// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { dashboardTileHrefs, duplicateDashboardLinks } from "../e2e/helpers/dashboard-links";
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ width: 100, height: 30 } as DOMRect);
});
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });
function duplicates(html: string) {
  document.body.innerHTML = `<main>${html}</main>`;
  return duplicateDashboardLinks(document.querySelector("main")!);
}
it("permits a breadcrumb, role tab and feature card to share a destination", () => {
  expect(duplicates('<nav><a href="/school/overview">Dashboard</a></nav><nav><a href="/school/overview">Overview</a><a href="/school/team">Team</a></nav><a href="/school/team">Manage Staff</a>')).toEqual([]);
});
it("rejects duplicate content actions even if a navigation shortcut also exists", () => {
  expect(duplicates('<nav><a href="/school/team">Team</a></nav><a href="/school/team">Manage Staff</a><a href="/school/team">Staff Again</a>')).toEqual([{ region: "content", href: "/school/team", count: 2 }]);
});
it("rejects duplicate links inside the same navigation region", () => {
  expect(duplicates('<nav><a href="/district/reports">Reports</a><a href="/district/reports">Reports Again</a></nav>')).toEqual([{ region: "navigation 1", href: "/district/reports", count: 2 }]);
});
it("does not count hidden or external links", () => {
  expect(duplicates('<a href="/calendar">Calendar</a><a style="display:none" href="/calendar">Hidden</a><a href="https://example.org">External</a><a href="https://example.org">External Again</a>')).toEqual([]);
});

it("probes the exact organization/filter/hash context and only deduplicates identical links", () => {
  document.body.innerHTML = `<main><a href="/district/reports?district_id=sample#coverage">Reports</a><a href="/district/reports?district_id=sample#coverage">Reports Again</a><a href="/district/reports?district_id=other">Other District</a><a href="//external.test/path">External</a></main>`;
  expect(dashboardTileHrefs(document.querySelector("main")!)).toEqual(["/district/reports?district_id=sample#coverage", "/district/reports?district_id=other"]);
});
