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

  it("gives every door a sign-in and waitlist action", () => {
    for (const slug of ROLE_DOOR_SLUGS) {
      const keys: RoleDoorActionKey[] = ROLE_DOORS[slug].actions.map(
        (a) => a.key
      );
      expect(keys, `${slug} signin`).toContain("signin");
      expect(keys, `${slug} waitlist`).toContain("join_waitlist");
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
    expect(partnerKeys).toEqual(
      expect.arrayContaining(["partner_free", "partner_premium"]),
    );
    for (const slug of ["student", "family", "educator", "school", "district"] as const) {
      const keys = ROLE_DOORS[slug].actions.map((a) => a.key);
      expect(keys).not.toContain("partner_free");
      expect(keys).not.toContain("partner_premium");
    }
  });

  it("routes waitlist actions with a matching role search param", () => {
    for (const slug of ROLE_DOOR_SLUGS) {
      const waitlist = ROLE_DOORS[slug].actions.find(
        (a) => a.key === "join_waitlist",
      );
      expect(waitlist?.to).toBe("/waitlist");
      expect(waitlist?.search?.role).toBeDefined();
    }
  });
});
