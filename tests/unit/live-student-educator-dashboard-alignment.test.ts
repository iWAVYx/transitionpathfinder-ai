import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

const STUDENT_DASHBOARD = read("src/components/dashboard/StudentDashboard.tsx");
const LIVE_STUDENT = read("src/components/dashboard/LiveStudentWorkspaceOverview.tsx");
const STUDENT_HUB = read("src/routes/_authenticated/hubs.student.tsx");
const LIVE_EDUCATOR = read("src/components/dashboard/LiveEducatorWorkspaceOverview.tsx");
const EDUCATOR_DASHBOARD = read("src/routes/_authenticated/caseload.tsx");
const EDUCATOR_HUB = read("src/routes/_authenticated/hubs.caseload.tsx");
const OWNER_ROUTE = read("src/routes/_authenticated/owner.index.tsx");
const OWNER_PAGE = read("src/components/owner/OwnerDashboardPage.tsx");
const DASHBOARD_ROUTE = read("src/routes/_authenticated/dashboard.tsx");
const AUDIT = read("docs/dashboard-feature-audit.md");

const DEMO_PATTERN = /useDemo|DEMO_|@\/lib\/demo|demo-fixtures|StudentPathwaySections/;

describe("live Student dashboard alignment", () => {
  it("uses the authorized snapshot for preview-first cards and truthful empty states", () => {
    expect(STUDENT_DASHBOARD).toContain("<LiveStudentWorkspaceOverview snapshot={snap} />");
    expect(STUDENT_HUB).toContain("<LiveStudentWorkspaceLoader />");
    expect(LIVE_STUDENT).toContain("getDashboardSnapshot");
    expect(LIVE_STUDENT).toContain("listStudents");
    expect(LIVE_STUDENT).toContain('data-testid="live-student-workspace-grid"');
    expect(LIVE_STUDENT).toContain("Preview What Matters, Then Open The Full Tool");
    expect(LIVE_STUDENT).toContain("Your student workspace could not be loaded right now.");
  });

  it("keeps public demo fixtures out of every signed-in Student surface", () => {
    expect(STUDENT_DASHBOARD).not.toMatch(DEMO_PATTERN);
    expect(STUDENT_HUB).not.toMatch(DEMO_PATTERN);
    expect(LIVE_STUDENT).not.toMatch(DEMO_PATTERN);
  });

  it("keeps sensitive content outside at-a-glance previews", () => {
    expect(LIVE_STUDENT).toContain(
      "Document contents and personal information never appear in this dashboard preview.",
    );
    expect(LIVE_STUDENT).toContain("Message contents remain inside the full team-scoped channel.");
    expect(LIVE_STUDENT).toContain(
      "Partners cannot see your private documents through this directory preview.",
    );
  });

  it("keeps Student Voice and Goals navigation in the preview-first grid without legacy duplicates", () => {
    for (const previewRoute of ['to: "/student-voice"', 'to: "/goals"']) {
      expect(LIVE_STUDENT).toContain(previewRoute);
    }

    expect(STUDENT_DASHBOARD).not.toContain('to: "/student-voice"');
    expect(STUDENT_DASHBOARD).not.toContain('to="/goals"');

    // Removing duplicate navigation must not remove the live goal details or
    // the remaining grade-aware Explore tools from the signed-in dashboard.
    expect(STUDENT_DASHBOARD).toContain("snap.goals.slice(0, 5)");
    expect(STUDENT_DASHBOARD).toContain("<ExploreForStudent gradeBand={s.grade_band} />");
    expect(STUDENT_DASHBOARD).toContain('to: "/messages"');
  });
});

describe("live Educator dashboard alignment", () => {
  it("uses the role-authorized caseload on both signed-in entry points", () => {
    expect(EDUCATOR_DASHBOARD).toContain(
      "<LiveEducatorWorkspaceOverview students={rows} loading={loading} />",
    );
    expect(EDUCATOR_HUB).toContain("<LiveEducatorWorkspaceOverview />");
    expect(LIVE_EDUCATOR).toContain("getCaseload");
    expect(LIVE_EDUCATOR).toContain('data-testid="live-educator-workspace-grid"');
  });

  it("removes fictional signed-in counts and demo feature sources", () => {
    for (const source of [EDUCATOR_DASHBOARD, EDUCATOR_HUB, LIVE_EDUCATOR]) {
      expect(source).not.toMatch(DEMO_PATTERN);
    }
    expect(EDUCATOR_HUB).not.toContain("8 in queue");
    expect(EDUCATOR_HUB).not.toContain("5 flagged");
  });

  it("keeps caseload previews aggregate-first and private", () => {
    expect(LIVE_EDUCATOR).toContain("At-a-glance previews use authorized caseload totals only.");
    expect(LIVE_EDUCATOR).toContain("Private note text is hidden from this aggregate preview.");
    expect(LIVE_EDUCATOR).toContain(
      "No document names, text, or personal information appear in this preview.",
    );
    expect(LIVE_EDUCATOR).not.toContain("row.first_name");
    expect(LIVE_EDUCATOR).not.toContain("row.last_name");
  });
});

describe("Owner Hub dashboard contract", () => {
  it("treats /owner and the Owner Hub as the owner dashboard", () => {
    expect(OWNER_ROUTE).toContain('title: "Admin Hub — TransitionForward"');
    expect(OWNER_ROUTE).toContain("component: OwnerDashboardPage");
    expect(OWNER_PAGE).toContain('title="Admin Hub"');
    expect(DASHBOARD_ROUTE).toContain('navigate({ to: "/owner", replace: true });');
    expect(AUDIT).toContain("`/owner` is the");
    expect(AUDIT).toContain("Do not add a separate owner dashboard route");
  });
});
