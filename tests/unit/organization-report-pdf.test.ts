import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import { buildOrganizationReportPdf } from "../../src/lib/organization-report-pdf";
const logo = `data:image/png;base64,${readFileSync("public/brand/transitionforward-wordmark.png").toString("base64")}`;
const branding = { logo, icon: logo, watermark: logo }; // Layout fixture only; browser path rasterizes the approved icon.
const runtime = { Pdf: jsPDF, table: autoTable };

it("keeps long organization names and every row across numbered Letter pages", () => {
  const doc = buildOrganizationReportPdf({
    title: "school report", organization: "Fictional Community School With a Long Name for the Export Layout Check",
    period: "October 1–31, 2026", sections: [
      { title: "at a glance", headings: ["Measure", "Value"], rows: [["Students", 75], ["Pathway Reports", 42]] },
      { title: "students", headings: ["Student", "Grade Band", "Reports", "Active Goals", "Open Actions"],
        rows: Array.from({ length: 75 }, (_, i) => [`Sample Student ${String(i + 1).padStart(2, "0")}`, "Grade 11", 1, 2, 3]) },
    ],
  }, runtime, branding);
  expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  expect(doc.internal.pageSize.getWidth()).toBeCloseTo(215.9, 1);
  expect(doc.internal.pageSize.getHeight()).toBeCloseTo(279.4, 1);
  const pdf = doc.output();
  for (let i = 1; i <= 75; i++) expect(pdf).toContain(`Sample Student ${String(i).padStart(2, "0")}`);
  for (let i = 1; i <= doc.getNumberOfPages(); i++) expect(pdf).toContain(`${i} / ${doc.getNumberOfPages()}`);
  expect(pdf).toContain("School Report");
  expect(pdf).toContain("At a Glance");
});

it("rejects a heading that would leave too little space for a readable table", () => {
  expect(() => buildOrganizationReportPdf({ title: "School Report", organization: "A very long school name ".repeat(90), period: "All Time", sections: [] }, runtime, branding)).toThrow(/heading is too long/);
});

it("clearly identifies an empty reporting period without inventing rows", () => {
  const doc = buildOrganizationReportPdf({ title: "District Report", organization: "Fictional District", period: "October 2026", sections: [{ title: "Schools", headings: ["School", "Students"], rows: [] }] }, runtime, branding);
  expect(doc.output()).toContain("No records in this reporting period.");
});


it("places the decorative watermark at the top right of every exported page", () => {
  const images = vi.spyOn(jsPDF.API, "addImage");
  try {
    const doc = buildOrganizationReportPdf({ title: "District Report", organization: "Fictional District", period: "October 2026", sections: [{ title: "Schools", headings: ["School", "Students"], rows: Array.from({length: 90}, (_, i) => [`School ${i + 1}`, i]) }] }, runtime, branding);
    const marks = images.mock.calls.filter(call => call[4] === 5.3 && call[5] === 5.3);
    expect(marks).toHaveLength(doc.getNumberOfPages());
    for (const call of marks) {
      expect(call[2]).toBeCloseTo(doc.internal.pageSize.getWidth() - 12.7 - 5.3, 2);
      expect(call[3]).toBeCloseTo(12.7, 2);
    }
  } finally { images.mockRestore(); }
});
