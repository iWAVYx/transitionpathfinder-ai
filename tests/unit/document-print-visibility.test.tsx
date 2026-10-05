// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { DocumentPrintStyles } from "../../src/components/documents/DocumentPrintStyles";
import { DocumentPrintHeader } from "../../src/components/documents/DocumentPrintHeader";

it("preserves the approved logo and document identity without navigation", () => {
  const html = renderToStaticMarkup(<DocumentPrintHeader title="Meeting preparation" />);
  const template = document.createElement("template");
  template.innerHTML = html;
  expect(template.content.querySelector('img[alt="TransitionForward"]')?.getAttribute("src")).toBe("/brand/transitionforward-wordmark.png");
  expect(template.content.querySelector("nav, button")).toBeNull();
  expect(template.content.textContent).toContain("Meeting preparation");
});

it("document visibility overrides the site-hiding rule at higher specificity", () => {
  const template = document.createElement("template");
  template.innerHTML = renderToStaticMarkup(<DocumentPrintStyles />);
  const css = template.content.textContent!;
  expect(css).toContain('body:has([data-print-document]) [data-print-document] * { visibility: visible; }');
  expect(css).toContain('[data-print-document] button,');
  expect(css).toContain('break-inside: avoid');
});
