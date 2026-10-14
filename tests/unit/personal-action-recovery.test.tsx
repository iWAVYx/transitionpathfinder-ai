// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const api = vi.hoisted(() => ({
  read: vi.fn(),
  complete: vi.fn(),
  viewer: "caller",
  loading: false,
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
  NextActionCard: ({ actions }: any) => (
    <p>{actions.length ? actions[0].title : "Empty Actions"}</p>
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
  return { ...render(view()), view };
}
it("shows read failure with retry rather than an empty claim", async () => {
  api.read
    .mockRejectedValueOnce(new Error("failed"))
    .mockResolvedValue({
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
