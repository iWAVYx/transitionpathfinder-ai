import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportReadinessRow, ReadinessBadge } from "../../src/components/documents/ReportReadinessRow";

it("renders a recorded band without invented scores, evidence or actions", () => {
  const html = renderToStaticMarkup(<ReportReadinessRow title="Career Exploration" level="emerging" />);
  expect(html).toContain("Career Exploration");
  expect(html).toContain("Emerging");
  expect(html).not.toContain("progressbar");
  expect(html).not.toContain("%");
  expect(html).not.toContain("Growth step");
});
it("retains the caller's evidence and next steps verbatim", () => {
  const html = renderToStaticMarkup(<ReportReadinessRow title="Daily Living" level="developing"><p>Observation: used a checklist on May 4.</p><p>Next step: practice with the team.</p></ReportReadinessRow>);
  expect(html).toContain("Observation: used a checklist on May 4.");
  expect(html).toContain("Next step: practice with the team.");
});
it("labels approaching independence without turning it into Ready", () => {
  const html = renderToStaticMarkup(<ReadinessBadge level="approaching_independence" />);
  expect(html).toContain("Approaching Independence");
  expect(html).not.toContain(">Ready<");
});
