/** Load every row, or fail rather than return a misleading partial report.
 * Callers must order by a unique id and request an exact count on each page.
 */
export async function readReportPages<T>(fetchPage: (from: number, to: number) => PromiseLike<{
  data: T[] | null; error: unknown; count: number | null;
}>): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 500;
  let expected: number | undefined;
  for (let page = 0; page < 2000; page++) {
    const result = await fetchPage(rows.length, rows.length + pageSize - 1);
    if (result.error || !result.data || result.count == null) {
      throw new Error("The report could not load all records. Please try again.");
    }
    if (expected !== undefined && expected !== result.count) {
      throw new Error("Records changed while this report loaded. Please try again.");
    }
    expected = result.count;
    rows.push(...result.data);
    if (rows.length === expected) return rows;
    if (!result.data.length || rows.length > expected) break;
  }
  throw new Error("The report could not load all records. Please try again.");
}

/** Keep organization/student filters small enough for the database request URL. */
export async function readReportBatches<T>(ids: string[], fetchPage: (
  ids: string[], from: number, to: number,
) => PromiseLike<{data: T[] | null; error: unknown; count: number | null}>): Promise<T[]> {
  const rows: T[] = [];
  const uniqueIds = [...new Set(ids)];
  for (let start = 0; start < uniqueIds.length; start += 100) {
    const batch = uniqueIds.slice(start, start + 100);
    rows.push(...await readReportPages((from, to) => fetchPage(batch, from, to)));
  }
  return rows;
}
