import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Users, FileText, FolderOpen, GraduationCap, Mail, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSchoolDashboard,
  updateMembershipStatus,
  type SchoolDashboard,
} from "@/lib/school-admin.functions";

export const Route = createFileRoute("/_authenticated/admin-school")({
  head: () => ({ meta: [{ title: "School Admin — TransitionForward" }] }),
  component: SchoolAdminPage,
});

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-2 font-display text-2xl font-medium">{value}</p>
    </div>
  );
}

function SchoolAdminPage() {
  const fetchDash = useServerFn(getSchoolDashboard);
  const updateMember = useServerFn(updateMembershipStatus);
  const [data, setData] = useState<SchoolDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);

  async function reload(nextOrgId?: string) {
    setLoading(true);
    try {
      const d = await fetchDash({ data: { org_id: nextOrgId } });
      setData(d);
      setOrgId(d.selected_org_id ?? undefined);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleApprove(membership_id: string) {
    try {
      await updateMember({ data: { membership_id, status: "active" } });
      toast.success("Member approved");
      reload(orgId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function handleRemove(membership_id: string) {
    try {
      await updateMember({ data: { membership_id, status: "removed" } });
      toast.success("Member removed");
      reload(orgId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  if (loading && !data) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SiteShell>
    );
  }

  if (!data?.is_school_admin) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "School Admin" }]} />
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-medium">School admin only</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              You don't currently have an admin role in any organization. Ask your district lead
              to grant you the <code>school_admin</code> role.
            </p>
            <Button asChild className="mt-5">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, { label: "School Admin" }]} />

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              School / District
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Admin dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your team, review pending invites, and see students in your organization.
            </p>
          </div>
          {data.orgs.length > 1 && (
            <Select value={orgId} onValueChange={(v) => reload(v)}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {data.orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    <span className="inline-flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5" /> {o.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Active staff" value={data.metrics.active_members} icon={Users} />
          <MetricCard label="Pending invites" value={data.metrics.pending_members} icon={Mail} />
          <MetricCard label="Students" value={data.metrics.students_count} icon={GraduationCap} />
          <MetricCard label="Reports" value={data.metrics.reports_count} icon={FileText} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-card">
            <div className="border-b border-border/60 px-5 py-4">
              <h2 className="font-display text-lg font-medium">Pending invites</h2>
              <p className="text-xs text-muted-foreground">
                Approve to give staff access to org-scoped views.
              </p>
            </div>
            <ul className="divide-y divide-border/40">
              {data.pending_members.length === 0 ? (
                <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                  No pending invites.
                </li>
              ) : (
                data.pending_members.map((m) => (
                  <li key={m.membership_id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.full_name ?? m.email ?? m.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.role_within_org} · {m.status}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(m.membership_id)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(m.membership_id)}>
                        Remove
                      </Button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card">
            <div className="border-b border-border/60 px-5 py-4">
              <h2 className="font-display text-lg font-medium">Staff</h2>
              <p className="text-xs text-muted-foreground">Active members in this organization.</p>
            </div>
            <ul className="divide-y divide-border/40">
              {data.members.length === 0 ? (
                <li className="px-5 py-6 text-center text-sm text-muted-foreground">No active members.</li>
              ) : (
                data.members.map((m) => (
                  <li key={m.membership_id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.full_name ?? m.email ?? m.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.role_within_org}
                        {m.primary_role ? ` · ${m.primary_role}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleRemove(m.membership_id)}>
                      Remove
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-border/60 bg-card">
          <div className="border-b border-border/60 px-5 py-4 flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg font-medium">Students in this org</h2>
            <span className="ml-auto text-xs text-muted-foreground">{data.students.length}</span>
          </div>
          <ul className="divide-y divide-border/40">
            {data.students.length === 0 ? (
              <li className="px-5 py-6 text-center text-sm text-muted-foreground">
                No students linked to this organization yet.
              </li>
            ) : (
              data.students.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {s.preferred_name ?? s.first_name ?? "Unnamed student"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[s.grade_band, s.owner_name && `Lead: ${s.owner_name}`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/students/$studentId" params={{ studentId: s.id }}>
                      Open
                    </Link>
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </SiteShell>
  );
}
