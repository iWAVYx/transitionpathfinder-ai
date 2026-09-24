import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS_CLASS } from "../../src/components/next-actions/status-badges";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

const STUDENT_DASHBOARD = read("src/components/dashboard/StudentDashboard.tsx");
const FAMILY_DASHBOARD = read("src/routes/_authenticated/dashboard.tsx");
const LIVE_FAMILY_OVERVIEW = read("src/components/dashboard/LiveFamilyWorkspaceOverview.tsx");
const STAT_GRID = read("src/components/layout/StatGrid.tsx");
const DASHBOARD_CALENDAR = read("src/components/dashboard/DashboardCalendar.tsx");
const INVITE_PEOPLE_CARD = read("src/components/dashboard/InvitePeopleCard.tsx");
const MY_IEP_SUMMARY_CARD = read("src/components/dashboard/MyIepSummaryCard.tsx");
const STUDENT_PATHWAY_SECTIONS = read("src/components/dashboard/StudentPathwaySections.tsx");
const COLLAPSIBLE_SECTION = read("src/components/layout/CollapsibleSection.tsx");
const CASELOAD = read("src/routes/_authenticated/caseload.tsx");
const NEXT_ACTION_CARD = read("src/components/next-actions/NextActionCard.tsx");
const NEXT_ACTION_ROW = read("src/components/next-actions/NextActionRow.tsx");
const NEXT_ACTIONS_EMPTY_STATE = read("src/components/next-actions/EmptyState.tsx");
const RECENTLY_COMPLETED_STRIP = read("src/components/next-actions/RecentlyCompletedStrip.tsx");

describe("dashboard accessibility contrast contract", () => {
  it("uses the audited readable helper color throughout the student dashboard", () => {
    expect(STUDENT_DASHBOARD).not.toContain("text-muted-foreground");
    expect(STUDENT_DASHBOARD).toContain(
      '<p className="text-sm text-foreground/75">\n                No goals set yet.',
    );
    expect(STUDENT_DASHBOARD).toContain(
      '<span className="text-xs text-foreground/75">{openCount} open</span>',
    );
    expect(STUDENT_DASHBOARD).toContain(
      "Nothing for you to do right now. Your team will add steps as your plan grows.",
    );
  });

  it("uses the audited readable helper color throughout the family dashboard", () => {
    expect(FAMILY_DASHBOARD).not.toContain("text-muted-foreground");
    expect(LIVE_FAMILY_OVERVIEW).not.toContain("text-muted-foreground");
    expect(FAMILY_DASHBOARD).toContain("<LiveFamilyWorkspaceOverview");
    expect(FAMILY_DASHBOARD).toContain("tracking-[0.18em] text-foreground/75");
    expect(LIVE_FAMILY_OVERVIEW).toContain("text-foreground/75");
    expect(FAMILY_DASHBOARD).toContain('className="mt-1 text-sm text-foreground/75"');
    expect(FAMILY_DASHBOARD).toContain(
      '<span className="italic text-foreground/75">Not set yet</span>',
    );
  });

  it("keeps canonical educator KPI labels and hints readable", () => {
    expect(STAT_GRID).not.toContain("text-muted-foreground");
    expect(STAT_GRID).toContain(
      "text-[11px] font-medium uppercase tracking-wider text-foreground/75",
    );
    expect(STAT_GRID).toContain('className="truncate text-[11px] text-foreground/75"');
  });

  it("keeps the shared dashboard calendar helper text and weekday labels readable", () => {
    expect(DASHBOARD_CALENDAR).not.toContain("text-muted-foreground");
    expect(DASHBOARD_CALENDAR).toContain(
      '<p className="text-xs text-foreground/75">{subtitle}</p>',
    );
    expect(DASHBOARD_CALENDAR).toContain(
      "text-[10px] font-semibold uppercase tracking-wider text-foreground/75",
    );
  });

  it("keeps the parent invitation helper text readable", () => {
    expect(INVITE_PEOPLE_CARD).not.toContain("text-muted-foreground");
    expect(INVITE_PEOPLE_CARD).toContain(
      '<p className="mt-2 max-w-xl text-sm text-foreground/75">',
    );
  });

  it("keeps educator quick-link labels and descriptions readable", () => {
    const quickLinkStart = CASELOAD.indexOf("function EducatorQuickLink");
    const quickLinkEnd = CASELOAD.indexOf("function EmptyState", quickLinkStart);
    const quickLink = CASELOAD.slice(quickLinkStart, quickLinkEnd);

    expect(quickLinkStart).toBeGreaterThan(-1);
    expect(quickLinkEnd).toBeGreaterThan(quickLinkStart);
    expect(quickLink).not.toContain("text-muted-foreground");
    expect(quickLink).toContain("text-xs font-medium text-foreground/75");
    expect(quickLink).toContain("text-[11px] text-foreground/75 group-hover:text-foreground");
  });

  it("keeps every student IEP and pathway helper state readable", () => {
    expect(MY_IEP_SUMMARY_CARD).not.toContain("text-muted-foreground");
    expect(STUDENT_PATHWAY_SECTIONS).not.toContain("text-muted-foreground");
    expect(MY_IEP_SUMMARY_CARD).toContain('<p className="text-sm text-foreground/75">');
    expect(STUDENT_PATHWAY_SECTIONS).toContain(
      '<dt className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">',
    );
  });

  it("keeps shared collapsible descriptions and every caseload state readable", () => {
    expect(COLLAPSIBLE_SECTION).not.toContain("text-muted-foreground");
    expect(CASELOAD).not.toContain("text-muted-foreground");
    expect(COLLAPSIBLE_SECTION).toContain(
      '<p className="mt-0.5 text-sm text-foreground/75">{description}</p>',
    );
    expect(CASELOAD).toContain('<p className="mt-1 text-sm text-foreground/75">');
  });

  it("keeps every dashboard next-action state readable", () => {
    for (const source of [
      NEXT_ACTION_CARD,
      NEXT_ACTION_ROW,
      NEXT_ACTIONS_EMPTY_STATE,
      RECENTLY_COMPLETED_STRIP,
    ]) {
      expect(source).not.toContain("text-muted-foreground");
    }

    expect(NEXT_ACTION_CARD).toContain(
      'className="mt-1 max-w-2xl text-sm text-foreground/75 sm:text-base"',
    );
    expect(NEXT_ACTION_ROW).toContain('className="text-sm leading-relaxed text-foreground/75"');
    expect(NEXT_ACTION_ROW).toContain(
      'className="text-[11px] font-medium uppercase tracking-wide text-foreground/75"',
    );
    expect(NEXT_ACTIONS_EMPTY_STATE).toContain('<p className="text-sm text-foreground/75">');
    expect(RECENTLY_COMPLETED_STRIP).toContain(
      "text-[11px] font-semibold uppercase tracking-wider text-foreground/75",
    );
  });

  it("keeps imported next-action status badge classes readable", () => {
    expect(STATUS_CLASS.not_started).toBe("bg-muted text-foreground");
    expect(STATUS_CLASS.dismissed).toBe("bg-muted text-foreground line-through");

    for (const [status, classes] of Object.entries(STATUS_CLASS)) {
      expect(classes, `${status} must not use low-contrast muted text`).not.toContain(
        "text-muted-foreground",
      );
    }
  });
});
