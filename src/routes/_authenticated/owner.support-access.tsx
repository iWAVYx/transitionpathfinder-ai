import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listSupportAccessGrants,
  revokeSupportAccessGrant,
  SUPPORT_ACCESS_SCOPE_LABELS,
  type SupportAccessGrant,
} from "@/lib/owner/support-access.functions";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/owner/support-access")({
  head: () => ({
    meta: [
      { title: "Exceptional Access Log — Admin Hub — TransitionForward" },
      {
        name: "description",
        content:
          "Every time a platform admin opened a student document under exceptional access, with reason, scope, and expiry.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: dashboardErrorComponent("owner"),
  component: SupportAccessPage,
});

const STATUS_VARIANT = {
  active: "destructive",
  expired: "outline",
  revoked: "secondary",
} as const;

function SupportAccessPage() {
  const fetchGrants = useServerFn(listSupportAccessGrants);
  const revoke = useServerFn(revokeSupportAccessGrant);
  const [grants, setGrants] = useState<SupportAccessGrant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchGrants()
      .then((g) => setGrants(g as SupportAccessGrant[]))
      .catch(() => setGrants(null))
      .finally(() => setLoading(false));
  }, [fetchGrants]);

  useEffect(load, [load]);

  async function onRevoke(id: string) {
    setBusyId(id);
    try {
      await revoke({ data: { id } });
      toast.success("Access revoked. The grant no longer opens the document.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke that grant.");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = grants?.filter((g) => g.status === "active").length ?? 0;

  return (
    <OwnerShell
      title="Exceptional Access Log"
      description="Platform admins have no routine access to student plans. Every override is recorded here permanently."
    >
      <div className="space-y-6">
        <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/30 p-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs text-muted-foreground">
            This log shows accountability metadata only — never a student name, document title, or
            plan content. Grants expire automatically after 15 minutes and can be revoked earlier.
            Entries cannot be edited or deleted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={activeCount > 0 ? "destructive" : "secondary"}>
            {activeCount} Currently Active
          </Badge>
          <Badge variant="outline">{grants?.length ?? 0} Recorded</Badge>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading the exceptional access log…</span>
          </div>
        ) : !grants ? (
          <p className="text-sm text-muted-foreground">
            The access log could not be loaded. Confirm you still hold platform admin access.
          </p>
        ) : grants.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No exceptional access has ever been granted. That is the expected steady state.
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border/70">
            {grants.map((g) => (
              <li key={g.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-4 sm:flex sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold leading-tight">{g.actorName}</span>
                    <Badge variant={STATUS_VARIANT[g.status]} className="capitalize">
                      {g.status}
                    </Badge>
                    <Badge variant="outline">{SUPPORT_ACCESS_SCOPE_LABELS[g.scope]}</Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">{g.documentRef}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{g.reason}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Opened {new Date(g.createdAt).toLocaleString()} · Expires{" "}
                    {new Date(g.expiresAt).toLocaleString()}
                    {g.caseReference ? ` · Case ${g.caseReference}` : ""}
                    {g.revokedAt ? ` · Revoked ${new Date(g.revokedAt).toLocaleString()}` : ""}
                  </p>
                </div>
                {g.status === "active" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={busyId === g.id}
                    onClick={() => onRevoke(g.id)}
                  >
                    {busyId === g.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Revoke Now"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </OwnerShell>
  );
}
