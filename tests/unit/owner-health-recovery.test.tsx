// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ health: vi.fn(), smoke: vi.fn(), gate: true }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: any) => options }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: any) => fn }));
vi.mock("@/components/owner/OwnerShell", () => ({
  OwnerShell: ({ children, title }: any) =>
    api.gate ? (
      <>
        <h1>{title}</h1>
        {children}
      </>
    ) : (
      <p>Checking owner access</p>
    ),
}));
vi.mock("@/lib/owner/system-health.functions", () => ({ runSystemHealth: api.health }));
vi.mock("@/lib/owner/ai-smoke-test.functions", () => ({ runOwnerAiSmokeTest: api.smoke }));
vi.mock("@/components/owner/SystemHealthChecklist", () => ({ ManualChecklistSection: () => null }));
import { Route } from "../../src/routes/_authenticated/owner.health";
const Page = (Route as any).component;
function result(label = "Backend Connection") {
  return {
    results: [
      {
        key: "backend",
        label,
        status: "working",
        detail: "Read probe completed",
        category: "infra",
      },
    ],
    summary: {
      working: 1,
      attention: 0,
      manual: 0,
      coming_soon: 0,
      total: 1,
      checked_at: "2026-10-17T12:00:00.000Z",
    },
  };
}
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  api.gate = true;
  api.health.mockResolvedValue(result());
  api.smoke.mockResolvedValue({
    ok: true,
    model: "synthetic",
    latencyMs: 12,
    redactionCount: 7,
    persistedRecords: 0,
    checkedAt: "2026-10-17T12:00:00.000Z",
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("does not start probes or AI before the OwnerShell gate mounts its children", async () => {
  api.gate = false;
  const view = render(<Page />);
  await act(async () => {});
  expect(api.health).not.toHaveBeenCalled();
  expect(api.smoke).not.toHaveBeenCalled();
  api.gate = true;
  view.rerender(<Page />);
  await screen.findByText("Backend Connection");
  expect(api.health).toHaveBeenCalledTimes(1);
  expect(api.smoke).not.toHaveBeenCalled();
});
it("handles a rejected load and retries without exposing private details or auto-running AI", async () => {
  api.health.mockRejectedValueOnce(new Error("private SQL detail"));
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByText("private SQL detail")).toBeNull();
  expect(screen.getByRole("button", { name: "Run synthetic AI test" })).toBeTruthy();
  expect(api.smoke).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  await screen.findByText("Backend Connection");
  expect(api.health).toHaveBeenCalledTimes(2);
});
it.each([
  undefined,
  { results: [], summary: null },
  { ...result(), results: [{ ...result().results[0], status: "unknown" }] },
])("recovers from malformed response %# rather than crashing", async (response) => {
  api.health.mockResolvedValueOnce(response);
  render(<Page />);
  await screen.findByRole("alert");
  expect(screen.queryByText("Running health checks…")).toBeNull();
  expect(api.smoke).not.toHaveBeenCalled();
});
it("bounds stalled reads, forwards cancellation, and ignores a late result after retry", async () => {
  vi.useFakeTimers();
  const old = deferred();
  api.health
    .mockImplementationOnce(() => old.promise)
    .mockResolvedValueOnce(result("Fresh successful result"));
  render(<Page />);
  await act(async () => {});
  await act(async () => {
    vi.advanceTimersByTime(20001);
  });
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(api.health.mock.calls[0][0].signal.aborted).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Try Again" }));
  await act(async () => {});
  expect(screen.getByText("Fresh successful result")).toBeTruthy();
  await act(async () => old.resolve(result("Late result")));
  expect(screen.queryByText("Late result")).toBeNull();
});
it("retains prior results with a visible recovery state when manual refresh fails", async () => {
  render(<Page />);
  await screen.findByText("Backend Connection");
  api.health.mockRejectedValueOnce(new Error("unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Re-run checks" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Backend Connection")).toBeTruthy();
  expect(api.smoke).not.toHaveBeenCalled();
});
it("cancels a departed owner workspace read before a fresh gate opens", async () => {
  const old = deferred();
  api.health.mockImplementationOnce(() => old.promise);
  const view = render(<Page />);
  await act(async () => {});
  const signal = api.health.mock.calls[0][0].signal;
  api.gate = false;
  view.rerender(<Page />);
  expect(signal.aborted).toBe(true);
  api.gate = true;
  view.rerender(<Page />);
  await screen.findByText("Backend Connection");
  await act(async () => old.resolve(result("Departed data")));
  expect(screen.queryByText("Departed data")).toBeNull();
});
it("runs synthetic AI only on explicit click, prevents duplicate clicks and preserves the no-record result", async () => {
  const pending = deferred();
  api.smoke.mockReturnValueOnce(pending.promise);
  render(<Page />);
  await screen.findByText("Backend Connection");
  expect(api.smoke).not.toHaveBeenCalled();
  const button = screen.getByRole("button", { name: "Run synthetic AI test" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.smoke).toHaveBeenCalledTimes(1);
  await act(async () =>
    pending.resolve({
      ok: true,
      model: "synthetic",
      latencyMs: 12,
      redactionCount: 7,
      persistedRecords: 0,
      checkedAt: "2026-10-17T12:00:00.000Z",
    }),
  );
  expect(screen.getByText(/no records saved/)).toBeTruthy();
});
