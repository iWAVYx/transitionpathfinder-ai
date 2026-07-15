import { useState } from "react";
import { ReportEvidencePanel } from "./ReportEvidencePanel";
import { DEMO_EVIDENCE_LINKS } from "@/lib/report-evidence/fixtures";
import type { EvidenceLink } from "@/lib/report-evidence/types";

/**
 * Demo-mode Evidence → Report panel. Fully local: attach/detach mutate
 * fixture state in memory so the sample stays interactive without
 * exposing real records.
 */
export function ReportEvidencePanelDemo({ scopeLabel = "Sample Data" }: { scopeLabel?: string }) {
  const [links, setLinks] = useState<EvidenceLink[]>(DEMO_EVIDENCE_LINKS);

  return (
    <ReportEvidencePanel
      links={links}
      scopeLabel={scopeLabel}
      canEdit
      onAttach={(input) => {
        setLinks((cur) => [
          {
            id: `demo-${Math.random().toString(36).slice(2, 8)}`,
            studentId: cur[0]?.studentId ?? "00000000-0000-0000-0000-000000000000",
            reportSection: input.reportSection,
            sourceKind: input.sourceKind,
            sourceLabel: input.sourceLabel,
            note: input.note ?? null,
            createdAt: new Date().toISOString(),
          },
          ...cur,
        ]);
      }}
      onDetach={(id) => setLinks((cur) => cur.filter((l) => l.id !== id))}
      emptyHint="Attach a document, note, goal, meeting, or opportunity to see how it backs a report section."
    />
  );
}
