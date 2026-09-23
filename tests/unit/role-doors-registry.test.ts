import { describe, expect, it } from "vitest";

import {
  isRoleDoorSlug,
  ROLE_DOORS,
  ROLE_DOOR_SLUGS,
  type RoleDoorActionKey,
} from "@/lib/routing/role-doors";

describe("role doors registry", () => {
  it("exposes exactly the six canonical role slugs", () => {
    expect(ROLE_DOOR_SLUGS).toEqual([
      "student",
      "family",
      "educator",
      "school",
      "district",
      "partner",
    ]);
    expect(isRoleDoorSlug("owner")).toBe(false);
    expect(isRoleDoorSlug("student")).toBe(true);
  });

  it("gives every door a sign-in action", () => {
    for (const slug of ROLE_DOOR_SLUGS) {
      const keys: RoleDoorActionKey[] = ROLE_DOORS[slug].actions.map((a) => a.key);
      expect(keys, `${slug} signin`).toContain("signin");
    }
  });

  it("limits the waitlist to families, educators, and schools", () => {
    const waitlistDoors = ROLE_DOOR_SLUGS.filter((slug) =>
      ROLE_DOORS[slug].actions.some((action) => action.key === "join_waitlist"),
    );
    expect(waitlistDoors).toEqual(["family", "educator", "school"]);

    for (const slug of waitlistDoors) {
      const waitlist = ROLE_DOORS[slug].actions.find((action) => action.key === "join_waitlist");
      expect(waitlist?.to).toBe("/waitlist");
      expect(waitlist?.search?.role).toBe(slug);
    }
  });

  it("reserves org-license requests to school/district and partner tiers to partner", () => {
    const canRequestLicense = (["school", "district"] as const).every((s) =>
      ROLE_DOORS[s].actions.some((a) => a.key === "request_org_license"),
    );
    expect(canRequestLicense).toBe(true);

    for (const slug of ["student", "family", "educator", "partner"] as const) {
      expect(
        ROLE_DOORS[slug].actions.some((a) => a.key === "request_org_license"),
        `${slug} must not offer org license`,
      ).toBe(false);
    }

    const partnerKeys = ROLE_DOORS.partner.actions.map((a) => a.key);
    expect(partnerKeys).toEqual(expect.arrayContaining(["partner_free", "partner_premium"]));
    for (const slug of ["student", "family", "educator", "school", "district"] as const) {
      const keys = ROLE_DOORS[slug].actions.map((a) => a.key);
      expect(keys).not.toContain("partner_free");
      expect(keys).not.toContain("partner_premium");
    }
  });

  it("keeps licensed-organization access requests separate from the waitlist", () => {
    for (const slug of ["student", "family", "educator"] as const) {
      const request = ROLE_DOORS[slug].actions.find(
        (action) => action.key === "request_org_access",
      );
      expect(request?.to).toBe("/help");
      expect(request?.hash).toBe("contact");
      expect(request?.search?.topic).toBeDefined();
    }
  });

  it("routes school and district license requests to a real sales contact", () => {
    for (const slug of ["school", "district"] as const) {
      const request = ROLE_DOORS[slug].actions.find(
        (action) => action.key === "request_org_license",
      );
      expect(request).toMatchObject({
        to: "/help",
        hash: "contact",
        search: { topic: "district-demo" },
      });
    }
  });

  it("routes partner tiers to the dedicated application, never the waitlist", () => {
    const partnerActions = ROLE_DOORS.partner.actions;
    expect(partnerActions.some((action) => action.key === "join_waitlist")).toBe(false);
    for (const key of ["partner_free", "partner_premium"] as const) {
      expect(partnerActions.find((action) => action.key === key)?.to).toBe("/partner-interest");
    }
  });
});
