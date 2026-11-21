// @vitest-environment jsdom
import { DocumentWatermark } from "../../src/components/documents/DocumentWatermark";
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
  expect(template.content.querySelector("[data-document-print-header]")?.classList.contains("hidden")).toBe(false);
  expect(template.content.textContent).toContain("Meeting Preparation");
});

it("document visibility overrides the site-hiding rule at higher specificity", () => {
  const template = document.createElement("template");
  template.innerHTML = renderToStaticMarkup(<DocumentPrintStyles />);
  const css = template.content.textContent!;
  expect(css).toContain('body:has([data-print-document]) [data-print-document] * { visibility: visible; }');
  expect(css).toContain('[data-print-document] button,');
  expect(css).toContain('break-inside: avoid');
  expect(css).toContain('header:not([data-print-document] *)');
  expect(css).toContain('footer:not([data-print-document] *)');
});

it("uses the approved watermark without duplicating accessible content", () => {
  const template = document.createElement("template");
  template.innerHTML = renderToStaticMarkup(<DocumentWatermark />);
  const mark = template.content.querySelector("[data-document-watermark]")!;
  expect(mark.getAttribute("src")).toBe("/brand/transitionforward-app-icon.svg");
  expect(mark.getAttribute("alt")).toBe("");
  expect(mark.getAttribute("aria-hidden")).toBe("true");
});
