import { readReportPages, readReportBatches } from "./report-query-pages";
type Page<T> = { data: T[] | null; error: unknown; count: number | null };
function calendarReadError(error: unknown) {
  return new Error(error instanceof Error && error.message.startsWith("Records changed")
    ? "Calendar records changed while loading. Please try again."
    : "Could not load all calendar records. Please try again.");
}
/** Complete caller-authorized reads, or an explicit failure instead of partial data. */
export async function readCalendarPages<T>(fetch: (from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  try { return await readReportPages(fetch); } catch (error) { throw calendarReadError(error); }
}
export async function readCalendarBatches<T>(ids: string[], fetch: (ids: string[], from: number, to: number) => PromiseLike<Page<T>>): Promise<T[]> {
  try { return await readReportBatches(ids, fetch); } catch (error) { throw calendarReadError(error); }
}
