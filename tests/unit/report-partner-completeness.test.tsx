// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.fetch }));
vi.mock("@/lib/partner-matching.functions", () => ({ matchPartnersForStudent: {} }));
import { ReportPartnerSuggestions } from "../../src/components/pathway/ReportPartnerSuggestions";
afterEach(() => { cleanup(); mocks.fetch.mockReset(); });
it("retains all returned partner reasons and cautions without clipping descriptions", async () => {
  const reasons = Array.from({ length: 6 }, (_, i) => `Recorded fit reason ${i + 1}`);
  const conflicts = Array.from({ length: 5 }, (_, i) => `Recorded caution ${i + 1}`);
  const description = "Complete supplied description " + "with important support details. ".repeat(20);
  mocks.fetch.mockResolvedValue({ matches: [{
    partner_id: "fictional-partner", organization_name: "Fictional Organization", description,
    reasons: [], explanation: { confidence: "medium", reasons, conflicts },
    suggested_next_step: "Check the current supports with the provider.",
  }] });
  const { container } = render(<ReportPartnerSuggestions studentId="fictional-student" />);
  await screen.findByText("Fictional Organization");
  for (const text of [...reasons, ...conflicts]) expect(screen.getByText(text)).toBeTruthy();
  expect(container.textContent).toContain(description);
  expect(container.querySelector('[class*="line-clamp"]')).toBeNull();
  expect(screen.getByText("Check the current supports with the provider.")).toBeTruthy();
  expect(mocks.fetch).toHaveBeenCalledWith({ data: { student_id: "fictional-student", limit: 6 } });
});

const partner = (name: string) => ({ partner_id: name, organization_name: name, description: "Recorded description", reasons: [],
  explanation: { confidence: "medium", reasons: ["Recorded interest"], conflicts: ["Confirm support availability"] }, suggested_next_step: "Confirm eligibility" });
it("hides a previous student's partner content and links while the next student's matches load", async () => {
  let finishNext!: (value: unknown) => void;
  mocks.fetch.mockResolvedValueOnce({ matches: [{ ...partner("Previous Partner"), website_url: "https://example.org/previous" }] })
    .mockReturnValueOnce(new Promise(resolve => { finishNext = resolve; }));
  const view = render(<ReportPartnerSuggestions studentId="first" />); await screen.findByText("Previous Partner");
  view.rerender(<ReportPartnerSuggestions studentId="second" />);
  expect(screen.queryByText("Previous Partner")).toBeNull(); expect(screen.queryByRole("link", { name: /Visit organization website/ })).toBeNull();
  expect(screen.getByText(/Finding partner matches/)).toBeTruthy();
  await act(async () => { finishNext({ matches: [partner("Current Partner")] }); });
  expect(screen.getByText("Current Partner")).toBeTruthy();
});
it.each([false, true])("ignores the old student's late result (failure=%s)", async failure => {
  let finishOld!: (value: unknown) => void; let failOld!: (error: Error) => void;
  mocks.fetch.mockReturnValueOnce(new Promise((resolve, reject) => { finishOld = resolve; failOld = reject; }))
    .mockResolvedValueOnce({ matches: [partner("Current Partner")] });
  const view = render(<ReportPartnerSuggestions studentId="first" />); view.rerender(<ReportPartnerSuggestions studentId="second" />);
  await screen.findByText("Current Partner");
  await act(async () => { if (failure) failOld(new Error("Old request failed")); else finishOld({ matches: [partner("Outdated Partner")] }); });
  expect(screen.getByText("Current Partner")).toBeTruthy(); expect(screen.queryByText("Outdated Partner")).toBeNull();
  expect(screen.queryByText(/couldn't reach the partner network/)).toBeNull();
});
it("does not carry a network error into a different student's empty result", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValueOnce({ matches: [] });
  const view = render(<ReportPartnerSuggestions studentId="first" />); await screen.findByText(/couldn't reach the partner network/);
  view.rerender(<ReportPartnerSuggestions studentId="second" />); await screen.findByText(/No partner matches yet/);
  expect(screen.queryByText(/couldn't reach the partner network/)).toBeNull();
});
it("removing the linked student hides matches and does not request new ones", async () => {
  mocks.fetch.mockResolvedValue({ matches: [partner("Previous Partner")] });
  const view = render(<ReportPartnerSuggestions studentId="first" />); await screen.findByText("Previous Partner");
  view.rerender(<ReportPartnerSuggestions />);
  expect(screen.queryByText("Previous Partner")).toBeNull(); expect(screen.getByText(/Link this report to a student profile/)).toBeTruthy();
  expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
