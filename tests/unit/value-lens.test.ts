import { describe, it, expect } from "vitest";

import {
  CHAPTER_VALUE_DEFAULTS,
  ROLE_VALUE,
  isValidValueCallout,
  type AppRole,
} from "@/lib/value-lens";
import { DEMO_STEP_VALUE } from "@/lib/demo/step-value";

describe("value-lens", () => {
  it("every role has a non-empty headline + next action", () => {
    const roles: AppRole[] = [
      "student",
      "family",
      "educator",
      "school",
      "district",
      "partner",
      "owner",
    ];
    for (const r of roles) {
      const v = ROLE_VALUE[r];
      expect(v.headline.length).toBeGreaterThan(10);
      expect(v.nextAction.length).toBeGreaterThan(5);
    }
  });

  it("every report chapter default is a valid value callout", () => {
    for (const key of Object.keys(CHAPTER_VALUE_DEFAULTS)) {
      const v = CHAPTER_VALUE_DEFAULTS[key as keyof typeof CHAPTER_VALUE_DEFAULTS];
      // The closing "bring_to_team" chapter intentionally has no questions
      // until the runtime aggregates them from other chapters.
      expect(isValidValueCallout(v)).toBe(true);
    }
  });

  it("every demo step answers a planning question and names inputs/output/roles", () => {
    for (const [stepId, v] of Object.entries(DEMO_STEP_VALUE)) {
      expect(v.question.endsWith("?"), `step ${stepId} should ask a question`).toBe(true);
      expect(v.storyBeat.length).toBeGreaterThan(20);
      expect(v.inputs.length).toBeGreaterThan(0);
      expect(v.output.length).toBeGreaterThan(10);
      expect(v.rolesHelped.length).toBeGreaterThan(0);
    }
  });
});
