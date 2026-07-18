import { describe, expect, it } from "vitest";
import { DEMO_PROFILES, DEMO_PROFILE_ORDER } from "@/lib/demo/demo-profiles";
import { DEMO_ROLES, DEMO_ROLE_ORDER } from "@/lib/demo/role-previews";
import {
  tilesForProfile,
  headlineForProfile,
  introForProfile,
  sharedStudentFromProfile,
} from "@/lib/demo/profile-shell";

describe("demo profile switch wiring", () => {
  it("all three profiles are registered", () => {
    expect(DEMO_PROFILE_ORDER).toEqual(["jordan", "riley", "sam"]);
    for (const id of DEMO_PROFILE_ORDER) {
      expect(DEMO_PROFILES[id]).toBeTruthy();
    }
  });

  it("shell tile count is preserved for every (role, profile) combination", () => {
    for (const roleId of DEMO_ROLE_ORDER) {
      const role = DEMO_ROLES[roleId];
      const baseCount = role.dashboardTiles.length;
      for (const pid of DEMO_PROFILE_ORDER) {
        const tiles = tilesForProfile(role, DEMO_PROFILES[pid]);
        expect(tiles.length, `${roleId} × ${pid}`).toBe(baseCount);
      }
    }
  });

  it("shared-student roles reflect the selected profile in header and headline", () => {
    for (const roleId of ["student", "family", "educator"] as const) {
      const role = DEMO_ROLES[roleId];
      for (const pid of DEMO_PROFILE_ORDER) {
        const profile = DEMO_PROFILES[pid];
        const shared = sharedStudentFromProfile(profile);
        expect(shared.name).toBe(profile.displayName);
        expect(headlineForProfile(role, profile)).toContain(profile.shortName);
        expect(introForProfile(role, profile)).toContain(profile.displayName);
      }
    }
  });

  it("non-shared-student roles keep their static tiles", () => {
    for (const roleId of ["school-admin", "district-admin", "partner"] as const) {
      const role = DEMO_ROLES[roleId];
      for (const pid of DEMO_PROFILE_ORDER) {
        expect(tilesForProfile(role, DEMO_PROFILES[pid])).toEqual(role.dashboardTiles);
      }
    }
  });
});
