import { describe, expect, it } from "vitest";

import { widgetLinkDestination } from "../../src/lib/dashboard/dashboard-widget-navigation";

describe("dashboard widget links", () => {
  it.each(["family", "student", "educator"] as const)(
    "keeps %s calendar widgets as previews, not duplicate links",
    (role) => {
      expect(widgetLinkDestination(role, "/calendar")).toBeNull();
      expect(widgetLinkDestination(role, "/meetings")).toBe("/meetings");
      expect(widgetLinkDestination(role, "/next-actions")).toBe("/next-actions");
    },
  );

  it("keeps school calendar widgets as previews without changing other roles", () => {
    expect(widgetLinkDestination("school_admin", "/school/calendar")).toBeNull();
    expect(widgetLinkDestination("district_admin", "/calendar")).toBe("/calendar");
    expect(widgetLinkDestination("partner", "/calendar")).toBe("/calendar");
  });
});
