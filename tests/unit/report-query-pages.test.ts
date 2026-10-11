import { expect, it, vi } from "vitest";
import { readReportPages, readReportBatches } from "../../src/lib/report-query-pages";

it("includes records beyond the database's first page", async () => {
  const records = Array.from({length: 1250}, (_, id) => ({id}));
  const fetch = vi.fn(async (from: number, to: number) => ({data: records.slice(from, to + 1), count: records.length, error: null}));
  expect(await readReportPages(fetch)).toEqual(records);
  expect(fetch).toHaveBeenCalledTimes(3);
});
it("does not request an extra page for exact page multiples or empty results", async () => {
  for (const count of [0, 500, 1000]) {
    const fetch = vi.fn(async (from: number, to: number) => ({data: Array.from({length: Math.max(0, Math.min(to + 1, count) - from)}, (_, i) => from + i), count, error: null}));
    expect(await readReportPages(fetch)).toHaveLength(count);
    expect(fetch).toHaveBeenCalledTimes(Math.max(1, count / 500));
  }
});
it("rejects a later-page failure rather than returning partial totals", async () => {
  await expect(readReportPages(async (from) => from === 0
    ? {data: Array.from({length: 500}, (_, i) => i), count: 600, error: null}
    : {data: null, count: null, error: {message: 'private database detail'}})).rejects.toThrow("could not load all records");
});
it("rejects missing counts, prematurely empty pages, and changing totals", async () => {
  await expect(readReportPages(async () => ({data: [], count: null, error: null}))).rejects.toThrow();
  await expect(readReportPages(async () => ({data: [], count: 10, error: null}))).rejects.toThrow();
  await expect(readReportPages(async (from) => ({data: [from], count: from ? 3 : 2, error: null}))).rejects.toThrow("Records changed");
});
it("batches distinct filters without dropping rows, and skips empty filters", async () => {
  const ids = Array.from({length: 251}, (_, i) => String(i));
  const fetch = vi.fn(async (batch: string[]) => ({data: batch, count: batch.length, error: null}));
  expect(await readReportBatches([...ids, ids[0]], fetch)).toEqual(ids);
  expect(fetch.mock.calls.map(([batch]) => batch.length)).toEqual([100,100,51]);
  fetch.mockClear();
  expect(await readReportBatches([], fetch)).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});
it("fails the whole batch load when one filter batch fails", async () => {
  const ids = Array.from({length: 101}, (_, i) => String(i));
  await expect(readReportBatches(ids, async (batch) => batch[0] === '100'
    ? {data: null, error: {}, count: null}
    : {data: batch, error: null, count: batch.length})).rejects.toThrow();
});
