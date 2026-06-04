import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Briefcase, CheckCircle2, Archive } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  platformListOpportunities,
  platformDecideOpportunity,
  type OpportunityRow,
} from "@/lib/owner/platform-admin.functions";

export const Route = createFileRoute("/_authenticated/owner/opportunities")({
  head: () => ({ meta: [{ title: "Opportunities Review — Admin Hub" }] }),
  component: OpportunitiesReviewPage,
});

const STATUSES = ["pending_review", "approved", "draft", "inactive", "all"] as const;

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pending_review: { label: "Pending review", cls: "bg-amber-100 text-amber-900" },
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900" },
    draft: { label: "Draft", cls: "bg-muted text-foreground" },
    inactive: { label: "Inactive", cls: "bg-slate-200 text-slate-800" },
  };
  const m = map[status] ?? { label: status, cls: "bg-muted" };
  return <Badge className={`${m.cls} hover:${m.cls}`}>{m.label}</Badge>;
}

function OpportunitiesReviewPage() {
  const list = useServerFn(platformListOpportunities);
  const decide = useServerFn(platformDecideOpportunity);
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>("pending_review");
  const [rows, setRows] = useState<OpportunityRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => {
    setRows(null);
    list({ data: { status: filter } })
      .then((r) => setRows(r.opportunities))
      .catch(() => setRows([]));
  };
  useEffect(refresh, [filter, list]);

  async function onDecide(id: string, decision: "approved" | "inactive" | "draft") {
    setBusy(id);
    try {
      await decide({ data: { id, decision } });
      toast.success(`Marked ${decision}`);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OwnerShell
      title="Opportunity Review Queue"
      description="Approve partner-submitted opportunities before they appear in the student catalog."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
          >
            {s.replace("_", " ")}
          </Button>
        ))}
      </div>

      {rows === null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Briefcase className="mx-auto mb-2 h-6 w-6" />
          Nothing in this queue.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border border-border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{r.title}</h3>
                    {statusBadge(r.status)}
                    <Badge variant="outline" className="capitalize">
                      {r.opportunity_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.organization_name ?? "Unknown org"}
                    {r.organization_verified && r.organization_verified !== "verified" && (
                      <span className="ml-2 text-amber-700">
                        · org status: {r.organization_verified}
                      </span>
                    )}
                    {r.location && <span> · {r.location}</span>}
                    <span> · updated {new Date(r.updated_at).toLocaleDateString()}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {r.status !== "approved" && (
                    <Button
                      size="sm"
                      onClick={() => onDecide(r.id, "approved")}
                      disabled={busy === r.id}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                  {r.status !== "inactive" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDecide(r.id, "inactive")}
                      disabled={busy === r.id}
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  )}
                  {r.status !== "draft" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDecide(r.id, "draft")}
                      disabled={busy === r.id}
                    >
                      Send back
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </OwnerShell>
  );
}
