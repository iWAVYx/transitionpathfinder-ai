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
    stdin: { contents: ["DocumentPrintHeader", "DocumentPrintStyles", "DocumentViewStyles", "DocumentWatermark", "PrintedFieldValue", "MeetingDocumentStyles", "SampleDocumentNotice", "ReportBrochurePrintStyles", "PptAgendaDocument"].map((name) => `export { ${name} } from './src/components/documents/${name}.tsx';`).join("\n") + "\nexport { PathwayReportBody } from './src/components/pathway/report/PathwayReportBody.tsx'; export { PathwayReport } from './src/components/demo/PathwayReport.tsx'; export { ReportView } from './src/components/pathway/ReportView.tsx'; export { SourceChips } from './src/components/pathway/SourceChips.tsx'; export { ReportPhase4Sections } from './src/components/pathway/ReportPhase4Sections.tsx'; export { DEMO_INTAKE_CATEGORIES } from './src/lib/demo-extras.ts'; export { DEMO_STUDENTS } from './src/lib/demo-data.ts'; export { projectSharedReport } from './src/lib/shared-report-projection.ts'; export { richerSharedFixture } from './tests/fixtures/shared-report.ts'; export { getDemoProfile } from './src/lib/demo/demo-profiles.ts'; import { RouterContextProvider, createRouter, createRootRoute, createMemoryHistory } from '@tanstack/react-router'; export function ReportFixtureRouter({children}) { const router = createRouter({ routeTree: createRootRoute(), history: createMemoryHistory({initialEntries: ['/']}) }); return <RouterContextProvider router={router}>{children}</RouterContextProvider>; }", resolveDir: process.cwd(), loader: "tsx" },
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
});


test("shared readers keep their designated audience and do not offer generation controls", async ({ page }) => {
  await page.route("**/*", route => route.fulfill({ status: 404, body: "" }));
  for (const audience of ["family", "educator"]) {
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Maya", report: components.DEMO_STUDENTS.maya.report,
      initialAudience: "student", fixedAudience: audience, readOnly: true,
    }));
    await page.setContent(`<html><body>${body}</body></html>`);
    await expect(page.getByRole("tablist", { name: "Choose a report view" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Pathway Assist", exact: true })).toHaveCount(0);
    const expected = audience === "family" ? "A Plan for Maya." : "Meeting Guide — Maya";
    await expect(page.getByRole("heading", { name: expected, exact: true })).toBeVisible();
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
    await expect(page.getByText(audience === "educator" ? "Fictional professional planning summary." : "Fictional plain-language planning summary.", { exact: true })).toBeVisible();
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
      await expect(page.getByText(audience === "family" ? "Family summary" : "Educator summary", { exact: true })).toBeVisible();
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
          if (media === "print") expect(await questionsSection.locator("li").evaluateAll(elements => elements.every(element => getComputedStyle(element).breakInside === "avoid"))).toBe(true);
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
    confidence: { overall: "high", rationale: "Recorded explanation based on an earlier observation.", caveats: ["A current team review is still needed."] },
  };
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
        const readiness = page.locator("#v2-readiness-indicators");
        for (const level of ["emerging", "developing", "progressing", "ready"]) {
          await expect(readiness.getByText(`Recorded ${level} area`, { exact: true })).toBeVisible();
          await expect(readiness.getByText(`Recorded ${level} observation`, { exact: true })).toBeVisible();
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
  const original = components.richerSharedFixture();
  original.recommended_pathways[0].why_it_fits = explanation;
  for (const audience of ["student", "family", "educator"]) for (const mode of audience === "student" ? ["demo", "live"] : ["demo", "live", "shared"]) {
    const shared = mode === "shared";
    const report = shared ? components.projectSharedReport(original, audience) : original;
    const body = renderToStaticMarkup(createElement(components.ReportView, {
      name: "Fictional Student", report, hasV2: true, demo: mode === "demo", readOnly: shared,
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
          for (const selector of ["[data-report-readiness-row]", "[data-report-profile-summary]", "[data-report-evidence-gap]", "[data-report-career-match]"]) {
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
