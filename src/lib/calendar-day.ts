/** Calendar-day arithmetic is independent of elapsed 24-hour intervals and DST. */
export function validCalendarDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function shiftCalendarDay(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function validCalendarTimeZone(value: string): boolean {
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
}
export function calendarDayForInstant(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function browserCalendarTimeZone(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
