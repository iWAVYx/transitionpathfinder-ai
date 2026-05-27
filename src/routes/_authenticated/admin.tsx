import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Users, FileText, FolderOpen, UserPlus, ClipboardList, Loader2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import {
  getAdminSummary,
  listAuditLog,
  type AdminSummary,
  type AuditEntry,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — TransitionForward" }] }),
  component: AdminPage,
});

function AdminPage() {
  const fetchSummary = useServerFn(getAdminSummary);
  const fetchAudit = useServerFn(listAuditLog);

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [s, a] = await Promise.all([fetchSummary(), fetchAudit({ data: {} })]);
        setSummary(s);
        setEntries(a.entries);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return entries;
    const f = filter.toLowerCase();
    return entries.filter(
      (e) =>
        e.action.toLowerCase().includes(f) ||
        e.entity_type.toLowerCase().includes(f) ||
        (e.actor_email ?? "").toLowerCase().includes(f),
    );
  }, [entries, filter]);

  if (loading) {
    return (
      <SiteShell>
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-16 text-sm text-muted-foreground sm:px-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading admin console…
        </div>
      </SiteShell>
    );
  }

  if (!summary?.is_admin) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-4 font-display text-3xl">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is reserved for TransitionForward administrators. If you believe you should
            have access, reach out to your workspace admin.
          </p>
        </section>
      </SiteShell>
    );
  }

  const stats = [
    { label: "Students", value: summary.totals.students, icon: Users },
    { label: "Reports", value: summary.totals.reports, icon: FileText },
    { label: "Documents", value: summary.totals.documents, icon: FolderOpen },
    { label: "Collaborators", value: summary.totals.collaborators, icon: UserPlus },
    { label: "Audit entries", value: summary.totals.audit_entries, icon: ClipboardList },
  ];

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Admin" }]} />
      </div>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Admin</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">Operations console</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Workspace totals and a chronological audit trail. Everything is scoped to data your role
          can already access — this view just makes it easier to review.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <s.icon className="h-3.5 w-3.5 text-primary" /> {s.label}
              </div>
              <p className="mt-2 font-display text-3xl">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">Recent activity</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Most recent 100 entries from the audit log.
              </p>
            </div>
            <Input
              placeholder="Filter by action, type, or email…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full max-w-xs"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">Action</th>
                  <th className="py-2 pr-4 font-medium">Entity</th>
                  <th className="py-2 pr-4 font-medium">Actor</th>
                  <th className="py-2 pr-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      No audit entries match.
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 align-top last:border-0">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4 font-medium">{e.action}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{e.entity_type}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {e.actor_email ?? e.actor_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {e.metadata ? (
                          <code className="block max-w-[28rem] truncate rounded bg-muted px-2 py-1 text-xs">
                            {JSON.stringify(e.metadata)}
                          </code>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
