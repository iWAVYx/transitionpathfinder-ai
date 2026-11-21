// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ReportExpandableDetails } from "@/components/documents/ReportExpandableDetails";
import { RecommendationCard } from "@/components/pathway/RecommendationCard";
import { PathwayReport } from "@/components/demo/PathwayReport";
import { getDemoProfile } from "@/lib/demo/demo-profiles";
afterEach(cleanup);
it.each(["student", "family", "educator"] as const)("%s shares accessible details without removing print content", audience => {
  const { container } = render(<ReportExpandableDetails kind="recommendation" audience={audience}>Complete recorded details</ReportExpandableDetails>);
  const button = screen.getByRole("button"); const panel = container.querySelector('[data-report-expandable-details]')!;
  expect(button.getAttribute("aria-controls")).toBe(panel.id); expect(button.getAttribute("aria-expanded")).toBe(String(audience === "educator"));
  expect(button.textContent).toBe(audience === "educator" ? "Hide Details" : "Show Details");
  expect(panel.textContent).toBe("Complete recorded details");
  if (audience !== "educator") expect(panel.className).toContain("hidden print:block");
  fireEvent.click(button); expect(button.getAttribute("aria-expanded")).toBe(String(audience !== "educator"));
});
it("switching report audiences applies the new perspective's default", () => {
  const view = render(<ReportExpandableDetails kind="demo-option" audience="family">Recorded guidance</ReportExpandableDetails>);
  view.rerender(<ReportExpandableDetails kind="demo-option" audience="educator">Recorded guidance</ReportExpandableDetails>);
  expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("true");
  view.rerender(<ReportExpandableDetails kind="demo-option" audience="student">Recorded guidance</ReportExpandableDetails>);
  expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe("false");
});
it.each(["student", "family", "educator"] as const)("actual and age-aware %s choices retain their own complete fields", audience => {
  const profile = getDemoProfile("sam");
  const demo = render(<PathwayReport profile={profile} audience={audience} />);
  const cards = demo.container.querySelectorAll('[data-demo-pathway-option]'); expect(cards.length).toBeGreaterThan(0);
  for (const card of cards) {
    expect(card.querySelector("button")?.getAttribute("aria-expanded")).toBe(String(audience === "educator"));
    expect(card.querySelectorAll("dd")).toHaveLength(3);
    expect(card.querySelector('[data-demo-option-details]')?.textContent).toContain("Ahead");
  }
  demo.unmount();
  const rec = { title: "Explore a supported visit", summary: "Recorded summary", why: "Recorded fit", next_action: "Recorded next action", owner_role: "family" as const, discuss_at_next_meeting: true, sources: [] };
  const actual = render(<RecommendationCard rec={rec} audience={audience} />);
  expect(screen.getByRole("button").getAttribute("aria-expanded")).toBe(String(audience === "educator"));
  for (const value of [rec.summary, rec.why, rec.next_action]) expect(actual.container.textContent).toContain(value);
  expect(actual.container.querySelector('[data-report-recommendation-field="owner"]')?.textContent).toContain("Family");
});
