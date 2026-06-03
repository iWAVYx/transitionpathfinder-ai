import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Activity } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { ownerListActivity, type ActivityLog } from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/activity")({
  head: () => ({ meta: [{ title: "Activity logs — Admin Hub" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const list = useServerFn(ownerListActivity);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    list()
      .then((r) => setLogs(r.logs))
      .finally(() => setLoading(false));
  }, []);

  return (
    <OwnerShell
      title="Admin activity logs"
      description={`${logs.length} most recent admin actions`}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          {logs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No admin actions logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {logs.map((l) => (
                <li key={l.id} className="px-4 py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{l.action_type.replace(/_/g, " ")}</span>
                      {l.target_type && (
                        <span className="text-xs text-muted-foreground">
                          {l.target_type}
                          {l.target_id ? ` · ${l.target_id.slice(0, 8)}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {l.admin_name || "Admin"} · {new Date(l.created_at).toLocaleString()}
                    </div>
                  </div>
                  {l.details && Object.keys(l.details).length > 0 && (
                    <pre className="mt-1 overflow-x-auto rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      {JSON.stringify(l.details, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </OwnerShell>
  );
}
