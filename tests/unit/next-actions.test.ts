import { describe, it, expect } from "vitest";
import { sortNextActions, isActive } from "../../src/lib/next-actions/types";
import { DEMO_NEXT_ACTIONS } from "../../src/lib/next-actions/demo-fixtures";
import type { NextAction } from "../../src/lib/next-actions/types";

const roles: (keyof typeof DEMO_NEXT_ACTIONS)[] = [
  "student",
  "family",
  "educator",
  "school_admin",
  "district_admin",
  "partner",
  "admin",
];

describe("Next Action engine", () => {
  it("sorts overdue and due_soon items first", () => {
    const items: NextAction[] = [
      { ...DEMO_NEXT_ACTIONS.student[3], urgency: "later", status: "not_started" },
      { ...DEMO_NEXT_ACTIONS.family[0], urgency: "overdue", status: "overdue" },
      { ...DEMO_NEXT_ACTIONS.student[0], urgency: "due_soon", status: "in_progress" },
    ];
    const sorted = sortNextActions(items);
    expect(sorted[0].urgency).toBe("overdue");
    expect(sorted[sorted.length - 1].urgency).toBe("later");
  });

  it("isActive excludes completed and dismissed", () => {
    expect(isActive({ ...DEMO_NEXT_ACTIONS.student[0], status: "completed" })).toBe(false);
    expect(isActive({ ...DEMO_NEXT_ACTIONS.student[0], status: "dismissed" })).toBe(false);
    expect(isActive({ ...DEMO_NEXT_ACTIONS.student[0], status: "not_started" })).toBe(true);
  });

  it("every role ships a non-empty demo fixture with required fields", () => {
    for (const role of roles) {
      const items = DEMO_NEXT_ACTIONS[role];
      expect(items.length, `${role} should have demo actions`).toBeGreaterThan(0);
      for (const a of items) {
        expect(a.id).toBeTruthy();
        expect(a.title).toBeTruthy();
        expect(a.reason).toBeTruthy();
        expect(a.ctaLabel).toBeTruthy();
        expect(a.ctaRoute.startsWith("/")).toBe(true);
      }
    }
  });
});
