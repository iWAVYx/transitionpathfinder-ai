import { describe, expect, it } from "vitest";

import {
  WIDGETS_BY_ROLE,
  widgetsForRole,
} from "../../src/lib/dashboard/dashboard-widget-prefs.functions";

describe("dashboard widget preferences", () => {
  it("keeps choices separated by signed-in role", () => {
    const layout = {
      family: ["meetings", "actions"],
      student: ["calendar"],
    };
    expect(widgetsForRole(layout, "family")).toEqual(["meetings", "actions"]);
    expect(widgetsForRole(layout, "student")).toEqual(["calendar"]);
  });

  it("uses role-safe defaults for malformed or forbidden choices", () => {
    expect(widgetsForRole({ partner: ["meetings"] }, "partner")).toEqual(["actions"]);
    expect(widgetsForRole({ family: ["actions", "actions"] }, "family"))
      .toEqual(WIDGETS_BY_ROLE.family);
    expect(widgetsForRole(null, "school_admin")).toEqual(["actions", "calendar"]);
  });

  it("never offers owner dashboard widgets", () => {
    expect(Object.keys(WIDGETS_BY_ROLE)).not.toContain("admin");
  });
});
