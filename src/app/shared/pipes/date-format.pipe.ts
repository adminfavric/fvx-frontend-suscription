import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formatea una fecha como ``DD/MM/YYYY HH:mm`` en una zona horaria dada
 * (default Chile) usando ``Intl.DateTimeFormat`` — sin dependencias.
 *
 * Reemplaza a moment-timezone (que empaquetaba toda la base IANA, ~700KB) por
 * la API nativa del navegador. ``formatToParts`` garantiza la salida exacta
 * ``DD/MM/YYYY HH:mm`` (independiente de cómo cada locale ensambla el string).
 *
 * El parámetro ``format`` se conserva por compatibilidad de firma: hoy toda la
 * app usa el formato canónico fecha+hora. Si ``format`` no incluye tokens de
 * hora (``H``/``m``), se devuelve solo la fecha.
 */
@Pipe({
  name: 'dateFormat',
  standalone: true,
})
export class DateFormatPipe implements PipeTransform {
  /** Zona horaria por defecto (Chile). */
  private readonly DEFAULT_TIMEZONE = 'America/Santiago';
  /** Locale para numerales; el ensamblado final es fijo DD/MM/YYYY. */
  private readonly LOCALE = 'es-CL';

  transform(
    value: string | Date | null | undefined,
    format = 'DD/MM/YYYY HH:mm',
    timezone?: string,
  ): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return typeof value === 'string' ? value : '';
    }

    const tz = timezone || this.DEFAULT_TIMEZONE;
    const withTime = /[Hm]/.test(format); // tokens de hora de la era moment

    try {
      const opts: Intl.DateTimeFormatOptions = {
        timeZone: tz,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
      };
      const p: Record<string, string> = {};
      for (const part of new Intl.DateTimeFormat(this.LOCALE, opts).formatToParts(date)) {
        p[part.type] = part.value;
      }
      const datePart = `${p['day']}/${p['month']}/${p['year']}`;
      return withTime ? `${datePart} ${p['hour']}:${p['minute']}` : datePart;
    } catch (error) {
      console.error('Error formatting date:', error);
      return typeof value === 'string' ? value : '';
    }
  }
}
