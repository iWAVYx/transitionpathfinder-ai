import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Shield,
  Users,
  FileText,
  FolderOpen,
  UserPlus,
  ClipboardList,
  Loader2,
  Trash2,
  Mail,
  Crown,
} from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getAdminSummary,
  listAuditLog,
  type AdminSummary,
  type AuditEntry,
} from "@/lib/admin.functions";
import {
  listWaitlist,
  deleteWaitlistEntry,
  claimAdminBootstrap,
  listUserRoles,
  grantRole,
  revokeRole,
  type WaitlistEntry,
  type RoleAssignment,
} from "@/lib/admin-waitlist.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — TransitionForward" }] }),
  component: AdminPage,
});

function AdminPage() {
  const fetchSummary = useServerFn(getAdminSummary);
  const fetchAudit = useServerFn(listAuditLog);
  const claimAdmin = useServerFn(claimAdminBootstrap);

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [filter, setFilter] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const s = await fetchSummary();
      setSummary(s);
      if (s.is_admin) {
        const a = await fetchAudit({ data: {} });
        setEntries(a.entries as AuditEntry[]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClaim() {
    setClaiming(true);
    try {
      const r = await claimAdmin();
      if (r.claimed) {
        toast.success("You're now the workspace admin.");
        await reload();
      } else {
        toast.error("An admin already exists. Ask them for access.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim admin.");
    } finally {
      setClaiming(false);
    }
  }

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
            This area is reserved for TransitionForward administrators. If no admin has been
            claimed yet for this workspace, you can claim it now.
          </p>
          <Button className="mt-6" onClick={handleClaim} disabled={claiming}>
            {claiming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Checking…
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" /> Claim admin (if available)
              </>
            )}
          </Button>
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
          Workspace totals, audit trail, waitlist requests, and role management.
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

        <Tabs defaultValue="activity" className="mt-10">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="roles">Roles</TabsTrigger>
          </TabsList>

          <TabsContent value="activity">
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
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
                                {e.metadata}
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
          </TabsContent>

          <TabsContent value="waitlist">
            <WaitlistPanel />
          </TabsContent>

          <TabsContent value="roles">
            <RolesPanel />
          </TabsContent>
        </Tabs>
      </section>
    </SiteShell>
  );
}

function WaitlistPanel() {
  const fetchList = useServerFn(listWaitlist);
  const remove = useServerFn(deleteWaitlistEntry);
  const [rows, setRows] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const { entries } = await fetchList();
      setRows(entries);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRemove(id: string) {
    if (!confirm("Delete this waitlist entry?")) return;
    await remove({ data: { id } });
    toast.success("Removed.");
    await reload();
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Waitlist requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            People who signed up before getting full access.
          </p>
        </div>
        <Mail className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">State</th>
              <th className="py-2 pr-4 font-medium">Grade band</th>
              <th className="py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  No waitlist entries yet.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-4 text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 pr-4 font-medium">{w.full_name}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    <a className="hover:underline" href={`mailto:${w.email}`}>
                      {w.email}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{w.role}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{w.state ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {w.student_grade_band ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(w.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ROLE_OPTIONS = ["admin", "parent", "educator", "case_manager"] as const;

function RolesPanel() {
  const fetchUsers = useServerFn(listUserRoles);
  const grant = useServerFn(grantRole);
  const revoke = useServerFn(revokeRole);

  const [users, setUsers] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLE_OPTIONS)[number]>("educator");
  const [sending, setSending] = useState(false);

  async function reload() {
    setLoading(true);
    try {
      const { users } = await fetchUsers();
      setUsers(users);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    try {
      await grant({ data: { email: email.trim(), role } });
      toast.success(`Granted ${role} to ${email}.`);
      setEmail("");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grant role.");
    } finally {
      setSending(false);
    }
  }

  async function handleRevoke(u: RoleAssignment, r: string) {
    if (!confirm(`Revoke ${r} from ${u.email ?? u.user_id}?`)) return;
    try {
      await revoke({ data: { user_id: u.user_id, role: r as any } });
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke role.");
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-soft">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Roles &amp; access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Grant workspace-level roles to people who have already signed up.
          </p>
        </div>
        <Shield className="h-5 w-5 text-muted-foreground" />
      </div>

      <form
        onSubmit={handleGrant}
        className="mt-5 flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3"
      >
        <Input
          type="email"
          required
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-[220px] flex-1"
        />
        <Select value={role} onValueChange={(v) => setRole(v as any)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Grant role
        </Button>
      </form>

      <ul className="mt-5 divide-y rounded-xl border">
        {loading ? (
          <li className="p-6 text-center text-sm text-muted-foreground">Loading…</li>
        ) : users.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">No role assignments.</li>
        ) : (
          users.map((u) => (
            <li
              key={u.user_id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {u.full_name ?? "Unnamed"}{" "}
                  <span className="text-muted-foreground">· {u.email ?? u.user_id.slice(0, 8)}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => handleRevoke(u, r)}
                      className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-0.5 text-xs hover:border-destructive hover:text-destructive"
                      title={`Revoke ${r}`}
                    >
                      {r}
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
