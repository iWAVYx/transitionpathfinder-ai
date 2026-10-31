// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useReportStudentVoice } from "../../src/hooks/use-report-student-voice";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.fetch }));
vi.mock("@/lib/student-voice.functions", () => ({ getStudentVoiceResponses: {} }));
beforeEach(() => mocks.fetch.mockReset());
afterEach(cleanup);
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { resolve, reject, promise };
}
const answers = (text: string) => ({ responses: [{ response_text: text }] });
it("hides saved answers immediately when the student changes and ignores late responses", async () => {
  const first = deferred(), second = deferred(), third = deferred();
  mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(third.promise);
  const view = renderHook(({ id }) => useReportStudentVoice(id, false), { initialProps: { id: "first" } });
  await act(async () => first.resolve(answers("First answers")));
  expect(view.result.current).toEqual(answers("First answers").responses);
  view.rerender({ id: "second" });
  expect(view.result.current).toEqual([]);
  view.rerender({ id: "third" });
  await act(async () => third.resolve(answers("Current answers")));
  await act(async () => second.resolve(answers("Outdated answers")));
  expect(view.result.current).toEqual(answers("Current answers").responses);
});
it("keeps failed requests empty instead of restoring the previous student's answers", async () => {
  const first = deferred(), second = deferred();
  mocks.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = renderHook(({ id }) => useReportStudentVoice(id, false), { initialProps: { id: "first" } });
  await act(async () => first.resolve(answers("Private answers")));
  view.rerender({ id: "second" });
  await act(async () => second.reject(new Error("Unavailable")));
  expect(view.result.current).toEqual([]);
});
it("does not load private answers in demo or unlinked reports and clears earlier answers", async () => {
  const first = deferred(); mocks.fetch.mockReturnValueOnce(first.promise);
  const view = renderHook(({ id, demo }: { id: string | undefined; demo: boolean }) => useReportStudentVoice(id, demo), {
    initialProps: { id: "first", demo: false },
  });
  await act(async () => first.resolve(answers("Private answers")));
  view.rerender({ id: "first", demo: true });
  expect(view.result.current).toEqual([]);
  view.rerender({ id: undefined, demo: false });
  expect(view.result.current).toEqual([]);
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
