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
import { DASHBOARD_WIDGET_READ_TIMEOUT_MS } from "@/lib/dashboard/dashboard-widget-read";
import type { NextActionContext } from "@/lib/next-actions/action-context";
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.resetAllMocks();
  api.viewer = "caller";
  api.loading = false;
});
function setup(context?: NextActionContext) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = () => (
    <QueryClientProvider client={client}>
      <NextActionCardServer context={context} />
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

it("reloads for role and student changes without displaying the previous workspace", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const first = "11111111-1111-4111-8111-111111111111";
  const second = "22222222-2222-4222-8222-222222222222";
  api.read.mockImplementation(async ({data}: any) => ({
    active: [{id: "derived:test", title: `${data.role} ${data.student_id}`}],
    recentlyCompleted: [], viewer_id: "caller",
  }));
  const view = (role: "family" | "educator", student_id: string) => (
    <QueryClientProvider client={client}><NextActionCardServer context={{role,student_id}} /></QueryClientProvider>
  );
  const result = render(view("family",first));
  await screen.findByText(`family ${first}`);
  result.rerender(view("educator",first));
  expect(screen.queryByText(`family ${first}`)).toBeNull();
  await screen.findByText(`educator ${first}`);
  result.rerender(view("educator",second));
  expect(screen.queryByText(`educator ${first}`)).toBeNull();
  await screen.findByText(`educator ${second}`);
  expect(api.read).toHaveBeenNthCalledWith(1,{signal:expect.any(AbortSignal),data:{role:"family",student_id:first}});
  expect(api.read).toHaveBeenNthCalledWith(2,{signal:expect.any(AbortSignal),data:{role:"educator",student_id:first}});
  expect(api.read).toHaveBeenNthCalledWith(3,{signal:expect.any(AbortSignal),data:{role:"educator",student_id:second}});
  expect(client.getQueryData(["next-actions","me","caller","family",first])).toBeTruthy();
  expect(client.getQueryData(["next-actions","me","caller","educator",second])).toBeTruthy();
});

it.each(["student", "family", "educator", "partner"] as const)("%s full action workspace times out, retries, and ignores the late read", async role => {
  vi.useFakeTimers();
  const old = pending();
  api.read.mockReturnValueOnce(old.promise).mockResolvedValue({active:[{id:"current",title:"Recovered Current Action"}],recentlyCompleted:[],viewer_id:"caller"});
  const view = setup({role});
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.getByRole("status")).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(DASHBOARD_WIDGET_READ_TIMEOUT_MS); });
  expect(screen.getByRole("alert").textContent).toContain("could not be fully loaded");
  expect(screen.queryByText("Empty Actions")).toBeNull();
  expect(api.read).toHaveBeenCalledTimes(1);
  expect(api.read.mock.calls[0][0].signal.aborted).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:"Try Again"}));
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.getByText("Recovered Current Action")).toBeTruthy();
  await act(async () => { old.resolve({active:[{title:"Obsolete Action"}],recentlyCompleted:[],viewer_id:"caller"}); await vi.advanceTimersByTimeAsync(1); });
  expect(screen.queryByText("Obsolete Action")).toBeNull();
  expect(screen.getByText("Recovered Current Action")).toBeTruthy();
  expect(api.complete).not.toHaveBeenCalled();
  view.client.clear();
});
