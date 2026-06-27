import { FileText } from "lucide-react";
import type { ReportSectionId } from "@/lib/hubs/registry";

const SECTION_LABEL: Record<ReportSectionId, string> = {
  snapshot: "Student Snapshot",
  student_voice: "Student Voice",
  family_priorities: "Family Priorities",
  educator_input: "Educator Input",
  documents: "Document Insights",
  readiness: "Readiness Areas",
  pathways: "Recommended Pathways",
  self_advocacy: "Self-Advocacy",
  independent_living: "Independent Living",
  plan_30_60_90: "30/60/90 Plan",
  questions_for_team: "Questions For The Team",
  partner_matches: "Partner Matches",
};

/** Small chip explaining how a spoke feeds the Pathway Report. */
export function FeedsReportBadge({ section }: { section: ReportSectionId }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-primary"
      title={`Feeds the "${SECTION_LABEL[section]}" section of the Pathway Report`}
    >
      <FileText className="h-3 w-3" aria-hidden />
      Feeds Report · {SECTION_LABEL[section]}
    </span>
  );
}
