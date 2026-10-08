import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportV2Sections } from "../../src/components/pathway/ReportV2Sections";
import { reportWebDestination, reportFollowUpRole } from "../../src/lib/report-match-details";
import { projectSharedReport } from "../../src/lib/shared-report-projection";
import { richerSharedFixture } from "../fixtures/shared-report";
function fixture() {
  const base = richerSharedFixture();
  return { ...base,
    resource_matches: [{ ...base.resource_matches[0], url: "https://example.org/resource", owner_role: "school_team" }],
    partner_matches: [{ ...base.partner_matches[0], url: "https://example.org/program", organization: "Fictional Provider", owner_role: "outside_provider" }],
  };
}
for (const audience of ["student", "family", "educator"] as const) {
  it(`${audience} displays recorded resource/partner links and follow-up roles`, () => {
    const html = renderToStaticMarkup(<ReportV2Sections content={fixture()} audience={audience} studentName="Maya" />);
    expect(html).toContain('href="https://example.org/resource"');
    expect(html).toContain('href="https://example.org/program"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Open Resource: Explore a supported visit"');
    expect(html).toContain('aria-label="Open Program or Opportunity: Explore a supported visit"');
    expect(html).toContain("School Team");
    expect(html).toContain("Outside Provider");
  });
}
for (const audience of ["family", "educator"] as const) {
  it(`${audience} sharing retains usable destinations and roles without private record fields`, () => {
    const original = fixture();
    const before = structuredClone(original);
    const projected = projectSharedReport(original, audience);
    expect(projected).not.toBeNull();
    const html = renderToStaticMarkup(<ReportV2Sections content={projected} audience={audience} studentName="this student" />);
    expect(html).toContain('href="https://example.org/program"');
    expect(html).toContain('href="https://example.org/resource"');
    expect(html).toContain("Outside Provider");
    expect(html).toContain("School Team");
    expect(JSON.stringify(projected)).not.toMatch(/a1111111|private-answer-key|opportunity_id|partner_id|resource_id|source_doc_ids/);
    expect(original).toEqual(before);
  });
}
it("does not activate missing, malformed or non-web destinations", () => {
  for (const value of [undefined, "", "javascript:alert(1)", "data:text/html,example", "/missing-tool", "not a url", "https://user:secret@example.org/", "https://example.org/\nprivate"]) expect(reportWebDestination(value)).toBeUndefined();
  expect(reportWebDestination(" https://example.org/a?b=1#section ")).toBe("https://example.org/a?b=1#section");
  expect(reportWebDestination("http://example.org/guide")).toBe("http://example.org/guide");
});
it("omits unavailable roles/links without guessing replacements", () => {
  const base = fixture();
  const content = { ...base, resource_matches: [{ ...base.resource_matches[0], url: "javascript:alert(1)", owner_role: undefined }], partner_matches: [{ ...base.partner_matches[0], url: undefined, owner_role: undefined }] };
  const html = renderToStaticMarkup(<ReportV2Sections content={content} audience="family" studentName="Maya" />);
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("Who Can Help:");
  expect(html).not.toContain('aria-label="Open Resource:');
  expect(html).not.toContain('aria-label="Open Program or Opportunity:');
  expect(reportFollowUpRole("unrecorded")).toBeUndefined();
});
it("shared projections drop unsafe URLs rather than returning active links", () => {
  const base = fixture();
  base.resource_matches[0].url = "javascript:alert(1)";
  base.partner_matches[0].url = "data:text/html,example";
  for (const audience of ["family", "educator"] as const) {
    const projected = projectSharedReport(base, audience);
    expect(projected).not.toBeNull();
    expect(JSON.stringify(projected)).not.toMatch(/javascript:|data:text/);
  }
});

for (const audience of ["student", "family", "educator"] as const) {
  it(`${audience} IEP summary does not infer that its source is the latest plan`, () => {
    const report = fixture();
    const html = renderToStaticMarkup(<ReportV2Sections content={report} audience={audience} studentName="Maya" />);
    expect(html).toContain("This summary reflects information recorded in this report.");
    expect(html).not.toContain("most recent IEP");
    const caveat = "This summary uses an earlier uploaded plan; team review is pending.";
    const changed = { ...report, iep_plan_summary: { ...report.iep_plan_summary, caveats: caveat } };
    const withCaveat = renderToStaticMarkup(<ReportV2Sections content={changed} audience={audience} studentName="Maya" />);
    expect(withCaveat).toContain(caveat);
    expect(withCaveat).not.toContain("This summary reflects information recorded in this report.");
  });
}
for (const audience of ["family", "educator"] as const) {
  it(`${audience} shared IEP summary preserves the source caveat`, () => {
    const base = fixture();
    const caveat = "The source plan needs a current team review.";
    const report = { ...base, iep_plan_summary: { ...base.iep_plan_summary, caveats: caveat } };
    const projected = projectSharedReport(report, audience);
    expect(projected).not.toBeNull();
    const html = renderToStaticMarkup(<ReportV2Sections content={projected} audience={audience} studentName="this student" />);
    expect(html).toContain(caveat);
    expect(html).not.toContain("most recent IEP");
  });
}
