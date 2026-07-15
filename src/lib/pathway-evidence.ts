/**
 * Helpers for weaving report_evidence_links into Pathway Report generation
 * and post-hoc validation of AI output. Pure functions — safe to import
 * from server functions and unit tests.
 */
import {
  REPORT_SECTION_LABELS,
  SOURCE_KIND_LABELS,
  type EvidenceSourceKind,
} from "@/lib/report-evidence/types";
import type { ReportSectionId } from "@/lib/hubs/registry";

export interface EvidenceRow {
  id: string;
  report_section: string;
  source_kind: string;
  source_id: string | null;
  source_label: string;
  note: string | null;
}

/** Phrases that indicate the AI fell back to generic filler. */
export const BANNED_SUMMARY_PHRASES = [
  "consider working on",
  "it is important to",
  "as a student",
  "in general",
  "overall, the student",
  "the student is a hard worker",
  "student needs support",
  "n/a",
];

const MIN_SUMMARY_CHARS = 60;

/** True when a summary is empty, too short, or contains a banned filler phrase. */
export function isWeakSummary(text: string | null | undefined): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (trimmed.length < MIN_SUMMARY_CHARS) return true;
  const lower = trimmed.toLowerCase();
  return BANNED_SUMMARY_PHRASES.some((p) => lower.includes(p));
}

/** Strip the "AI-extracted (confidence): " prefix left by the extractor. */
export function evidenceSnippet(row: EvidenceRow): string {
  const note = (row.note ?? "").trim();
  const m = note.match(/^AI-extracted\s*\([^)]+\):\s*(.*)$/i);
  return (m ? m[1] : note).trim();
}

/** Group evidence rows by report_section, preserving insert order. */
export function groupBySection(rows: EvidenceRow[]): Record<string, EvidenceRow[]> {
  const out: Record<string, EvidenceRow[]> = {};
  for (const r of rows) {
    (out[r.report_section] ||= []).push(r);
  }
  return out;
}

/**
 * Build a delimited `<<<EVIDENCE>>>` block for the AI prompt. Sections with
 * no evidence are listed explicitly so the model knows what's missing.
 */
export function formatEvidenceForPrompt(rows: EvidenceRow[], maxPerSection = 6): string {
  if (rows.length === 0) {
    return `<<<EVIDENCE>>>
(no evidence links on file — flag missing_information for anything not grounded in the sections below)
<<<END_EVIDENCE>>>`;
  }
  const grouped = groupBySection(rows);
  const lines: string[] = ["<<<EVIDENCE>>>"];
  for (const [section, list] of Object.entries(grouped)) {
    const label =
      REPORT_SECTION_LABELS[section as ReportSectionId] ?? section;
    lines.push(`# ${label} (${section})`);
    for (const r of list.slice(0, maxPerSection)) {
      const snip = evidenceSnippet(r).replace(/\s+/g, " ").slice(0, 400);
      const kindLabel =
        SOURCE_KIND_LABELS[r.source_kind as EvidenceSourceKind] ?? r.source_kind;
      lines.push(`- [${kindLabel}: ${r.source_label}] ${snip} {evidence_id:${r.id}}`);
    }
    if (list.length > maxPerSection) {
      lines.push(`- (+${list.length - maxPerSection} more evidence items in this section)`);
    }
  }
  lines.push("<<<END_EVIDENCE>>>");
  lines.push(
    "Rules: prefer wording grounded in the EVIDENCE above. When you cite one, reference {evidence_id:...}. Do NOT invent facts beyond the evidence and other structured inputs.",
  );
  return lines.join("\n");
}

/** Summary of how much evidence backed the report, for `evidence_used` on the report content. */
export interface EvidenceUsedSummary {
  total: number;
  covered_sections: string[];
  missing_sections: string[];
  by_section: Record<string, { count: number; ids: string[] }>;
}

const ALL_SECTIONS: ReportSectionId[] = [
  "snapshot",
  "student_voice",
  "family_priorities",
  "educator_input",
  "documents",
  "readiness",
  "pathways",
  "self_advocacy",
  "independent_living",
  "plan_30_60_90",
  "questions_for_team",
  "partner_matches",
];

export function summarizeEvidenceUsed(rows: EvidenceRow[]): EvidenceUsedSummary {
  const grouped = groupBySection(rows);
  const by_section: EvidenceUsedSummary["by_section"] = {};
  for (const [section, list] of Object.entries(grouped)) {
    by_section[section] = { count: list.length, ids: list.map((r) => r.id) };
  }
  const covered_sections = Object.keys(by_section);
  const missing_sections = ALL_SECTIONS.filter((s) => !by_section[s]);
  return {
    total: rows.length,
    covered_sections,
    missing_sections,
    by_section,
  };
}
