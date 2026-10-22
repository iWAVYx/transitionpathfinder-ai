import { expect, test, type Page } from "@playwright/test";

/** Prepared fictional sample only. No sign-in, generation, save/share or fixtures.
 * Headless PDF output verifies hosted HTML/CSS, not the native OS print dialog. */
test.use({ storageState: { cookies: [], origins: [] }, trace: "off" });
const reportPath = (origin: string, view = origin) => `/demo/report?example=builder&role=${origin}&view=${view}`;
async function selected(page: Page, audience: string, builder: string) {
  await expect(page.getByRole("tab", {name: new RegExp(`^${audience}$`, "i")})).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText(`${audience[0].toUpperCase()}${audience.slice(1)} Edition`, {exact:true})).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("view")).toBe(audience);
  await expect.poll(() => new URL(page.url()).searchParams.get("role")).toBe(builder);
  await expect(page.getByRole("link", {name:/Back to Pathway Builder/})).toHaveAttribute("href", `/demo/intake?role=${builder}`);
  await expect(page.locator(".report-root")).toBeVisible();
  expect(await page.locator(".report-root").evaluate(root => root.scrollWidth <= root.clientWidth)).toBe(true);
}
async function exportPreparedPdf(page: Page, audience: string, outputPath: string) {
  await page.emulateMedia({media:"print"});
  await page.evaluate(() => document.fonts.ready);
  const mark = page.locator("[data-document-watermark]");
  await expect(mark).toBeVisible();
  await expect.poll(() => mark.evaluate(el => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0)).toBe(true);
  const last = page.locator("[data-value-callout-print-tail]").last();
  const question = (await last.locator("[data-value-callout-question]").innerText()).replace(/\s+/g," ").trim();
  const source = (await last.locator('[data-value-callout-row="informationUsed"] > div').last().innerText()).replace(/\s+/g," ").trim();
  const bytes = await page.pdf({path:outputPath,preferCSSPageSize:true,printBackground:true});
  const {getDocument} = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({data:new Uint8Array(bytes),useSystemFonts:true,isEvalSupported:false});
  try {
    const pdf = await task.promise, pages: string[] = [];
    for (let number=1;number<=pdf.numPages;number++) {
      const text = await (await pdf.getPage(number)).getTextContent();
      pages.push(text.items.map(item => "str" in item ? item.str : "").join(" ").replace(/\s+/g," ").trim());
    }
    expect(pages.every(text => text.split(/\s+/).length>8)).toBe(true);
    const sourcePage = pages.find(text => text.includes(source));
    expect(sourcePage, `${audience}: full final source note must print`).toBeTruthy();
    expect(sourcePage).toContain(question);
    expect(pages.at(-1)).toContain("End of report");
    return {audience,pages:pages.length,finalQuestionWithSources:true};
  } finally { await task.destroy(); await page.emulateMedia({media:"screen"}); }
}
for (const width of [390,1440]) for (const origin of ["family","educator"]) {
  test(`prepared report lenses ${width}px from ${origin}`, async ({page}, info) => {
    test.setTimeout(120_000);
    await page.setViewportSize({width,height:900});
    await page.goto(reportPath(origin), {waitUntil:"domcontentloaded"});
    await selected(page,origin,origin);
    const other = origin === "family" ? "educator" : "family";
    let builder = origin;
    const pdfs = [];
    for (const target of [other,"student",origin]) {
      await page.getByRole("tab", {name:new RegExp(`^${target}$`,"i")}).click(); // Exactly one click per transition.
      if (target !== "student") builder=target;
      await selected(page,target,builder);
      if (width===1440 && origin==="family") pdfs.push(await exportPreparedPdf(page,target,info.outputPath(`${target}-prepared-report.pdf`)));
    }
    await page.goBack(); await selected(page,"student",other);
    await page.goForward(); await selected(page,origin,origin);
    await page.reload({waitUntil:"domcontentloaded"}); await selected(page,origin,origin);
    await page.goto(reportPath(origin,"student"),{waitUntil:"domcontentloaded"}); await selected(page,"student",origin);
    await page.reload({waitUntil:"domcontentloaded"}); await selected(page,"student",origin);
    await page.getByRole("link", {name:"See Sample Plan Details and Review Notes"}).click();
    await expect(page.getByRole("heading",{name:"Sample Plan Details and Review Notes"})).toBeVisible();
    await expect(page.getByRole("button",{name:"Student",exact:true})).toHaveAttribute("aria-pressed","true");
    await page.getByRole("link",{name:/Back to Sample Pathway Report/}).click();
    await selected(page,"student",origin);
    await info.attach("prepared-reader-results",{body:JSON.stringify({width,origin,singleClick:true,history:true,reload:true,optionalRoundTrip:true,pdfs,nativePrintDialogVerified:false}),contentType:"application/json"});
  });
}
