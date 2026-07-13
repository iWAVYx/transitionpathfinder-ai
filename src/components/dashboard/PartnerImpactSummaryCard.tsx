import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Users, CalendarCheck, ArrowRight } from "lucide-react";
import { getImpactSummary } from "@/lib/partnerforward.functions";
import { ModuleEmptyState } from "@/components/dashboard/ModuleEmptyState";


type Summary = {
  total_events: number;
  total_participants: number;
  by_kind: Record<string, number>;
};

/**
 * Compact partner impact summary, designed to live on the main Opportunities
 * tab so partners see their cumulative reach without leaving the workspace.
 * The full ledger lives on /partners-manage/impact.
 */
export function PartnerImpactSummaryCard({ orgId }: { orgId: string }) {
  const loadSummary = useServerFn(getImpactSummary);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    loadSummary({ data: { organization_id: orgId } })
      .then((s) => setSummary(s as Summary))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [loadSummary, orgId]);

  const events = summary?.total_events ?? 0;
  const participants = summary?.total_participants ?? 0;
  const isEmpty = !loading && events === 0 && participants === 0;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Your Impact
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cumulative events and students reached through your partnership.
          </p>
        </div>
        <Link
          to="/partners-manage/impact"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Open Impact Ledger <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {isEmpty ? (
        <ModuleEmptyState
          kind="reports"
          eyebrow="Partner Impact"
          title="No Impact Recorded Yet"
          description="Post an opportunity and log participation after each session — cumulative events and student reach will populate here for your board and funders."
          primaryAction={{ label: "Post An Opportunity", to: "/opportunities" }}
          secondaryAction={{ label: "Open Partner Report", to: "/partners-manage/impact" }}
          className="mt-3"
        />
      ) : (
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <CalendarCheck className="h-3.5 w-3.5" /> Events Recorded
          </div>
          <p className="mt-1 font-display text-2xl">
            {loading ? "—" : events}
          </p>
        </div>
        <div className="rounded-xl border bg-background p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Users className="h-3.5 w-3.5" /> Students Reached
          </div>
          <p className="mt-1 font-display text-2xl">
            {loading ? "—" : participants}
          </p>
        </div>
      </div>
      )}
    </div>
  );
}

