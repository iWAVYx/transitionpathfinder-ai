import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
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
    stdin: { contents: ["DocumentPrintHeader", "DocumentPrintStyles", "DocumentViewStyles", "DocumentWatermark", "PrintedFieldValue", "MeetingDocumentStyles", "SampleDocumentNotice", "ReportBrochurePrintStyles"].map((name) => `export { ${name} } from './src/components/documents/${name}.tsx';`).join("\n") + "\nexport { PathwayReportBody } from './src/components/pathway/report/PathwayReportBody.tsx'; export { PathwayReport } from './src/components/demo/PathwayReport.tsx'; export { getDemoProfile } from './src/lib/demo/demo-profiles.ts';", resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    alias: { "@": resolve("src") },
    plugins: [{ name: "explicit-document-fixture", setup(builder) {
      builder.onResolve({ filter: /use-demo-student$/ }, () => ({ path: "selection", namespace: "offline" }));
      builder.onLoad({ filter: /.*/, namespace: "offline" }, () => ({ contents: 'export function useDemoStudent(){throw new Error("Document QA requires an explicit fictional profile");}' }));
    } }],
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
          ${renderToStaticMarkup(createElement(components.SampleDocumentNotice))}
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
      await expect(page.locator("[data-document-sample-notice]")).toBeVisible();
      await expect(page.getByRole("textbox", { name: "Meeting notes" })).toBeHidden();
      await expect(page.locator("[data-document-field-value]")).toBeVisible();
      await expect(page.locator("[data-document-field-value]")).toHaveText(note);
      expect(await page.locator("[data-document-field-value]").evaluate((element) => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
      await expect(page.locator("[data-document-watermark]")).toBeVisible();
      expect(await page.locator("[data-document-watermark]").evaluate((element) => Number(getComputedStyle(element).opacity))).toBeLessThanOrEqual(0.1);
      expect(await page.locator("[data-document-watermark]").evaluate(element => {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        return style.position === "fixed" && style.right === "0px" && Math.abs(rect.top) < 1 && Math.abs(rect.right - window.innerWidth) < 1;
      })).toBe(true);
      const geometry = await page.locator("[data-generated-document]").evaluate((element) => {
        const style = getComputedStyle(element);
        const headings = Array.from(element.querySelectorAll("h1,h2,h3,h4"));
        return { left: style.paddingLeft, right: style.paddingRight,
          fonts: headings.map((heading) => getComputedStyle(heading).fontFamily),
          aligned: headings.every((heading) => getComputedStyle(heading).textAlign === "left") };
      });
      expect(geometry.left).toBe(geometry.right);
      expect(new Set(geometry.fonts).size).toBe(1);
      expect(geometry.aligned).toBe(true);
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


test("report print layout keeps long content readable without screen-size chapter spacing", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiledCss = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiledCss.sources });
  const css = compiledCss.build(scanner.scan());
  const note = "A dated observation records the student's progress, support and agreed next step. ".repeat(80) + "Final review: bring the dated evidence to the team.";
  const body = renderToStaticMarkup(createElement(components.PathwayReportBody, {
    sections: {
      student_snapshot: createElement("div", { className: "pub-page-body" },
        createElement("p", { className: "font-semibold uppercase", "data-report-label": true }, "Communication Style"),
        createElement("p", { "data-long-report-content": true }, note)),
      data_gaps: createElement("p", { "data-report-evidence": true }, "Evidence remains incomplete. Ask for a current observation before making a decision."),
    },
  }));
  const printStyles = renderToStaticMarkup(createElement(components.ReportBrochurePrintStyles));
  const headingStyles = renderToStaticMarkup(createElement(components.DocumentViewStyles));
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  await page.setContent(`<html><head><style>${css}</style></head><body><div class="report-shell"><section class="report-root" data-generated-document>${printStyles}${headingStyles}${body}</section></div></body></html>`);
  const content = page.locator("[data-long-report-content]");
  await expect(content).toHaveText(note);
  await page.emulateMedia({ media: "print" });
  await expect(content).toHaveText(note);
  expect(await content.evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
  expect(await page.locator(".report-stage > header").evaluateAll(headers => headers.every(header => header.getBoundingClientRect().height < 130))).toBe(true);
  expect(await content.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await page.locator("[data-report-label]").evaluate(element => getComputedStyle(element).breakAfter)).toBe("avoid");
  expect(await page.locator(".report-stage h2").evaluateAll(headings => headings.every(heading => getComputedStyle(heading).breakAfter === "avoid"))).toBe(true);
  expect(await page.locator(".report-stage h2").evaluateAll(headings => headings.every(heading => getComputedStyle(heading).textAlign === "left"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});


for (const width of [390, 768, 1440]) {
  test(`sample report document has accessible text and note semantics at ${width}px`, async ({ page }) => {
    const require = createRequire(resolve("package.json"));
    const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
      base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
    });
    const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
    const css = compiled.build(scanner.scan());
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*", route => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
      return route.fulfill({ status: 404, body: "" });
    });
    for (const audience of ["student", "family", "educator"]) {
      const body = renderToStaticMarkup(createElement(components.PathwayReport, { profile: components.getDemoProfile("sam"), audience }));
      await page.setContent(`<html lang="en"><head><title>Fictional Pathway Report</title><base href="http://document-fixture.test"><style>${css}</style></head><body><main class="report-shell">${body}</main></body></html>`);
      await expect(page.locator("[data-document-sample-notice][role=note]")).toBeVisible();
      await expect(page.locator("main aside")).toHaveCount(0);
      const result = await new AxeBuilder({ page }).include("[data-generated-document]").analyze();
      expect(result.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => node.target), summaries: violation.nodes.map(node => node.failureSummary) }))).toEqual([]);
      // Repeated answers should align with their questions and have equal gutters.
      const checkVoiceSpacing = async () => {
        const rows = await page.locator("[data-report-voice-response] figure").evaluateAll(figures => figures.map(figure => {
          const style = getComputedStyle(figure), quote = figure.querySelector("blockquote")!, prompt = figure.querySelector("figcaption")!;
          return {
            left: quote.getBoundingClientRect().left, promptLeft: prompt.getBoundingClientRect().left,
            right: quote.getBoundingClientRect().right, promptRight: prompt.getBoundingClientRect().right,
            top: style.paddingTop, bottom: style.paddingBottom, start: style.paddingLeft, end: style.paddingRight,
            margin: style.marginTop, marker: getComputedStyle(quote, "::before").display,
          };
        }));
        expect(rows).toHaveLength(3);
        for (const row of rows) {
          expect(Math.abs(row.left - row.promptLeft)).toBeLessThan(1);
          expect(Math.abs(row.right - row.promptRight)).toBeLessThan(1);
          expect(row.top).toBe(row.bottom);
          expect(row.start).toBe(row.end);
          expect(row.margin).toBe("0px");
          expect(row.marker).toBe("none");
        }
        expect(new Set(rows.map(row => row.left)).size).toBe(1);
      };
      const checkProfileSpacing = async (columns: number) => {
        const grid = page.locator("[data-report-profile-details]");
        const geometry = await grid.evaluate(element => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(" ").map(Number.parseFloat),
          groups: Array.from(element.children).map(group => {
            const style = getComputedStyle(group);
            return { width: group.getBoundingClientRect().width, top: style.paddingTop, bottom: style.paddingBottom };
          }),
        }));
        expect(geometry.columns).toHaveLength(columns);
        if (columns === 2) expect(Math.abs(geometry.columns[0] - geometry.columns[1])).toBeLessThan(1);
        for (const group of geometry.groups) expect(group.top).toBe(group.bottom);
        expect(Math.max(...geometry.groups.map(group => group.width)) - Math.min(...geometry.groups.map(group => group.width))).toBeLessThan(1);
      };
      const checkReadinessSpacing = async (columns: number) => {
        const layout = await page.locator('[data-report-readiness-grid]').evaluate(element => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').map(Number.parseFloat),
          widths: Array.from(element.children).map(child => child.getBoundingClientRect().width),
          clipped: Array.from(element.children).some(child => child.scrollWidth > child.clientWidth + 1),
        }));
        expect(layout.columns).toHaveLength(columns);
        expect(layout.widths).toHaveLength(4);
        expect(Math.max(...layout.widths) - Math.min(...layout.widths)).toBeLessThan(1);
        expect(layout.clipped).toBe(false);
        const headers = await page.locator('[data-report-readiness-heading], [data-demo-readiness-overall]').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect(), title = element.querySelector('h3')!.getBoundingClientRect(), badge = element.querySelector('span')!.getBoundingClientRect();
          return { left: Math.abs(title.left - box.left), right: Math.abs(badge.right - box.right), top: Math.abs(title.top - badge.top) };
        }));
        for (const header of headers) {
          expect(header.left).toBeLessThan(1);
          expect(header.right).toBeLessThan(1);
          expect(header.top).toBeLessThan(1);
        }
      };
      await checkReadinessSpacing(width < 640 ? 1 : 2);
      await checkProfileSpacing(width < 640 ? 1 : 2);
      await checkVoiceSpacing();
      await page.emulateMedia({ media: "print" });
      await checkVoiceSpacing();
      await checkProfileSpacing(2);
      await checkReadinessSpacing(2);
      expect(await page.locator("[data-document-watermark]").evaluate(element => {
        const rect = element.getBoundingClientRect();
        return Math.abs(rect.top) < 1 && Math.abs(rect.right - window.innerWidth) < 1;
      })).toBe(true);
      await page.emulateMedia({ media: "screen" });
    }
  });
}
