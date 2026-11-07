import { afterEach, expect, it, vi } from "vitest";
import { readDashboardWidget, DASHBOARD_WIDGET_READ_TIMEOUT_MS } from "@/lib/dashboard/dashboard-widget-read";
afterEach(() => vi.useRealTimers());
it("aborts a stalled read and ignores a response arriving after the deadline", async () => {
  vi.useFakeTimers();
  let resolve!: (value: string) => void;
  let requestSignal!: AbortSignal;
  const result = readDashboardWidget(new AbortController().signal, signal => {
    requestSignal = signal;
    return new Promise<string>(yes => { resolve = yes; });
  });
  const failed = expect(result).rejects.toThrow("taking too long");
  await vi.advanceTimersByTimeAsync(DASHBOARD_WIDGET_READ_TIMEOUT_MS);
  await failed;
  expect(requestSignal.aborted).toBe(true);
  resolve("late private content");
  await expect(result).rejects.toThrow("taking too long");
  expect(vi.getTimerCount()).toBe(0);
});
it("propagates query cancellation to the transport and removes the deadline", async () => {
  vi.useFakeTimers();
  const query = new AbortController();
  let requestSignal!: AbortSignal;
  const result = readDashboardWidget(query.signal, signal => {
    requestSignal = signal;
    return new Promise<string>(() => {});
  });
  await Promise.resolve();
  const failed = expect(result).rejects.toThrow("cancelled");
  query.abort();
  await failed;
  expect(requestSignal.aborted).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it("does not start a read for an already cancelled query", async () => {
  const query = new AbortController(); query.abort();
  const read = vi.fn();
  await expect(readDashboardWidget(query.signal, read)).rejects.toThrow("cancelled");
  expect(read).not.toHaveBeenCalled();
});
it.each(["success", "failure"])("cleans up after an ordinary %s", async outcome => {
  vi.useFakeTimers();
  const query = new AbortController();
  const remove = vi.spyOn(query.signal, "removeEventListener");
  const result = readDashboardWidget(query.signal, async () => {
    if (outcome === "failure") throw new Error("read denied");
    return "current content";
  });
  if (outcome === "failure") await expect(result).rejects.toThrow("read denied");
  else await expect(result).resolves.toBe("current content");
  expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});
