// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { MeetingPrepPartners } from "../../src/components/pathway/MeetingPrepPartners";

const state = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => state.fetch }));
vi.mock("@/lib/partner-matching.functions", () => ({ matchPartnersForStudent: {} }));
beforeEach(() => state.fetch.mockReset());
afterEach(cleanup);
function pending() {
  let resolve!: (value: { matches: unknown[] }) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<{ matches: unknown[] }>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const partner = (name: string) => ({ partner_id: name, organization_name: name, reasons: [], suggested_next_step: "Confirm availability", services: [] });

it("hides the previous student's suggestions immediately when the selected student changes", async () => {
  const first = pending(), second = pending();
  state.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(<MeetingPrepPartners studentId="first" meetingDate={null} />);
  await act(async () => first.resolve({ matches: [partner("First Student Partner")] }));
  expect(screen.getByText("First Student Partner")).toBeTruthy();
  view.rerender(<MeetingPrepPartners studentId="second" meetingDate={null} />);
  expect(screen.queryByText("First Student Partner")).toBeNull();
  expect(screen.getByText(/Loading partner matches/)).toBeTruthy();
  await act(async () => second.resolve({ matches: [partner("Second Student Partner")] }));
  expect(screen.getByText("Second Student Partner")).toBeTruthy();
  expect(screen.queryByText("First Student Partner")).toBeNull();
});

it("ignores an older request that completes after the current student's request", async () => {
  const first = pending(), second = pending();
  state.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(<MeetingPrepPartners studentId="first" meetingDate={null} />);
  view.rerender(<MeetingPrepPartners studentId="second" meetingDate={null} />);
  await act(async () => second.resolve({ matches: [partner("Current Partner")] }));
  await act(async () => first.resolve({ matches: [partner("Outdated Partner")] }));
  expect(screen.getByText("Current Partner")).toBeTruthy();
  expect(screen.queryByText("Outdated Partner")).toBeNull();
});

it("clears a prior network error when another student's request succeeds with no matches", async () => {
  const first = pending(), second = pending();
  state.fetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const view = render(<MeetingPrepPartners studentId="first" meetingDate={null} />);
  await act(async () => first.reject(new Error("Unavailable")));
  expect(screen.getByText(/couldn't reach the partner network/)).toBeTruthy();
  view.rerender(<MeetingPrepPartners studentId="second" meetingDate={null} />);
  expect(screen.queryByText(/couldn't reach the partner network/)).toBeNull();
  await act(async () => second.resolve({ matches: [] }));
  expect(screen.getByText(/No partner matches yet/)).toBeTruthy();
  expect(screen.queryByText(/couldn't reach the partner network/)).toBeNull();
});

it("does not fetch or expose prior matches when there is no linked student", async () => {
  const first = pending(); state.fetch.mockReturnValueOnce(first.promise);
  const view = render(<MeetingPrepPartners studentId="first" meetingDate={null} />);
  await act(async () => first.resolve({ matches: [partner("Previous Partner")] }));
  view.rerender(<MeetingPrepPartners studentId={null} meetingDate={null} />);
  expect(screen.queryByText("Previous Partner")).toBeNull();
  expect(screen.getByText(/Link this report to a student profile/)).toBeTruthy();
  expect(state.fetch).toHaveBeenCalledTimes(1);
});
