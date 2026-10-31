// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
const api = vi.hoisted(() => ({
  session: vi.fn(),
  callback: null as any,
  unsubscribe: vi.fn(),
  onSubscribe: null as null | ((callback: any) => void),
  signOut: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: api.session,
      onAuthStateChange: (callback: any) => {
        api.callback = callback;
        api.onSubscribe?.(callback);
        return { data: { subscription: { unsubscribe: api.unsubscribe } } };
      },
      signOut: api.signOut,
    },
  },
}));
import { useAuth } from "@/hooks/use-auth";
function Probe() {
  const { user, session, loading } = useAuth();
  return (
    <output data-session-id={session?.user?.id ?? "none"}>
      {loading ? "Loading" : (user?.id ?? "Signed Out")}
    </output>
  );
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
  api.onSubscribe = null;
  api.signOut.mockReset();
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

it("a synchronous subscription event wins over the initial session snapshot", async () => {
  api.onSubscribe = (callback) => callback("SIGNED_IN", { user: { id: "Event User" } });
  api.session.mockResolvedValue({ data: { session: { user: { id: "Old User" } } } });
  render(<Probe />);
  await act(async () => {});
  expect(screen.getByText("Event User").getAttribute("data-session-id")).toBe("Event User");
  expect(screen.queryByText("Old User")).toBeNull();
});
it("a resolved session error cannot expose the accompanying session", async () => {
  api.session.mockResolvedValue({
    data: { session: { user: { id: "Untrusted User" } } },
    error: new Error("Private session failure"),
  });
  render(<Probe />);
  const output = await screen.findByText("Signed Out");
  expect(output.getAttribute("data-session-id")).toBe("none");
  expect(document.body.textContent).not.toContain("Private session failure");
});
it.each([
  undefined,
  {},
  { data: null },
  { data: { session: {} } },
  { data: { session: { user: null } } },
  { data: { session: { user: { id: "" } } } },
  { data: { session: { user: { id: "   " } } } },
  { data: { session: { user: { id: 123 } } } },
])("malformed initial session data finishes without an identity %#", async (response) => {
  api.session.mockResolvedValue(response);
  render(<Probe />);
  expect((await screen.findByText("Signed Out")).getAttribute("data-session-id")).toBe("none");
});
it("a synchronous session read failure finishes loading", async () => {
  api.session.mockImplementation(() => {
    throw new Error("Private session detail");
  });
  render(<Probe />);
  await screen.findByText("Signed Out");
  expect(document.body.textContent).not.toContain("Private session detail");
});
it.each([null, {}, { user: {} }, { user: { id: "" } }, { user: { id: 5 } }])(
  "invalid or signed-out auth events clear both user and session %#",
  async (session) => {
    api.session.mockResolvedValue({ data: { session: { user: { id: "First" } } } });
    render(<Probe />);
    await screen.findByText("First");
    act(() => api.callback("USER_UPDATED", session));
    expect(screen.getByText("Signed Out").getAttribute("data-session-id")).toBe("none");
  },
);
it("account updates keep the exposed user and session together", async () => {
  api.session.mockResolvedValue({ data: { session: { user: { id: "First" } } } });
  render(<Probe />);
  await screen.findByText("First");
  for (const event of ["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "MFA_CHALLENGE_VERIFIED"]) {
    act(() => api.callback(event, { user: { id: event } }));
    expect(screen.getByText(event).getAttribute("data-session-id")).toBe(event);
  }
});
it("an event callback retained after unmount cannot restore auth state", async () => {
  api.session.mockResolvedValue({ data: { session: null } });
  const view = render(<Probe />);
  await screen.findByText("Signed Out");
  const old = api.callback;
  view.unmount();
  act(() => old("SIGNED_IN", { user: { id: "Departed" } }));
  expect(document.body.textContent).toBe("");
  expect(api.unsubscribe).toHaveBeenCalledOnce();
});
