import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReportProfileDetails } from "../../src/components/documents/ReportProfileDetails";

it("preserves supplied categories and every item while omitting empty categories", () => {
  const html = renderToStaticMarkup(<ReportProfileDetails groups={[
    { label: "Strengths", items: Array.from({ length: 6 }, (_, i) => `Recorded strength ${i}`) },
    { label: "Needs", items: ["Written steps & time to respond.", "<script>Student text</script>"] },
    { label: "Motivators", items: [] },
  ]} />);
  for (let i = 0; i < 6; i++) expect(html).toContain(`Recorded strength ${i}`);
  expect(html).toContain("Written steps &amp; time to respond.");
  expect(html).toContain("&lt;script&gt;Student text&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("Motivators");
  expect(html).toContain("<h3");
});
it("does not fabricate content for absent categories", () => {
  expect(renderToStaticMarkup(<ReportProfileDetails groups={[{ label: "Needs", items: [] }]} />)).toBe("");
});
