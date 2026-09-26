import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildSchoolAdminLivePreview } from "../../src/lib/dashboard/school-admin-live-preview";
import { buildDistrictAdminLivePreview } from "../../src/lib/dashboard/district-admin-live-preview";
import type { SchoolDashboard } from "../../src/lib/school-admin.functions";
import type { DistrictDashboard } from "../../src/lib/district-admin.functions";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

const SCHOOL_HUB = read("src/routes/_authenticated/hubs.school.tsx");
const DISTRICT_HUB = read("src/routes/_authenticated/hubs.district.tsx");
const SCHOOL_GRID = read("src/components/dashboard/role/SchoolAdminOverviewGrid.tsx");
const DISTRICT_GRID = read("src/components/dashboard/role/DistrictAdminOverviewGrid.tsx");

const school: SchoolDashboard = {
  is_school_admin: true,
  orgs: [
    {
      id: "school-live",
      name: "Live School",
      type: "school",
      city: "Hartford",
      state: "CT",
      verified_status: "verified",
    },
  ],
  selected_org_id: "school-live",
  members: [],
  pending_members: [],
  students: [
    {
      id: "s1",
      first_name: "Hidden",
      preferred_name: null,
      grade_band: "Grade 11",
      owner_id: "u1",
      owner_name: "Hidden Owner",
    },
    {
      id: "s2",
      first_name: "Hidden",
      preferred_name: null,
      grade_band: "Grade 12",
      owner_id: "u2",
      owner_name: "Hidden Owner",
    },
  ],
  metrics: {
    total_members: 7,
    active_members: 5,
    pending_members: 2,
    students_count: 2,
    reports_count: 1,
    documents_count: 8,
  },
};

const district: DistrictDashboard = {
  is_district_admin: true,
  districts: [
    {
      id: "district-live",
      name: "Live District",
      city: "Hartford",
      state: "CT",
      verified_status: "verified",
    },
  ],
  selected_district_id: "district-live",
  schools: [
    {
      id: "school-live",
      name: "Live School",
      city: "Hartford",
      state: "CT",
      verified_status: "verified",
      active_members: 5,
      pending_members: 2,
      students_count: 30,
      reports_count: 20,
      open_actions: 3,
      needs_followup: true,
    },
  ],
  team: [],
  pending_team: [],
  metrics: {
    schools_count: 1,
    school_admins: 1,
    educators: 5,
    students_count: 30,
    reports_count: 20,
    pct_with_report: 67,
    pct_with_goals: 63,
    pct_with_actions: 60,
    open_actions: 3,
  },
};

describe("signed-in School and District preview alignment", () => {
  it("builds school previews from authorized aggregate data without student PII", () => {
    const preview = buildSchoolAdminLivePreview(school, "school-live");
    expect(preview?.organization.name).toBe("Live School");
    expect(preview?.details["school-overview"].stats).toEqual([
      { label: "Students", value: "2" },
      { label: "Active staff", value: "5" },
      { label: "Report records", value: "1" },
    ]);

    const serialized = JSON.stringify(preview);
    expect(serialized).not.toContain("Hidden");
    expect(serialized).not.toContain("Hidden Owner");
    expect(serialized).toContain("No resource-usage totals were returned");
  });

  it("builds district previews from aggregate school data without student-level records", () => {
    const preview = buildDistrictAdminLivePreview(district, "district-live");
    expect(preview?.district.name).toBe("Live District");
    expect(preview?.details["readiness-trend"].stats).toEqual([
      { label: "With report", value: "67%" },
      { label: "With goals", value: "63%" },
      { label: "With actions", value: "60%" },
    ]);
    expect(preview?.details["service-gaps"].rows[0]).toMatchObject({
      primary: "Live School",
      status: "warning",
    });
    const serialized = JSON.stringify(preview);
    expect(serialized).not.toMatch(/first_name|preferred_name/);
    expect(serialized).not.toContain("Hidden");
  });

  it("keeps authenticated hubs off demo fixtures and uses live next actions", () => {
    for (const hub of [SCHOOL_HUB, DISTRICT_HUB]) {
      expect(hub).not.toMatch(/DEMO_NEXT_ACTIONS|DEMO_RECENTLY_COMPLETED|demo-fixtures/);
      expect(hub).toContain("<NextActionCardServer");
    }
    expect(SCHOOL_HUB).toContain("useSchoolDashboard()");
    expect(SCHOOL_HUB).toContain("liveData={data}");
    expect(DISTRICT_HUB).toContain("useDistrictDashboard()");
    expect(DISTRICT_HUB).toContain("liveData={data}");
    expect(SCHOOL_HUB).not.toContain('status: "94% · on target"');
    expect(DISTRICT_HUB).not.toContain('status: "92% · on target"');
  });

  it("uses demo providers only in explicit sample branches", () => {
    for (const grid of [SCHOOL_GRID, DISTRICT_GRID]) {
      expect(grid).toContain("if (isSample) return");
      expect(grid).toContain("<TransitionChannelTile role=");
      expect(grid).toContain("detailOverride={activeDetail}");
      expect(grid).toContain("{isSample && openFeature && (");
    }
    expect(SCHOOL_GRID).toContain("buildSchoolAdminLivePreview");
    expect(DISTRICT_GRID).toContain("buildDistrictAdminLivePreview");
  });
});
