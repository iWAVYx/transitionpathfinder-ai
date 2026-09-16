import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

const STUDENT_DASHBOARD = read("src/components/dashboard/StudentDashboard.tsx");
const FAMILY_DASHBOARD = read("src/routes/_authenticated/dashboard.tsx");
const STAT_GRID = read("src/components/layout/StatGrid.tsx");

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
    expect(FAMILY_DASHBOARD).toContain(
      'tracking-[0.18em] text-foreground/75">Your students</p>',
    );
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
});
