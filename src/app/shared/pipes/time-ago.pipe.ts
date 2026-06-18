import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/**
 * Formato relativo de fecha: `"hace 12 min"`, `"ayer"`, `"hace 3 días"`.
 *
 * Usa `Intl.RelativeTimeFormat` (nativo del navegador) con el idioma activo
 * de Transloco. Para fechas > 30 días, cae a formato absoluto `dd/mm/yyyy`
 * para evitar números enormes ("hace 412 días") poco útiles.
 *
 * Para valores `null` / inválidos devuelve la traducción de `common.never`
 * (con fallback `'—'` si no existe la clave).
 *
 * @example
 * ```html
 * <span [matTooltip]="row.last_login | dateFormat">
 *   {{ row.last_login | timeAgo }}
 * </span>
 * ```
 *
 * Impure: re-evalúa en cada CD cycle para reflejar el paso del tiempo
 * (acceptable: el cálculo es trivial).
 */
@Pipe({ name: 'timeAgo', standalone: true, pure: false })
export class TimeAgoPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);

  transform(value: Date | string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') {
      return this.neverLabel();
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const lang = this.transloco.getActiveLang() || 'en';
    const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
    const absDays = Math.abs(diffSeconds / 86400);

    if (absDays > 30) {
      // Fecha absoluta corta para evitar "hace 412 días".
      return new Intl.DateTimeFormat(lang, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    }

    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    const abs = Math.abs(diffSeconds);
    if (abs < 60) return rtf.format(diffSeconds, 'second');
    const minutes = Math.round(diffSeconds / 60);
    if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
    const hours = Math.round(diffSeconds / 3600);
    if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
    const days = Math.round(diffSeconds / 86400);
    return rtf.format(days, 'day');
  }

  private neverLabel(): string {
    const key = 'common.never';
    const translated = this.transloco.translate(key);
    return translated && translated !== key ? translated : '—';
  }
}
