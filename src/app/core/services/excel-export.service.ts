import { Injectable } from '@angular/core';
// Solo tipos (se borran en compilación, no van al bundle). El runtime de xlsx
// se carga bajo demanda con `await import('xlsx')` dentro de exportToExcel,
// así la librería (~400KB) cae en un chunk lazy y no en el bundle inicial.
import type * as XLSX from 'xlsx';

export interface ExportColumn {
  /** Ruta con puntos, p.ej. ``profile.role`` o ``profile.user_details.email``. */
  key: string;
  /** Encabezado en la primera fila del XLSX. */
  label: string;
}

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

/**
 * Exporta filas a XLSX leyendo valores por ruta con punto (objetos anidados o JSON recibido del API).
 *
 * Sintaxis rápida ``columnsExport``:
 * - Cada argumento es un path: ``'username'`` → etiqueta autogenerada (``Username``).
 * - Etiqueta explícita: ``'profile.role|Role'`` (path y título separados por ``|``).
 * Para columnas bajo un objeto dinámico (p.ej. todo ``profile.*`` de la primera fila), usa
 * ``expandColumnsUnderPrefix(rows, 'profile')`` y concatena el resultado a ``exportColumns``.
 */
@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  /**
   * Define columnas desde strings: ``path`` o ``path|Header``.
   */
  static columnsExport(...specs: string[]): ExportColumn[] {
    const out: ExportColumn[] = [];
    for (const raw of specs) {
      const s = raw.trim();
      if (!s) continue;
      const pipe = s.indexOf('|');
      if (pipe >= 0) {
        out.push({
          key: s.slice(0, pipe).trim(),
          label: s.slice(pipe + 1).trim() || humanizeHeader(s.slice(0, pipe).trim()),
        });
      } else {
        out.push({ key: s, label: humanizeHeader(s) });
      }
    }
    return out;
  }

  /**
   * Añade columnas para cada clave de primer nivel bajo ``prefix`` (p.ej. ``'profile'``),
   * usando la primera fila de ``rows`` como muestra. Valores objeto → JSON en celda.
   */
  expandColumnsUnderPrefix(rows: Record<string, unknown>[], prefix: string): ExportColumn[] {
    const base = prefix.replace(/\.$/, '');
    const first = rows?.[0];
    if (!first) return [];
    const node = this.getNestedValue(first, base);
    if (node === null || node === undefined || typeof node !== 'object' || Array.isArray(node)) {
      return [{ key: base, label: humanizeHeader(base) }];
    }
    return Object.keys(node as object).map(k => ({
      key: `${base}.${k}`,
      label: humanizeHeader(`${base} ${k}`),
    }));
  }

  /**
   * Normaliza la carga útil del API: array, ``{ results: [] }``, o un solo objeto → una fila.
   */
  normalizeRows(data: unknown): Record<string, unknown>[] {
    if (data === null || data === undefined) return [];
    if (Array.isArray(data)) return data as Record<string, unknown>[];
    if (typeof data === 'object' && data !== null && 'results' in data) {
      const r = (data as { results: unknown }).results;
      return Array.isArray(r) ? (r as Record<string, unknown>[]) : [];
    }
    if (typeof data === 'object') return [data as Record<string, unknown>];
    return [];
  }

  /**
   * Exporta a ``.xlsx`` usando solo las columnas indicadas (valores por ruta con punto).
   */
  async exportToExcel(
    data: unknown,
    columns: ExportColumn[],
    filename = 'export',
  ): Promise<void> {
    const rows = this.normalizeRows(data);
    if (!rows.length) {
      console.warn('ExcelExportService: no hay filas para exportar');
      return;
    }
    if (!columns.length) {
      console.warn('ExcelExportService: no hay columnas configuradas');
      return;
    }

    const exportData = rows.map(item => {
      const row: Record<string, string | number | boolean> = {};
      for (const col of columns) {
        row[col.label] = this.formatCell(this.getNestedValue(item, col.key));
      }
      return row;
    });

    const xlsx = await import('xlsx'); // chunk lazy: solo se descarga al exportar

    const ws: XLSX.WorkSheet = xlsx.utils.json_to_sheet(exportData);
    const colWidths = columns.map(col => ({
      wch: Math.min(
        48,
        Math.max(col.label.length, 12, ...exportData.map(r => String(r[col.label] ?? '').length)),
      ),
    }));
    ws['!cols'] = colWidths;

    const wb: XLSX.WorkBook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Data');

    const timestamp = new Date().toISOString().slice(0, 10);
    const safe = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
    xlsx.writeFile(wb, `${safe}_${timestamp}.xlsx`);
  }

  getNestedValue(obj: unknown, path: string): unknown {
    if (obj === null || obj === undefined || !path) return '';
    const keys = path.split('.').filter(Boolean);
    let value: unknown = obj;
    for (const key of keys) {
      if (value === null || value === undefined) return '';
      if (typeof value !== 'object') return '';
      value = (value as Record<string, unknown>)[key];
    }
    return value;
  }

  private formatCell(value: unknown): string | number | boolean {
    if (value === null || value === undefined) return '';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value instanceof Date) return value.toISOString().slice(0, 19).replace('T', ' ');
    if (typeof value === 'string') {
      if (ISO_DATE.test(value)) {
        return value.slice(0, 19).replace('T', ' ');
      }
      return value;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

function humanizeHeader(path: string): string {
  const last = path.includes('.') ? path.split('.').pop()! : path;
  return last
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
