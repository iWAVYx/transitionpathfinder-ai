import { useMemo, useState, type ReactNode } from "react";
import { FileText, Plus, Trash2, Link2 } from "lucide-react";
import type { ReportSectionId } from "@/lib/hubs/registry";
import {
  REPORT_SECTIONS,
  REPORT_SECTION_LABELS,
  SOURCE_KIND_LABELS,
  evidenceCoveragePct,
  groupEvidenceBySection,
  type EvidenceLink,
  type EvidenceSourceKind,
} from "@/lib/report-evidence/types";

export interface AttachEvidenceInput {
  reportSection: ReportSectionId;
  sourceKind: EvidenceSourceKind;
  sourceLabel: string;
  note?: string;
}

export interface ReportEvidencePanelProps {
  /** Loaded evidence links for the current student. */
  links: EvidenceLink[];
  /** Optional context label — e.g. student name / "Sample Data". */
  scopeLabel?: string;
  /** Enables the attach + delete affordances. */
  canEdit?: boolean;
  isPending?: boolean;
  emptyHint?: ReactNode;
  onAttach?: (input: AttachEvidenceInput) => Promise<void> | void;
  onDetach?: (id: string) => Promise<void> | void;
}

const KIND_OPTIONS: EvidenceSourceKind[] = [
  "document",
  "note",
  "goal",
  "meeting",
  "voice_response",
  "assessment",
  "opportunity",
  "other",
];

/**
 * Evidence → Pathway Report backing panel. Shows how each report section
 * is (or isn't) backed by student records, and lets editors attach or
 * detach evidence links. Read-only for viewers.
 */
export function ReportEvidencePanel({
  links,
  scopeLabel,
  canEdit = false,
  isPending = false,
  emptyHint,
  onAttach,
  onDetach,
}: ReportEvidencePanelProps) {
  const grouped = useMemo(() => groupEvidenceBySection(links), [links]);
  const coverage = evidenceCoveragePct(links);
  const [openSection, setOpenSection] = useState<ReportSectionId | null>(null);

  return (
    <section
      aria-labelledby="report-evidence-title"
      className="mt-6 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm sm:p-6"
      data-testid="report-evidence-panel"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow">Evidence → Pathway Report</p>
          <h2
            id="report-evidence-title"
            className="mt-1 flex items-center gap-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            <FileText className="h-5 w-5 text-primary" aria-hidden />
            What Backs Each Report Section
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Connect uploads, notes, goals, meetings, voice responses, and opportunities to the exact
            Pathway Report section they support{scopeLabel ? ` — ${scopeLabel}` : ""}.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Sections Backed</div>
          <div className="font-display text-2xl font-semibold text-primary">{coverage}%</div>
        </div>
      </header>

      {links.length === 0 && emptyHint ? (
        <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
          {emptyHint}
        </div>
      ) : null}

      <ul className="mt-4 divide-y divide-border/60">
        {REPORT_SECTIONS.map((section) => {
          const items = grouped[section] ?? [];
          const isOpen = openSection === section;
          return (
            <li key={section} className="py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">
                    {REPORT_SECTION_LABELS[section]}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {items.length === 0
                      ? "No evidence yet"
                      : `${items.length} evidence link${items.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : section)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-foreground hover:border-primary/60 hover:text-primary disabled:opacity-50"
                    disabled={isPending}
                    aria-expanded={isOpen}
                    aria-controls={`evidence-attach-${section}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden /> Attach
                  </button>
                ) : null}
              </div>

              {items.length > 0 ? (
                <ul className="mt-2 space-y-1.5">
                  {items.map((link) => (
                    <li
                      key={link.id}
                      className="flex items-start justify-between gap-2 rounded-md border border-border/50 bg-background/70 px-2.5 py-1.5 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Link2 className="h-3 w-3 text-muted-foreground" aria-hidden />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {SOURCE_KIND_LABELS[link.sourceKind]}
                          </span>
                        </div>
                        <div className="truncate text-foreground">{link.sourceLabel}</div>
                        {link.note ? (
                          <div className="text-xs text-muted-foreground">{link.note}</div>
                        ) : null}
                      </div>
                      {canEdit && onDetach ? (
                        <button
                          type="button"
                          onClick={() => onDetach(link.id)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                          aria-label={`Detach ${link.sourceLabel}`}
                          disabled={isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {canEdit && isOpen ? (
                <AttachForm
                  section={section}
                  disabled={isPending}
                  onCancel={() => setOpenSection(null)}
                  onSubmit={async (input) => {
                    await onAttach?.(input);
                    setOpenSection(null);
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AttachForm({
  section,
  disabled,
  onSubmit,
  onCancel,
}: {
  section: ReportSectionId;
  disabled?: boolean;
  onSubmit: (input: AttachEvidenceInput) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<EvidenceSourceKind>("document");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");

  return (
    <form
      id={`evidence-attach-${section}`}
      className="mt-3 space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!label.trim()) return;
        await onSubmit({
          reportSection: section,
          sourceKind: kind,
          sourceLabel: label.trim(),
          note: note.trim() || undefined,
        });
        setLabel("");
        setNote("");
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Source Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EvidenceSourceKind)}
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {SOURCE_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-muted-foreground">Source Label</span>
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. IEP 2025-2026 · page 4"
            className="rounded-md border border-border bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-xs">
        <span className="font-medium text-muted-foreground">Note (optional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why does this back the section?"
          className="rounded-md border border-border bg-background px-2 py-1 text-sm"
        />
      </label>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={disabled || !label.trim()}
          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Attach Evidence
        </button>
      </div>
    </form>
  );
}
