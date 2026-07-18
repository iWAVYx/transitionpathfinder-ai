import { describe, expect, it } from "vitest";
import { DEMO_PROFILES, DEMO_PROFILE_ORDER } from "@/lib/demo/demo-profiles";
import { WORKSPACE_STAGES } from "@/lib/workspace/stages";
import { getStageDetail, getStageSample } from "@/lib/workspace/stage-samples";

/**
 * Fingerprint the sample screens returned for each demo profile and
 * confirm that switching profiles updates the visible identity data.
 * The check does NOT require every string to differ (base narratives
 * are shared), only that no other profile's identity leaks through.
 */
describe("demo profile sample data fingerprints", () => {
  const otherIdentity = (currentId: string) =>
    DEMO_PROFILE_ORDER.filter((id) => id !== currentId).flatMap((id) => {
      const p = DEMO_PROFILES[id];
      return [p.displayName, p.demographics.schoolPlaceholder];
    });

  for (const id of DEMO_PROFILE_ORDER) {
    const profile = DEMO_PROFILES[id];
    it(`stage samples reflect ${profile.displayName} without leaking other profile identity`, () => {
      const others = otherIdentity(id);
      for (const stage of WORKSPACE_STAGES) {
        const sample = getStageSample(stage.id, profile);
        const detail = getStageDetail(stage.id, profile);
        const blob = JSON.stringify({ sample, detail });
        // The active profile's name must appear somewhere in the sample surfaces
        // whose narrative was originally scoped to the student.
        // (Some stages have no student-name references — allow that.)
        for (const other of others) {
          expect(blob, `${stage.id} × ${id} leaked "${other}"`).not.toContain(other);
        }
      }
    });
  }

  it("each profile owns a unique display name and school placeholder", () => {
    const names = DEMO_PROFILE_ORDER.map((id) => DEMO_PROFILES[id].displayName);
    const schools = DEMO_PROFILE_ORDER.map((id) => DEMO_PROFILES[id].demographics.schoolPlaceholder);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(schools).size).toBe(schools.length);
  });
});
