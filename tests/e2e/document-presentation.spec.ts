import { test, expect } from "@playwright/test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { createRequire } from "node:module";

// Playwright's JSX transform targets component-test descriptors, not React SSR.
// Bundle the real shared components with the application's automatic React JSX runtime.
let components: Record<string, any>;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: ["DocumentPrintHeader", "DocumentPrintStyles", "DocumentViewStyles", "DocumentWatermark", "PrintedFieldValue", "MeetingDocumentStyles"].map((name) => `export { ${name} } from './src/components/documents/${name}.tsx';`).join("\n"), resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
    alias: { "@": resolve("src") },
  });
  const compiled = { exports: {} };
  new Function("module", "exports", "require", result.outputFiles[0].text)(compiled, compiled.exports, createRequire(resolve("package.json")));
  components = compiled.exports;
});

// Credential-free shared-component regression; no application server, AI or database.
// This does not replace full generated-document pagination acceptance.
for (const role of ["Family", "Educator"]) {
  for (const width of [390, 1024]) {
    test(`${role} document stays readable on screen and in print at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.route("**/brand/**", (route) => {
        const pathname = new URL(route.request().url()).pathname;
        return route.fulfill({
          body: readFileSync(resolve("public", pathname.slice(1))),
          contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png",
        });
      });
      const note = "A dated observation and the agreed next step.\n".repeat(90) + "Final follow-up: confirm the review date.";
      const field = renderToStaticMarkup(createElement(components.PrintedFieldValue, { value: note }));
      const watermark = renderToStaticMarkup(createElement(components.DocumentWatermark));
      const header = renderToStaticMarkup(createElement(components.DocumentPrintHeader, { title: `${role} meeting plan — sample` }));
      const styles = [components.DocumentPrintStyles, components.DocumentViewStyles, components.MeetingDocumentStyles].map((component) => renderToStaticMarkup(createElement(component))).join("");
      await page.setContent(`<html><head><base href="http://document-fixture.test"><style>
        body { margin: 16px; font-family: sans-serif; }
        [data-brand-logo] { display: flex; align-items: center; gap: 8px; }
        [data-brand-logo] img { height: 32px; width: auto; max-width: 100%; }
        [data-print-document] { max-width: 760px; margin: auto; }
        [data-document-field-value] { display: none; }
        @media print { [data-document-field-value] { display: block; white-space: pre-wrap; overflow-wrap: anywhere; } textarea { display: none; } }
      </style></head><body>
        <header>Site navigation</header><main class="site-shell-main"><div>Dashboard breadcrumb</div>
        <section data-meeting-document data-generated-document data-print-document>${styles}${watermark}${header}
          <h1>A meeting plan for a sample student</h1>
          <p>Sample content for a layout check. No student records or AI requests are used.</p>
          <header data-section-heading><h2>Questions to discuss</h2></header>
          <ul><li>Which supports help the student complete the next task?</li><li>Who will record progress and when will the team review it?</li></ul>
          <p>Long reference: ${"sample-reference-".repeat(25)}</p>
          <textarea aria-label="Meeting notes">Short editing viewport</textarea>${field}
          <footer data-document-note>Planning guidance; check the student's current records.</footer>
          <button>Save action</button><div class="print:hidden">Interactive setup guidance</div>
        </section></main><footer data-site-footer>Marketing footer</footer>
        <div data-floating-control style="position:fixed;bottom:0">Feedback</div>
      </body></html>`);
      await expect(page.locator("[data-document-print-header]")).toBeVisible();
      await expect(page.getByRole("heading", { name: "A meeting plan for a sample student" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save action" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.locator("[data-brand-logo] img").evaluateAll((images) => images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
      await expect(page.locator("[data-document-watermark]")).toBeHidden();
      await expect(page.locator("[data-document-field-value]")).toBeHidden();
      await page.emulateMedia({ media: "print" });
      await expect(page.getByRole("textbox", { name: "Meeting notes" })).toBeHidden();
      await expect(page.locator("[data-document-field-value]")).toBeVisible();
      await expect(page.locator("[data-document-field-value]")).toHaveText(note);
      expect(await page.locator("[data-document-field-value]").evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      await expect(page.locator("[data-document-watermark]")).toBeVisible();
      expect(await page.locator("[data-document-watermark]").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThanOrEqual(0.1);
      await expect(page.locator("[data-document-print-header]")).toBeVisible();
      await expect(page.locator("[data-section-heading]")).toBeVisible();
      await expect(page.locator("[data-document-note]")).toBeVisible();
      await expect(page.getByRole("heading", { name: "A meeting plan for a sample student" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Save action" })).toBeHidden();
      await expect(page.locator("body > header")).toBeHidden();
      await expect(page.locator("main > div")).toBeHidden();
      await expect(page.locator("[data-site-footer]")).toBeHidden();
      await expect(page.locator("[data-floating-control]")).toBeHidden();
      await expect(page.getByText("Interactive setup guidance", { exact: true })).toBeHidden();
    });
  }
}
