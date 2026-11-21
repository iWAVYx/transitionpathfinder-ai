// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PrintedFieldValue } from "../../src/components/documents/PrintedFieldValue";
it("exports the full long field value with line breaks and escaped text", () => {
  const value = "First line\n" + "A complete meeting observation. ".repeat(200) + "\nLast line <script>literal note</script>";
  const template = document.createElement("template");
  template.innerHTML = renderToStaticMarkup(<PrintedFieldValue value={value} />);
  expect(template.content.textContent).toBe(value);
  expect(template.content.querySelector("textarea, script")).toBeNull();
});
it("does not invent content for an unrecorded field", () => {
  expect(renderToStaticMarkup(<PrintedFieldValue value="   " />)).toContain("Not recorded.");
});
