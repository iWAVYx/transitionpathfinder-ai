import { expect, it } from "vitest";
import { reportExportReady, organizationCsvCell } from "../../src/lib/organization-report-export";
const ready = { loading: false, loadedOrganization: "school-a", organization: "school-a", window: { from: null, to: null } };
it("exports only the selected loaded organization and exact period", () => {
  expect(reportExportReady(ready)).toBe(true);
  expect(reportExportReady({ ...ready, organization: "school-b" })).toBe(false);
  expect(reportExportReady({ ...ready, from: "2026-10-01T00:00:00.000Z" })).toBe(false);
  expect(reportExportReady({ ...ready, loading: true })).toBe(false);
  expect(reportExportReady({ ...ready, window: null })).toBe(false);
});
it("accepts matching one-sided and bounded periods but refuses reversed dates", () => {
  const from = "2026-10-01T00:00:00.000Z", to = "2026-10-05T23:59:59.999Z";
  expect(reportExportReady({ ...ready, from, window: { from, to: null } })).toBe(true);
  expect(reportExportReady({ ...ready, to, window: { from: null, to } })).toBe(true);
  expect(reportExportReady({ ...ready, from, to, window: { from, to } })).toBe(true);
  expect(reportExportReady({ ...ready, from: to, to: from, window: { from: to, to: from } })).toBe(false);
});
it("quotes commas, quotes and both line-ending characters", () => {
  expect(organizationCsvCell('A, B "School"')).toBe('"A, B ""School"""');
  expect(organizationCsvCell("A\rB")).toBe('"A\rB"');
  expect(organizationCsvCell("A\nB")).toBe('"A\nB"');
  expect(organizationCsvCell(null)).toBe("");
});
it.each(["=HYPERLINK(1)", "+School", "-School", "@School", "\t=School", "  =School"])("exports %s as text, not a formula", value => {
  expect(organizationCsvCell(value).startsWith("'")).toBe(true);
});
it("keeps numeric values and normal labels unchanged", () => {
  expect(organizationCsvCell(-3)).toBe("-3");
  expect(organizationCsvCell(0)).toBe("0");
  expect(organizationCsvCell("Sample School")).toBe("Sample School");
});
