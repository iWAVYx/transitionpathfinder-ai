import { expect, it } from "vitest";
import { planningWidgetContent } from "../../src/lib/demo/planning-widget-content";
import { getDemoProfile } from "../../src/lib/demo/demo-profiles";
import { generatePathwayReport } from "../../src/lib/demo/pathway-engine";
for (const id of ["sam", "riley", "jordan"] as const) {
  for (const role of ["student", "family", "educator"] as const) {
    it(`${role}/${id} widgets use relevant report actions and preserve sample context`, () => {
      const profile = getDemoProfile(id);
      const content = planningWidgetContent(role, profile);
      const owner = role === "educator" ? "school_team" : role;
      const expected = generatePathwayReport(profile)
        .nextSteps.filter((step) => step.owner === owner || step.owner === "shared")
        .slice(0, 5);
      expect(content.actions.entries.map((entry) => entry.id)).toEqual(
        expected.map((step) => step.id),
      );
      for (const widget of Object.values(content)) {
        for (const href of [
          widget.toolDestination,
          ...widget.entries.map((entry) => entry.to),
        ].filter(Boolean)) {
          const url = new URL(href!, "https://example.test");
          expect(url.pathname).toMatch(/^\/demo\//);
          expect(url.searchParams.get("student")).toBe(id);
        }
      }
      expect(content.calendar.entries).toHaveLength(3);
      expect(content.meetings.entries).toHaveLength(role === "student" ? 0 : 1);
      if (role === "student") expect(content.meetings.toolDestination).toBeNull();
    });
  }
}
