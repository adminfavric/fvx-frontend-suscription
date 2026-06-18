import { DateFormatPipe } from './date-format.pipe';

/**
 * Unit tests del DateFormatPipe (transform puro, sin DI).
 *
 * Cubre la reescritura moment→Intl: salida fija ``DD/MM/YYYY HH:mm`` vía
 * ``formatToParts``, modo solo-fecha cuando el format no trae tokens de hora, y
 * los caminos de borde (vacío / fecha inválida). Se fija ``timezone: 'UTC'`` en
 * las aserciones exactas para que NO dependan del DST de la zona por defecto.
 */
describe('DateFormatPipe', () => {
  let pipe: DateFormatPipe;

  beforeEach(() => {
    pipe = new DateFormatPipe();
  });

  it('returns empty string for null/undefined/empty', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('returns the original string when the date is invalid', () => {
    expect(pipe.transform('not-a-date')).toBe('not-a-date');
  });

  it('formats an ISO string as DD/MM/YYYY HH:mm (UTC)', () => {
    expect(pipe.transform('2026-03-15T08:05:00Z', 'DD/MM/YYYY HH:mm', 'UTC')).toBe(
      '15/03/2026 08:05',
    );
  });

  it('formats a Date instance the same as its ISO string', () => {
    const d = new Date('2026-12-31T23:59:00Z');
    expect(pipe.transform(d, 'DD/MM/YYYY HH:mm', 'UTC')).toBe('31/12/2026 23:59');
  });

  it('omits the time when the format has no H/m tokens', () => {
    expect(pipe.transform('2026-03-15T08:05:00Z', 'DD/MM/YYYY', 'UTC')).toBe('15/03/2026');
  });

  it('pads single-digit day/month/hour/minute to two digits', () => {
    expect(pipe.transform('2026-01-02T03:04:00Z', 'DD/MM/YYYY HH:mm', 'UTC')).toBe(
      '02/01/2026 03:04',
    );
  });

  it('uses 24h time (no AM/PM)', () => {
    expect(pipe.transform('2026-06-01T18:30:00Z', 'DD/MM/YYYY HH:mm', 'UTC')).toBe(
      '01/06/2026 18:30',
    );
  });

  it('emits the canonical shape with the default timezone', () => {
    // No fijamos hora exacta (depende del DST de America/Santiago); solo el shape.
    const out = pipe.transform('2026-06-01T12:00:00Z');
    expect(out).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});
