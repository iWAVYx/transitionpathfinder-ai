import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { getDemoProfile } from "../../src/lib/demo/demo-profiles";
import { generatePathwayReport } from "../../src/lib/demo/pathway-engine";
import { tokensForProfile } from "../../src/lib/demo/student-tokens";
import { demoFamilyMeetingPrep } from "../../src/lib/demo/meeting-preview";
import { DemoPlanningActions } from "../../src/components/demo/DemoPlanningActions";

describe("contextual planning previews", () => {
  for (const id of ["sam", "riley", "jordan"] as const) {
    const profile = getDemoProfile(id);
    it(`${id} meeting questions use the selected profile with its existing fictional meeting date and no adult-service eligibility claims`, () => {
      const prep = demoFamilyMeetingPrep(profile);
      const text = JSON.stringify(prep);
      expect(text).toContain(profile.shortName);
      expect(text).toContain(profile.goals[0].title);
      expect(text).toContain(profile.demographics.gradeLabel);
      expect(prep.meetingDate).toBe(
        `Fictional meeting: ${tokensForProfile(profile).nextMeetingDate}`,
      );
      expect(prep.groups.some((group) => group.forAudience === "adult_services")).toBe(false);
      for (const other of ["Sam", "Riley", "Jordan"].filter((name) => name !== profile.shortName))
        expect(text).not.toContain(other);
    });
    for (const audience of ["student", "family", "educator"] as const) {
      it(`${id}/${audience} shows only this report's assigned and shared actions`, () => {
        const html = renderToStaticMarkup(
          <DemoPlanningActions profile={profile} audience={audience} />,
        );
        const owner = audience === "educator" ? "school_team" : audience;
        const report = generatePathwayReport(profile);
        expect(html).toContain(profile.shortName);
        expect(html).toContain("not saved tasks or agreed deadlines");
        for (const step of report.nextSteps) {
          const escaped = renderToStaticMarkup(
            <h3 className="text-sm font-semibold">{step.title}</h3>,
          );
          if (step.owner === owner || step.owner === "shared") expect(html).toContain(escaped);
          else expect(html).not.toContain(escaped);
        }
      });
    }
  }
});
