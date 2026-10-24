// @vitest-environment jsdom
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportPhase4Sections } from "../../src/components/pathway/ReportPhase4Sections";
import { DEMO_INTAKE_CATEGORIES, DEMO_DOCUMENT_SOURCES, DEMO_VOICE } from "../../src/lib/demo-extras";

for (const studentId of ["jordan", "maya"] as const) {
  for (const audience of ["student", "family", "educator"] as const) {
    it(`${studentId} ${audience} sample report retains all source categories and eligible voice responses`, () => {
      const html = renderToStaticMarkup(<ReportPhase4Sections studentId={studentId} audience={audience} />);
      const root = document.createElement("div");
      root.innerHTML = html;
      const text = root.textContent ?? "";
      const sources = root.querySelector("#sec-source-notes")?.textContent ?? "";
      expect(DEMO_INTAKE_CATEGORIES[studentId].length).toBeGreaterThan(6);
      for (const item of DEMO_INTAKE_CATEGORIES[studentId]) {
        expect(sources).toContain(item.category);
        expect(sources).toContain(item.flowsTo);
      }
      for (const item of DEMO_DOCUMENT_SOURCES[studentId]) expect(sources).toContain(item.label);
      for (const item of DEMO_VOICE[studentId].filter(v => /ask for help|adults to understand|meeting|comfortable|struggle/i.test(v.prompt))) {
        expect(root.querySelector("#sec-self-advocacy-readiness")?.textContent).toContain(item.response);
      }
      expect(Array.from(root.querySelectorAll(".pub-page-kicker")).some(kicker => /^Section \d+$/.test(kicker.textContent ?? ""))).toBe(false);
      expect(sources).toContain("Sample Pathway Builder Responses");
      expect(sources).toContain("These are not verified student records.");
      expect(sources).toContain("TransitionForward Sample");
      expect(text).not.toMatch(/human-reviewed|Every claim|No source = no claim|Each one traces directly/);
      expect(root.querySelector("#sec-role-next-steps")?.textContent).toContain(
        audience === "student" ? "Your Next Steps," : audience === "family" ? "Family" : "Case Manager"
      );
    });
  }
}
