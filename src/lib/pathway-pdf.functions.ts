import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getStageDetail } from "@/lib/workspace/stage-samples";

/**
 * Server-side PDF generation for the Pathway Report sample preview.
 * Produces a deterministic, printable PDF using pdf-lib (Worker-safe,
 * no native binaries). Returned as base64 for RPC serialization.
 */

const CHAPTERS: { title: string; eyebrow: string; sectionTitles: string[] }[] = [
  {
    eyebrow: "Chapter 1",
    title: "Who We're Planning With",
    sectionTitles: [
      "Student Snapshot",
      "Student Voice (In Their Own Words)",
      "Family Priorities",
      "Educator Insights",
    ],
  },
  {
    eyebrow: "Chapter 2",
    title: "What We've Gathered",
    sectionTitles: [
      "Documents and Evidence",
      "Readiness Scorecard",
      "IEP + Transition Translator",
      "Data Gaps + Needs Review",
    ],
  },
  {
    eyebrow: "Chapter 3",
    title: "Where We're Going",
    sectionTitles: [
      "Executive Summary",
      "Recommended Pathways",
      "Career and Life Matches",
    ],
  },
  {
    eyebrow: "Chapter 4",
    title: "How We Get There",
    sectionTitles: [
      "Recommended Resources",
      "Partner Matches (Where Consent Allows)",
      "Meeting Prep Questions",
    ],
  },
  {
    eyebrow: "Chapter 5",
    title: "The Action Plan",
    sectionTitles: [
      "Role-Specific Views",
      "30 / 90 / 180 / 365-Day Next Steps",
      "Source Notes + AI Disclaimer",
    ],
  },
];

// Replace unicode chars WinAnsi (pdf-lib default font) can't encode.
function sanitize(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "");
}

export const generatePathwayReportPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const detail = getStageDetail("roadmap");
    const byTitle = new Map(detail.groups.map((g) => [g.title, g]));

    const pdf = await PDFDocument.create();
    pdf.setTitle("Jordan Rivera's Pathway Report");
    pdf.setAuthor("Transition Forward CT");
    pdf.setSubject("Pathway Report — Sample Preview");
    pdf.setCreator("Transition Forward CT");

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    const PAGE_W = 612;
    const PAGE_H = 792;
    const MARGIN_X = 54;
    const MARGIN_TOP = 54;
    const MARGIN_BOTTOM = 60;
    const CONTENT_W = PAGE_W - MARGIN_X * 2;

    const ink = rgb(0.12, 0.14, 0.2);
    const muted = rgb(0.42, 0.45, 0.52);
    const accent = rgb(0.11, 0.36, 0.62);
    const rule = rgb(0.85, 0.87, 0.92);

    let page = pdf.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN_TOP;
    let pageNum = 1;

    function drawFooter(p: ReturnType<typeof pdf.addPage>, n: number) {
      p.drawText(sanitize("Transition Forward CT · Pathway Report · Sample"), {
        x: MARGIN_X,
        y: 30,
        size: 8,
        font: regular,
        color: muted,
      });
      const label = `Page ${n}`;
      const w = regular.widthOfTextAtSize(label, 8);
      p.drawText(label, { x: PAGE_W - MARGIN_X - w, y: 30, size: 8, font: regular, color: muted });
    }

    function newPage() {
      drawFooter(page, pageNum);
      page = pdf.addPage([PAGE_W, PAGE_H]);
      pageNum += 1;
      y = PAGE_H - MARGIN_TOP;
    }

    function ensure(space: number) {
      if (y - space < MARGIN_BOTTOM) newPage();
    }

    function wrap(text: string, font: typeof regular, size: number, maxWidth: number): string[] {
      const clean = sanitize(text);
      const paragraphs = clean.split(/\n+/);
      const lines: string[] = [];
      for (const para of paragraphs) {
        const words = para.split(/\s+/).filter(Boolean);
        let current = "";
        for (const word of words) {
          const trial = current ? `${current} ${word}` : word;
          if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
            lines.push(current);
            current = word;
          } else {
            current = trial;
          }
        }
        if (current) lines.push(current);
        if (words.length === 0) lines.push("");
      }
      return lines;
    }

    function drawWrapped(
      text: string,
      opts: {
        font?: typeof regular;
        size?: number;
        color?: ReturnType<typeof rgb>;
        lineHeight?: number;
        indent?: number;
      } = {},
    ) {
      const font = opts.font ?? regular;
      const size = opts.size ?? 10.5;
      const color = opts.color ?? ink;
      const lh = opts.lineHeight ?? size * 1.35;
      const indent = opts.indent ?? 0;
      const lines = wrap(text, font, size, CONTENT_W - indent);
      for (const line of lines) {
        ensure(lh);
        page.drawText(line, { x: MARGIN_X + indent, y: y - size, size, font, color });
        y -= lh;
      }
    }

    // ---------- COVER ----------
    page.drawRectangle({
      x: 0,
      y: PAGE_H - 220,
      width: PAGE_W,
      height: 220,
      color: rgb(0.96, 0.97, 1),
    });
    y = PAGE_H - 80;
    page.drawText("PATHWAY REPORT · SAMPLE PREVIEW", {
      x: MARGIN_X,
      y,
      size: 9,
      font: bold,
      color: accent,
    });
    y -= 34;
    page.drawText(sanitize("Jordan Rivera's Pathway Report"), {
      x: MARGIN_X,
      y,
      size: 26,
      font: bold,
      color: ink,
    });
    y -= 26;
    drawWrapped(
      "A full-fidelity preview of the shareable Pathway Report — the same 17 sections signed-in families, educators, and students see, rendered here with sample data.",
      { color: muted, size: 11 },
    );
    y -= 8;
    const meta = [
      ["ID", "TF-SAMPLE01"],
      ["For", "Jordan Rivera"],
      ["Next Review", "This Spring"],
      ["Version", "3 · Regenerated Today"],
    ];
    for (const [k, v] of meta) {
      ensure(16);
      page.drawText(`${k.toUpperCase()}`, {
        x: MARGIN_X,
        y: y - 10,
        size: 8,
        font: bold,
        color: muted,
      });
      page.drawText(sanitize(v), {
        x: MARGIN_X + 90,
        y: y - 10,
        size: 10,
        font: regular,
        color: ink,
      });
      y -= 16;
    }

    const voice = byTitle.get("Student Voice (In Their Own Words)");
    const voiceQuote = voice?.items.find((i) => i.label === "What I Want After School")?.note;
    if (voiceQuote) {
      y -= 18;
      ensure(80);
      const boxTop = y;
      const quoteLines = wrap(`"${voiceQuote}"`, italic, 12, CONTENT_W - 24);
      const attribution = "— Jordan · From The Student Voice Stage";
      const boxH = 20 + quoteLines.length * 16 + 22;
      page.drawRectangle({
        x: MARGIN_X,
        y: boxTop - boxH,
        width: CONTENT_W,
        height: boxH,
        color: rgb(1, 1, 1),
        borderColor: accent,
        borderWidth: 0.75,
      });
      page.drawRectangle({
        x: MARGIN_X,
        y: boxTop - boxH,
        width: 3,
        height: boxH,
        color: accent,
      });
      let qy = boxTop - 18;
      for (const line of quoteLines) {
        page.drawText(line, { x: MARGIN_X + 14, y: qy, size: 12, font: italic, color: ink });
        qy -= 16;
      }
      page.drawText(sanitize(attribution), {
        x: MARGIN_X + 14,
        y: qy - 4,
        size: 8,
        font: bold,
        color: muted,
      });
      y = boxTop - boxH - 12;
    }

    // ---------- TABLE OF CONTENTS ----------
    newPage();
    page.drawText("Contents", { x: MARGIN_X, y: y - 20, size: 20, font: bold, color: ink });
    y -= 40;
    for (const c of CHAPTERS) {
      ensure(22);
      page.drawText(c.eyebrow.toUpperCase(), {
        x: MARGIN_X,
        y: y - 10,
        size: 8,
        font: bold,
        color: accent,
      });
      page.drawText(sanitize(c.title), {
        x: MARGIN_X + 80,
        y: y - 10,
        size: 12,
        font: bold,
        color: ink,
      });
      y -= 20;
      for (const st of c.sectionTitles) {
        ensure(14);
        page.drawText(sanitize(`•  ${st}`), {
          x: MARGIN_X + 80,
          y: y - 10,
          size: 10,
          font: regular,
          color: muted,
        });
        y -= 14;
      }
      y -= 8;
    }

    // ---------- CHAPTERS ----------
    for (const c of CHAPTERS) {
      newPage();
      page.drawText(c.eyebrow.toUpperCase(), {
        x: MARGIN_X,
        y: y - 10,
        size: 9,
        font: bold,
        color: accent,
      });
      y -= 22;
      page.drawText(sanitize(c.title), {
        x: MARGIN_X,
        y: y - 20,
        size: 22,
        font: bold,
        color: ink,
      });
      y -= 34;
      page.drawLine({
        start: { x: MARGIN_X, y },
        end: { x: PAGE_W - MARGIN_X, y },
        thickness: 0.5,
        color: rule,
      });
      y -= 18;

      for (const title of c.sectionTitles) {
        const group = byTitle.get(title);
        if (!group) continue;
        ensure(48);
        page.drawText(sanitize(group.title), {
          x: MARGIN_X,
          y: y - 12,
          size: 13,
          font: bold,
          color: ink,
        });
        y -= 20;
        if (group.description) {
          drawWrapped(group.description, { color: muted, size: 10, lineHeight: 13 });
          y -= 4;
        }
        for (const item of group.items) {
          ensure(16);
          drawWrapped(item.label, { font: bold, size: 10.5, lineHeight: 14 });
          if (item.note) {
            drawWrapped(item.note, { color: muted, size: 10, lineHeight: 13, indent: 12 });
          }
          y -= 4;
        }
        y -= 10;
        ensure(8);
        page.drawLine({
          start: { x: MARGIN_X, y },
          end: { x: PAGE_W - MARGIN_X, y },
          thickness: 0.25,
          color: rule,
        });
        y -= 14;
      }
    }

    // ---------- DISCLAIMER ----------
    newPage();
    page.drawText("Source Notes & Disclaimer", {
      x: MARGIN_X,
      y: y - 20,
      size: 18,
      font: bold,
      color: ink,
    });
    y -= 44;
    drawWrapped(
      "AI-assisted, team-reviewed. Every section cites its source; nothing ships without educator approval. AI recommendations are supportive planning tools and do not replace professional judgment, school team decisions, legal advice, or official IEP/PPT determinations.",
      { color: muted, size: 10.5, lineHeight: 15 },
    );

    drawFooter(page, pageNum);

    const bytes = await pdf.save();
    // Base64 encode for RPC transport.
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + chunk)) as unknown as number[],
      );
    }
    const base64 =
      typeof btoa === "function"
        ? btoa(binary)
        : Buffer.from(bytes).toString("base64");

    return {
      filename: "jordan-rivera-pathway-report.pdf",
      contentType: "application/pdf",
      base64,
    };
  });
