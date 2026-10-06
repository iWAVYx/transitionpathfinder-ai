import type { jsPDF } from "jspdf";
import type { autoTable as AutoTable } from "jspdf-autotable";
import { loadJsPdf, loadJsPdfAutoTable } from "@/lib/browser-only-libs";
import { BRAND_ICON_SRC, BRAND_WORDMARK_SRC } from "@/components/brand/BrandLogo";
import { toTitleCase } from "@/lib/title-case";

type ReportSection = { title: string; headings: string[]; rows: Array<Array<string | number>> };
export type OrganizationReportPdfInput = {
  title: string;
  organization: string;
  period: string;
  sections: ReportSection[];
};
type PdfRuntime = { Pdf: typeof jsPDF; table: typeof AutoTable };
type Branding = { logo: string; icon: string; watermark: string };

/** Rasterize approved assets locally; no document data leaves the browser. */
async function brandImage(source: string, opacity = 1, maxWidth = 480) {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(image.naturalWidth, opacity < 1 ? 96 : maxWidth);
  canvas.height = Math.round(canvas.width * image.naturalHeight / image.naturalWidth);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("We couldn't prepare the document logo.");
  context.globalAlpha = opacity;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function createOrganizationReportPdf(input: OrganizationReportPdfInput) {
  const [pdf, table, logo, icon, watermark] = await Promise.all([
    loadJsPdf(), loadJsPdfAutoTable(), brandImage(BRAND_WORDMARK_SRC), brandImage(BRAND_ICON_SRC, 1, 96), brandImage(BRAND_ICON_SRC, 0.09),
  ]);
  return buildOrganizationReportPdf(input, { Pdf: pdf.jsPDF, table: table.default }, { logo, icon, watermark });
}

/** Pure layout entry point for synthetic export validation; role/data checks stay in the routes. */
export function buildOrganizationReportPdf(input: OrganizationReportPdfInput, runtime: PdfRuntime, branding: Branding) {
  const doc = new runtime.Pdf({ unit: "mm", format: "letter" });
  const outer = 12.7; // Same half-inch outer margin as the other documents.
  const gutter = 6.35;
  const left = outer + gutter;
  const width = doc.internal.pageSize.getWidth() - left * 2;
  const height = doc.internal.pageSize.getHeight();
  doc.setFont("times", "normal").setFontSize(22);
  const title = doc.splitTextToSize(toTitleCase(input.title), width) as string[];
  doc.setFont("helvetica", "normal").setFontSize(10.5);
  const organization = doc.splitTextToSize(input.organization, width) as string[];
  const period = doc.splitTextToSize(`Reporting Period: ${input.period}`, width) as string[];
  const titleY = outer + 16;
  const organizationY = titleY + title.length * 8 + 1;
  const periodY = organizationY + organization.length * 5 + 1;
  const start = periodY + period.length * 5 + 8;
  if (start > height / 2) throw new Error("This document heading is too long to fit clearly.");
  let nextY = start;

  for (const section of input.sections) {
    if (nextY + 35 > height - outer) { doc.addPage(); nextY = start; }
    doc.setFont("times", "normal").setFontSize(15).setTextColor(91, 42, 134);
    doc.text(toTitleCase(section.title), left, nextY);
    runtime.table(doc, {
      startY: nextY + 5,
      margin: { top: start, left, right: left, bottom: outer + 7 },
      head: [section.headings.map(toTitleCase)],
      body: section.rows.length ? section.rows.map((row) => row.map((value) => String(value)))
        : [["No records in this reporting period.", ...section.headings.slice(1).map(() => "")]],
      rowPageBreak: "avoid",
      theme: "grid",
      styles: { font: "helvetica", fontSize: 10.5, cellPadding: 2.4, overflow: "linebreak", textColor: [36, 42, 51], lineColor: [226, 219, 233], lineWidth: 0.15 },
      headStyles: { fillColor: [91, 42, 134], textColor: [255, 255, 255], fontStyle: "bold", halign: "left" },
      alternateRowStyles: { fillColor: [250, 248, 252] },
      columnStyles: section.headings.length === 2
        ? { 0: { cellWidth: width / 2 }, 1: { cellWidth: width / 2 } }
        : Object.fromEntries(section.headings.map((_, i) => [i, { cellWidth: i === 0 ? width * 0.4 : width * 0.6 / (section.headings.length - 1) }])),
    });
    nextY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.addImage(branding.watermark, "PNG", doc.internal.pageSize.getWidth() - outer - 5.3, outer, 5.3, 5.3);
    doc.addImage(branding.icon, "PNG", left, outer, 6, 6);
    doc.addImage(branding.logo, "PNG", left + 8, outer, 36, 6);
    doc.setTextColor(36, 42, 51).setFont("times", "normal").setFontSize(22);
    doc.text(title, left, titleY);
    doc.setFont("helvetica", "normal").setFontSize(10.5);
    doc.text(organization, left, organizationY);
    doc.setFontSize(9).setTextColor(94, 94, 105);
    doc.text(period, left, periodY);
    doc.setDrawColor(226, 219, 233).setLineWidth(0.2).line(left, start - 4, left + width, start - 4);
    doc.setFontSize(9).setTextColor(105, 105, 115);
    doc.text(toTitleCase(input.title), left, height - outer / 2);
    doc.text(`${page} / ${pages}`, left + width, height - outer / 2, { align: "right" });
  }
  return doc;
}
