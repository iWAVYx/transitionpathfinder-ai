import { expect, it } from "vitest";
import { reportOverviewContent } from "../../src/lib/report-overview-content";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { richerSharedFixture } from "../fixtures/shared-report";
const older = {
  summary: "Earlier summary", strengths_snapshot: ["Earlier strength"],
  recommended_pathways: [{ title: "Earlier option", why_it_fits: "Earlier explanation" },
    { type: "best-fit", title: "Earlier best fit", why_it_fits: "Earlier best-fit explanation" }],
};
it("preserves recorded legacy overview and best-fit ordering", () => {
  expect(reportOverviewContent(older, "family", false)).toEqual({
    summary: older.summary, strengths: older.strengths_snapshot,
    direction: { label: "Best-Fit Direction", title: "Earlier best fit", explanation: "Earlier best-fit explanation" },
  });
});
it.each(["student", "family", "educator"] as const)("uses newer %s sources without promoting retained legacy content", audience => {
  const r = { ...older, plain_language_summary: "Current plain summary", professional_summary: "Current team summary",
    spin: { strengths: ["  Current strength  ", "Second", "Third", "Fourth"] },
    employment_pathway_recs: [{ title: "Current option", why: "Current explanation" }] };
  const before = structuredClone(r);
  expect(reportOverviewContent(r, audience, true)).toEqual({
    summary: audience === "educator" ? "Current team summary" : "Current plain summary",
    strengths: ["  Current strength  ", "Second", "Third"],
  });
  expect(r).toEqual(before);
});
it("explains absent newer overview data instead of using an older summary, strengths or ranking", () => {
  expect(reportOverviewContent({ ...older, plain_language_summary: "  ", spin: null }, "student", true)).toEqual({
    summary: "An updated overview is not available. Review the detailed sections with your team.", strengths: [],
  });
});
it("uses the other recorded newer summary when the preferred summary is empty", () => {
  expect(reportOverviewContent({ professional_summary: "Recorded team summary" }, "family", true).summary).toBe("Recorded team summary");
  expect(reportOverviewContent({ plain_language_summary: "Recorded plain summary", professional_summary: " " }, "educator", true).summary).toBe("Recorded plain summary");
});
it.each(["family", "educator"] as const)("uses permitted projected newer overview fields for shared %s", audience => {
  const original = richerSharedFixture();
  const projected = projectSharedReport(original, audience);
  expect(projected).not.toBeNull();
  expect(reportOverviewContent(projected, audience, true)).toEqual(reportOverviewContent(original, audience, true));
});
