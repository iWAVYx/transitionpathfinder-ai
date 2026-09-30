import { describe, expect, it } from "vitest";
import { SCHOOL_PROFILES, DISTRICT_PROFILES } from "../../src/lib/demo/role-contexts";
import {
  schoolWidgetActions,
  districtWidgetActions,
} from "../../src/lib/demo/organization-widget-actions";
import { getDemoFeature } from "../../src/lib/demo/feature-routes";

describe("organization widget context", () => {
  for (const school of Object.values(SCHOOL_PROFILES)) {
    it(`uses ${school.shortName}'s figures and published destinations`, () => {
      const actions = schoolWidgetActions(school);
      expect(actions[0].detail).toContain(`${school.reportsComplete} of ${school.iepCaseload}`);
      for (const action of actions) {
        expect(getDemoFeature("school-admin", action.to.split("/").at(-1)!)).not.toBeNull();
      }
    });
  }
  for (const district of Object.values(DISTRICT_PROFILES)) {
    it(`uses ${district.shortName}'s connection status and published destinations`, () => {
      const actions = districtWidgetActions(district);
      expect(actions[0].detail).toContain(`${district.schoolsConnected} of ${district.schools}`);
      expect(actions[0].detail.includes("All sample schools are connected")).toBe(
        district.schoolsConnected === district.schools,
      );
      for (const action of actions) {
        expect(getDemoFeature("district-admin", action.to.split("/").at(-1)!)).not.toBeNull();
      }
    });
  }
  it("does not claim pending staff onboarding when none is needed", () => {
    expect(
      schoolWidgetActions({ ...SCHOOL_PROFILES.comprehensive, onboardingNeeded: 0 })[1].detail,
    ).toContain("onboarding is complete");
  });
});
