// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ translate: vi.fn(), suggest: vi.fn(), success: vi.fn(), error: vi.fn(), auth: { user: { id: "viewer-a" } as { id: string } | null, loading: false } }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => mocks.auth }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/ai-assist.functions", () => ({
  translateReport: mocks.translate, suggestNextSteps: mocks.suggest,
  SUPPORTED_LANGUAGES: [{ value: "spanish", label: "Spanish" }],
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
import { AiAssistPanel } from "../../src/components/pathway/AiAssistPanel";
import type { PathwayReport } from "../../src/lib/pathway.functions";
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.auth = { user: { id: "viewer-a" }, loading: false }; });
function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { resolve, reject, promise };
}
const first = { summary: "First report" } as PathwayReport;
const second = { summary: "Second report" } as PathwayReport;
const next = (text: string) => ({ next_steps: { this_week: [text], this_month: [], conversation_starters: [], watch_for: [] } });
function panel(report: PathwayReport, translated = vi.fn(), name = "Maya") {
  return <AiAssistPanel report={report} studentName={name} onTranslated={translated} onReset={vi.fn()} translatedTo={null} />;
}
it("ignores an old translation and enables translation for the new report", async () => {
  const old = deferred(), current = deferred(), translated = vi.fn();
  mocks.translate.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(panel(first, translated));
  fireEvent.click(screen.getByRole("button", { name: "Translate", exact: true }));
  view.rerender(panel(second, translated));
  expect((screen.getByRole("button", { name: "Translate", exact: true }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Translate", exact: true }));
  await act(async () => current.resolve({ report: second, language: "spanish" }));
  await act(async () => old.resolve({ report: first, language: "spanish" }));
  expect(translated).toHaveBeenCalledExactlyOnceWith(second, "spanish");
  expect(mocks.success).toHaveBeenCalledTimes(1);
});
it("removes completed suggestions on report change and ignores a stale refresh result", async () => {
  const old = deferred(), current = deferred();
  mocks.suggest.mockResolvedValueOnce(next("First suggestion")).mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const view = render(panel(first));
  fireEvent.click(screen.getByRole("button", { name: "Suggest next steps" }));
  expect(await screen.findByText("First suggestion")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Refresh suggestions" }));
  view.rerender(panel(second));
  expect(screen.queryByText("First suggestion")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Suggest next steps" }));
  await act(async () => current.resolve(next("Current suggestion")));
  await act(async () => old.resolve(next("Outdated suggestion")));
  expect(screen.getByText("Current suggestion")).toBeTruthy();
  expect(screen.queryByText("Outdated suggestion")).toBeNull();
});
it("ignores late request errors after leaving the report", async () => {
  const translation = deferred(), suggestions = deferred();
  mocks.translate.mockReturnValueOnce(translation.promise); mocks.suggest.mockReturnValueOnce(suggestions.promise);
  const view = render(panel(first));
  fireEvent.click(screen.getByRole("button", { name: "Translate", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "Suggest next steps" }));
  view.unmount();
  await act(async () => { translation.reject(new Error("Old translation error")); suggestions.reject(new Error("Old suggestion error")); });
  expect(mocks.error).not.toHaveBeenCalled();
});
it("keeps current request errors visible and permits retry", async () => {
  mocks.translate.mockRejectedValue(new Error("Try again"));
  render(panel(first));
  fireEvent.click(screen.getByRole("button", { name: "Translate", exact: true }));
  await act(async () => {});
  expect(mocks.error).toHaveBeenCalledWith("Try again");
  expect((screen.getByRole("button", { name: "Translate", exact: true }) as HTMLButtonElement).disabled).toBe(false);
});

it("clears results for a viewer change and ignores the departed translation", async () => {
  const old = deferred(), translated = vi.fn(); mocks.translate.mockReturnValueOnce(old.promise); mocks.suggest.mockResolvedValueOnce(next("Private earlier suggestion"));
  const view = render(panel(first, translated));
  fireEvent.click(screen.getByRole("button", { name: "Suggest next steps", exact: true })); await screen.findByText("Private earlier suggestion");
  fireEvent.click(screen.getByRole("button", { name: "Translate", exact: true }));
  mocks.auth.user = { id: "viewer-b" }; view.rerender(panel(first, translated));
  expect(screen.queryByText("Private earlier suggestion")).toBeNull();
  await act(async () => old.resolve({ report: first, language: "spanish" })); expect(translated).not.toHaveBeenCalled(); expect(mocks.success).not.toHaveBeenCalled();
});
it("sends current viewer intent for both assistance actions and hides controls during auth changes", async () => {
  mocks.translate.mockReturnValue(deferred().promise); mocks.suggest.mockReturnValue(deferred().promise);
  const view = render(panel(first)); fireEvent.click(screen.getByRole("button", { name: "Translate", exact: true })); fireEvent.click(screen.getByRole("button", { name: "Suggest next steps", exact: true }));
  expect(mocks.translate).toHaveBeenCalledWith({ data: { report: first, language: "spanish", expected_viewer_id: "viewer-a" } });
  expect(mocks.suggest).toHaveBeenCalledWith({ data: { report: first, student_first_name: "Maya", expected_viewer_id: "viewer-a" } });
  mocks.auth.loading = true; view.rerender(panel(first)); expect(screen.queryByRole("button", { name: "Translate", exact: true })).toBeNull();
  mocks.auth = { user: null, loading: false }; view.rerender(panel(first)); expect(screen.queryByText("Pathway Assist")).toBeNull();
});
