/**
 * Formato de fechas de /eventos en español de Chile y hora de Santiago, sin
 * depender del LOCALE_ID de la app (que sigue al idioma del panel).
 * «Sábado 28 de noviembre de 2026»: solo la primera letra en mayúscula.
 */
const LOCALE = 'es-CL';
const TIME_ZONE = 'America/Santiago';

type DateParts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

function getParts(iso: string, options: Intl.DateTimeFormatOptions): DateParts {
  const parts = new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: TIME_ZONE }).formatToParts(new Date(iso));
  return Object.fromEntries(parts.map((p) => [p.type, p.value.replace('.', '')]));
}

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «Sábado 28 de noviembre de 2026». */
export function formatLongDate(iso: string): string {
  const p = getParts(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return capitalizeFirst(`${p.weekday} ${p.day} de ${p.month} de ${p.year}`);
}

/** «24 de octubre de 2026». */
export function formatDayMonthYear(iso: string): string {
  const p = getParts(iso, { day: 'numeric', month: 'long', year: 'numeric' });
  return `${p.day} de ${p.month} de ${p.year}`;
}

/** «24 oct 2026». */
export function formatShortDate(iso: string): string {
  const p = getParts(iso, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${p.day} ${p.month} ${p.year}`;
}

/** «sábado 28» (para «Programa del sábado 28»). */
export function formatWeekdayDay(iso: string): string {
  const p = getParts(iso, { weekday: 'long', day: 'numeric' });
  return `${p.weekday} ${p.day}`;
}

/** «9:30» (sin cero a la izquierda en la hora). */
export function formatTime(iso: string): string {
  const p = getParts(iso, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${Number(p.hour)}:${p.minute}`;
}

/** «De 9:30 a 18:00 hrs» o «Desde las 9:30 hrs» si no hay término. */
export function formatSchedule(start: string | null, end?: string | null): string {
  if (!start) return '';
  return end ? `De ${formatTime(start)} a ${formatTime(end)} hrs` : `Desde las ${formatTime(start)} hrs`;
}

/** Separa la descripción en párrafos (línea en blanco = párrafo nuevo). */
export function splitParagraphs(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/**
 * ¿Ya terminó? Manda el `is_past` del servidor. Si el backend no lo envía (el
 * de hoy), se calcula aquí: `end_date` o, si falta, el final del día de `date`
 * en Santiago (un evento sin hora de término no pasa a «anteriores» a la hora
 * en que empieza). Sin fecha = no terminó.
 */
export function isEventPast(event: { is_past?: boolean; date: string | null; end_date?: string | null }): boolean {
  if (typeof event.is_past === 'boolean') return event.is_past;
  const endsAt = event.end_date ?? (event.date ? endOfSantiagoDay(event.date) : null);
  return endsAt !== null && new Date(endsAt).getTime() < Date.now();
}

/** 23:59:59 del día de `iso` en Santiago, como ISO con el desfase de ese día. */
function endOfSantiagoDay(iso: string): string {
  const p = getParts(iso, { year: 'numeric', month: '2-digit', day: '2-digit', timeZoneName: 'longOffset' });
  const offset = (p.timeZoneName ?? 'GMT-03:00').replace('GMT', '') || '+00:00';
  return `${p.year}-${p.month}-${p.day}T23:59:59${offset}`;
}
