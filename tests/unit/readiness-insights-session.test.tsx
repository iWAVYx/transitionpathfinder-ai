// @vitest-environment jsdom
import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ generate: vi.fn(), auth: { user: { id: "viewer-a" } as { id: string } | null, loading: false } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => api.auth }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/readiness-insights.functions", () => ({ generateReadinessInsights: api.generate }));
import { ReadinessInsightsCard } from "@/components/students/ReadinessInsightsCard";
function pending() {
  let resolve!: (value: any) => void, reject!: (reason: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const insights = (text: string) => ({ headline: text, readiness_summary: text, pillar_callouts: [], friendly_next_steps: [], encouragement: "Review together", sources: [] });
const card = (id = "student-a", compact = false) => <ReadinessInsightsCard studentId={id} studentFirstName={id} compact={compact} />;
beforeEach(() => { vi.clearAllMocks(); api.auth = { user: { id: "viewer-a" }, loading: false }; });
afterEach(cleanup);
it.each([false, true])("clears completed insights immediately when the student changes (compact %s)", async compact => {
  api.generate.mockResolvedValueOnce(insights("Earlier student summary")).mockReturnValueOnce(pending().promise);
  const view = render(card("student-a", compact));
  expect((await screen.findAllByText("Earlier student summary")).length).toBeGreaterThan(0);
  view.rerender(card("student-b", compact));
  expect(screen.queryByText("Earlier student summary")).toBeNull();
  expect(api.generate).toHaveBeenLastCalledWith({ data: { student_id: "student-b", expected_viewer_id: "viewer-a" } });
});
it.each([false, true])("ignores departed student completion (failure %s)", async failure => {
  const old = pending(), current = pending();
  api.generate.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(card()); view.rerender(card("student-b"));
  await act(async () => current.resolve(insights("Current summary")));
  await act(async () => failure ? old.reject(new Error("Private old error")) : old.resolve(insights("Private old summary")));
  expect(screen.getAllByText("Current summary").length).toBeGreaterThan(0);
  expect(screen.queryByText(/Private old/)).toBeNull();
});
it("restarts for a new viewer and hides content during sign-out/loading", async () => {
  const old = pending(); api.generate.mockReturnValueOnce(old.promise).mockResolvedValue(insights("Current viewer summary"));
  const view = render(card());
  api.auth.user = { id: "viewer-b" }; view.rerender(card());
  await act(async () => {});
  expect(api.generate).toHaveBeenLastCalledWith({ data: { student_id: "student-a", expected_viewer_id: "viewer-b" } });
  await act(async () => old.resolve(insights("Departed viewer summary")));
  expect(screen.queryByText("Departed viewer summary")).toBeNull();
  api.auth.loading = true; view.rerender(card()); expect(screen.queryByText("Current viewer summary")).toBeNull();
  api.auth = { user: null, loading: false }; view.rerender(card());
  expect(screen.getByText("Sign in to view readiness insights.")).toBeTruthy();
  expect(api.generate).toHaveBeenCalledTimes(2);
});
it("does not generate while signed out or authentication is loading", () => {
  api.auth = { user: null, loading: true }; const view = render(card());
  api.auth.loading = false; view.rerender(card()); expect(api.generate).not.toHaveBeenCalled();
});
it("keeps current failure generic and allows one explicit retry", async () => {
  api.generate.mockRejectedValueOnce(new Error("Private provider detail")).mockResolvedValueOnce(insights("Recovered"));
  render(card()); await screen.findByText("We couldn't generate readiness insights right now. Please try again.");
  expect(screen.queryByText("Private provider detail")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
  expect((await screen.findAllByText("Recovered")).length).toBeGreaterThan(0);
  expect(api.generate).toHaveBeenCalledTimes(2);
});
it("starts only one provider action during Strict Mode effect replay", async () => {
  const result = pending(); api.generate.mockReturnValue(result.promise);
  render(<StrictMode>{card()}</StrictMode>); expect(api.generate).toHaveBeenCalledTimes(1);
  await act(async () => result.resolve(insights("Ready")));
  expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
});
it("does not claim an IEP was reviewed when available sources are unknown", async () => {
  api.generate.mockResolvedValue(insights("Ready")); render(card()); await screen.findAllByText("Ready");
  expect(screen.queryByText(/from their IEP/)).toBeNull();
  expect(screen.getByText(/Based on the planning information available/)).toBeTruthy();
});

it.each([false, true])("shows unassessed areas and makes a failed refresh visible (compact %s)", async compact => {
  const result = { ...insights("Earlier suggestions"), pillar_callouts: [{ pillar: "Employment", score: null, status: "not_assessed", what_we_see: "No assessment supplied.", why_it_matters: "Confirm with your team." }] };
  api.generate.mockResolvedValueOnce(result).mockRejectedValueOnce(new Error("PRIVATE source failure"));
  render(card("student-a", compact)); await screen.findAllByText("Earlier suggestions");
  if (!compact) expect(screen.getByText("Not Assessed")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refresh", exact: true }));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent", "We couldn't refresh these insights. The earlier suggestions are still shown.");
  expect(screen.queryByText("PRIVATE source failure")).toBeNull();
  expect(screen.getAllByText("Earlier suggestions").length).toBeGreaterThan(0);
});
