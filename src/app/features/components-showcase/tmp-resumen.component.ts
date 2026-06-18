import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Componente de ejemplo "documento ya formateado" para demostrar
 * `app-preview-export` en el showcase. NO se usa en producción —
 * vive aquí solo como payload del demo.
 *
 * Renderiza un mini-reporte tipo "resumen mensual" con cabecera, KPIs,
 * tabla y notas. Está completamente self-contained, sin dependencias del
 * shell ni del tema (colores hardcoded para que la exportación PDF/PNG se
 * vea idéntica al preview independiente del theme activo).
 */
@Component({
  selector: 'app-tmp-resumen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="r-head">
      <div>
        <h1 class="r-title">Resumen mensual</h1>
        <p class="r-subtitle">{{ mesNombre }} {{ anio }} · {{ org }}</p>
      </div>
      <div class="r-meta">
        <p><strong>Generado:</strong> {{ generadoFecha }}</p>
        <p><strong>Referencia:</strong> RES-{{ anio }}-{{ ('0' + mes).slice(-2) }}</p>
      </div>
    </header>

    <section class="r-kpis">
      <div class="r-kpi">
        <p class="r-kpi__label">Ingresos</p>
        <p class="r-kpi__value">{{ ingresos | currency:'CLP':'symbol-narrow':'1.0-0' }}</p>
      </div>
      <div class="r-kpi">
        <p class="r-kpi__label">Egresos</p>
        <p class="r-kpi__value">{{ egresos | currency:'CLP':'symbol-narrow':'1.0-0' }}</p>
      </div>
      <div class="r-kpi r-kpi--accent">
        <p class="r-kpi__label">Saldo</p>
        <p class="r-kpi__value">{{ (ingresos - egresos) | currency:'CLP':'symbol-narrow':'1.0-0' }}</p>
      </div>
    </section>

    <section class="r-section">
      <h2 class="r-section__title">Movimientos destacados</h2>
      <table class="r-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Descripción</th>
            <th class="r-table__num">Monto</th>
          </tr>
        </thead>
        <tbody>
          @for (m of movimientos; track m.fecha) {
            <tr>
              <td>{{ m.fecha }}</td>
              <td>{{ m.descripcion }}</td>
              <td class="r-table__num" [class.r-table__num--neg]="m.monto < 0">
                {{ m.monto | currency:'CLP':'symbol-narrow':'1.0-0' }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </section>

    <section class="r-section">
      <h2 class="r-section__title">Notas</h2>
      <p class="r-notes">
        Este es un documento de ejemplo generado por <code>tmp-resumen</code> para
        demostrar el componente <code>app-preview-export</code>. Los datos son ficticios.
      </p>
    </section>

    <footer class="r-footer">
      <p>FVX · Documento generado automáticamente</p>
    </footer>
  `,
  styles: [`
    :host {
      display: block;
      font-family: 'Inter', system-ui, -apple-system, Segoe UI, sans-serif;
      color: #1f2937;
    }
    .r-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
    }
    .r-title { margin: 0 0 4px; font-size: 1.5rem; font-weight: 700; }
    .r-subtitle { margin: 0; color: #6b7280; font-size: 0.95rem; }
    .r-meta { text-align: right; font-size: 0.85rem; color: #4b5563; }
    .r-meta p { margin: 0 0 4px; }

    .r-kpis {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 20px 0 26px;
    }
    .r-kpi {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 14px;
    }
    .r-kpi--accent {
      background: #ecfeff;
      border-color: #67e8f9;
    }
    .r-kpi__label { margin: 0; font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
    .r-kpi__value { margin: 6px 0 0; font-size: 1.25rem; font-weight: 700; color: #111827; }

    .r-section { margin-bottom: 24px; }
    .r-section__title {
      margin: 0 0 10px;
      font-size: 0.95rem;
      font-weight: 600;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .r-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    .r-table th, .r-table td {
      padding: 8px 12px;
      text-align: left;
      border-bottom: 1px solid #f3f4f6;
    }
    .r-table th { background: #f9fafb; font-weight: 600; color: #4b5563; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    .r-table__num { text-align: right; font-variant-numeric: tabular-nums; }
    .r-table__num--neg { color: #b91c1c; }

    .r-notes { margin: 0; font-size: 0.875rem; color: #4b5563; line-height: 1.55; }
    .r-notes code { background: #f3f4f6; padding: 1px 6px; border-radius: 4px; font-size: 0.8em; }

    .r-footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      font-size: 0.75rem;
      color: #9ca3af;
      text-align: center;
    }
  `],
})
export class TmpResumenComponent {
  @Input() mes = 5;
  @Input() anio = 2026;
  @Input() org = 'FVX';
  @Input() ingresos = 12450000;
  @Input() egresos = 7820000;

  readonly generadoFecha = new Date().toLocaleDateString('es-CL');

  movimientos = [
    { fecha: '2026-05-03', descripcion: 'Pago cliente A', monto: 3200000 },
    { fecha: '2026-05-08', descripcion: 'Sueldo Juan Pérez', monto: -1850000 },
    { fecha: '2026-05-12', descripcion: 'Pago cliente B', monto: 2100000 },
    { fecha: '2026-05-15', descripcion: 'Arriendo oficina', monto: -2400000 },
    { fecha: '2026-05-22', descripcion: 'Pago cliente C', monto: 4150000 },
    { fecha: '2026-05-28', descripcion: 'Servicios básicos', monto: -370000 },
  ];

  get mesNombre(): string {
    return new Date(this.anio, this.mes - 1, 1)
      .toLocaleDateString('es-CL', { month: 'long' })
      .replace(/^\w/, c => c.toUpperCase());
  }
}
