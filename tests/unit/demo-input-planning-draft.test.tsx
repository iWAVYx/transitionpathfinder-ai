import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DemoInputPlanningDraft } from "../../src/components/demo/DemoInputPlanningDraft";
import { createPathwayIntakeDefaults } from "../../src/lib/pathway-intake";
it("renders changed inputs without borrowing another student's evidence or recommendations", () => {
  const values = {
    ...createPathwayIntakeDefaults(),
    student_first_name: "Sample A",
    interests: "Robotics",
    assistive_technology: "Screen reader",
  };
  const html = renderToStaticMarkup(<DemoInputPlanningDraft values={values} />);
  expect(html).toContain("Robotics");
  expect(html).toContain("Screen reader");
  expect(html).toContain("Not provided — review with the team.");
  expect(html).not.toContain("Jordan");
  expect(html).toContain('data-report-stage="voice"');
  expect(html).toContain('data-report-stage="evidence"');
  const changed = renderToStaticMarkup(
    <DemoInputPlanningDraft values={{ ...values, interests: "Gardening" }} />,
  );
  expect(changed).toContain("Gardening");
  expect(changed).not.toContain("Robotics");
});
it("escapes entered markup and does not expose a connected student identifier", () => {
  const html = renderToStaticMarkup(
    <DemoInputPlanningDraft
      values={{
        ...createPathwayIntakeDefaults(),
        student_first_name: "<script>alert(1)</script>",
        student_id: "private-student-id",
      }}
    />,
  );
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("private-student-id");
});
