// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({
  user: { id: "a" } as { id: string } | null,
  loading: false,
  load: vi.fn(),
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: api.user, loading: api.loading }) }));
import { useCaseloadRead } from "../../src/hooks/use-caseload-read";
function Probe() {
  const { data, loading, error, reload } = useCaseloadRead(api.load, { rows: [] as string[] });
  return (
    <div>
      {loading ? (
        <p>Loading</p>
      ) : error ? (
        <p role="alert">Unavailable</p>
      ) : (
        data.rows.map((r) => <p key={r}>{r}</p>)
      )}
      <button onClick={() => void reload()}>Refresh</button>
    </div>
  );
}
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise<any>((yes) => (resolve = yes));
  return { promise, resolve };
}
beforeEach(() => {
  vi.clearAllMocks();
  api.user = { id: "a" };
  api.loading = false;
  api.load.mockResolvedValue({ rows: ["Current"] });
});
afterEach(cleanup);
it("passes viewer intent and distinguishes errors from empty success with refresh", async () => {
  api.load.mockRejectedValueOnce(Error());
  render(<Probe />);
  await screen.findByRole("alert");
  expect(api.load).toHaveBeenCalledWith({ data: { expected_viewer_id: "a" } });
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByText("Current");
  expect(screen.queryByRole("alert")).toBeNull();
});
it("older refresh cannot overwrite a newer response", async () => {
  const old = deferred();
  api.load.mockReturnValueOnce(old.promise);
  render(<Probe />);
  fireEvent.click(screen.getByText("Refresh"));
  await screen.findByText("Current");
  await act(async () => old.resolve({ rows: ["Stale"] }));
  expect(screen.queryByText("Stale")).toBeNull();
});
it("account departure hides data immediately and ignores departed replies including A-B-A", async () => {
  const old = deferred();
  api.load.mockReturnValueOnce(old.promise);
  const v = render(<Probe />);
  api.user = { id: "b" };
  v.rerender(<Probe />);
  await screen.findByText("Current");
  api.user = { id: "a" };
  v.rerender(<Probe />);
  await act(async () => old.resolve({ rows: ["Old private A"] }));
  expect(screen.queryByText("Old private A")).toBeNull();
  await screen.findByText("Current");
});
it("sign-out/auth refresh hides old records without more requests", async () => {
  const v = render(<Probe />);
  await screen.findByText("Current");
  api.loading = true;
  v.rerender(<Probe />);
  expect(screen.queryByText("Current")).toBeNull();
  api.user = null;
  api.loading = false;
  v.rerender(<Probe />);
  fireEvent.click(screen.getByText("Refresh"));
  expect(api.load).toHaveBeenCalledOnce();
});
