import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DemoStudentVoicePreview } from "../../src/components/demo/DemoStudentVoicePreview";
import { demoCalendarEvents } from "../../src/lib/demo/calendar-preview";
import { getDemoProfile } from "../../src/lib/demo/demo-profiles";
import { getDemoFeature, isDemoRole } from "../../src/lib/demo/feature-routes";

describe("public voice and calendar sample context", () => {
  for (const id of ["sam", "riley", "jordan"] as const) {
    const profile = getDemoProfile(id);
    it(`${id} voice renders this profile's responses without capture controls`, () => {
      const html = renderToStaticMarkup(<DemoStudentVoicePreview profile={profile} />);
      for (const response of profile.voice)
        expect(html).toContain(
          renderToStaticMarkup(<dt className="text-sm font-semibold">{response.prompt}</dt>),
        );
      expect(html).not.toContain("<button");
      expect(html).not.toContain("/student-voice");
      expect(html).toContain(profile.shortName);
    });
    for (const role of ["student", "family", "educator"] as const) {
      it(`${role}/${id} calendar keeps the sample context and links inside the demo`, () => {
        const now = new Date("2026-09-29T12:00:00Z");
        const events = demoCalendarEvents(role, profile, now);
        expect(events).toHaveLength(3);
        for (const event of events) {
          expect(event.scope).toBe(profile.displayName);
          expect(new Date(event.start).getTime()).toBeGreaterThan(now.getTime());
          for (const href of [event.href, event.pathwayGoal?.href]) {
            expect(href).toMatch(/^\/demo\//);
            const url = new URL(href!, "https://example.test");
            expect(url.searchParams.get("student")).toBe(id);
            if (url.pathname.startsWith("/demo/feature/")) {
              const [, , , featureRole, slug] = url.pathname.split("/");
              expect(isDemoRole(featureRole)).toBe(true);
              expect(getDemoFeature(featureRole as never, slug)).not.toBeNull();
            } else expect(url.searchParams.get("role")).toBe(role);
          }
        }
        expect(JSON.stringify(events)).not.toMatch(
          /Daniel|Capital CC|college pathway|partner organizations/,
        );
      });
    }
  }
  it("other role calendar links are existing previews or non-clickable, never live tools", () => {
    for (const role of ["school-admin", "district-admin", "partner", "owner"] as const) {
      for (const event of demoCalendarEvents(role, getDemoProfile("sam"))) {
        for (const href of [event.href, event.pathwayGoal?.href]) {
          if (!href) continue;
          const [, , , featureRole, slug] = href.split("/");
          expect(featureRole).toBe(role);
          expect(getDemoFeature(role, slug)).not.toBeNull();
        }
      }
    }
  });
});


describe("organization calendar preview destinations", () => {
  it.each([
    ["school-admin", "school", "specialized"],
    ["district-admin", "district", "local-district"],
    ["partner", "plan", "premium"],
  ] as const)("%s event links pin only their applicable selected context", (role, parameter, value) => {
    const context = { school: "specialized", district: "local-district", plan: "premium" } as const;
    const events = demoCalendarEvents(role, getDemoProfile("riley"), undefined, context);
    const links = events.flatMap(event => [event.href, event.pathwayGoal?.href]).filter(Boolean) as string[];
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) {
      const url = new URL(href, "https://example.test");
      const slug = url.pathname.split("/").at(-1)!;
      expect(getDemoFeature(role, slug)).not.toBeNull();
      expect([...url.searchParams.entries()]).toEqual([[parameter, value]]);
    }
  });
  it("Owner calendar examples receive no student, school, district or listing-plan context", () => {
    const events = demoCalendarEvents("owner", getDemoProfile("sam"), undefined, { school: "specialized", district: "local-district", plan: "premium" });
    for (const event of events) for (const href of [event.href, event.pathwayGoal?.href]) {
      if (!href) continue;
      expect(new URL(href, "https://example.test").search).toBe("");
      expect(href).toMatch(/^\/demo\/feature\/owner\//);
    }
  });
  it("invalid organization context values are ignored without changing the destination", () => {
    const profile = getDemoProfile("sam");
    expect(demoCalendarEvents("school-admin", profile, undefined, { school: "unknown" } as any).map(event => event.href))
      .toEqual(demoCalendarEvents("school-admin", profile).map(event => event.href));
  });
});
