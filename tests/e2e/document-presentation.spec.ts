import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "esbuild";
import { createRequire } from "node:module";

// Playwright's JSX transform targets component-test descriptors, not React SSR.
// Bundle the real shared components with the application's automatic React JSX runtime.
let components: Record<string, any>;
test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: ["DocumentPrintHeader", "DocumentPrintStyles", "DocumentViewStyles", "DocumentWatermark", "PrintedFieldValue", "MeetingDocumentStyles", "SampleDocumentNotice", "ReportBrochurePrintStyles", "PptAgendaDocument"].map((name) => `export { ${name} } from './src/components/documents/${name}.tsx';`).join("\n") + "\nexport { ReportPathwayHeading, ReportPathwaySummary } from './src/components/documents/ReportPathwayIntro.tsx'; export { RecommendationCard } from './src/components/pathway/RecommendationCard.tsx'; export { PathwayReportBody } from './src/components/pathway/report/PathwayReportBody.tsx'; export { DemoOptionalReportDocument } from './src/components/demo/DemoOptionalReportDocument.tsx'; export { OPTIONAL_REPORT_EXAMPLE } from './src/lib/demo/optional-report-example.ts'; export { PathwayReport } from './src/components/demo/PathwayReport.tsx'; export { ValueCallout } from './src/components/value/ValueCallout.tsx'; export { DocumentLayoutStyles } from './src/components/documents/DocumentLayoutStyles.tsx'; export { ReportView } from './src/components/pathway/ReportView.tsx'; export { SourceChips } from './src/components/pathway/SourceChips.tsx'; export { ReportPhase4Sections } from './src/components/pathway/ReportPhase4Sections.tsx'; export { DEMO_INTAKE_CATEGORIES } from './src/lib/demo-extras.ts'; export { DEMO_STUDENTS } from './src/lib/demo-data.ts'; export { projectSharedReport } from './src/lib/shared-report-projection.ts'; export { richerSharedFixture } from './tests/fixtures/shared-report.ts'; export { recordGeneratedSections, recordSavedSections } from './src/lib/report-section-updates.ts'; export { getDemoProfile } from './src/lib/demo/demo-profiles.ts'; export { generatePathwayReport } from './src/lib/demo/pathway-engine.ts'; export { demoReportNextStepPreview } from './src/lib/demo/report-overview.ts'; import { RouterContextProvider, createRouter, createRootRoute, createMemoryHistory } from '@tanstack/react-router'; export function ReportFixtureRouter({children}) { const router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory({initialEntries: ['/']}) }); return <RouterContextProvider router={router}>{children}</RouterContextProvider>; }", resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic",
    external: ["react", "react-dom", "react/jsx-runtime"],
    alias: { "@": resolve("src") },
    plugins: [{ name: "explicit-document-fixture", setup(builder) {
      builder.onResolve({ filter: /^@tanstack\/react-start$/ }, () => ({ path: "start", namespace: "offline" }));
      builder.onLoad({ filter: /^start$/, namespace: "offline" }, () => ({ contents: "export function useServerFn(fn){return fn;}" }));
      builder.onResolve({ filter: /\.functions$/ }, args => ({
        path: args.path.startsWith("@/") ? resolve("src", args.path.slice(2) + ".ts") : resolve(args.resolveDir, args.path + ".ts"), namespace: "offline-functions",
      }));
      builder.onLoad({ filter: /.*/, namespace: "offline-functions" }, args => {
        const names = [...readFileSync(args.path, "utf8").matchAll(/export\s+(?:async\s+)?(?:const|function|type|interface|class)\s+(\w+)/g)].map(match => match[1]);
        return { contents: [...new Set(names)].map(name => name === "SUPPORTED_LANGUAGES" ? "export const SUPPORTED_LANGUAGES=[];" : `export const ${name}=()=>{throw new Error("Document QA forbids server calls");};`).join("\n") };
      });
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
          <h3 data-heading-plain>Recorded Context</h3>
          <h3 data-heading-icon><svg width="16" height="16" aria-hidden="true"><path d="M2 8h12" /></svg>Recorded Supports</h3>
          <div data-meeting-followups>
            <section data-meeting-short-section><header data-section-heading><h2>Questions to Discuss</h2></header>
              <ul><li>Which supports help the student complete the next task?</li><li>Who will record progress and when will the team review it?</li></ul>
            </section>
            <section data-meeting-short-section><h2>Next Steps</h2><p>Bring the recorded observations to the next review.</p></section>
          </div>
          <div data-meeting-summary-fields style="display:grid">
            <label data-meeting-summary-field><span>What We Discussed</span><p>Review the recorded support.</p></label>
            <label data-meeting-summary-field><span>Decisions Made</span><p>Try the written checklist.</p></label>
            <label data-meeting-summary-field><span>Documents to Update</span><p>Update the observation log.</p></label>
            <label data-meeting-summary-field><span>Next Meeting Date</span><p>2026-11-02</p></label>
          </div>
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
      const subheadingAlignment = async () => page.locator("[data-generated-document]").evaluate(root => {
        const textLeft = (element: Element) => {
          const node = Array.from(element.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())!;
          const range = document.createRange(); range.selectNodeContents(node);
          return range.getBoundingClientRect().left;
        };
        const plain = root.querySelector("[data-heading-plain]")!, decorated = root.querySelector("[data-heading-icon]")!;
        return { plain: textLeft(plain), decorated: textLeft(decorated), icon: decorated.querySelector("svg")!.getBoundingClientRect().left };
      });
      const screenAlignment = await subheadingAlignment();
      expect(Math.abs(screenAlignment.plain - screenAlignment.decorated)).toBeLessThan(1);
      expect(screenAlignment.icon).toBeGreaterThan(screenAlignment.decorated);
      await page.emulateMedia({ media: "print" });
      const printAlignment = await subheadingAlignment();
      expect(Math.abs(printAlignment.plain - printAlignment.decorated)).toBeLessThan(1);
      expect(printAlignment.icon).toBeGreaterThan(printAlignment.decorated);
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
      const followups = await page.locator("[data-meeting-followups]").evaluate(element => {
        const children = Array.from(element.children).map(child => child.getBoundingClientRect());
        return { widths: children.map(rect => rect.width), tops: children.map(rect => rect.top) };
      });
      expect(Math.abs(followups.widths[0] - followups.widths[1])).toBeLessThan(1);
      expect(Math.abs(followups.tops[0] - followups.tops[1])).toBeLessThan(1);
      const summaryFields = await page.locator("[data-meeting-summary-field]").evaluateAll(elements => elements.map(element => ({
        width: element.getBoundingClientRect().width, top: element.getBoundingClientRect().top,
        breakInside: getComputedStyle(element).breakInside,
      })));
      expect(summaryFields[0].width).toBeGreaterThan(summaryFields[1].width * 2);
      for (const field of summaryFields.slice(1)) {
        expect(Math.abs(field.width - summaryFields[1].width)).toBeLessThan(1);
        expect(Math.abs(field.top - summaryFields[1].top)).toBeLessThan(1);
        expect(field.breakInside).toBe("avoid");
      }
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
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("#demo-report-overview h2")).toHaveText("At a Glance");
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
        const grid = page.locator("#section-strengths_preferences_interests_needs [data-report-profile-details]");
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
      const checkGoalSpacing = async (columns: number) => {
        const layout = await page.locator('[data-report-recorded-goals]').evaluate(element => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
          cards: Array.from(element.children).map(card => {
            const s = getComputedStyle(card), rect = card.getBoundingClientRect();
            return { width: rect.width, top: s.paddingTop, bottom: s.paddingBottom, left: s.paddingLeft, right: s.paddingRight,
              clipped: card.scrollWidth > card.clientWidth + 1 };
          }),
        }));
        expect(layout.columns).toBe(columns);
        const facts = await page.locator('[data-report-recorded-goal] [data-report-goal-details]').evaluateAll(elements => elements.map(element => {
          const labels = Array.from(element.querySelectorAll('[data-report-goal-fact] > [data-document-subheading]'));
          return { columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
            tops: labels.map(label => label.getBoundingClientRect().top),
            clipped: labels.some(label => label.scrollWidth > label.clientWidth + 1) };
        }));
        for (const fact of facts) {
          expect(fact.tops).toHaveLength(2); expect(fact.clipped).toBe(false);
          if (fact.columns === 2) expect(Math.abs(fact.tops[0] - fact.tops[1])).toBeLessThan(1);
        }
        expect(layout.cards).toHaveLength(4);
        expect(Math.max(...layout.cards.map(card => card.width)) - Math.min(...layout.cards.map(card => card.width))).toBeLessThan(1);
        for (const card of layout.cards) {
          expect(card.top).toBe(card.bottom); expect(card.left).toBe(card.right); expect(card.clipped).toBe(false);
        }
      };
      const checkActionSpacing = async () => {
        const cards = await page.locator('[data-demo-next-step]').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          return { left: style.paddingLeft, right: style.paddingRight, top: style.paddingTop, bottom: style.paddingBottom,
            clipped: element.scrollWidth > element.clientWidth + 1 };
        }));
        expect(cards).toHaveLength(4);
        // Sam has one action per owner: each uses the available width.
        const grids = await page.locator('[data-demo-action-group] ul').evaluateAll(elements => elements.map(element => getComputedStyle(element).gridTemplateColumns.split(' ').length));
        expect(grids).toEqual([1, 1, 1, 1]);
        const headers = await page.locator('[data-demo-action-heading]').evaluateAll(elements => elements.map(element => {
          const box = element.getBoundingClientRect(), title = element.querySelector('h4')!.getBoundingClientRect(), badge = element.querySelector('div')!.getBoundingClientRect();
          return { left: Math.abs(title.left-box.left), right: Math.abs(badge.right-box.right) };
        }));
        for (const header of headers) { expect(header.left).toBeLessThan(1); expect(header.right).toBeLessThan(1); }
        for (const card of cards) { expect(card.left).toBe(card.right); expect(card.top).toBe(card.bottom); expect(card.clipped).toBe(false); }
      };
      await checkActionSpacing();
      await checkGoalSpacing(width < 640 ? 1 : 2);
      await checkReadinessSpacing(width < 640 ? 1 : 2);
      const checkFamilySpacing = async (columns: number) => {
        const grid = await page.locator('#section-family_action_plan [data-report-profile-details]').evaluate(element => ({
          columns: getComputedStyle(element).gridTemplateColumns.split(' ').map(Number.parseFloat),
          groups: Array.from(element.children).map(child => ({width: child.getBoundingClientRect().width, clipped: child.scrollWidth > child.clientWidth + 1})),
        }));
        expect(grid.columns).toHaveLength(columns);
        expect(grid.groups).toHaveLength(2);
        expect(Math.abs(grid.groups[0].width-grid.groups[1].width)).toBeLessThan(1);
        expect(grid.groups.every(group => !group.clipped)).toBe(true);
      };
      await checkFamilySpacing(width < 640 ? 1 : 2);
      await checkProfileSpacing(width < 640 ? 1 : 2);
      await checkVoiceSpacing();
      await page.emulateMedia({ media: "print" });
      await checkVoiceSpacing();
      await checkProfileSpacing(2);
      await checkFamilySpacing(2);
      await checkReadinessSpacing(2);
      await checkGoalSpacing(2);
      await expect(page.locator('[data-report-recorded-goal] > [data-report-goal-heading]')).toHaveCount(4);
      const goalHeadings = await page.locator('[data-report-recorded-goal] > h3').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, border: style.borderLeftWidth, left: style.paddingLeft,
          right: style.paddingRight, clipped: element.scrollWidth > element.clientWidth + 1 };
      }));
      expect(goalHeadings).toHaveLength(4);
      for (const heading of goalHeadings) {
        expect(heading.background).toBe('rgb(247, 242, 250)');
        expect(heading.border).toBe('2px');
        expect(heading.left).toBe(heading.right);
        expect(heading.clipped).toBe(false);
      }
      await checkActionSpacing();
      expect(await page.locator("[data-document-watermark]").evaluate(element => {
        const rect = element.getBoundingClientRect();
        return Math.abs(rect.top) < 1 && Math.abs(rect.right - window.innerWidth) < 1;
      })).toBe(true);
      await page.emulateMedia({ media: "screen" });
    }
  });
}


test("newer report plans and collapsed sources stay inside the printable document for every audience", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
    return route.fulfill({ status: 404, body: "" });
  });
  const plan = (role: string) => ({ intro: `Fictional ${role} planning steps`, horizons: {
    thirty_day: [`${role} thirty day action`], ninety_day: [`${role} ninety day action`],
    six_month: [`${role} six month action`], one_year: [`${role} one year action`],
  } });
  const report = { ...components.DEMO_STUDENTS.maya.report, schema_version: 2,
    teacher_action_plan: undefined, teacher_next_steps: ["Historical teacher step; not the newer role plan."],
    student_action_plan: plan("Student"), family_action_plan_v2: plan("Family"), educator_action_plan_v2: plan("Educator"),
    employment_pathway_recs: [{ title: "explore a supported job visit", summary: "Fictional career exploration example.",
      why: "A dated fictional observation supports discussing this option.", next_action: "Confirm an accessible visit before scheduling.",
      owner_role: "case_manager", timeframe: "30_day", discuss_at_next_meeting: true,
      sources: [{ kind: "profile", label: "Fictional profile observation" }],
    }],
    inputs_used: { profile: true, intake: true, student_voice_keys: ["fictional-response"], generated_at: "2026-10-06T12:00:00Z" },
  };
  for (const audience of ["student", "family", "educator"]) {
    await page.emulateMedia({ media: "screen" });
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Maya", report, demo: true, hasV2: true, initialAudience: audience }));
    await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${body}</div></main></body></html>`);
    await expect(page.getByRole("heading", { name: "Teacher Next Steps", exact: true })).toHaveCount(0);
    await expect(page.getByText("Historical teacher step; not the newer role plan.", { exact: true })).toHaveCount(0);
    const contents = page.getByRole("navigation", { name: "Table of contents" });
    const targets = await contents.locator('a[href^="#v2-"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
    expect(targets.length).toBeGreaterThan(2);
    for (const target of targets) await expect(page.locator(target)).toHaveCount(1);
    await contents.locator('a[href="#v2-family-plan"]').click();
    await expect(page).toHaveURL(/#v2-family-plan$/);
    const summary = page.locator(".exec-summary");
    const ownRole = audience[0].toUpperCase() + audience.slice(1);
    await expect(summary.getByText(`${ownRole} thirty day action`, { exact: true })).toBeVisible();
    for (const role of ["Student", "Family", "Educator"].filter(role => role !== ownRole)) {
      await expect(summary.getByText(`${role} thirty day action`, { exact: true })).toHaveCount(0);
    }
    const recommendation = page.locator("[data-report-recommendation]");
    const rationale = recommendation.locator("[data-report-recommendation-details]");
    if (audience !== "educator") await expect(rationale).toBeHidden();
    const sources = page.locator("#v2-inputs-used-body");
    await expect(sources).toBeHidden();
    const toggle = page.getByRole("button", { name: /Show all sources/ });
    // Export the default closed screen panel; every source must still print.
    await page.emulateMedia({ media: "print" });
    await expect(sources).toBeVisible();
    await expect(rationale).toBeVisible();
    const why = rationale.locator('[data-report-recommendation-field="why"]');
    const next = rationale.locator('[data-report-recommendation-field="next"]');
    const boxes = await Promise.all([why.boundingBox(), next.boundingBox()]);
    expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(1);
    expect(Math.abs(boxes[0]!.width - boxes[1]!.width)).toBeLessThan(1);
    expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x + boxes[0]!.width);
    const narrowLayout = await recommendation.evaluate(element => {
      const copy = element.cloneNode(true) as HTMLElement;
      element.after(copy);
      const display = getComputedStyle(element.querySelector("[data-report-recommendation-details]")!).display;
      copy.remove();
      return display;
    });
    expect(narrowLayout).toBe("block");


    expect(await recommendation.evaluate(element => Math.abs(element.getBoundingClientRect().width - element.parentElement!.getBoundingClientRect().width))).toBeLessThan(1);
    await expect(recommendation.getByText("A dated fictional observation supports discussing this option.", { exact: true })).toBeVisible();
    await expect(recommendation.getByText("Confirm an accessible visit before scheduling.", { exact: true })).toBeVisible();
    await expect(recommendation.getByText("Case manager", { exact: true })).toBeVisible();
    await expect(recommendation.getByRole("button")).toBeHidden();
    if (audience === "student") await expect(recommendation.getByText("Information Used", { exact: true })).toHaveCount(0);
    else {
      await expect(recommendation.getByText("Information Used", { exact: true })).toBeVisible();
      if (audience === "family") await expect(recommendation.getByText("Fictional profile observation", { exact: true })).toHaveCount(0);
      else await expect(recommendation.getByText("Fictional profile observation", { exact: true })).toBeVisible();
    }
    await expect(toggle).toBeHidden();
    expect(await sources.evaluate(element => !!element.closest(".report-root"))).toBe(true);
    for (const role of ["Student", "Family", "Educator"]) {
      const allowed = role === "Family" || (role === "Educator" ? audience === "educator" : audience !== "educator");
      for (const horizon of ["thirty day", "ninety day", "six month", "one year"]) {
        const planId = role === "Student" ? "v2-student-plan" : role === "Family" ? "v2-family-plan" : "v2-edu-plan";
        const item = page.locator(`#${planId}`).getByText(`${role} ${horizon} action`, { exact: true });
        if (allowed) {
          await expect(item).toBeVisible();
          expect(await item.evaluate(element => !!element.closest(".report-root"))).toBe(true);
        } else await expect(item).toHaveCount(0);
      }
    }
    await expect(sources.getByText("Student Voice", { exact: true })).toBeVisible();
    await expect(sources.getByText("1 response", { exact: true })).toBeVisible();
    expect(await sources.textContent()).not.toContain("fictional-response");
    const sourceAudit = await new AxeBuilder({ page }).include("#v2-inputs-used").analyze();
    expect(sourceAudit.violations.map(violation => violation.id)).toEqual([]);
  }
  // A missing newer role plan is not permission to substitute legacy teacher steps.
  const missingPlan = renderToStaticMarkup(createElement(components.ReportView, {
    name: "Maya", report: { ...report, educator_action_plan_v2: undefined }, demo: true, hasV2: true, initialAudience: "educator",
  }));
  await page.emulateMedia({ media: "screen" });
  await page.setContent(`<html><body>${missingPlan}</body></html>`);
  await expect(page.getByRole("heading", { name: "Teacher Next Steps", exact: true })).toHaveCount(0);
  await expect(page.getByText("Historical teacher step; not the newer role plan.", { exact: true })).toHaveCount(0);
  const legacy = renderToStaticMarkup(createElement(components.ReportView, {
    name: "Maya", report: { ...components.DEMO_STUDENTS.maya.report, teacher_action_plan: undefined,
      teacher_next_steps: ["Recorded legacy teacher next step."] }, demo: true, initialAudience: "educator",
  }));
  await page.setContent(`<html><body>${legacy}</body></html>`);
  await expect(page.getByRole("heading", { name: "Teacher Next Steps", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Teacher Next Steps", exact: true }).locator("xpath=ancestor::section[1]").getByText("Recorded legacy teacher next step.", { exact: true })).toBeVisible();

});


test("shared readers keep their designated audience and do not offer generation controls", async ({ page }) => {
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["family", "educator"]) {
    const body = renderToStaticMarkup(createElement(components.ReportFixtureRouter, {}, createElement(components.ReportView, {
      name: "Maya", report: components.DEMO_STUDENTS.maya.report,
      initialAudience: "student", fixedAudience: audience, readOnly: true,
      studentId: "synthetic-student", onSaveToProfile: () => {}, onRefresh: () => {}, onReset: () => {},
    })));
    await page.setContent(`<html><body>${body}</body></html>`);
    await expect(page.getByRole("tablist", { name: "Choose a report view" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pathway Assist", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Save to Student Profile", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Refresh Pathway Report", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Turn recommendations into next steps", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add to Actions", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Add to Calendar", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Print or save Pathway Report as PDF" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Create another report", exact: true })).toHaveCount(0);
    const expected = audience === "family" ? "A Plan for Maya." : "Meeting Guide — Maya";
    await expect(page.getByRole("heading", { name: expected, exact: true })).toBeVisible();
  }
  for (const audience of ["student", "family", "educator"]) {
    const body = renderToStaticMarkup(createElement(components.ReportFixtureRouter, {}, createElement(components.ReportView, {
      name: "Maya", report: components.DEMO_STUDENTS.maya.report, initialAudience: audience,
      studentId: "synthetic-student", onSaveToProfile: () => {}, onRefresh: () => {}, onReset: () => {},
    })));
    await page.setContent(`<html><body>${body}</body></html>`);
    await expect(page.getByRole("button", { name: "Save to Student Profile", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Refresh Pathway Report", exact: true })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Create another report", exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Turn recommendations into next steps", exact: true })).toHaveCount(1);
    expect(await page.getByRole("button", { name: "Add to Actions", exact: true }).count()).toBeGreaterThan(0);
  }

});


test("regenerated identity snapshots render without empty legacy labels for every audience", async ({ page }) => {
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const report = { ...components.DEMO_STUDENTS.maya.report, schema_version: 2,
    student_snapshot: { display_name: "Maya Rivera", grade: "12", school: "Fictional School", plan_type: "IEP",
      headline: "A recorded identity snapshot", last_updated: "2026-10-06" },
    plain_language_summary: "Fictional plain-language planning summary.",
    professional_summary: "Fictional professional planning summary.",
  };
  for (const audience of ["student", "family", "educator"]) {
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Maya", report, demo: true, hasV2: true, initialAudience: audience,
    }));
    await page.setContent(`<html><body>${body}</body></html>`);
    await expect(page.locator("#sec-snapshot")).toHaveCount(0);
    await expect(page.locator('a[href="#sec-snapshot"]')).toHaveCount(0);
    await expect(page.getByText("Grade 12", { exact: true })).toBeVisible();
    await expect(page.getByText("Fictional School", { exact: true })).toBeVisible();
    await expect(page.getByText("A recorded identity snapshot", { exact: true })).toBeVisible();
    const summary = page.getByText(audience === "educator" ? "Fictional professional planning summary." : "Fictional plain-language planning summary.", { exact: true });
    await expect(summary).toHaveCount(2);
    await expect(summary.nth(0)).toBeVisible();
    await expect(summary.nth(1)).toBeVisible();
    await expect(page.getByText("Where Maya Is Now", { exact: true })).toHaveCount(0);
  }
});


test("projected newer shared reports retain permitted plans and source counts on screen and in print", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
    return route.fulfill({ status: 404, body: "" });
  });
  for (const audience of ["family", "educator"]) {
    const report = components.projectSharedReport(components.richerSharedFixture(), audience);
    expect(report).toBeTruthy();
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "this student", report, hasV2: true, initialAudience: "student", fixedAudience: audience, readOnly: true,
    }));
    expect(body).not.toMatch(/a1111111|private-answer-key|Private notes|Hidden message/);
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ media: "screen" });
      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${body}</div></main></body></html>`);
      const contents = page.getByRole("navigation", { name: "Table of contents" });
      const targets = await contents.locator('a[href^="#v2-"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
      expect(targets.length).toBeGreaterThan(2);
      for (const target of targets) await expect(page.locator(target)).toHaveCount(1);
      await contents.locator('a[href="#v2-family-plan"]').click();
      await expect(page).toHaveURL(/#v2-family-plan$/);
      const summaries = page.getByText(audience === "family" ? "Family summary" : "Educator summary", { exact: true });
      await expect(summaries).toHaveCount(2);
      await expect(summaries.nth(0)).toBeVisible();
      await expect(summaries.nth(1)).toBeVisible();
      await expect(page.getByRole("tab")).toHaveCount(0);
      const resourceLink = page.locator("#v2-resources").getByRole("link", { name: "Open Resource: Explore a supported visit" });
      const partnerLink = page.locator("#v2-partners").getByRole("link", { name: "Open Program or Opportunity: Explore a supported visit" });
      await expect(resourceLink).toHaveAttribute("href", "https://example.org/resources/support-guide");
      await expect(partnerLink).toHaveAttribute("href", "https://example.org/programs/supported-visit");
      for (const link of [resourceLink, partnerLink]) {
        await expect(link).toHaveAttribute("target", "_blank");
        await expect(link).toHaveAttribute("rel", "noopener noreferrer");
        await expect(link).toBeVisible();
      }
      await expect(page.locator("#v2-resources").getByText("Family", { exact: true })).toBeVisible();
      await expect(page.locator("#v2-partners").getByText("Family", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator("#v2-inputs-used-body")).toBeHidden();
      await page.emulateMedia({ media: "print" });
      const sources = page.locator("#v2-inputs-used-body");
      await expect(sources).toBeVisible();
      await expect(sources.getByText("1 response", { exact: true })).toBeVisible();
      await expect(sources.getByText("1 document", { exact: true })).toBeVisible();
      await expect(sources.getByText("2 goals", { exact: true })).toBeVisible();
      const rec = page.locator("[data-report-recommendation]");
      await expect(rec.getByText("Discuss a visit", { exact: true })).toBeVisible();
      const fields = await Promise.all(["why", "next"].map(field => rec.locator(`[data-report-recommendation-field="${field}"]`).boundingBox()));
      expect(Math.abs(fields[0]!.y - fields[1]!.y)).toBeLessThan(1);
      expect(Math.abs(fields[0]!.width - fields[1]!.width)).toBeLessThan(1);

      await expect(resourceLink).toBeVisible();
      await expect(partnerLink).toBeVisible();
      await expect(page.locator("#v2-resources").getByText("Family", { exact: true })).toBeVisible();
      await expect(page.locator("#v2-partners").getByText("Family", { exact: true })).toBeVisible();
      if (audience === "family") {
        await expect(rec.getByText(/Information from 1 recorded source/)).toBeVisible();
        await expect(page.getByText("A recorded profile observation", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Educator steps", { exact: true })).toHaveCount(0);
      } else {
        await expect(rec.getByText("A recorded profile observation", { exact: true })).toBeVisible();
        await expect(page.getByText("Student steps", { exact: true })).toHaveCount(0);
      }
      await expect(page.getByText("Family steps", { exact: true }).first()).toBeVisible();
      expect(await new AxeBuilder({ page }).include("#v2-inputs-used").analyze().then(result => result.violations.map(item => item.id))).toEqual([]);
    }
  }
});

test("document-control labels stay grouped with readable values for each report audience", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 1000 });
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
    return route.fulfill({ status: 404, body: "" });
  });
  for (const audience of ["student", "family", "educator"]) {
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Maya", report: components.DEMO_STUDENTS.maya.report, demo: true, initialAudience: audience,
      meta: { reportId: "FICTIONAL-REPORT", confidentiality: "Fictional sample only. No real student records." },
    }));
    await page.setViewportSize({ width: 390, height: 900 });
    await page.emulateMedia({ media: "screen" });
    await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main>${body}</main></body></html>`);
    const details = page.locator("[data-report-document-details]");
    await expect(details.getByText("How This Was Prepared", { exact: true })).toBeVisible();
    expect(await details.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.emulateMedia({ media: "print" });
    const geometry = await details.evaluate(element => {
      const children = Array.from(element.children).map(child => child.getBoundingClientRect());
      return { keep: getComputedStyle(element).breakInside, widths: children.map(child => child.width), tops: children.map(child => child.top) };
    });
    expect(geometry.keep).toBe("avoid");
    // Closing copy must stay readable rather than shrink to reduce page count.
    const closingType = await details.locator("p + p").evaluateAll(elements => elements.map(el => ({
      size: parseFloat(getComputedStyle(el).fontSize), line: parseFloat(getComputedStyle(el).lineHeight),
    })));
    expect(closingType.every(value => value.size >= 14 && value.line >= 19)).toBe(true);
    const disclaimer = page.locator("[data-report-planning-disclaimer] > p + p");
    expect(await disclaimer.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    expect(await disclaimer.evaluate(el => parseFloat(getComputedStyle(el).lineHeight))).toBeGreaterThanOrEqual(19);
    expect(Math.max(...geometry.widths) - Math.min(...geometry.widths)).toBeLessThan(1);
    expect(Math.max(...geometry.tops) - Math.min(...geometry.tops)).toBeLessThan(1);
    const typography = await details.evaluate(element => ({
      label: parseFloat(getComputedStyle(element.querySelector("p")!).fontSize),
      value: parseFloat(getComputedStyle(element.querySelector("p + p")!).fontSize),
      valueLine: parseFloat(getComputedStyle(element.querySelector("p + p")!).lineHeight),
    }));
    expect(await details.evaluate(element => Array.from(element.querySelectorAll("p")).every(paragraph => paragraph.scrollWidth <= paragraph.clientWidth + 1))).toBe(true);
    expect(typography.label).toBeGreaterThanOrEqual(11.3);
    expect(typography.value).toBeGreaterThanOrEqual(12);
    expect(typography.valueLine).toBeGreaterThanOrEqual(15);
    expect(await page.locator("[data-report-document-footer] > div:last-child").evaluate(element => getComputedStyle(element).breakBefore)).toBe("avoid");
    expect(await page.locator("[data-report-labeled-field]").evaluateAll(elements => elements.length > 0 && elements.every(element => getComputedStyle(element).breakInside === "avoid" && getComputedStyle(element.querySelector("p")!).breakAfter === "avoid"))).toBe(true);
    const badges = page.locator("#sec-opportunities .inline-flex:has(svg)");
    expect(await badges.evaluateAll(elements => elements.length > 0 && elements.every(element => getComputedStyle(element).whiteSpace === "nowrap" && getComputedStyle(element).flexShrink === "0"))).toBe(true);
    await expect(details.getByText(/AI-drafted from the student's/)).toBeVisible();
    await expect(details.getByText("Fictional sample only. No real student records.", { exact: true })).toBeVisible();
  }
});

test("complete action-plan export includes later periods for every audience without repeating identical steps", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
    return route.fulfill({ status: 404, body: "" });
  });
  const step = (week: number, action: string) => ({ week, action, focus: "Recorded Next Step", owner: "School Team",
    time: "20 minutes", details: [`Recorded detail ${week}`], outcome: `Recorded outcome ${week}`,
    familyActions: [`Recorded family action ${week}`], teacherActions: [`Recorded educator action ${week}`],
    readiness: { category: "Self-Advocacy", level: "developing", metric: `Recorded progress measure ${week}` },
  });
  const first = step(1, "First month step"), second = step(5, "Second month step"), third = step(9, "Third month step");
  const plans = { thirty: [first], sixty: [first, second], ninety: [first, second, third] };
  for (const audience of ["student", "family", "educator"]) {
    await page.emulateMedia({ media: "screen" });
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Maya", report: components.DEMO_STUDENTS.maya.report, demo: true, initialAudience: audience, extendedPlans: plans,
    }));
    await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${body}</div></main></body></html>`);
    const section = page.locator("#sec-thirty-day");
    const exported = section.locator("[data-report-complete-plan]");
    await expect(exported).toBeHidden();
    await expect(section.getByRole("group", { name: "Action Plan Timeframe" })).toBeVisible();
    await expect(section.getByText("First month step", { exact: true }).first()).toBeVisible();
    await expect(section.getByText("Second month step", { exact: true })).toBeHidden();
    await page.emulateMedia({ media: "print" });
    await expect(exported).toBeVisible();
    await expect(section.getByRole("group", { name: "Action Plan Timeframe" })).toBeHidden();
    await expect(exported.locator("[data-report-plan-step]")).toHaveCount(3);
    const firstStep = exported.locator("[data-report-plan-step]").first();
    const printType = await firstStep.evaluate(element => ({
      label: parseFloat(getComputedStyle(element.querySelector("[data-report-plan-label]")!).fontSize),
      body: parseFloat(getComputedStyle(element.querySelector("[data-report-plan-details] li")!).fontSize),
      week: element.querySelector("[data-report-plan-week]")!.getBoundingClientRect().width,
    }));
    expect(printType.label).toBeGreaterThanOrEqual(12);
    expect(printType.body).toBeGreaterThanOrEqual(14);
    expect(printType.week).toBeLessThan(40);
    const weekLabel = await firstStep.locator("[data-report-plan-week] > span").first().evaluate(element => {
      const range = document.createRange(); range.selectNodeContents(element);
      const label = range.getBoundingClientRect(), badge = element.parentElement!.getBoundingClientRect();
      return { lines: range.getClientRects().length, left: label.left - badge.left, right: badge.right - label.right, transform: getComputedStyle(element).textTransform };
    });
    expect(weekLabel.lines).toBe(1);
    expect(weekLabel.left).toBeGreaterThanOrEqual(0);
    expect(weekLabel.right).toBeGreaterThanOrEqual(0);
    expect(weekLabel.transform).toBe("none");
    const columns = await firstStep.evaluate(element => {
      const details = element.querySelector("[data-report-plan-details]")!.getBoundingClientRect();
      const actions = element.querySelector("[data-report-plan-actions]")!.getBoundingClientRect();
      const readiness = element.querySelector("[data-report-plan-readiness]")!.getBoundingClientRect();
      return { widths: [details.width, actions.width, readiness.width], right: [actions.left, readiness.left], overflow: element.scrollWidth > element.clientWidth };
    });
    expect(Math.max(...columns.widths) - Math.min(...columns.widths)).toBeLessThan(1);
    expect(Math.abs(columns.right[0] - columns.right[1])).toBeLessThan(1);
    expect(columns.overflow).toBe(false);


    for (const item of [first, second, third]) {
      await expect(exported.getByText(item.action, { exact: true })).toBeVisible();
      await expect(exported.getByText(item.details[0], { exact: true })).toBeVisible();
      await expect(exported.getByText(item.outcome, { exact: true })).toBeVisible();
      await expect(exported.getByText(item.familyActions[0], { exact: true })).toBeVisible();
      await expect(exported.getByText(item.teacherActions[0], { exact: true })).toBeVisible();
    }
    await expect(exported.locator("[data-report-export-period]")).toHaveCount(3);
    expect(await page.locator(".pub-pullquote blockquote").first().evaluate(element => getComputedStyle(element, "::before").display)).toBe("none");
  }
});


test("recorded action plans stay readable without fabricated detail in every audience", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
    return route.fulfill({ status: 404, body: "" });
  });

  const report = { ...components.DEMO_STUDENTS.maya.report, thirty_day_plan: [
    { week: 1, action: "Discuss the student's recorded interests and support needs with the team." },
    { week: 4, action: "Review the recorded progress and agree on the next step together." },
  ] };
  for (const audience of ["student", "family", "educator"]) for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Maya", report, demo: true, initialAudience: audience }));
    await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main>${body}</main></body></html>`);
    const section = page.locator("#sec-thirty-day");
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const plan = media === "screen" ? section.locator("ol.print\\:hidden") : section.locator("[data-report-complete-plan]");
      await expect(plan).toBeVisible();
      await expect(plan.locator("[data-report-plan-step]")).toHaveCount(2);
      for (const action of report.thirty_day_plan) await expect(plan.getByText(action.action, { exact: true })).toBeVisible();
      for (const marker of ["meta", "details", "actions", "readiness"]) await expect(plan.locator(`[data-report-plan-${marker}]`)).toHaveCount(0);
      expect(await plan.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(await plan.locator("h3").first().evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(14);
    }
    await expect(section.locator('[data-report-export-period="sixty"], [data-report-export-period="ninety"]')).toHaveCount(0);
    await expect(section.getByRole("group", { name: "Action Plan Timeframe" })).toHaveCount(0);
  }
});


test("actual PPT guide preserves content and symmetric layout in sample and recorded modes", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    return pathname.startsWith("/brand/")
      ? route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" })
      : route.fulfill({ status: 404, body: "" });
  });
  for (const role of ["Family", "Educator"]) {
    const agenda = {
      opening_note: `${role}: review the student's strengths and dated observations together.`,
      agenda: ["Student Voice", "Progress Review", "Supports to Try", "Agreed Next Steps"].map((title, i) => ({ title, minutes: 5 + i, purpose: `Discuss ${title.toLowerCase()} using the student's current records. ` + "Keep the student's preferences and documented support needs visible. ".repeat(8) })),
      questions_to_ask: Array.from({ length: 4 }, (_, i) => `${role} question ${i + 1}: who will record the observation and review the next step?`),
      evidence_to_bring: ["Dated work samples", "Current support plan", "Observation reference: " + "sample-reference-".repeat(35)],
      language_that_works: Array.from({ length: 3 }, (_, i) => `${role} script ${i + 1}: can we agree on the evidence, the support to try and a review date?`),
      if_things_get_stuck: "Pause and restate the student's priorities. Ask the team to record areas of agreement and the evidence still needed.",
    };
    const exactFields = [agenda.opening_note, ...agenda.agenda.map(item => item.purpose), ...agenda.questions_to_ask, ...agenda.evidence_to_bring, agenda.if_things_get_stuck];
    for (const width of [390, 1024]) {
      const modeGeometry: unknown[] = [];
      for (const sample of [false, true]) {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ media: "screen" });
        const markup = renderToStaticMarkup(createElement(components.PptAgendaDocument, {
          name: "Fictional Student", agenda, studentId: sample ? null : "fictional-student", meetingDate: null, sample,
          partnerContent: sample ? undefined : createElement("p", null, "Fictional contact: confirm availability with the recorded support team."),
          onAddAction: async () => { throw new Error("No record writes during document QA"); },
        }));
        await page.setContent(`<html><head><base href="http://document-fixture.test"><style>${css}</style></head><body>${markup}</body></html>`);
        const doc = page.locator("[data-ppt-print-packet]");
        await expect(doc.getByRole("heading", { name: "Your Meeting Guide for Fictional Student" })).toBeVisible();
        await expect(doc.getByRole("heading", { name: "Your Meeting Plan", exact: true })).toBeVisible();
        await expect(page.locator("[data-document-sample-notice]")).toHaveCount(sample ? 1 : 0);
        await expect(doc.getByRole("button", { name: "+ Action", exact: true })).toHaveCount(sample ? 0 : 7);
        for (const field of exactFields) await expect(doc.getByText(field, { exact: true })).toBeVisible();
        for (const script of agenda.language_that_works) await expect(doc.getByText(`"${script}"`, { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const geometry = await doc.locator("[data-document-columns]").evaluate(element => {
          const style = getComputedStyle(element);
          const children = Array.from(element.children).map(child => child.getBoundingClientRect().width);
          return { columns: style.gridTemplateColumns, children };
        });
        if (width === 1024) expect(Math.abs(geometry.children[0] - geometry.children[1])).toBeLessThan(1);
        modeGeometry.push(geometry);
        if (role === "Family" && width === 1024 && sample) {
          await page.screenshot({ path: test.info().outputPath("ppt-meeting-guide-screen.png"), fullPage: true });
        }
        await page.emulateMedia({ media: "print" });
        for (const field of exactFields) await expect(doc.getByText(field, { exact: true })).toBeVisible();
        await expect(doc.getByRole("button", { name: "Print / save as PDF" })).toBeHidden();
        if (!sample) await expect(doc.getByRole("button", { name: "+ Action", exact: true }).first()).toBeHidden();
        await expect(doc.locator("[data-document-watermark]")).toBeVisible();
        expect(await doc.locator("[data-document-watermark]").evaluate(element => {
          const style = getComputedStyle(element);
          return style.position === "fixed" && style.top === "0px" && style.right === "0px" && Number(style.opacity) <= 0.1;
        })).toBe(true);
        expect(await doc.locator("[data-document-columns]").evaluate(element => {
          const widths = Array.from(element.children).map(child => child.getBoundingClientRect().width);
          return Math.abs(widths[0] - widths[1]) < 1;
        })).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
      expect(modeGeometry[0]).toEqual(modeGeometry[1]);
    }
  }
});

test("complete source labels and counts remain readable on screen and in print", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  const label = ("A complete recorded observation: " + "Evidence".repeat(26)).slice(0, 240);
  const body = renderToStaticMarkup(createElement("div", { className: "report-shell" }, createElement("section", { className: "report-root p-4", "data-generated-document": true },
    createElement(components.DocumentViewStyles),
    createElement(components.SourceChips, { sources: [{ kind: "iep_extraction", label, id: "private-record" }] }),
    createElement(components.SourceChips, { sources: [], sourceCount: 2 }),
  )));
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const width of [390, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await page.setContent(`<html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`);
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const source = page.getByText(label, { exact: true });
      await expect(source).toBeVisible();
      expect(await source.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      await expect(page.getByText("Information from 2 recorded sources.", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(await page.locator("body").textContent()).not.toContain("private-record");
    }
  }
});


test("complete sample source index is readable for every planning audience", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const studentId of ["jordan", "maya"]) {
    for (const audience of ["student", "family", "educator"]) {
      const body = renderToStaticMarkup(createElement("main", { className: "report-shell" },
        createElement("div", { className: "report-root", "data-generated-document": true },
          createElement(components.DocumentViewStyles), createElement(components.ReportBrochurePrintStyles),
          createElement(components.ReportPhase4Sections, { studentId, audience }))));
      for (const width of [390, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.setContent(`<html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`);
        for (const media of ["screen", "print"] as const) {
          await page.emulateMedia({ media });
          const source = page.locator("#sec-source-notes");
          expect(await page.locator('.pub-page-kicker').allTextContents()).not.toEqual(expect.arrayContaining([expect.stringMatching(/^Section \d+$/)]));
          if (media === "print") {
            expect(await source.locator("[data-report-source-entry]").evaluateAll(rows => rows.every(row => getComputedStyle(row).breakInside === "avoid"))).toBe(true);
          }
          for (const item of components.DEMO_INTAKE_CATEGORIES[studentId]) {
            await expect(source.getByText(item.category, { exact: true })).toBeVisible();
          }
          await expect(source.getByText("Sample Pathway Builder Responses", { exact: true })).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
      }
    }
  }
});

test("complete recorded team questions retain role visibility on screen and in print", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const questions = [
    ...Array.from({ length: 10 }, (_, i) => ({ question: `Recorded team question ${i + 1}?`, for_audience: "team", why: `Context for recorded question ${i + 1}.` })),
    { question: "Recorded educator question?", for_audience: "educator" },
    { question: "Recorded family question?", for_audience: "family" },
  ];
  for (const audience of ["student", "family", "educator"]) {
    const original = { ...components.richerSharedFixture(), meeting_prep_questions: questions };
    for (const shared of audience === "student" ? [false] : [false, true]) {
      const report = shared ? components.projectSharedReport(original, audience) : original;
      const body = renderToStaticMarkup(createElement(components.ReportView, {
        name: "Fictional Student", report, hasV2: true, demo: !shared, readOnly: shared,
        initialAudience: audience, fixedAudience: shared ? audience : undefined,
      }));
      for (const width of [390, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        await page.setContent(`<html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`);
        for (const media of ["screen", "print"] as const) {
          await page.emulateMedia({ media });
          const section = page.locator("[data-report-team-questions]");
          await expect(section.locator('a[href="#v2-meeting-qs"]')).toBeVisible();
          await expect(section.locator('[data-value-callout-question]')).toHaveCount(0);
          if (media === "print") expect(await section.evaluate(element => getComputedStyle(element).breakInside)).toBe("avoid");
          const questionsSection = page.locator("#v2-meeting-qs");
          const continuation = page.locator(".pub-page:has(#v2-meeting-qs) > [data-publication-continuation]");
          await expect(continuation).toHaveCount(1);
          await expect(continuation.locator("thead").getByRole("heading", { name: "Meeting Prep Questions", level: 2 })).toBeVisible();
          expect(await continuation.evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table" : "block");
          expect(await continuation.locator("thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
          await expect(continuation.getByRole("columnheader")).toHaveCount(0);
          if (media === "print") expect(await continuation.locator("tbody > tr").evaluate(element => getComputedStyle(element).breakInside)).toBe("auto");
          if (media === "print") expect(await questionsSection.locator("li").evaluateAll(elements => elements.every(element => getComputedStyle(element).breakInside === "avoid"))).toBe(true);
          if (media === "print") expect(await questionsSection.locator("li").evaluateAll(elements => elements.every(element => parseFloat(getComputedStyle(element).paddingTop) <= 8 && parseFloat(getComputedStyle(element.querySelector("p.mt-1")!).fontSize) >= 14))).toBe(true);
          for (let i = 1; i <= 10; i++) {
            await expect(page.getByText(`Recorded team question ${i}?`, { exact: true })).toHaveCount(1);
            await expect(questionsSection.getByText(`Recorded team question ${i}?`, { exact: true })).toBeVisible();
            expect(await questionsSection.getByText(`Context for recorded question ${i}.`, { exact: true }).count()).toBe(audience === "student" ? 0 : 1);
          }
          expect(await questionsSection.getByText("Recorded educator question?", { exact: true }).count()).toBe(audience === "educator" ? 1 : 0);
          expect(await questionsSection.getByText("Recorded family question?", { exact: true }).count()).toBe(audience === "student" ? 0 : 1);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
      }
    }
  }
});

test("qualitative readiness and recorded confidence stay readable without invented measurements", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const original = { ...components.richerSharedFixture(),
    readiness_indicators: [...["emerging", "developing", "progressing", "ready"].map(level => ({ domain: `Recorded ${level} area`, level, note: `Recorded ${level} observation` })), { domain: "Additional recorded area", level: "ready", note: "Additional recorded observation" }],
    confidence_level: "high",
    confidence: { overall: "low", rationale: "Recorded explanation based on an earlier observation.", caveats: ["A current team review is still needed."] },
  };
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const report = shared ? components.projectSharedReport(original, audience) : original;
    expect(report).toBeTruthy();
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Fictional Student", report, hasV2: true, demo: !shared, readOnly: shared,
      initialAudience: audience, fixedAudience: shared ? audience : undefined,
    }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${body}</div></main></body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        const readiness = page.locator("#v2-readiness-indicators");
        for (const level of ["emerging", "developing", "progressing", "ready"]) {
          await expect(readiness.getByText(`Recorded ${level} area`, { exact: true })).toBeVisible();
          await expect(readiness.getByText(`Recorded ${level} observation`, { exact: true })).toBeVisible();
          const badge = readiness.locator(`[data-report-readiness-level="${level}"]`).first();
          await expect(badge).toHaveText(level.charAt(0).toUpperCase() + level.slice(1));
          await expect(badge.locator('svg[aria-hidden="true"]')).toHaveCount(1);
          expect(await badge.evaluate(element => parseFloat(getComputedStyle(element).borderRadius) >= element.getBoundingClientRect().height / 2)).toBe(true);
        }
        await expect(readiness.getByText("Additional recorded observation", { exact: true })).toBeVisible();
        expect(await readiness.locator("[data-report-section-icon]").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "none" : "flex");
        const rows = readiness.locator("[data-report-readiness-row]");
        const layout = await rows.evaluateAll(elements => elements.map(element => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, noteWidth: element.querySelector("p:last-child")!.getBoundingClientRect().width, fontSize: getComputedStyle(element.querySelector("p:last-child")!).fontSize };
        }));
        if (media === "print") {
          expect(Math.abs(layout[0].y - layout[1].y)).toBeLessThan(1);
          expect(Math.abs(layout[2].y - layout[3].y)).toBeLessThan(1);
          expect(Math.abs(layout[0].width - layout[1].width)).toBeLessThan(1);
          expect(layout[1].x).toBeGreaterThan(layout[0].x + layout[0].width);
          expect(Math.abs(layout[4].width - (layout[1].x + layout[1].width - layout[0].x))).toBeLessThan(1);
          expect(layout[0].fontSize).toBe("14px");
          expect(layout.every(row => Math.abs(row.width - row.noteWidth) < 1)).toBe(true);
        } else {
          expect(layout.every(row => Math.abs(row.x - layout[0].x) < 1)).toBe(true);
          expect(layout[1].y).toBeGreaterThan(layout[0].y);
        }
        expect(await readiness.locator('[style*="width"]').count()).toBe(0);
        const confidence = page.locator("#v2-confidence");
        await expect(page.locator('.print-cover-footer-tag')).toHaveText("Low Confidence");
        await expect(page.locator('.fb-cover')).toContainText("Low Confidence");
        await expect(page.locator('section[aria-label="Student Snapshot"]')).toContainText("Low Confidence");
        await expect(confidence.getByText("Low Confidence", { exact: true })).toBeVisible();
        await expect(page.locator('#sec-pathways')).not.toContainText("High Confidence");
        await expect(page.locator('#sec-pathways')).not.toContainText("Low Confidence");
        await expect(confidence.getByText(original.confidence.rationale, { exact: true })).toBeVisible();
        await expect(confidence.getByText(original.confidence.caveats[0], { exact: true })).toBeVisible();
        expect(await confidence.textContent()).not.toContain("comprehensive and recent");
        if (media === "print") expect(await confidence.evaluate(element => getComputedStyle(element).breakInside)).toBe("avoid");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  }
});


test("complete best-fit explanation matches screen and print for planning and shared readers", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const explanation = "A recorded observation explains how the student's interests and support needs inform this direction. ".repeat(20) + "Final recorded consideration: review the visit with the team.";
  const original = structuredClone(components.DEMO_STUDENTS.maya.report);
  original.recommended_pathways[0].why_it_fits = explanation;
  for (const audience of ["student", "family", "educator"]) for (const mode of audience === "student" ? ["demo", "live"] : ["demo", "live", "shared"]) {
    const shared = mode === "shared";
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Fictional Student", report, hasV2: false, demo: mode === "demo", readOnly: shared,
      initialAudience: audience, fixedAudience: shared ? audience : undefined,
    }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body>${body}</body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        const paragraph = page.locator("[data-report-best-fit-explanation]");
        await expect(paragraph).toHaveText(explanation);
        expect(await paragraph.evaluate(element => {
          const style = getComputedStyle(element);
          return { complete: element.scrollHeight <= element.clientHeight + 1, clamp: style.webkitLineClamp };
        })).toEqual({ complete: true, clamp: "none" });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  }
});


test("report recommendations align in standalone and route wrappers across role readers", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["student", "family", "educator"]) for (const mode of audience === "student" ? ["demo", "live"] : ["demo", "live", "shared"]) {
    const shared = mode === "shared";
    const original = components.richerSharedFixture();
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, demo: mode === "demo", readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    for (const wrapper of ["", "report-shell eh-issue"]) {
      await page.setContent(`<html><head><style>${css}</style></head><body><main class="site-shell-main"><div class="${wrapper}">${body}</div></main></body></html>`);
      await page.emulateMedia({ media: "print" });
      if (wrapper) {
        expect(await page.locator(".eh-issue").evaluate(element => getComputedStyle(element, "::before").display)).toBe("none");
      }
      const checkMarkerContrast = async () => {
        const ratios = await page.locator(".pub-checklist-tick").evaluateAll(markers => markers.map(marker => {
          const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d")!;
          const rgba = (value: string) => {
            ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = value; ctx.fillRect(0, 0, 1, 1);
            return Array.from(ctx.getImageData(0, 0, 1, 1).data);
          };
          let background = [255, 255, 255];
          const chain: Element[] = [];
          for (let element: Element | null = marker; element; element = element.parentElement) chain.unshift(element);
          for (const element of chain) {
            const color = rgba(getComputedStyle(element).backgroundColor), alpha = color[3] / 255;
            background = background.map((channel, i) => color[i] * alpha + channel * (1 - alpha));
          }
          const ink = rgba(getComputedStyle(marker).color), alpha = ink[3] / 255;
          const foreground = background.map((channel, i) => ink[i] * alpha + channel * (1 - alpha));
          const luminance = (color: number[]) => color.map(channel => {
            const value = channel / 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
          }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
          const a = luminance(foreground), b = luminance(background);
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        }));
        expect(ratios.length).toBeGreaterThan(0);
        expect(Math.min(...ratios), `${audience}/${mode}/${wrapper}: checklist contrast`).toBeGreaterThanOrEqual(3);
      };
      await checkMarkerContrast();
      for (const selector of ["[data-report-pathway-introduction]", "[data-report-recommendation]"]) {
        expect(await page.locator(selector).count()).toBeGreaterThan(0);
        expect(await page.locator(selector).evaluateAll(elements => elements.every(element => getComputedStyle(element).breakInside === "avoid"))).toBe(true);
      }
      await expect(page.locator("[data-report-pathway-pages]")).toHaveCount(original.recommended_pathways.length);
      for (const pathway of original.recommended_pathways) {
        const table = page.locator("[data-report-pathway-pages]").filter({ hasText: pathway.title });
        await expect(table).toHaveAttribute("role", "presentation");
        expect(await table.locator("thead").evaluate(element => getComputedStyle(element).display)).toBe("table-header-group");
        const detailColumns = await table.locator(".pub-spread-lead > div").evaluate(element => {
          const cards = Array.from(element.children).map(child => child.getBoundingClientRect());
          return { display: getComputedStyle(element).display, columns: getComputedStyle(element).gridTemplateColumns.split(" ").length, widths: cards.map(card => card.width), tops: cards.map(card => card.top), bottoms: cards.map(card => card.bottom) };
        });
        expect(detailColumns.display).toBe("grid");
        expect(detailColumns.columns).toBe(2);
        expect(Math.max(...detailColumns.widths) - Math.min(...detailColumns.widths)).toBeLessThan(1);
        for (let i = 0; i + 1 < detailColumns.tops.length; i += 2) {
          expect(Math.abs(detailColumns.tops[i] - detailColumns.tops[i + 1])).toBeLessThan(1);
          expect(Math.abs(detailColumns.bottoms[i] - detailColumns.bottoms[i + 1])).toBeLessThan(1);
        }
        const columnHeadings = await table.locator(".pub-spread").evaluate(element => {
          const first = element.querySelector("[data-document-subheading]")!;
          const action = element.querySelector(".pub-sidebar-label")!;
          return [first.getBoundingClientRect().top, action.getBoundingClientRect().top];
        });
        expect(Math.abs(columnHeadings[0] - columnHeadings[1])).toBeLessThan(1);


        for (const value of [pathway.why_it_fits, ...pathway.related_strengths, ...pathway.possible_barriers, ...pathway.supports_needed, ...pathway.school_experiences, ...pathway.community_experiences, ...pathway.courses_or_programs, ...pathway.career_clusters, ...pathway.credentials, ...pathway.partner_resources, ...Object.values(pathway.action_steps).flat()]) {
          expect(await table.textContent()).toContain(value);
        }
      }
      expect(await page.locator(".pub-sidebar-label, .pub-callout-label").evaluateAll(elements => elements.length > 0 && elements.every(element => getComputedStyle(element).breakAfter === "avoid"))).toBe(true);
      expect(await page.locator(".pub-sidebar-body, .pub-callout-body").evaluateAll(elements => elements.length > 0 && elements.every(element => getComputedStyle(element).breakBefore === "avoid"))).toBe(true);
      await page.emulateMedia({ media: "screen" });
      if (wrapper) {
        expect(await page.locator(".eh-issue").evaluate(element => getComputedStyle(element, "::before").display)).toBe("block");
      }
      await checkMarkerContrast();
      expect(await page.locator("[data-report-pathway-introduction]").evaluateAll(elements => elements.every(element => getComputedStyle(element).breakInside === "auto"))).toBe(true);
      expect(await page.locator("[data-report-pathway-pages] > thead").evaluateAll(elements => elements.every(element => getComputedStyle(element).display === "block"))).toBe(true);
      for (const width of [390, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        if (width >= 880) {
          const offsets = await page.locator("[data-report-pathway-pages]").evaluateAll(tables => tables.map(table => {
            const detail = table.querySelector("[data-document-subheading]")!.getBoundingClientRect();
            const action = table.querySelector(".pub-sidebar-label")!.getBoundingClientRect();
            return Math.abs(detail.top - action.top);
          }));
          expect(offsets.every(offset => offset <= 1), `${audience}/${mode}/${wrapper}: ${offsets}`).toBe(true);
        }
      }
    }
  }
});


test("legacy readiness has recorded levels and full details without percentage bars or reset chapter numbers", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const original = components.richerSharedFixture();
  for (const audience of ["student", "family", "educator"]) for (const mode of audience === "student" ? ["demo", "live"] : ["demo", "live", "shared"]) {
    const shared = mode === "shared";
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, demo: mode === "demo", readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        const readiness = page.locator("#sec-readiness");
        const education = page.locator("#sec-education");
        for (const option of original.education_training_options) expect(await education.textContent()).toContain(option);
        const careers = page.locator("[data-report-career-pages]");
        await expect(careers).toHaveCount(original.career_matches.length);
        for (const career of original.career_matches) {
          const table = careers.filter({ hasText: career.cluster });
          await expect(table).toHaveAttribute("role", "presentation");
          expect(await table.locator("thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
          for (const value of [career.education_needed, career.work_environment, career.next_step, ...career.example_jobs, ...career.skills_required, ...career.accommodations]) expect(await table.textContent()).toContain(value);
        }
        await expect(readiness.getByRole("progressbar")).toHaveCount(0);
        for (const row of original.readiness_scorecard) {
          for (const field of [row.evidence, row.what_it_means, row.growth_activity, row.suggested_goal]) expect(await readiness.textContent()).toContain(field);
        }
        if (media === "print") {
          for (const selector of ["#sec-education", "[data-report-readiness-row]", "[data-report-profile-summary]", "[data-report-evidence-gap]", "[data-report-career-match]"]) {
            const grouping = await page.locator(selector).evaluateAll(elements => elements.map(element => getComputedStyle(element).breakInside));
            expect(grouping.length).toBeGreaterThan(0);
            expect(grouping.every(value => value === "avoid")).toBe(true);
          }
          for (const selector of [".report-stage:has(#sec-thirty-day)", "#v2-inputs-used", ".pub-page:has([data-report-role-plan])", "[data-report-closing-package]"]) {
            const grouping = await page.locator(selector).evaluateAll(elements => elements.map(element => getComputedStyle(element).breakInside));
            expect(grouping.length).toBeGreaterThan(0);
            expect(grouping.every(value => value === "avoid")).toBe(true);
          }
          await expect(page.locator("[data-report-closing-package] [data-document-closing]")).toHaveCount(1);
          await expect(page.locator("[data-report-closing-package] [data-report-document-footer]")).toHaveCount(1);
          const evidence = await page.locator("[data-report-evidence-grid]").evaluate(element => {
            const cards = [...element.children].map(card => card.getBoundingClientRect());
            return { display: getComputedStyle(element).display, widths: cards.map(card => card.width), tops: cards.map(card => card.top) };
          });
          expect(evidence.display).toBe("grid");
          expect(Math.max(...evidence.widths) - Math.min(...evidence.widths)).toBeLessThan(1);
          expect(Math.max(...evidence.tops) - Math.min(...evidence.tops)).toBeLessThan(1);
          const actions = await page.locator("[data-report-plan-heading] h3").evaluateAll(elements => elements.map(element => getComputedStyle(element).breakAfter));
          expect(actions.length).toBeGreaterThan(0);
          expect(actions.every(value => value === "auto")).toBe(true);
        }
        expect(await page.locator(".pub-page-kicker").evaluateAll(elements => elements.some(element => /^Section \d+$/.test(element.textContent ?? "")))).toBe(false);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  }
});


test("printed goal follow-ups use balanced columns without changing screen details", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["student", "family", "educator"]) for (const mode of audience === "student" ? ["demo", "live"] : ["demo", "live", "shared"]) {
    const original = components.richerSharedFixture();
    const shared = mode === "shared";
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, demo: mode === "demo", readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
      await page.emulateMedia({ media: "print" });
      const goals = page.locator("[data-report-printed-goals]");
      await expect(goals.locator('[data-report-goal-heading]')).toHaveCount(original.postsecondary_goals.length);
      expect(await goals.locator("[data-report-goal-followups]").count()).toBe(original.postsecondary_goals.length);
      for (const goal of original.postsecondary_goals) for (const value of [...goal.next_steps, ...goal.who_supports, ...goal.evidence_needed]) expect(await goals.textContent()).toContain(value);
      const geometry = await goals.locator("[data-report-goal-followups]").evaluateAll(groups => groups.map(group => {
        const rectangles = Array.from(group.children).map(child => child.getBoundingClientRect());
        return { columns: getComputedStyle(group).gridTemplateColumns.split(" ").length, widths: rectangles.map(rect => rect.width), tops: rectangles.map(rect => rect.top) };
      }));
      for (const group of geometry) {
        expect(group.columns).toBe(3);
        expect(Math.max(...group.widths) - Math.min(...group.widths)).toBeLessThan(1);
        expect(Math.max(...group.tops) - Math.min(...group.tops)).toBeLessThan(1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.emulateMedia({ media: "screen" });
      expect(await page.locator("[data-report-goal-followups]").evaluateAll(groups => groups.every(group => getComputedStyle(group).display === "contents"))).toBe(true);
    }
  }
});


test("goal sections have distinct symmetric headings and readable long content", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const original = components.richerSharedFixture();
    original.postsecondary_goals[0].area = "Education and Training with Recorded Interests, Support Needs and a Team Review Before Choosing the Next Learning Setting";
    original.postsecondary_goals[0].evidence_needed.push("A complete dated observation describing the available support, what the student tried and what the student wants to review with the team before deciding on the next step.");
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, demo: !shared, readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
      await page.emulateMedia({ media: "print" });
      const goals = page.locator("[data-report-goal-section]");
      expect(await goals.count()).toBe(original.postsecondary_goals.length);
      await expect(goals.locator(":scope > h3")).toHaveCount(original.postsecondary_goals.length);
      for (const geometry of await goals.locator(":scope > h3").evaluateAll(headings => headings.map(heading => {
        const style = getComputedStyle(heading);
        return { left: style.paddingLeft, right: style.paddingRight, background: style.backgroundColor, border: style.borderLeftWidth, font: parseFloat(style.fontSize), height: heading.clientHeight >= heading.scrollHeight - 1, align: style.textAlign };
      }))) {
        expect(geometry.left).toBe(geometry.right);
        expect(geometry.background).toBe("rgb(247, 242, 250)");
        expect(geometry.border).toBe("2px");
        expect(geometry.font).toBeGreaterThanOrEqual(15);
        expect(geometry.height).toBe(true);
        expect(geometry.align).toBe("left");
      }
      expect(await goals.nth(1).evaluate(element => parseFloat(getComputedStyle(element).marginTop))).toBeGreaterThanOrEqual(15);
      const last = original.postsecondary_goals[0].evidence_needed.at(-1);
      expect(await goals.first().textContent()).toContain(last);
      expect(await goals.locator("[data-report-goal-followups] li").evaluateAll(items => items.every(item => parseFloat(getComputedStyle(item).fontSize) >= 14))).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test("report contents reach unique sections in reading order for every planning and shared audience", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({status: 404, body: ""}));
  const original = components.DEMO_STUDENTS.maya.report;
  const newer = components.richerSharedFixture();
  const cases = [
    ...["student", "family", "educator"].map(audience => ({audience, report: original, demo: true, demoStudentId: "maya", hasV2: false})),
    ...["student", "family", "educator"].map(audience => ({audience, report: newer, demo: false, studentId: "fictional-student", hasV2: true})),
    ...["family", "educator"].map(audience => ({audience, report: components.projectSharedReport(newer, audience), demo: false, readOnly: true, fixedAudience: audience, hasV2: true})),
  ];
  for (const fixture of cases) {
    for (const width of [390, 1024]) {
      await page.setViewportSize({width, height: 900});
      const body = renderToStaticMarkup(createElement(components.ReportFixtureRouter, null,
        createElement(components.ReportView, {
          name: "Fictional Student", ...fixture, initialAudience: fixture.audience,
        })));

      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main>${body}</main></body></html>`);
      const contents = page.getByRole("navigation", {name: "Table of contents"});
      const targets = await contents.locator('a[href^="#"]').evaluateAll(links => links.map(link => link.getAttribute("href")!));
      expect(targets).toContain("#report-team-questions");
      expect(new Set(targets).size).toBe(targets.length);
      for (const target of targets) await expect(page.locator(target)).toHaveCount(1);
      const ordered = await page.evaluate(ids => ids.slice(1).every((id, index) => {
        const before = document.querySelector(ids[index])!, after = document.querySelector(id)!;
        return !!(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING);
      }), targets);
      expect(ordered).toBe(true);
      for (const target of ["#sec-readiness", ...("demoStudentId" in fixture ? ["#sec-source-notes"] : []), "#report-team-questions"]) {
        await contents.locator(`a[href="${target}"]`).click();
        expect(new URL(page.url()).hash).toBe(target);
        await expect(page.locator(target)).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});


test("report heading text aligns with chapter margins across planning and shared readers", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    return pathname.startsWith("/brand/") ? route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" }) : route.fulfill({ status: 404, body: "" });
  });
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const source = components.richerSharedFixture();
    const report = shared ? components.projectSharedReport(source, audience) : source;
    const markup = renderToStaticMarkup(createElement(components.ReportView, {
      report, name: "Fictional Student", demo: !shared, readOnly: shared, hasV2: true,
      initialAudience: audience, fixedAudience: shared ? audience : undefined,
    }));
    for (const width of [390, 1024]) for (const media of ["screen", "print"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><base href="http://document-fixture.test"><style>${css}</style></head><body><main class="site-shell-main">${markup}</main></body></html>`);
      await page.emulateMedia({ media });
      const labels = await page.locator("[data-generated-document] :is(.pub-callout-label, .pub-sidebar-label, .pub-checklist-title, [data-document-subheading], [data-value-callout-label])").evaluateAll(elements => elements.map(element => ({ transform: getComputedStyle(element).textTransform, spacing: getComputedStyle(element).letterSpacing, alignment: getComputedStyle(element).textAlign })));
      if (media === "print") {
        const groups = await page.locator("[data-report-pathway-detail], .pub-sidebar .pub-checklist").evaluateAll(elements => elements.map(element => getComputedStyle(element).breakInside));
        expect(groups.length).toBeGreaterThan(0);
        expect(groups.every(value => value === "avoid")).toBe(true);
      }
      expect(labels.length).toBeGreaterThan(0);
      for (const label of labels) expect(label).toEqual({ transform: "none", spacing: "normal", alignment: "left" });
      const measurements = await page.locator(".report-stage").evaluateAll(stages => {
        const textLeft = (element: Element) => {
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) if (node.textContent?.trim()) {
            const range = document.createRange(); range.selectNodeContents(node);
            return range.getBoundingClientRect().left;
          }
          return NaN;
        };
        return stages.flatMap(stage => {
          const chapter = stage.querySelector(":scope > header > h2");
          if (!chapter) return [];
          return Array.from(stage.querySelectorAll("[data-report-block-heading] > :is(button,div)"))
            .filter(control => control.getBoundingClientRect().height > 0)
            .map(control => {
              const title = control.querySelector("h2")!;
              const box = control.getBoundingClientRect(), parent = control.parentElement!.getBoundingClientRect();
              return { title: title.textContent, chapterLeft: textLeft(chapter), titleLeft: textLeft(title),
                left: box.left, right: box.right, parentLeft: parent.left, parentRight: parent.right,
                paddingLeft: getComputedStyle(control).paddingLeft, paddingRight: getComputedStyle(control).paddingRight };
            });
        });
      });
      expect(measurements.length).toBeGreaterThan(5);
      for (const result of measurements) {
        expect(Math.abs(result.titleLeft - result.chapterLeft), `${audience}/${shared}/${width}/${media}: ${JSON.stringify(result)}`).toBeLessThan(1);
        expect(Math.abs(result.left - result.parentLeft)).toBeLessThan(1);
        expect(Math.abs(result.right - result.parentRight)).toBeLessThan(1);
        expect(result.paddingLeft).toBe(result.paddingRight);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});


test("sample report headings and content share balanced card margins for every age and audience", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const profile of ["sam", "riley", "jordan"]) for (const audience of ["student", "family", "educator"]) {
    const sourceProfile = components.getDemoProfile(profile);
    const markup = renderToStaticMarkup(createElement(components.PathwayReport, { profile: components.getDemoProfile(profile), audience }));
    for (const width of [390, 1024]) for (const media of ["screen", "print"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body><main class="site-shell-main">${markup}</main></body></html>`);
      await page.emulateMedia({ media });
      const cards = await page.locator("[data-demo-report-section]").evaluateAll(elements => elements.map(card => {
        const heading = card.querySelector("h3")!;
        const header = heading.parentElement!;
        const content = header.nextElementSibling!;
        const h = heading.getBoundingClientRect(), c = content.getBoundingClientRect();
        const style = getComputedStyle(content);
        return { section: card.getAttribute("data-demo-report-section"), headingLeft: h.left, headingRight: h.right,
          contentLeft: c.left + parseFloat(style.paddingLeft), contentRight: c.right - parseFloat(style.paddingRight) };
      }));
      expect(cards.length).toBeGreaterThan(0);
      for (const card of cards) {
        expect(Math.abs(card.headingLeft - card.contentLeft), `${profile}/${audience}/${width}/${media}: ${JSON.stringify(card)}`).toBeLessThan(1);
        expect(Math.abs(card.headingRight - card.contentRight), `${profile}/${audience}/${width}/${media}: ${JSON.stringify(card)}`).toBeLessThan(1);
      }
      const optionRows = await page.locator("[data-document-columns]:has(> [data-demo-pathway-option]), [data-document-columns]:has(> [data-demo-alt-pathway])").evaluateAll(grids => grids.map(grid => {
        const children = [...grid.children], last = children.at(-1)!;
        return { count: children.length, span: getComputedStyle(last).gridColumn,
          width: last.getBoundingClientRect().width, gridWidth: grid.getBoundingClientRect().width };
      }));
      for (const row of optionRows) if (row.count % 2 && media === "print") {
        expect(row.span).toBe("1 / -1");
        expect(Math.abs(row.width - row.gridWidth)).toBeLessThan(1);
      }
      const sourceReport = components.generatePathwayReport(sourceProfile);
      const goals = page.locator("[data-report-recorded-goal]");
      await expect(goals).toHaveCount(sourceProfile.goals.length);
      for (let i = 0; i < sourceProfile.goals.length; i++) {
        await expect(goals.nth(i).locator("[data-report-recorded-goal-title]")).toHaveText(sourceProfile.goals[i].title);
        await expect(goals.nth(i).getByText("Where Things Stand", { exact: true })).toBeVisible();
        await expect(goals.nth(i).getByText("Planning Timeframe", { exact: true })).toBeVisible();
        const statusLabels: Record<string, string> = { not_started: "Not Started", in_progress: "In Progress", on_track: "On Track", needs_review: "Needs Review" };
        const horizonLabels: Record<string, string> = { next_semester: "Next Semester", this_year: "This Year", next_year: "Next Year", "2_to_3_years": "2–3 Years" };
        await expect(goals.nth(i).locator("[data-report-goal-fact] > p:nth-child(2)")).toHaveText([statusLabels[sourceProfile.goals[i].status], horizonLabels[sourceProfile.goals[i].horizon]]);
      }
      const options = page.locator("[data-demo-pathway-option]");
      await expect(options).toHaveCount(sourceReport.pathwayOptions.length);
      for (const option of sourceReport.pathwayOptions) {
        const card = page.locator(`[data-demo-pathway-option="${option.id}"]`);
        expect((await card.locator("h3").innerText()).toLowerCase()).toBe(option.title.toLowerCase());
        await expect(card.getByText(option.fitSummary, { exact: true })).toBeVisible();
        await expect(card.locator("dd")).toHaveText([option.ahead, option.beside, option.behind]);
        const details = card.locator("[data-demo-option-details]");
        if (media === "print" || audience === "educator") await expect(details).toBeVisible();
        else await expect(details).toBeHidden();
        const control = card.getByRole("button", { name: audience === "educator" ? "Hide Details" : "Show Details", includeHidden: true });
        await expect(control).toHaveAttribute("aria-expanded", String(audience === "educator"));
        if (media === "print") await expect(control).toBeHidden();
        else await expect(control).toBeVisible();
      }
      const alternatives = page.locator("[data-demo-alt-pathway]");
      await expect(alternatives).toHaveCount(sourceReport.alternativePathways.length);
      for (const alternative of sourceReport.alternativePathways) {
        const card = page.locator(`[data-demo-alt-pathway="${alternative.id}"]`);
        expect((await card.locator("h3").innerText()).toLowerCase()).toBe(alternative.title.toLowerCase());
        await expect(card).toContainText(alternative.whenToConsider);
      }
      await expect(page.locator("[data-demo-conflict]")).toHaveCount(sourceReport.conflicts.length);
      for (const conflict of sourceReport.conflicts) await expect(page.locator(`[data-demo-conflict="${conflict.id}"]`)).toContainText(conflict.summary);
      if (!sourceReport.conflicts.length) {
        await expect(page.locator('[data-demo-report-conflicts="none"]')).toContainText(`${sourceProfile.shortName}'s fictional sample`);
        await expect(page.locator('[data-demo-report-conflicts="none"]')).not.toContainText("current evidence");
      }
      for (const section of ["strengths_preferences_interests_needs", "family_action_plan"]) {
        const frame = page.locator(`#section-${section} [data-publication-continuation]`);
        await expect(frame).toHaveAttribute("role", "presentation");
        await expect(frame.locator(":scope > thead .pub-page-kicker")).toHaveCount(1);
        await expect(frame.locator(":scope > thead .pub-page-dek")).toContainText(sourceProfile.shortName);
        expect(await frame.locator(":scope > thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
      }
      const categories = page.locator("[data-report-profile-details] [data-report-profile-category-pages]");
      expect(await categories.count()).toBeGreaterThan(0);
      for (const category of await categories.all()) {
        await expect(category).toHaveAttribute("role", "presentation");
        await expect(category.locator(":scope > thead h3")).toHaveCount(1);
        expect(await category.locator(":scope > thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
      }
      const review = await page.locator("[data-demo-review-summary]").evaluate(element => {
        const children = [...element.children];
        const rects = children.map(child => child.getBoundingClientRect());
        return { columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
          widths: rects.map(rect => rect.width), tops: rects.map(rect => rect.top), bottoms: rects.map(rect => rect.bottom),
          span: getComputedStyle(children[0]).gridColumn,
          font: parseFloat(getComputedStyle(children[2].querySelector("p")!).fontSize) };
      });
      if (media === "print") {
        expect(review.columns).toBe(2);
        expect(review.span).toBe("1 / -1");
        expect(review.widths[0]).toBeGreaterThan(review.widths[1] * 1.9);
        expect(Math.abs(review.widths[1] - review.widths[2])).toBeLessThan(1);
        expect(Math.abs(review.tops[1] - review.tops[2])).toBeLessThan(1);
        expect(Math.abs(review.bottoms[1] - review.bottoms[2])).toBeLessThan(1);
        expect(review.font).toBeGreaterThanOrEqual(14);
      } else expect(review.tops[2]).toBeGreaterThan(review.bottoms[1]);
      const lead = page.locator("[data-demo-action-lead]");
      await expect(lead.locator('[data-demo-report-section="what_to_do_next"]')).toHaveCount(1);
      await expect(lead.locator("[data-demo-action-group]")).toHaveCount(1);
      if (media === "print") expect(await lead.evaluate(element => getComputedStyle(element).breakInside)).toBe("avoid");
      const opportunityHeader = page.locator("[data-report-opportunity-pages] > thead");
      await expect(opportunityHeader.locator("h2")).toContainText(sourceProfile.shortName);
      expect(await opportunityHeader.evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
      const evidenceLayout = await page.locator("[data-report-evidence-entries]").evaluate(element => {
        const rects = [...element.children].map(child => child.getBoundingClientRect());
        return { columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
          widths: rects.map(rect => rect.width), tops: rects.map(rect => rect.top), bottoms: rects.map(rect => rect.bottom) };
      });
      if (media === "print") {
        expect(evidenceLayout.columns).toBe(2);
        expect(Math.abs(evidenceLayout.widths[0] - evidenceLayout.widths[1])).toBeLessThan(1);
        expect(Math.abs(evidenceLayout.tops[0] - evidenceLayout.tops[1])).toBeLessThan(1);
        expect(Math.abs(evidenceLayout.bottoms[0] - evidenceLayout.bottoms[1])).toBeLessThan(1);
        if (sourceProfile.evidence.length % 2) expect(evidenceLayout.widths.at(-1)).toBeGreaterThan(evidenceLayout.widths[0] * 1.9);
      } else expect(evidenceLayout.tops[1]).toBeGreaterThan(evidenceLayout.bottoms[0]);
      const entries = page.locator('[data-demo-report-section="evidence"] [data-report-source-entry]');
      await expect(entries).toHaveCount(sourceProfile.evidence.length);
      for (let i = 0; i < sourceProfile.evidence.length; i++) {
        const item = sourceProfile.evidence[i], row = entries.nth(i);
        await expect(row.locator("[data-report-source-title]")).toHaveText(item.title);
        await expect(row.locator("[data-report-source-metadata]")).toHaveText(`${item.source} · ${item.date}`);
        await expect(row.locator("[data-report-source-summary]")).toHaveText(item.summary);
        expect(await row.innerHTML()).not.toContain(item.id);
        const layout = await row.evaluate(element => ({ left: [...element.children].map(child => child.getBoundingClientRect().left), grouping: getComputedStyle(element).breakInside }));
        expect(Math.max(...layout.left) - Math.min(...layout.left)).toBeLessThan(1);
        if (media === "print") expect(layout.grouping).toBe("avoid");
      }
      const opportunities = await page.locator("[data-report-opportunity]").evaluateAll(cards => cards.map(card => {
        const heading = card.querySelector("h3")!;
        const summary = card.querySelector(":scope > p")!;
        return { title: heading.textContent, headingLeft: heading.getBoundingClientRect().left, summaryLeft: summary.getBoundingClientRect().left };
      }));
      expect(opportunities.length).toBeGreaterThan(0);
      for (const opportunity of opportunities) expect(Math.abs(opportunity.headingLeft - opportunity.summaryLeft), `${profile}/${audience}/${width}/${media}: ${JSON.stringify(opportunity)}`).toBeLessThan(1);
      const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
        elements: Array.from(document.querySelectorAll("[data-generated-document] *")).filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map(e => ({ tag: e.tagName, cls: e.className, right: e.getBoundingClientRect().right })) }));
      expect(overflow.scroll <= overflow.width, `${profile}/${audience}/${width}/${media}: ${JSON.stringify(overflow)}`).toBe(true);
    }
  }
});


test("recorded opportunity headings stay aligned inside the site wrapper for all readers", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const names = ["Art Visit", "A Longer Recorded Community Learning Opportunity With Individual Support", "Library Visit", "Supported Garden Project"];
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const source = { ...components.richerSharedFixture(), opportunity_matches: names.map(name => ({
      name, category: "enrichment", readiness_level: "developing", why_it_fits: "Recorded interest in art.",
      what_student_gains: "Practice asking questions.", how_to_explore: "Discuss an accessible visit with the team.", who_helps: "Recorded support person",
    })) };
    const report = shared ? components.projectSharedReport(source, audience) : source;
    expect(report).not.toBeNull();
    const markup = renderToStaticMarkup(createElement(components.ReportView, {
      report, name: "Fictional Student", demo: !shared, readOnly: shared, hasV2: false,
      initialAudience: audience, fixedAudience: shared ? audience : undefined,
    }));
    for (const width of [390, 1024]) for (const media of ["screen", "print"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body><main class="site-shell-main">${markup}</main></body></html>`);
      await page.emulateMedia({ media });
      const rows = await page.locator("#sec-opportunities h3").evaluateAll(headings => headings.map(heading => {
        const card = heading.parentElement!.parentElement!.parentElement!;
        const field = card.querySelector("[data-report-labeled-field]")!;
        return { left: heading.getBoundingClientRect().left, fieldLeft: field.getBoundingClientRect().left, text: card.textContent };
      }));
      expect(rows).toHaveLength(4);
      for (const row of rows) {
        expect(Math.abs(row.left - row.fieldLeft), `${audience}/${shared}/${width}/${media}`).toBeLessThan(1);
        expect(row.text).toContain("Discuss an accessible visit with the team.");
        expect(row.text).toContain("Recorded support person");
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});


test("resource and partner matches retain role content with consistent titles and balanced document spacing", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const original = components.richerSharedFixture();
  original.partner_matches[0].organization = "DDS / PartnerForward";
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Fictional Student", report, hasV2: true, demo: !shared, readOnly: shared,
      initialAudience: audience, fixedAudience: shared ? audience : undefined,
    }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${body}</div></main></body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        for (const section of ["#v2-resources", "#v2-partners"]) {
          const entry = page.locator(section).locator("[data-report-match-entry]");
          await expect(entry.locator("[data-report-match-title]")).toHaveText("Explore a Supported Visit");
          await expect(entry.getByText("Recorded interests", { exact: true })).toBeVisible();
          await expect(entry.getByText("Discuss a visit", { exact: true })).toBeVisible();
          const panels = entry.locator("[data-report-match-details] > .pub-callout");
          const boxes = await Promise.all([panels.nth(0).boundingBox(), panels.nth(1).boundingBox()]);
          if (media === "print") {
            expect(Math.abs(boxes[0]!.y - boxes[1]!.y)).toBeLessThan(1);
            expect(Math.abs(boxes[0]!.width - boxes[1]!.width)).toBeLessThan(1);
            expect(Math.abs(boxes[0]!.height - boxes[1]!.height)).toBeLessThan(1);
            expect(boxes[1]!.x).toBeGreaterThan(boxes[0]!.x + boxes[0]!.width);
          } else {
            expect(Math.abs(boxes[0]!.x - boxes[1]!.x)).toBeLessThan(1);
            expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);
          }
          if (audience === "student") await expect(entry.locator("[data-report-source-count]")).toHaveCount(0);
          else if (audience === "family") {
            await expect(entry.getByText("Information from 1 recorded source.", { exact: true })).toBeVisible();
            await expect(entry.getByText("A recorded profile observation", { exact: true })).toHaveCount(0);
          } else await expect(entry.getByText("A recorded profile observation", { exact: true })).toBeVisible();
          await expect(entry.getByRole("link")).toHaveAttribute("target", "_blank");
          await expect(entry.getByRole("link")).toHaveAttribute("rel", "noopener noreferrer");
        }
        await expect(page.locator("#v2-partners").getByText("DDS / PartnerForward", { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  }
});


test("demo and product overviews retain their own source content and role-specific action timing", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const css = compiler.build(new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources }).scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const sourceSteps = [
    { id: "family", owner: "family", title: "Family observation", detail: "Family-only detail", timeframe: "this_year", reviewByMonths: 8 },
    { id: "shared", owner: "shared", title: "Discuss supports together", detail: "Shared detail", timeframe: "this_semester", reviewByMonths: 5 },
  ];
  expect(components.demoReportNextStepPreview([{ ...sourceSteps[0], reviewByMonths: 1 }, sourceSteps[1]], "family")).toEqual({ label: "For the Family", items: ["Family observation — This Year · Review in 1 Month"] });
  expect(components.demoReportNextStepPreview(sourceSteps, "student")).toEqual({ label: "Shared Next Steps", items: ["Discuss supports together — This Semester · Review in 5 Months"] });
  expect(components.demoReportNextStepPreview(sourceSteps.slice(0, 1), "educator")).toEqual({ label: "Recorded Next Steps", items: [] });
  for (const audience of ["student", "family", "educator"]) {
    const fixtures = ["sam", "riley", "jordan"].map(id => {
      const profile = components.getDemoProfile(id), report = components.generatePathwayReport(profile);
      return { name: id, markup: renderToStaticMarkup(createElement(components.PathwayReport, { profile, audience })), summary: report.focus,
        strengths: profile.learning.strengths.slice(0, 3), direction: report.pathwayOptions[0]?.fitSummary,
        actions: components.demoReportNextStepPreview(report.nextSteps, audience), report };
    });
    const actual = { ...components.richerSharedFixture(), spin: { strengths: ["Current source strength"] } };
    fixtures.push({ name: "product", markup: renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report: actual, hasV2: true, initialAudience: audience })), summary: audience === "educator" ? actual.professional_summary : actual.plain_language_summary, strengths: actual.spin.strengths, direction: undefined, actions: undefined, report: undefined } as any);
    for (const fixture of fixtures) for (const width of [390, 1024]) for (const media of ["screen", "print"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${fixture.markup}</div></main></body></html>`);
      await page.emulateMedia({ media });
      const overview = page.locator("[data-report-overview]");
      await expect(overview).toHaveCount(1);
      if (media === "print") expect(await overview.evaluate(element => getComputedStyle(element.closest(".exec-summary")!).breakInside)).toBe("avoid");
      await expect(overview).toContainText(fixture.summary);
      for (const strength of fixture.strengths) await expect(overview).toContainText(strength);
      if (fixture.direction) await expect(overview).toContainText(fixture.direction);
      if (fixture.name === "product") {
        await expect(overview).not.toContainText(actual.summary);
        await expect(overview.locator('[data-report-best-fit-explanation]')).toHaveCount(0);
        await expect(page.locator('#sec-pathways')).toContainText(actual.recommended_pathways[0].why_it_fits);
      }
      if (fixture.actions) {
        await expect(overview.locator(".pub-sidebar-label")).toHaveText(fixture.actions.label);
        for (const action of fixture.actions.items) await expect(overview.locator(".pub-sidebar-body")).toContainText(action);
        for (const option of fixture.report.pathwayOptions) await expect(page.locator(`[data-demo-pathway-option="${option.id}"]`)).toContainText(option.fitSummary);
        for (const alternative of fixture.report.alternativePathways) await expect(page.locator(`[data-demo-alt-pathway="${alternative.id}"]`)).toContainText(alternative.whenToConsider);
        for (const conflict of fixture.report.conflicts) await expect(page.locator(`[data-demo-conflict="${conflict.id}"]`)).toContainText(conflict.summary);
        const anchor = page.locator('a[href="#demo-report-overview"]');
        await expect(anchor).toHaveCount(1);
      }
      const spread = await overview.evaluate(element => { const lead = element.querySelector(".pub-spread-lead")!.getBoundingClientRect(), side = element.querySelector(".pub-spread-side")!.getBoundingClientRect(); return { topDifference: Math.abs(lead.top-side.top), overlap: lead.right > side.left+1, width: element.getBoundingClientRect().width }; });
      if (media === "print" || width === 1024) { expect(spread.topDifference).toBeLessThan(1); expect(spread.overlap).toBe(false); }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});


test("missing information retains recorded follow-up across planning, shared and empty demo reports", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const gap = { topic: "current travel observation", why_it_matters: "The earlier observation does not describe the current route.", how_to_collect: "Ask the team for a dated observation with the supports used.", owner_role: "school_team" };
  const original = { ...components.richerSharedFixture(), missing_information_v2: [gap] };
  for (const audience of ["student", "family", "educator"]) {
    const profile = { ...components.getDemoProfile("sam"), evidence: [], voice: [] };
    const fixtures = [{ markup: renderToStaticMarkup(createElement(components.PathwayReport, { profile, audience })), demo: true }];
    for (const shared of audience === "student" ? [false] : [false, true]) {
      const report = shared ? components.projectSharedReport(original, audience) : original;
      fixtures.push({ markup: renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined })), demo: false });
    }
    for (const fixture of fixtures) for (const width of [390, 1024]) for (const media of ["screen", "print"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ media });
      await page.setContent(`<html><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${fixture.markup}</div></main></body></html>`);
      const gaps = page.locator("[data-report-planning-gap]");
      expect(await gaps.count()).toBeGreaterThan(0);
      for (const card of await gaps.all()) {
        await expect(card.locator(":scope > h3")).toHaveCount(1);
        const layout = await card.evaluate(element => {
          const heading = element.querySelector("h3")!;
          return { overflow: element.scrollWidth > element.clientWidth, headingMargin: getComputedStyle(heading).marginLeft, breakInside: getComputedStyle(element).breakInside };
        });
        expect(layout.overflow).toBe(false);
        expect(layout.headingMargin).toBe("0px");
        if (media === "print") expect(layout.breakInside).toBe("avoid");
      }
      if (fixture.demo) {
        const evidence = page.locator('[data-demo-report-missing="evidence"]');
        await expect(evidence.getByRole("heading")).toHaveText("What We Still Need to Know");
        await expect(evidence).toContainText("No sample evidence items are recorded for this profile.");
        await expect(evidence).toContainText("Gather current observations or documents before confirming recommendations.");
        await expect(page.locator("[data-report-voice-response]")).toHaveCount(0);
      } else {
        await expect(gaps.getByRole("heading", { name: "Current Travel Observation" })).toHaveCount(1);
        const newerGap = gaps.filter({ has: page.getByRole("heading", { name: "Current Travel Observation" }) });
        for (const field of [gap.why_it_matters, gap.how_to_collect]) await expect(newerGap).toContainText(field);
        const legacy = page.locator("[data-report-evidence-gap]");
        for (let i = 0; i < original.data_gaps.length; i++) {
          for (const field of [original.data_gaps[i].why_it_matters, original.data_gaps[i].who_can_help, original.data_gaps[i].how_to_collect, original.data_gaps[i].question_to_ask].filter(Boolean)) expect(await legacy.nth(i).textContent()).toContain(field);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});


test("newer report chapters use section headings beneath the document title for all permitted readers", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const original = { ...components.richerSharedFixture(),
      spin: { strengths: ["Recorded strength"], preferences: [], interests: [], needs: [] },
      readiness_indicators: [{ domain: "Recorded planning area", level: "developing", note: "Recorded readiness note" }],
      needs_review_flags: [{ section: "source_date", reason: "Confirm the recorded source date" }],
      confidence: { overall: "high", rationale: "Recorded confidence explanation", caveats: [] },
    };
    original.iep_plan_summary.transition_goals = [{ area: "Education", goal_text: "Recorded transition goal", plain_language: "Recorded goal explanation" }];
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Fictional Student", report, hasV2: true, demo: !shared, readOnly: shared,
      initialAudience: audience, fixedAudience: shared ? audience : undefined,
    }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main><div class="report-shell eh-issue">${body}</div></main></body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        if (media === "screen") await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        const chapters = page.locator('section[aria-label="Pathway Report — detailed sections"] .pub-page-opener, #v2-inputs-used .pub-page-opener');
        expect(await chapters.count()).toBeGreaterThanOrEqual(10);
        await expect(chapters.locator("h1, h3")).toHaveCount(0);
        await expect(chapters.locator("h2")).toHaveCount(await chapters.count());
        const spinFrame = page.locator("#v2-spin [data-publication-continuation]");
        await expect(spinFrame).toHaveAttribute("role", "presentation");
        await expect(spinFrame.locator(":scope > thead h2")).toHaveText("Strengths, Preferences, Interests & Needs");
        expect(await spinFrame.locator(":scope > thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
        const spinCategory = spinFrame.locator("[data-report-profile-category-pages]");
        await expect(spinCategory).toHaveCount(1);
        await expect(spinCategory.locator(":scope > thead [data-document-subheading]")).toHaveText("Strengths");
        expect(await spinCategory.locator(":scope > thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
        const recommendations = page.locator("[data-report-recommendation]");
        expect(await recommendations.count()).toBeGreaterThan(0);
        await expect(recommendations.locator(":scope > header > h3")).toHaveCount(await recommendations.count());
        await expect(recommendations.locator("h4")).toHaveCount(0);
        const headings = chapters.locator("h2");
        for (const geometry of await headings.evaluateAll(nodes => nodes.map(node => {
          const style = getComputedStyle(node);
          return { padding: style.paddingLeft, align: style.textAlign, band: style.borderLeftWidth,
            font: parseFloat(style.fontSize), fits: node.scrollWidth <= node.clientWidth + 1 };
        }))) {
          expect(geometry.padding).toBe(media === "print" ? "10px" : "12px");
          expect(geometry.align).toBe("left");
          expect(geometry.band).toBe("3px");
          expect(geometry.font).toBeGreaterThanOrEqual(media === "print" ? 20 : 17.5);
          expect(geometry.fits).toBe(true);
        }
        await expect(page.locator("#v2-iep-summary").getByRole("heading", { name: "Present Levels", level: 3 })).toBeVisible();
        await expect(page.locator("#v2-iep-summary").getByRole("heading", { name: "Transition Goals", level: 3 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  }
});


test("empty demo pathway options retain a chapter heading and honest filter notice", async ({ page }) => {
  const profile = components.getDemoProfile("sam");
  const filtered = { ...profile, stage: { ...profile.stage, emphasizedThemes: [] } };
  expect(components.generatePathwayReport(filtered).pathwayOptions).toHaveLength(0);
  const markup = renderToStaticMarkup(createElement(components.PathwayReport, { profile: filtered, audience: "family" }));
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  await page.setContent(`<html><body>${markup}</body></html>`);
  await expect(page.getByRole("heading", { name: "Pathway Options", exact: true, level: 2 })).toHaveCount(1);
  await expect(page.getByText(`No age-appropriate options matched the current filters for ${profile.shortName}.`, { exact: true })).toBeVisible();
  await expect(page.locator("[data-demo-pathway-option]")).toHaveCount(0);
});


test("legacy profile context repeats in print while retaining its screen heading and source categories", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const original = { ...components.richerSharedFixture(), schema_version: 1, student_snapshot: components.DEMO_STUDENTS.maya.report.student_snapshot,
      spin_analysis: { strengths: ["Recorded strength one", "Recorded strength two"], preferences: ["Written directions", "Quiet space"], interests: ["Recorded interest one", "Recorded interest two"], needs: ["Recorded need one", "Recorded need two"], motivators: ["Recorded motivator"], barriers: ["Recorded barrier"], environmental_supports: ["Recorded setting"], areas_for_growth: ["Recorded growth area"], what_this_means: "Discuss this recorded profile with the student and team." } };
    const report = shared ? components.projectSharedReport(original, audience) : original;
    expect(report).not.toBeNull();
    const markup = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: false, demo: !shared, readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body><div class="report-shell eh-issue">${markup}</div></body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        const section = page.locator("#sec-spin"), frame = section.locator("[data-publication-continuation]");
        const context = frame.locator(":scope > thead [data-publication-parent-title]");
        await expect(context).toHaveText("Strengths, Preferences, Interests & Needs");
        if (media === "screen") {
          await expect(context).toBeHidden();
          await expect(section.getByRole("heading", { level: 2 })).toHaveCount(1);
        } else {
          await expect(context).toBeVisible();
          await expect(section.getByRole("heading", { level: 2 })).toHaveCount(1);
        }
        expect(await frame.locator(":scope > thead").evaluate(element => getComputedStyle(element).display)).toBe(media === "print" ? "table-header-group" : "block");
        await expect(section.locator("[data-report-profile-category-pages]")).toHaveCount(8);
        for (const [area, values] of Object.entries(original.spin_analysis)) {
          if (area === "what_this_means") continue;
          for (const value of values as string[]) await expect(section.getByText(value, { exact: true })).toBeVisible();
        }
        await expect(section.getByText(original.spin_analysis.what_this_means, { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  }
});


test("long profile categories use full print rows while short categories and screen order stay intact", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["student", "family", "educator"]) {
    const base = components.getDemoProfile("sam");
    const profile = { ...base, learning: { ...base.learning, strengths: Array.from({ length: 5 }, (_, i) => `Fictional long strength ${i + 1}: ${"Review the available support and student perspective with the team. ".repeat(5)}End strength ${i + 1}.`) },
      family: { ...base.family, keyConsiderations: Array.from({ length: 6 }, (_, i) => `Fictional long family priority ${i + 1}: ${"Review the source plan, student perspective and available support with the team. ".repeat(7)}End priority ${i + 1}.`), transportationNote: `Fictional travel note: ${"Confirm the route, available support and family schedule before planning travel. ".repeat(7)}End travel note.` },
      voice: Array.from({ length: 6 }, (_, i) => ({ prompt: `Fictional student prompt ${i + 1}?`, answer: `Fictional answer ${i + 1}: ${"I want to discuss the support that helps me learn and participate with my team. ".repeat(7)}End answer ${i + 1}.` })) };
    const markup = renderToStaticMarkup(createElement(components.PathwayReport, { profile, audience }));
    for (const width of [390, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body>${markup}</body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        const long = page.locator('[data-report-profile-group]:has(> [data-report-profile-long])');
        await expect(long).toHaveCount(3);
        for (const group of await long.all()) {
          const layout = await group.evaluate(element => ({ span: getComputedStyle(element).gridColumn, width: element.getBoundingClientRect().width, parent: element.parentElement!.getBoundingClientRect().width }));
          if (media === "print") {
            expect(layout.span).toBe("1 / -1");
            expect(Math.abs(layout.width - layout.parent)).toBeLessThan(1);
          } else expect(layout.span).toBe("auto");
        }
        const short = page.locator('[data-report-profile-group]:not(:has(> [data-report-profile-wide]))').first();
        expect(await short.evaluate(element => getComputedStyle(element).gridColumn)).toBe("auto");
        await expect(page.locator("[data-report-voice-response]")).toHaveCount(profile.voice.length);
        for (const response of profile.voice) {
          await expect(page.getByText(`— ${response.prompt}`, { exact: true })).toHaveCount(1);
          await expect(page.getByText(`"${response.answer}"`, { exact: true })).toBeVisible();
        }
        await expect(page.locator("#section-student_voice [data-publication-continuation] > thead .pub-page-kicker")).toHaveText("In Their Own Words");
        for (const strength of profile.learning.strengths) await expect(page.locator("#section-strengths_preferences_interests_needs").getByText(strength, { exact: true })).toBeVisible();
        await expect(page.locator("#section-family_action_plan").getByText(profile.family.transportationNote, { exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
    }
  }
  for (const format of ["legacy", "newer"]) for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const long = Array.from({ length: 6 }, (_, i) => `Recorded long strength ${i + 1}: ${"Review recorded observations and support with the student and team before changing the plan. ".repeat(6)}End strength ${i + 1}.`);
    const original = format === "legacy"
      ? { ...components.DEMO_STUDENTS.maya.report, schema_version: 1, spin_analysis: { ...components.DEMO_STUDENTS.maya.report.spin_analysis, strengths: long } }
      : { ...components.richerSharedFixture(), spin: { strengths: Array.from({ length: 8 }, (_, i) => `Recorded newer strength ${i + 1}: ${"Review recorded observations and support with the student and team. ".repeat(3)}`.slice(0, 185)), preferences: ["Recorded short preference"], interests: [], needs: [] } };
    const report = shared ? components.projectSharedReport(original, audience) : original;
    expect(report).not.toBeNull();
    const markup = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: format === "newer", demo: !shared, readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.setContent(`<html><head><style>${css}</style></head><body>${markup}</body></html>`);
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({ media });
      const section = page.locator(format === "legacy" ? "#sec-spin" : "#v2-spin");
      const wide = section.locator(format === "legacy" ? '[data-report-profile-group]:has(> [data-report-profile-long])' : '[data-report-spin-group]:has(> [data-report-profile-long])');
      await expect(wide).toHaveCount(1);
      expect(await wide.evaluate(element => getComputedStyle(element).gridColumn)).toBe(media === "print" ? "1 / -1" : "auto");
      await expect(wide.locator("li")).toHaveCount(format === "legacy" ? 6 : 8);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }

});


test("fictional optional report sections use actual role-aware document presentation", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const source = components.OPTIONAL_REPORT_EXAMPLE;
  for (const audience of ["student", "family", "educator"]) {
    const body = renderToStaticMarkup(createElement(components.DemoOptionalReportDocument, { audience }));
    for (const width of [390, 1024]) for (const media of ["screen", "print"] as const) {
      await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ media });
      await page.setContent(`<html><head><style>${css}</style></head><body><header>Site navigation fixture</header><main class="site-shell-main"><div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 print:contents"><a class="print:hidden">Return navigation fixture</a><div class="print:hidden">Role controls fixture</div>${body}</div></main><footer>Site footer fixture</footer></body></html>`);
      if (media === "print") {
        await expect(page.getByText("Site navigation fixture", { exact: true })).toBeHidden();
        await expect(page.getByText("Site footer fixture", { exact: true })).toBeHidden();
        await expect(page.getByText("Return navigation fixture", { exact: true })).toBeHidden();
        await expect(page.getByText("Role controls fixture", { exact: true })).toBeHidden();
      }
      if (media === "screen") await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("#v2-iep-summary")).toContainText(source.iep_plan_summary.present_levels);
      await expect(page.locator("#v2-iep-summary")).toContainText(source.iep_plan_summary.transition_goals[0].goal_text);
      await expect(page.locator("#v2-confidence")).toContainText(source.confidence.rationale);
      await expect(page.getByText(source.change_summary, { exact: true })).toBeVisible();
      if (audience === "educator") await expect(page.getByText(source.iep_plan_summary.transition_goals[0].plain_language, { exact: true })).toHaveCount(0);
      else await expect(page.getByText(source.iep_plan_summary.transition_goals[0].plain_language, { exact: true })).toBeVisible();
      await expect(page.getByText("No IEP was uploaded, extracted or reviewed.", { exact: false })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});

test("shared pathway introductions preserve long headings and recorded metadata without mobile overflow", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({status:404,body:""}));
  const title = "X".repeat(160), summary = "Recorded complete summary ".repeat(15);
  for (const width of [375, 1200]) {
    await page.emulateMedia({media:"screen"});
    await page.setViewportSize({width,height:900});
    const markup = renderToStaticMarkup(createElement("section", {"data-generated-document":true},
      createElement(components.DocumentViewStyles),
      createElement(components.ReportPathwayHeading, {title,badges:createElement("span",null,"Recorded Category")}),
      createElement(components.ReportPathwaySummary, {kind:"fit"},summary),
      createElement(components.RecommendationCard, {audience:"educator",rec:{title,summary,why:"Recorded reason",sources:[{kind:"profile",label:"Recorded profile"}],next_action:"Recorded next step",owner_role:"educator",timeframe:"90_day",discuss_at_next_meeting:true}})));
    await page.setContent(`<html><head><style>${css}</style></head><body style="margin:0;padding:16px">${markup}</body></html>`);
    await expect(page.locator('[data-report-pathway-heading] h3')).toHaveText([title,title]);
    await expect(page.locator('[data-report-pathway-summary]')).toHaveText([summary.trim(),summary.trim()]);
    await expect(page.getByText("Recorded Category",{exact:true})).toBeVisible();
    await expect(page.getByText("Next 90 days",{exact:true})).toBeVisible();
    await expect(page.getByText("Discuss at next meeting",{exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
    const sizes = await page.locator('[data-report-pathway-heading] h3').evaluateAll(elements=>elements.map(element=>({font:getComputedStyle(element).fontSize,clipped:element.scrollWidth>element.clientWidth+1})));
    expect(sizes[0].font).toBe(sizes[1].font);
    for (const size of sizes) {
      expect(size.clipped).toBe(false);
      expect(parseFloat(size.font)).toBeGreaterThanOrEqual(14);
      expect(parseFloat(size.font)).toBeLessThanOrEqual(16);
    }
    const shortCard = createElement(components.RecommendationCard,{audience:"family",rec:{title:"Option",summary:"Recorded summary",why:"Recorded why",sources:[],next_action:"Recorded step",owner_role:"family",discuss_at_next_meeting:true}});
    const short = renderToStaticMarkup(createElement("section", {"data-generated-document":true,className:"report-root"},
      createElement(components.DocumentViewStyles), createElement(components.ReportBrochurePrintStyles),
      createElement("div",{className:"pub-page-body"},
        createElement(components.ReportPathwayHeading,{title:"Recorded Option",badges:createElement("span",null,"Badge")}),
        createElement("section",{className:"pub-page"}, createElement("div",{"data-report-pillar-recommendations":true},shortCard)))));
    await page.setContent(`<html><head><style>${css}</style></head><body style="margin:0;padding:16px">${short}</body></html>`);
    for (const media of ["screen","print"] as const) {
    await page.emulateMedia({media});
    const aligned = await page.locator('[data-report-pathway-heading]').evaluateAll(elements=>elements.map(element=>{
      const title=element.querySelector('h3')!,badge=element.querySelector('[data-report-pathway-badges]')!;
      return Math.abs(title.getBoundingClientRect().top-badge.getBoundingClientRect().top);
    }));
    for (const difference of aligned) expect(difference).toBeLessThan(1);
    if (media === "print") expect(await page.locator('.pub-page').evaluate(element=>getComputedStyle(element).breakInside)).toBe("avoid");
    }
  }
});


test("section update history is scoped, readable and complete in print while folded on screen", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const css = compiler.build(new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources }).scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const generated = components.recordGeneratedSections(undefined, components.richerSharedFixture(), "2026-10-01T12:00:00.000Z");
  const source = components.recordSavedSections(generated, { ...generated, postsecondary_goals: generated.postsecondary_goals.map((goal, index) => index === 0 ? { ...goal, current_status: "Saved wording" } : goal) }, "2026-10-12T18:00:00.000Z");
  for (const audience of ["student", "family", "educator"]) for (const shared of audience === "student" ? [false] : [false, true]) {
    const report = shared ? components.projectSharedReport(source, audience) : source;
    const body = renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    expect(body).not.toContain(source.section_updates.write_id);
    for (const width of [375, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html><head><style>${css}</style></head><body><main class="site-shell-main"><div class="report-shell eh-issue">${body}</div></main></body></html>`);
      await page.emulateMedia({ media: "screen" });
      const panel = page.locator('[data-report-section-updates]');
      await expect(panel.getByRole('heading', { name: 'Section Update History' })).toBeVisible();
      await expect(panel.getByRole('button', { name: 'Show Update Details' })).toHaveAttribute('aria-expanded', 'false');
      await expect(panel.locator('[data-report-update-table]')).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.emulateMedia({ media: "print" });
      await expect(panel.locator('[data-report-update-table]')).toBeVisible();
      await expect(panel.getByRole('button')).toBeHidden();
      await expect(panel.locator('[data-report-update-field="postsecondary_goals"]')).toContainText('Saved · Oct 12, 2026');
      await expect(panel.locator('[data-report-update-field="educator_action_plan_v2"]')).toHaveCount(audience === 'educator' ? 1 : 0);
      const layout = await panel.locator('tbody tr').evaluateAll(rows => rows.map(row => { const cells = row.children; return { left: cells[0].getBoundingClientRect().x, right: cells[1].getBoundingClientRect().x, font: parseFloat(getComputedStyle(cells[1]).fontSize), aligned: getComputedStyle(cells[0]).textAlign === 'left' && getComputedStyle(cells[1]).textAlign === 'left' }; }));
      expect(layout.every(row => Math.abs(row.left - layout[0].left) < 1 && Math.abs(row.right - layout[0].right) < 1 && row.font >= 12 && row.aligned)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("IEP goal headings and facts share level margins and readable typography across demo, product and fixed shares", async ({ page }) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), { base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {} });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  const iep = { ...components.OPTIONAL_REPORT_EXAMPLE.iep_plan_summary,
    transition_goals: [{ ...components.OPTIONAL_REPORT_EXAMPLE.iep_plan_summary.transition_goals[0], area: "education and IEP planning" }] };
  const variants = [
    ...(["student", "family", "educator"] as const).map(audience => ({ audience, kind: "demo", shared: false })),
    ...(["student", "family", "educator"] as const).map(audience => ({ audience, kind: "product", shared: false })),
    ...(["family", "educator"] as const).map(audience => ({ audience, kind: "product", shared: true })),
  ];
  for (const { audience, kind, shared } of variants) {
    const source = { ...components.richerSharedFixture(), iep_plan_summary: iep };
    const report = shared ? components.projectSharedReport(source, audience) : source;
    const body = kind === "demo"
      ? renderToStaticMarkup(createElement(components.DemoOptionalReportDocument, { audience }))
      : renderToStaticMarkup(createElement(components.ReportView, { name: "Fictional Student", report, hasV2: true, demo: false, readOnly: shared, initialAudience: audience, fixedAudience: shared ? audience : undefined }));
    const expectedIep = kind === "demo" ? components.OPTIONAL_REPORT_EXAMPLE.iep_plan_summary : iep;
    for (const width of [375, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.setContent(`<html lang="en"><head><style>${css}</style></head><body><main>${body}</main></body></html>`);
      for (const media of ["screen", "print"] as const) {
        await page.emulateMedia({ media });
        const summary = page.locator("#v2-iep-summary");
        await expect(summary.getByRole("heading", { name: "Transition Goals", level: 3 })).toBeVisible();
        if (media === "print") {
          const present = summary.locator("[data-report-iep-present-levels]");
          expect(await present.locator(":scope > h3").evaluate(element => getComputedStyle(element).breakAfter)).toBe("avoid");
          expect(await present.locator(":scope > hr").evaluate(element => getComputedStyle(element).breakAfter)).toBe("avoid");
        }
        for (const label of ["Accommodations", "Services"]) {
          const caption = summary.getByText(label, { exact: true });
          await expect(caption).toBeVisible();
          expect(await caption.evaluate(element => getComputedStyle(element).textTransform)).toBe("none");
        }
        const goals = summary.locator('li:has(> [data-report-goal-heading])');
        await expect(goals).toHaveCount(expectedIep.transition_goals.length);
        for (let index = 0; index < expectedIep.transition_goals.length; index++) {
          const goal = goals.nth(index), sourceGoal = expectedIep.transition_goals[index];
          await expect(goal.locator(":scope > h4[data-report-goal-heading]")).toBeVisible();
          await expect(goal.locator("[data-report-recorded-goal-title]")).toHaveText(sourceGoal.goal_text);
          expect(await goal.locator("[data-report-goal-fact]").count()).toBe(audience !== "educator" && sourceGoal.plain_language ? 1 : 0);
          const dimensions = await goal.evaluate(element => {
            const parts = [element.querySelector("h4"), element.querySelector("[data-report-recorded-goal-title]"), element.querySelector("[data-report-goal-fact]")].filter(Boolean) as HTMLElement[];
            return parts.map(node => ({ left: node.getBoundingClientRect().left, font: parseFloat(getComputedStyle(node).fontSize), overflow: node.scrollWidth > node.clientWidth + 1 }));
          });
          expect(Math.max(...dimensions.map(x => x.left)) - Math.min(...dimensions.map(x => x.left))).toBeLessThanOrEqual(1);
          expect(dimensions.every(x => x.font >= 12 && !x.overflow)).toBe(true);
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      }
    }
  }
});


test("saved report print discards surrounding route layout without changing the screen", async ({ page }, info) => {
  const require = createRequire(resolve("package.json"));
  const compiled = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiled.sources });
  const css = compiled.build(scanner.scan());
  await page.route("**/*", route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname.startsWith("/brand/")) return route.fulfill({ body: readFileSync(resolve("public", pathname.slice(1))), contentType: pathname.endsWith(".svg") ? "image/svg+xml" : "image/png" });
    return route.abort();
  });
  for (const audience of ["family", "educator", "student"]) {
    await page.emulateMedia({ media: "screen" });
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Fictional Student", report: components.DEMO_STUDENTS.maya.report, initialAudience: audience,
    }));
    // Saved routes have nested flex shells, breadcrumbs and a version panel
    // outside ReportView. Visibility alone hides ink but retains their pages.
    await page.setContent(`<html><head><base href="http://document-fixture.test"><style>${css}</style></head><body>
      <div class="signed-in-shell"><div class="flex min-h-dvh flex-col overflow-x-clip">
      <header>Site navigation</header><main class="site-shell-main flex-1" style="min-height:60vh">
      <div class="report-shell eh-issue"><div data-route-chrome style="height:120px">Report breadcrumb</div>
      <div class="mx-auto w-full px-3 pt-4"><div class="min-w-0">${body}</div></div>
      <section data-route-chrome style="min-height:1600px">Version history and restore controls</section>
      </div></main><footer>Site footer</footer></div></div></body></html>`);
    await expect(page.locator("[data-route-chrome]").first()).toBeVisible();
    await expect(page.locator("[data-route-chrome]").last()).toBeVisible();
    const meetingQuestions=components.DEMO_STUDENTS.maya.report.family_questions_for_ppt as string[];
    await expect(page.locator("#sec-meeting-prep .pub-checklist").first().locator("li")).toHaveCount(5);
    await expect(page.locator('[data-report-team-questions] a[href="#sec-meeting-prep"]')).toBeVisible();
    // Screen-only Add to Actions controls intentionally reuse recorded items.
    // Count the document body separately while preserving those functional controls.
    for (const question of meetingQuestions) {
      expect(await page.getByText(question,{exact:true}).filter({visible:true}).evaluateAll(elements=>elements.filter(el=>!el.closest(".no-print")).length)).toBe(1);
      await expect(page.locator("[data-report-team-questions]").getByText(question,{exact:true})).toHaveCount(0);
    }
    await page.emulateMedia({ media: "print" });
    for (const chrome of await page.locator("[data-route-chrome]").all()) {
      expect(await chrome.evaluate(el=>getComputedStyle(el).display)).toBe("none");
      expect(await chrome.evaluate(el=>el.getBoundingClientRect().height)).toBe(0);
    }
    expect(await page.locator(".site-shell-main").evaluate(el=>getComputedStyle(el).display)).toBe("block");
    await expect(page.locator(".report-root")).toBeVisible();
    for (const question of meetingQuestions) await expect(page.getByText(question,{exact:true}).filter({visible:true})).toHaveCount(1);
    await page.evaluate(()=>document.fonts.ready);
    await expect(page.locator("[data-document-watermark]")).toBeVisible();
    const questionAlignment = await page.locator('[data-value-callout-print-tail]').evaluateAll(tails => tails.map(tail => {
      const preceding = tail.previousElementSibling!;
      const list = preceding.querySelector('ul')!;
      const last = tail.querySelector('[data-value-callout-question]')!;
      const tailList = tail.querySelector('ul')!;
      const expected = list.getBoundingClientRect().left + parseFloat(getComputedStyle(list).paddingLeft);
      const source = tail.querySelector('[data-value-callout-row="informationUsed"]')!;
      return {difference: Math.abs(expected - last.getBoundingClientRect().left), expected,
        sourceEdgeDifference: Math.abs(preceding.getBoundingClientRect().left - source.getBoundingClientRect().left),
        sourceBorder: getComputedStyle(source).borderTopWidth,
        actual: last.getBoundingClientRect().left, gap: getComputedStyle(preceding).gap,
        iconWidth: preceding.firstElementChild!.getBoundingClientRect().width,
        listPadding: getComputedStyle(list).paddingLeft, tailMargin: getComputedStyle(tailList).marginLeft,
        tailPadding: getComputedStyle(tailList).paddingLeft, rootFont: getComputedStyle(document.documentElement).fontSize};
    }));
    const alignmentPath = info.outputPath(`${audience}-question-alignment.json`);
    writeFileSync(alignmentPath, JSON.stringify(questionAlignment, null, 2));
    await info.attach(`${audience}-question-alignment`, {path:alignmentPath,contentType:"application/json"});
    expect(questionAlignment.length).toBeGreaterThan(0);
    for (const measurement of questionAlignment) {
      expect(measurement.difference).toBeLessThan(1);
      expect(measurement.sourceEdgeDifference).toBeLessThan(1);
      expect(parseFloat(measurement.sourceBorder)).toBeGreaterThan(0);
    }
    await page.pdf({path:info.outputPath(`${audience}-saved-shell-report.pdf`),preferCSSPageSize:true,printBackground:true});
    await page.screenshot({path:info.outputPath(`${audience}-saved-shell-print.png`),fullPage:true});
    await page.emulateMedia({ media: "screen" });
    await expect(page.locator("[data-route-chrome]").last()).toBeVisible();
  }
});


// Exercise a question list longer than one printed page, including a source note
// close to a page boundary. This fixture cannot call a server or save a record.
test("long report questions export complete content across page boundaries", async ({ page }, info) => {
  await page.route("**/*", route => route.abort());
  const styles = [components.DocumentLayoutStyles, components.ReportBrochurePrintStyles]
    .map(component => renderToStaticMarkup(createElement(component))).join("");
  const questions = Array.from({ length: 24 }, (_, index) =>
    `Question ${index + 1}: Which recorded supports helped the fictional student complete the activity, and what observations should the team compare before choosing the next step?`);
  const callout = renderToStaticMarkup(createElement(components.ValueCallout, { data: {
    whatThisMeans: "Use recorded observations to choose the next planning step.",
    whyItMatters: "The team needs clear information about the supports tried.",
    recommendedNextStep: "Bring the observation log to the team conversation.",
    questionsForTeam: questions,
    informationUsed: ["Fictional classroom observation log", "Fictional family planning notes"],
  } }));
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const offset of [0, 160, 320, 480, 640, 800]) {
    await page.setContent(`<html><head><style>
      body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.5; }
      [data-value-callout-row] { display: flex; gap: 12px; padding: 10px 0; }
      [data-value-callout-row] > :first-child { flex: 0 0 24px; }
      [data-value-callout-row] > :last-child { flex: 1; min-width: 0; }
      [data-value-callout-row] svg { width: 16px; height: 16px; }
      [data-value-callout-label] { margin: 0; font-weight: bold; }
      li { margin-bottom: 8px; }
    </style></head><body><main class="report-root" data-generated-document>
      ${styles}<div style="height:${offset}px">Fictional planning context</div>${callout}
    </main></body></html>`);
    await page.emulateMedia({ media: "screen" });
    await expect(page.locator("[data-value-callout-print-tail]")).toBeHidden();
    await expect(page.locator("[data-value-callout-question]:visible")).toHaveCount(24);
    await expect(page.locator('[data-value-callout-row="informationUsed"]:visible')).toHaveCount(1);
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("[data-value-callout-question]:visible")).toHaveCount(24);
    await expect(page.getByText(questions[23], { exact: true }).filter({visible: true})).toBeVisible();
    await expect(page.getByText("Fictional classroom observation log · Fictional family planning notes", { exact: true }).filter({visible: true})).toBeVisible();
    expect(await page.locator(".report-root").evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    const bytes = await page.pdf({ path: info.outputPath(`questions-offset-${offset}.pdf`), preferCSSPageSize: true, printBackground: true });
    const task = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false });
    try {
      const pdf = await task.promise;
      const pages: string[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const content = await (await pdf.getPage(number)).getTextContent();
        pages.push(content.items.map(item => "str" in item ? item.str : "").join(" "));
      }
      const text = pages.join(" ");
      for (let number = 1; number <= 24; number++) expect(text.match(new RegExp(`Question ${number}:`, "g"))).toHaveLength(1);
      expect(text.match(/Information Used/g)).toHaveLength(1);
      expect(text.match(/Fictional classroom observation log/g)).toHaveLength(1);
      const lastQuestionPage = pages.findIndex(text => text.includes("Question 24:"));
      expect(lastQuestionPage).toBeGreaterThanOrEqual(0);
      expect(pages[lastQuestionPage]).toContain("Information Used");
      expect(pages[lastQuestionPage]).toContain("Fictional classroom observation log");
      expect(pages[lastQuestionPage]).toContain("Fictional family planning notes");
      expect(pages.every(text => text.trim().split(/\s+/).length > 10)).toBe(true);
    } finally { await task.destroy(); }
  }
});


for (const questionCount of [0, 1]) {
  test(`report source stays visible once with ${questionCount} team questions`, async ({ page }) => {
    await page.route("**/*", route => route.abort());
    const styles = renderToStaticMarkup(createElement(components.DocumentLayoutStyles));
    const callout = renderToStaticMarkup(createElement(components.ValueCallout, { data: {
      whatThisMeans: "Use recorded observations.", whyItMatters: "Compare the supports tried.",
      recommendedNextStep: "Bring the observation log.",
      questionsForTeam: Array.from({length: questionCount}, () => "Which support helped?"),
      informationUsed: ["Fictional observation log"],
    } }));
    await page.setContent(`<html><body><main data-generated-document>${styles}${callout}</main></body></html>`);
    for (const media of ["screen", "print"] as const) {
      await page.emulateMedia({media});
      await expect(page.locator('[data-value-callout-row="informationUsed"]:visible')).toHaveCount(1);
      await expect(page.getByText("Fictional observation log", {exact:true}).filter({visible:true})).toHaveCount(1);
      await expect(page.locator('[data-value-callout-question]:visible')).toHaveCount(questionCount);
    }
  });
}

// A complete prepared meeting sheet should be usable at the meeting without
// turning to another page for its three short follow-up actions.
test("prepared meeting sheet keeps recorded follow-ups with its questions for every audience", async ({ page }, info) => {
  const require = createRequire(resolve("package.json"));
  const compiler = await require("@tailwindcss/node").compile(readFileSync(resolve("src/styles.css"), "utf8"), {
    base: resolve("src"), from: resolve("src/styles.css"), onDependency: () => {},
  });
  const scanner = new (require("@tailwindcss/oxide").Scanner)({ sources: compiler.sources });
  const css = compiler.build(scanner.scan());
  await page.route("**/*", route => route.abort());
  const sample = components.DEMO_STUDENTS.maya;
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  for (const audience of ["family", "educator", "student"]) {
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Maya", report: sample.report, demo: true, initialAudience: audience,
    }));
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.setContent(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
    await page.emulateMedia({ media: "print" });
    const questions = await page.locator("#sec-meeting-prep .pub-checklist").first().locator("li > span:last-child").allTextContents();
    const bytes = await page.pdf({path:info.outputPath(`${audience}-meeting-sheet-report.pdf`),preferCSSPageSize:true,printBackground:true});
    const task = getDocument({data:new Uint8Array(bytes),useSystemFonts:true,isEvalSupported:false});
    try {
      const pdf = await task.promise;
      const pages: string[] = [];
      for (let number = 1; number <= pdf.numPages; number++) {
        const content = await (await pdf.getPage(number)).getTextContent();
        pages.push(content.items.map(item => "str" in item ? item.str : "").join(" ").replace(/\s+/g," ").replace(/-\s+/g,"-").trim());
      }
      const normalized = questions.map(text => text.replace(/\s+/g," ").replace(/-\s+/g,"-").trim());
      const meetingPage = pages.find(text => normalized.every(question => text.includes(question)));
      expect(meetingPage, `${audience}: all meeting questions should share the prepared meeting sheet`).toBeTruthy();
      for (const action of sample.report.meeting_prep_toolkit.follow_up_items) expect(meetingPage).toContain(action);
      expect(pages.every(text => text.split(/\s+/).length > 8)).toBe(true);
    } finally { await task.destroy(); }
  }
});
