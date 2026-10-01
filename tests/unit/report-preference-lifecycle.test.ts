import { afterEach, expect, it, vi } from "vitest";
import {
  configureReportPrefsPusher,
  queueReportPrefsUpdate,
  flushReportPrefs,
} from "../../src/lib/report-view-prefs";
afterEach(() => vi.useRealTimers());
it("flushes pending live preferences at unmount and never sends subsequent demo changes", () => {
  vi.useFakeTimers();
  const push = vi.fn().mockResolvedValue(undefined);
  const disconnect = configureReportPrefsPusher(push);
  queueReportPrefsUpdate({ density: "compact" });
  disconnect();
  expect(push).toHaveBeenCalledTimes(1);
  queueReportPrefsUpdate({ density: "comfortable" });
  vi.runAllTimers();
  flushReportPrefs();
  expect(push).toHaveBeenCalledTimes(1);
  const next = vi.fn().mockResolvedValue(undefined);
  const stop = configureReportPrefsPusher(next);
  flushReportPrefs();
  expect(next).not.toHaveBeenCalled();
  stop();
});
