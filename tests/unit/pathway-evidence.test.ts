import { describe, expect, it } from "vitest";
import {
  BANNED_SUMMARY_PHRASES,
  evidenceSnippet,
  formatEvidenceForPrompt,
  groupBySection,
  isWeakSummary,
  summarizeEvidenceUsed,
  type EvidenceRow,
} from "@/lib/pathway-evidence";

function row(partial: Partial<EvidenceRow> & { id: string; report_section: string }): EvidenceRow {
  return {
    source_kind: "document",
    source_id: null,
    source_label: "IEP.pdf",
    note: null,
    ...partial,
  } as EvidenceRow;
}

describe("pathway-evidence helpers", () => {
  describe("isWeakSummary", () => {
    it("flags empty, short, and banned-phrase summaries", () => {
      expect(isWeakSummary(null)).toBe(true);
      expect(isWeakSummary("")).toBe(true);
      expect(isWeakSummary("Too short.")).toBe(true);
      for (const p of BANNED_SUMMARY_PHRASES) {
        expect(
          isWeakSummary(`${p} — padded padded padded padded padded padded padded padded padded.`),
        ).toBe(true);
      }
    });

    it("accepts substantive, grounded summaries", () => {
      expect(
        isWeakSummary(
          "Maya thrives in hands-on cooking labs and is exploring a culinary certificate program next fall.",
        ),
      ).toBe(false);
    });
  });

  describe("evidenceSnippet", () => {
    it("strips the AI-extracted prefix", () => {
      const r = row({
        id: "1",
        report_section: "student_voice",
        note: "AI-extracted (high): Loves working with animals.",
      });
      expect(evidenceSnippet(r)).toBe("Loves working with animals.");
    });

    it("returns raw note when no prefix present", () => {
      const r = row({ id: "1", report_section: "readiness", note: "Uses public transit." });
      expect(evidenceSnippet(r)).toBe("Uses public transit.");
    });
  });

  describe("groupBySection", () => {
    it("groups rows and preserves insertion order", () => {
      const rows = [
        row({ id: "a", report_section: "student_voice" }),
        row({ id: "b", report_section: "readiness" }),
        row({ id: "c", report_section: "student_voice" }),
      ];
      const g = groupBySection(rows);
      expect(g.student_voice.map((r) => r.id)).toEqual(["a", "c"]);
      expect(g.readiness.map((r) => r.id)).toEqual(["b"]);
    });
  });

  describe("formatEvidenceForPrompt", () => {
    it("emits a placeholder block when no evidence", () => {
      const out = formatEvidenceForPrompt([]);
      expect(out).toContain("<<<EVIDENCE>>>");
      expect(out).toContain("(no evidence links on file");
      expect(out).toContain("<<<END_EVIDENCE>>>");
    });

    it("includes section headers, snippets, and evidence ids", () => {
      const out = formatEvidenceForPrompt([
        row({
          id: "e1",
          report_section: "student_voice",
          note: "AI-extracted (high): Wants to work with animals.",
        }),
      ]);
      expect(out).toContain("student_voice");
      expect(out).toContain("Wants to work with animals.");
      expect(out).toContain("{evidence_id:e1}");
    });

    it("caps items per section and notes the overflow", () => {
      const rows = Array.from({ length: 8 }, (_, i) =>
        row({ id: `e${i}`, report_section: "readiness", note: `Snippet number ${i}` }),
      );
      const out = formatEvidenceForPrompt(rows, 3);
      expect(out).toContain("Snippet number 0");
      expect(out).toContain("Snippet number 2");
      expect(out).not.toContain("Snippet number 5");
      expect(out).toContain("(+5 more evidence items");
    });
  });

  describe("summarizeEvidenceUsed", () => {
    it("reports covered vs missing sections", () => {
      const s = summarizeEvidenceUsed([
        row({ id: "a", report_section: "snapshot" }),
        row({ id: "b", report_section: "snapshot" }),
        row({ id: "c", report_section: "readiness" }),
      ]);
      expect(s.total).toBe(3);
      expect(s.covered_sections.sort()).toEqual(["readiness", "snapshot"]);
      expect(s.missing_sections).toContain("student_voice");
      expect(s.by_section.snapshot.ids).toEqual(["a", "b"]);
      expect(s.by_section.snapshot.count).toBe(2);
    });
  });
});
