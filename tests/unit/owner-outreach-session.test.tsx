// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({
  viewer: "viewer-a" as string | null,
  loading: false,
  list: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: any) => options }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: api.viewer ? { id: api.viewer } : null, loading: api.loading }),
}));
vi.mock("@/components/owner/OwnerShell", () => ({
  OwnerShell: ({ title, description, actions, children }: any) => (
    <main>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
      {children}
    </main>
  ),
}));
vi.mock("@/lib/validation/validation.functions", () => ({
  listOutreach: api.list,
  upsertOutreach: api.save,
  deleteOutreach: api.remove,
}));
vi.mock("sonner", () => ({ toast: { error: api.toast } }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, disabled, children }: any) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));
import { Route } from "@/routes/_authenticated/owner.outreach";
const Page = (Route as any).component,
  id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222",
  date = "2026-10-15T00:00:00Z";
function row(patch: any = {}) {
  return {
    id,
    contact_name: "Recorded Contact",
    organization: null,
    role_type: null,
    email: null,
    phone: null,
    relationship_notes: null,
    notes: null,
    outreach_status: "not_contacted",
    last_contacted_at: null,
    next_follow_up_at: null,
    created_at: date,
    updated_at: date,
    ...patch,
  };
}
function deferred() {
  let resolve!: (v: any) => void, reject!: (v: any) => void;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  api.viewer = "viewer-a";
  api.loading = false;
  vi.clearAllMocks();
  api.list.mockReset().mockResolvedValue({ rows: [] });
  api.save.mockReset().mockResolvedValue({ row: row() });
  api.remove.mockReset().mockResolvedValue({ ok: true, id });
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function ready() {
  await screen.findByText("No outreach contacts.");
}
async function prepare() {
  const view = render(<Page />);
  await ready();
  fireEvent.click(screen.getByRole("button", { name: "Add contact" }));
  fireEvent.change(screen.getByPlaceholderText("Contact name"), {
    target: { value: "Recorded Contact" },
  });
  return view;
}
function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
}
describe("actual Owner outreach page with synthetic transport", () => {
  it("waits for settled auth and sends original viewer intent", async () => {
    api.loading = true;
    const view = render(<Page />);
    expect(api.list).not.toHaveBeenCalled();
    api.loading = false;
    view.rerender(<Page />);
    await ready();
    expect(api.list).toHaveBeenCalledWith({ data: { expected_viewer_id: "viewer-a" } });
  });
  it("saves a contact with no email, keeps optional blanks null and confirms the row", async () => {
    await prepare();
    save();
    await screen.findByText("Recorded Contact");
    expect(api.save).toHaveBeenCalledExactlyOnceWith({
      data: {
        contact_name: "Recorded Contact",
        organization: null,
        role_type: null,
        email: null,
        phone: null,
        notes: null,
        expected_viewer_id: "viewer-a",
      },
    });
    expect(screen.queryByPlaceholderText("Contact name")).toBeNull();
  });
  it("keeps the draft after a failed save without exposing server details", async () => {
    api.save.mockRejectedValueOnce(new Error("private record"));
    await prepare();
    save();
    await waitFor(() =>
      expect(api.toast).toHaveBeenCalledWith(expect.stringContaining("Your draft is kept")),
    );
    expect((screen.getByPlaceholderText("Contact name") as HTMLInputElement).value).toBe(
      "Recorded Contact",
    );
    expect(api.toast).not.toHaveBeenCalledWith("private record");
  });
  it("prevents duplicate saves and disables editing while saving", async () => {
    const d = deferred();
    api.save.mockReturnValueOnce(d.promise);
    await prepare();
    save();
    fireEvent.click(screen.getByRole("button", { name: "Save contact" }));
    expect(api.save).toHaveBeenCalledOnce();
    expect((screen.getByPlaceholderText("Contact name") as HTMLInputElement).disabled).toBe(true);
    await act(async () => d.resolve({ row: row() }));
    await screen.findByText("Recorded Contact");
  });
  it.each([null, row({ contact_name: "Wrong" }), row({ id: "bad" })])(
    "does not clear drafts on unconfirmed save %j",
    async (saved) => {
      api.save.mockResolvedValueOnce({ row: saved });
      await prepare();
      save();
      await waitFor(() => expect(api.toast).toHaveBeenCalled());
      expect((screen.getByPlaceholderText("Contact name") as HTMLInputElement).value).toBe(
        "Recorded Contact",
      );
    },
  );
  it("shows read failure rather than zero contacts and reloads", async () => {
    api.list.mockRejectedValueOnce(new Error("private"));
    render(<Page />);
    await screen.findByRole("button", { name: "Reload Contacts" });
    expect(screen.queryByText("No outreach contacts.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reload Contacts" }));
    await ready();
  });
  it("hides failed cached contact records after refresh", async () => {
    api.list.mockResolvedValueOnce({ rows: [row()] });
    render(<Page />);
    await screen.findByText("Recorded Contact");
    api.list.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Refresh Contacts" }));
    await screen.findByRole("button", { name: "Reload Contacts" });
    expect(screen.queryByText("Recorded Contact")).toBeNull();
  });
  it("conditionally changes only the selected status", async () => {
    api.list.mockResolvedValueOnce({ rows: [row()] });
    api.save.mockResolvedValueOnce({ row: row({ outreach_status: "interested" }) });
    render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.change(screen.getAllByRole("combobox").at(-1)!, { target: { value: "interested" } });
    await waitFor(() =>
      expect(api.save).toHaveBeenCalledExactlyOnceWith({
        data: {
          id,
          contact_name: "Recorded Contact",
          outreach_status: "interested",
          expected_updated_at: date,
          expected_viewer_id: "viewer-a",
        },
      }),
    );
  });
  it("does not remove a contact after an empty or mismatched delete response", async () => {
    api.list.mockResolvedValueOnce({ rows: [row()] });
    api.remove.mockResolvedValueOnce({ ok: true, id: other });
    render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.click(screen.getByRole("button", { name: "Delete Recorded Contact" }));
    await waitFor(() => expect(api.toast).toHaveBeenCalled());
    expect(screen.getByText("Recorded Contact")).toBeTruthy();
  });
  it("confirms exact version-scoped deletion and prevents duplicates", async () => {
    const d = deferred();
    api.list.mockResolvedValueOnce({ rows: [row()] });
    api.remove.mockReturnValueOnce(d.promise);
    render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.click(screen.getByRole("button", { name: "Delete Recorded Contact" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete Recorded Contact" }));
    expect(api.remove).toHaveBeenCalledExactlyOnceWith({
      data: { id, expected_updated_at: date, expected_viewer_id: "viewer-a" },
    });
    await act(async () => d.resolve({ ok: true, id }));
    await ready();
  });
  it.each(["success", "failure"])(
    "ignores late save %s after changing accounts",
    async (outcome) => {
      const d = deferred();
      api.save.mockReturnValueOnce(d.promise);
      const view = await prepare();
      save();
      api.viewer = "viewer-b";
      view.rerender(<Page />);
      await ready();
      await act(async () =>
        outcome === "success" ? d.resolve({ row: row() }) : d.reject(new Error("old")),
      );
      expect(screen.queryByText("Recorded Contact")).toBeNull();
      expect(api.toast).not.toHaveBeenCalled();
    },
  );
  it("ignores a departed A-to-B-to-A read", async () => {
    const d = deferred();
    api.list.mockReturnValueOnce(d.promise);
    const view = render(<Page />);
    await waitFor(() => expect(api.list).toHaveBeenCalledOnce());
    api.viewer = "viewer-b";
    view.rerender(<Page />);
    await ready();
    api.viewer = "viewer-a";
    view.rerender(<Page />);
    await ready();
    await act(async () => d.resolve({ rows: [row()] }));
    expect(screen.queryByText("Recorded Contact")).toBeNull();
  });
  it("ignores a save completed after unmount", async () => {
    const d = deferred();
    api.save.mockReturnValueOnce(d.promise);
    const view = await prepare();
    save();
    view.unmount();
    await act(async () => d.resolve({ row: row() }));
    expect(api.toast).not.toHaveBeenCalled();
  });
  it("does not save an unchanged follow-up timestamp on blur", async () => {
    const timestamp = "2026-10-15T16:30:00Z";
    api.list.mockResolvedValueOnce({ rows: [row({ next_follow_up_at: timestamp })] });
    render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.blur(screen.getByLabelText("Follow-Up for Recorded Contact"));
    expect(api.save).not.toHaveBeenCalled();
  });
  it("distinguishes empty filters from an empty contact list", async () => {
    api.list.mockResolvedValueOnce({ rows: [row()] });
    render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.change(screen.getAllByRole("combobox")[0], { target: { value: "contacted" } });
    await screen.findByText("No contacts match these filters.");
    expect(screen.queryByText("No outreach contacts.")).toBeNull();
  });
  it("serializes competing status and notes changes on one contact", async () => {
    const d = deferred();
    api.list.mockResolvedValueOnce({ rows: [row()] });
    api.save.mockReturnValueOnce(d.promise);
    render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.change(screen.getAllByRole("combobox").at(-1)!, { target: { value: "interested" } });
    const notes = screen.getByLabelText("Notes for Recorded Contact");
    fireEvent.change(notes, { target: { value: "Later notes" } });
    fireEvent.blur(notes);
    expect(api.save).toHaveBeenCalledOnce();
    expect(
      (screen.getByRole("button", { name: "Refresh Contacts" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    await act(async () => d.resolve({ row: row({ outreach_status: "interested" }) }));
  });
  it("does not acknowledge a status change after account departure", async () => {
    const d = deferred();
    api.list.mockResolvedValueOnce({ rows: [row()] });
    api.save.mockReturnValueOnce(d.promise);
    const view = render(<Page />);
    await screen.findByText("Recorded Contact");
    fireEvent.change(screen.getAllByRole("combobox").at(-1)!, { target: { value: "interested" } });
    api.viewer = "viewer-b";
    view.rerender(<Page />);
    await ready();
    await act(async () => d.resolve({ row: row({ outreach_status: "interested" }) }));
    expect(screen.queryByText("Recorded Contact")).toBeNull();
    expect(api.toast).not.toHaveBeenCalled();
  });
});
