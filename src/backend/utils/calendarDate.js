/** Parse YYYY-MM-DD as local noon; Date/ISO otherwise. Empty → null. Invalid → null. */
export function parseInvoiceCalendarDate(value) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const dateStr = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(`${dateStr}T12:00:00`)
    : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

/** Inclusive local calendar-day window (00:00:00.000–23:59:59.999). */
export function localDayBounds(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function todayLocalNoon() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
}
