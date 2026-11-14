// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const api = vi.hoisted(() => ({ list: vi.fn(), create: vi.fn(), remove: vi.fn(), update: vi.fn(), orgs: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a> }));
vi.mock("@/lib/calendar.functions", () => ({ listCalendarEvents: api.list, createCalendarEvent: api.create, deleteCalendarEvent: api.remove, updateCalendarEvent: api.update, listMyCalendarOrganizations: api.orgs }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import { DashboardCalendar } from "@/components/dashboard/DashboardCalendar";
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Object.values(api).forEach(fn => fn.mockReset()); });
it("the real signed-in download control retains authorized record dates, times, location and meeting link without mutations", async () => {
  api.list.mockResolvedValue({ events: [
    { id: "day", title: "School Review Day", detail: "Recorded day", kind: "team", event_type: "review", event_date: "2030-12-31", all_day: true, start_time: null, end_time: null, location: "School Office", meeting_link: null, visibility: "school_team", is_mine: true },
    { id: "meeting", title: "Recorded Planning Meeting", detail: "Bring observations", kind: "meeting", event_type: "meeting", event_date: "2030-12-31", all_day: false, start_time: "14:15:00", end_time: "15:45:00", location: "Room 2, North", meeting_link: "https://meeting.example.test/room?id=abc", visibility: "family_team", is_mine: true },
  ] });
  let captured: Blob | undefined;
  const createObjectURL = vi.fn((blob: Blob) => { captured = blob; return "blob:calendar-fixture"; });
  const revokeObjectURL = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal("URL", class extends OriginalURL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; });
  let cleanupUrl: (() => void) | undefined;
  const originalTimeout = globalThis.setTimeout;
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: (...args: any[]) => void, delay?: number, ...args: any[]) => {
    if (delay === 2000) { cleanupUrl = () => callback(...args); return 0; }
    return originalTimeout(callback, delay, ...args);
  }) as typeof setTimeout);
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  render(<DashboardCalendar organizationOptions={[]} />);
  const exportButton = screen.getByRole("button", { name: "Export calendar as .ics file" });
  await waitFor(() => expect(exportButton.hasAttribute("disabled")).toBe(false));
  fireEvent.click(exportButton);
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(click).toHaveBeenCalledOnce();
  expect(captured?.type).toBe("text/calendar;charset=utf-8");
  const text = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsText(captured!);
  });
  expect(text).toContain("DTSTART;VALUE=DATE:20301231");
  expect(text).toContain("DTEND;VALUE=DATE:20310101");
  expect(text).toMatch(/DTSTART(?:;TZID=[^:]+)?:20301231T141500/);
  expect(text).toMatch(/DTEND(?:;TZID=[^:]+)?:20301231T154500/);
  expect(text).toContain("LOCATION:Room 2\\, North");
  expect(text).toContain("URL:https://meeting.example.test/room?id=abc");
  expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(2);
  expect(cleanupUrl).toBeDefined();
  expect(revokeObjectURL).not.toHaveBeenCalled();
  cleanupUrl!();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:calendar-fixture");
  expect(api.create).not.toHaveBeenCalled(); expect(api.update).not.toHaveBeenCalled(); expect(api.remove).not.toHaveBeenCalled();
});
