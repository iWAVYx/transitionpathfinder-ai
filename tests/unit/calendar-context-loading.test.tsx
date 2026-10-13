// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), remove: vi.fn(), update: vi.fn(), orgs: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: api.list, createCalendarEvent: api.create, deleteCalendarEvent: api.remove, updateCalendarEvent: api.update, listMyCalendarOrganizations: api.orgs }));
vi.mock("sonner", () => ({ toast: { success: api.success, error: api.error } }));
vi.mock("@/components/ui/popover", () => ({ Popover: ({ children }: any) => children, PopoverTrigger: ({ children }: any) => children, PopoverContent: ({ children }: any) => <div>{children}</div> }));
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
function deferred() { let resolve!: (value: any) => void; let reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const record = (title: string) => ({ id: "cal-event", title, detail: "Recorded event", event_date: "2030-12-31", kind: "personal", all_day: true, start_time: null, end_time: null, is_mine: true, event_status: "scheduled" });
const calendar = (id: string) => <DashboardCalendar studentId={id} organizationOptions={[]} />;
afterEach(() => { cleanup(); vi.restoreAllMocks(); Object.values(api).forEach(fn => fn.mockReset()); });
it.each([false, true])("a prior student load cannot replace the new calendar or show stale errors (failure=%s)", async failure => {
  const old = deferred(); const current = deferred();
  api.list.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(calendar("student-a"));
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(1));
  view.rerender(calendar("student-b"));
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  await act(async () => failure ? old.reject(new Error("Obsolete load")) : old.resolve({ events: [record("Old Student Event")] }));
  expect(screen.queryByText("Old Student Event")).toBeNull();
  expect(screen.getByRole("button", { name: "Export calendar as .ics file" }).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("Loading calendar…")).toBeTruthy();
  expect(api.error).not.toHaveBeenCalled();
  await act(async () => current.resolve({ events: [record("Current Student Event")] }));
  expect(screen.getAllByText("Current Student Event").length).toBeGreaterThan(0);
  expect(api.list.mock.calls[1][0]).toEqual({ data: { student_id: "student-b" } });
});
it("a student switch immediately removes loaded rows and old event controls while the next load is pending", async () => {
  const next = deferred(); api.list.mockResolvedValueOnce({ events: [record("Old Student Event")] }).mockReturnValueOnce(next.promise);
  const view = render(calendar("student-a")); await screen.findByRole("button", { name: "Mark Old Student Event complete" });
  view.rerender(calendar("student-b"));
  expect(screen.queryByText("Old Student Event")).toBeNull(); expect(screen.queryByRole("button", { name: "Delete event" })).toBeNull();
  expect(screen.getByRole("button", { name: "Export calendar as .ics file" }).hasAttribute("disabled")).toBe(true);
  await act(async () => next.resolve({ events: [] }));
});
it.each([false, true])("a load completed after departure has no notifications (failure=%s)", async failure => {
  const pending = deferred(); api.list.mockReturnValue(pending.promise);
  const view = render(calendar("student-a")); await waitFor(() => expect(api.list).toHaveBeenCalledOnce()); view.unmount();
  await act(async () => failure ? pending.reject(new Error("Late error")) : pending.resolve({ events: [record("Departed Event")] }));
  expect(api.error).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});
it.each([false, true])("only the latest same-context load commits under effect replay (failure=%s)", async failure => {
  const old = deferred(); api.list.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ events: [record("Latest Event")] });
  render(<StrictMode>{calendar("student-a")}</StrictMode>);
  await screen.findByRole("button", { name: "Mark Latest Event complete" });
  await act(async () => failure ? old.reject(new Error("Superseded error")) : old.resolve({ events: [record("Obsolete Event")] }));
  expect(screen.queryByText("Obsolete Event")).toBeNull(); expect(screen.getAllByText("Latest Event").length).toBeGreaterThan(0); expect(api.error).not.toHaveBeenCalled();
});
for (const operation of ["delete", "complete", "create"] as const) it.each([false, true])(`${operation} completion after a student switch cannot notify or reload the departed calendar (failure=%s)`, async failure => {
  const pending = deferred(); api.list.mockResolvedValue({ events: [record("Recorded Event")] });
  const mutation = operation === "delete" ? api.remove : operation === "complete" ? api.update : api.create;
  mutation.mockReturnValueOnce(pending.promise);
  const view = render(calendar("student-a")); await screen.findByRole("button", { name: "Mark Recorded Event complete" });
  if (operation === "create") { fireEvent.change(screen.getByLabelText("Title"), { target: { value: "New Event" } }); fireEvent.click(screen.getByRole("button", { name: "Add to calendar", exact: true })); }
  else fireEvent.click(screen.getByRole("button", { name: operation === "delete" ? "Delete event" : "Mark Recorded Event complete" }));
  await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
  view.rerender(calendar("student-b")); await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  await act(async () => failure ? pending.reject(new Error("Departed mutation")) : pending.resolve({}));
  expect(api.list).toHaveBeenCalledTimes(2); expect(api.error).not.toHaveBeenCalled(); expect(api.success).not.toHaveBeenCalled();
});
