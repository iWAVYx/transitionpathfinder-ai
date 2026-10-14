// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({
  read: vi.fn(),
  complete: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  viewer: "caller",
  loading: false,
}));
vi.mock("sonner", () => ({
  toast: { success: api.success, warning: api.warning, error: api.error, info: api.info },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/lib/next-actions/next-actions.functions", () => ({
  getNextActionsForMe: api.read,
  completeNextAction: api.complete,
}));
vi.mock("@/components/next-actions/NextActionCard", () => ({
  NextActionCard: ({ actions, onComplete, completingId }: any) => (
    <div>
      <p>{actions.length ? actions[0].title : "Empty Actions"}</p>
      <p>Completion: {completingId ?? "None"}</p>
      {actions.length > 0 && (
        <button onClick={() => onComplete(actions[0].id)}>Complete Test Action</button>
      )}
    </div>
  ),
}));
import { NextActionCardServer } from "@/components/next-actions/NextActionCardServer";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
});
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = () => (
    <QueryClientProvider client={client}>
      <NextActionCardServer />
    </QueryClientProvider>
  );
  return { ...render(view()), view, client };
}
it("shows read failure with retry rather than an empty claim", async () => {
  api.read.mockRejectedValueOnce(new Error("failed")).mockResolvedValue({
    active: [{ title: "Recovered Action" }],
    recentlyCompleted: [],
    viewer_id: "caller",
  });
  setup();
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Empty Actions")).toBeNull();
  fireEvent.click(screen.getByText("Try Again"));
  expect(await screen.findByText("Recovered Action")).toBeTruthy();
});
it("rejects a response for another viewer", async () => {
  api.read.mockResolvedValue({
    active: [{ title: "Other Viewer Action" }],
    recentlyCompleted: [],
    viewer_id: "other",
  });
  setup();
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Other Viewer Action")).toBeNull();
});
it("waits for resolved sign-in", async () => {
  api.loading = true;
  setup();
  expect(screen.getByRole("status")).toBeTruthy();
  await waitFor(() => expect(api.read).not.toHaveBeenCalled());
});
it("does not retain cached rows after the viewer signs out", async () => {
  api.read.mockResolvedValue({
    active: [{ title: "Caller Action" }],
    recentlyCompleted: [],
    viewer_id: "caller",
  });
  const result = setup();
  await screen.findByText("Caller Action");
  api.viewer = "";
  result.rerender(result.view());
  expect(screen.queryByText("Caller Action")).toBeNull();
  expect(screen.getByRole("status")).toBeTruthy();
});

const ACTION = "10000000-0000-4000-8000-000000000001";
const VERSION = "2026-10-14T12:00:00.123456+00:00";
const response = (viewer = "caller") => ({
  active: [{ id: ACTION, title: `${viewer} Action`, updatedAt: VERSION }],
  recentlyCompleted: [],
  viewer_id: viewer,
});
function pending() {
  let resolve!: (x: any) => void;
  let reject!: (x: any) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
it("submits the displayed action/version and distinguishes failed history logging", async () => {
  api.read.mockResolvedValue(response());
  api.complete.mockResolvedValue({ ok: true, activityLogged: false });
  const view = setup();
  await screen.findByText("caller Action");
  const invalidation = vi.spyOn(view.client, "invalidateQueries");
  fireEvent.click(screen.getByText("Complete Test Action"));
  await waitFor(() =>
    expect(api.warning).toHaveBeenCalledWith(
      "Marked complete. Activity history could not be updated.",
    ),
  );
  expect(api.success).not.toHaveBeenCalled();
  expect(api.complete).toHaveBeenCalledWith({
    data: { id: ACTION, expected_viewer_id: "caller", expected_updated_at: VERSION },
  });
  expect(invalidation).toHaveBeenCalledWith({ queryKey: ["next-actions", "me", "caller"] });
});
for (const failure of [false, true])
  it(`suppresses departed completion effects after viewer change (failure ${failure})`, async () => {
    const old = pending();
    api.read.mockResolvedValueOnce(response()).mockResolvedValue(response("new"));
    api.complete.mockReturnValue(old.promise);
    const view = setup();
    await screen.findByText("caller Action");
    const invalidation = vi.spyOn(view.client, "invalidateQueries");
    fireEvent.click(screen.getByText("Complete Test Action"));
    await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
    api.viewer = "new";
    view.rerender(view.view());
    await screen.findByText("new Action");
    await act(async () =>
      failure
        ? old.reject(new Error("Previous user error"))
        : old.resolve({ ok: true, activityLogged: false }),
    );
    expect(api.warning).not.toHaveBeenCalled();
    expect(api.success).not.toHaveBeenCalled();
    expect(api.error).not.toHaveBeenCalled();
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ["next-actions", "me", "caller"],
      refetchType: "none",
    });
    expect(invalidation.mock.calls.every(([options]) => options?.queryKey?.[2] !== "new")).toBe(
      true,
    );
    expect(screen.getByText("Completion: None")).toBeTruthy();
    expect(screen.getByText("new Action")).toBeTruthy();
  });
it("suppresses completion effects after unmount", async () => {
  const old = pending();
  api.read.mockResolvedValue(response());
  api.complete.mockReturnValue(old.promise);
  const view = setup();
  await screen.findByText("caller Action");
  fireEvent.click(screen.getByText("Complete Test Action"));
  await waitFor(() => expect(api.complete).toHaveBeenCalledOnce());
  view.unmount();
  await act(async () => old.resolve({ ok: true, activityLogged: false }));
  expect(api.warning).not.toHaveBeenCalled();
  expect(api.success).not.toHaveBeenCalled();
});
it("does not persist a derived suggestion through the stored-action mutation", async () => {
  api.read.mockResolvedValue({
    active: [{ id: "derived:report:sample", title: "Derived Suggestion" }],
    recentlyCompleted: [],
    viewer_id: "caller",
  });
  setup();
  await screen.findByText("Derived Suggestion");
  fireEvent.click(screen.getByText("Complete Test Action"));
  expect(api.complete).not.toHaveBeenCalled();
  expect(api.info).toHaveBeenCalled();
});
