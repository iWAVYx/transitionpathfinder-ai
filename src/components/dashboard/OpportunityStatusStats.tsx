import { Briefcase, CheckCircle2, Clock, Archive, FileEdit } from "lucide-react";
import { OPPORTUNITY_STATUS_LABEL } from "@/lib/opportunity-status";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";

type Opp = { id: string; status: string };

/**
 * Partner workspace stats: counts opportunities by status. Pure
 * presentational — operates on data the partner page already loaded.
 */
export function OpportunityStatusStats({ opps }: { opps: Opp[] }) {
  const counts = {
    draft: 0,
    pending_review: 0,
    approved: 0,
    inactive: 0,
  } as Record<string, number>;
  for (const o of opps) counts[o.status] = (counts[o.status] ?? 0) + 1;

  const tiles: Array<{
    key: keyof typeof counts;
    label: string;
    icon: React.ReactNode;
    tone: string;
  }> = [
    { key: "approved", label: OPPORTUNITY_STATUS_LABEL.approved, icon: <CheckCircle2 className="h-3.5 w-3.5" />, tone: "text-emerald-600 dark:text-emerald-400" },
    { key: "pending_review", label: OPPORTUNITY_STATUS_LABEL.pending_review, icon: <Clock className="h-3.5 w-3.5" />, tone: "text-amber-600 dark:text-amber-400" },
    { key: "draft", label: OPPORTUNITY_STATUS_LABEL.draft, icon: <FileEdit className="h-3.5 w-3.5" />, tone: "text-foreground" },
    { key: "inactive", label: OPPORTUNITY_STATUS_LABEL.inactive, icon: <Archive className="h-3.5 w-3.5" />, tone: "text-muted-foreground" },
  ];

  const isEmpty = opps.length === 0;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Briefcase className="h-3.5 w-3.5" /> Opportunity pipeline
      </div>
      {isEmpty ? (
        <ModuleEmptyState
          kind="tasks"
          eyebrow="Opportunity Pipeline"
          title="No Opportunities Yet"
          description="Draft an opportunity to describe the role, cadence, and eligibility. Submit for review to appear in family- and student-facing search."
          primaryAction={{ label: "Post An Opportunity", to: "/partners-manage" }}
          secondaryAction={{ label: "Open Partner Report", to: "/partners-manage/impact" }}
          className="mt-3"
        />
      ) : (
      <>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.key} className="rounded-xl border bg-background p-3">
            <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider ${t.tone}`}>
              {t.icon} {t.label}
            </div>
            <p className="mt-1 font-display text-2xl">{counts[t.key] ?? 0}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Drafts are private. Submit for review to be listed in family- and student-facing search.
      </p>
      </>
      )}
    </div>
  );
}

