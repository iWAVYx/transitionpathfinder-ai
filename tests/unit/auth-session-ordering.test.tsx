// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
const api = vi.hoisted(() => ({ session: vi.fn(), callback: null as any, unsubscribe: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: api.session,
      onAuthStateChange: (callback: any) => {
        api.callback = callback;
        return { data: { subscription: { unsubscribe: api.unsubscribe } } };
      },
      signOut: vi.fn(),
    },
  },
}));
import { useAuth } from "@/hooks/use-auth";
function Probe() {
  const { user, loading } = useAuth();
  return <output>{loading ? "Loading" : (user?.id ?? "Signed Out")}</output>;
}
function pending() {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
afterEach(() => {
  cleanup();
  api.session.mockReset();
  api.unsubscribe.mockReset();
  api.callback = null;
});
it.each([false, true])(
  "a current auth event wins over a late initial read (failure %s)",
  async (failure) => {
    const old = pending();
    api.session.mockReturnValue(old.promise);
    render(<Probe />);
    act(() => api.callback("SIGNED_IN", { user: { id: "Current User" } }));
    expect(screen.getByText("Current User")).toBeTruthy();
    await act(async () => {
      failure
        ? old.reject(new Error("Private auth detail"))
        : old.resolve({ data: { session: { user: { id: "Old User" } } } });
    });
    expect(screen.queryByText("Old User")).toBeNull();
    expect(screen.getByText("Current User")).toBeTruthy();
  },
);
it("sign-out cannot be reversed by a late session snapshot", async () => {
  const old = pending();
  api.session.mockReturnValue(old.promise);
  render(<Probe />);
  act(() => api.callback("SIGNED_OUT", null));
  await act(async () => old.resolve({ data: { session: { user: { id: "Old User" } } } }));
  expect(screen.getByText("Signed Out")).toBeTruthy();
});
it("unmounted auth observers ignore late completion and unsubscribe", async () => {
  const old = pending();
  api.session.mockReturnValue(old.promise);
  const view = render(<Probe />);
  view.unmount();
  await act(async () => old.reject(new Error("Late error")));
  expect(api.unsubscribe).toHaveBeenCalledOnce();
  expect(document.body.textContent).toBe("");
});
it("an initial failed read finishes loading without leaking its details", async () => {
  api.session.mockRejectedValue(new Error("Private auth detail"));
  render(<Probe />);
  await screen.findByText("Signed Out");
  expect(document.body.textContent).not.toContain("Private auth detail");
});
