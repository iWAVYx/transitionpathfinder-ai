/**
 * Compact, locale-agnostic "time ago" formatter for admin surfaces.
 * Falls back to localized date for anything older than a week.
 */
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
];

export function timeAgo(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return "";
  const diffSec = Math.round((Date.now() - ms) / 1000);
  if (diffSec < 5) return "just now";

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  let value = -diffSec;
  for (const [unit, span] of UNITS) {
    if (Math.abs(value) < span) {
      return rtf.format(Math.round(value), unit);
    }
    value = value / span;
  }
  return date.toLocaleDateString();
}
