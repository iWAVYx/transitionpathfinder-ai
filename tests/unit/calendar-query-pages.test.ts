import { expect, it } from "vitest";
import { readCalendarPages, readCalendarBatches } from "@/lib/calendar-query-pages";
it("continues after a server short page until the exact count is reached", async () => {
  const rows = Array.from({ length: 73 }, (_, id) => ({ id }));
  const result = await readCalendarPages((from) => Promise.resolve({ data: rows.slice(from, from + 20), error: null, count: rows.length }));
  expect(result).toEqual(rows);
});
it("a failure on a later page rejects the entire calendar result", async () => {
  await expect(readCalendarPages((from) => Promise.resolve(from === 0 ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null, count: 501 } : { data: null, error: { message: "private database detail" }, count: null })))
    .rejects.toThrow("Could not load all calendar records. Please try again.");
});
it("changed counts request a retry instead of publishing a partial calendar", async () => {
  await expect(readCalendarPages((from) => Promise.resolve({ data: [{ id: from }], error: null, count: from === 0 ? 2 : 3 })))
    .rejects.toThrow("Calendar records changed while loading. Please try again.");
});
it.each([null, 2])("missing counts or an exhausted incomplete read fails explicitly (count=%s)", async count => {
  await expect(readCalendarPages(() => Promise.resolve({ data: [], error: null, count }))).rejects.toThrow("Could not load all calendar records.");
});
it("ID batching deduplicates filters and fails if any batch cannot fully load", async () => {
  const calls: string[][] = [];
  const ids = Array.from({ length: 201 }, (_, i) => String(i));
  await expect(readCalendarBatches([...ids, "0"], (batch) => { calls.push(batch); return Promise.resolve({ data: batch.map(id => ({ id })), error: calls.length === 3 ? {} : null, count: batch.length }); }))
    .rejects.toThrow("Could not load all calendar records.");
  expect(calls.map(batch => batch.length)).toEqual([100,100,1]);
});
