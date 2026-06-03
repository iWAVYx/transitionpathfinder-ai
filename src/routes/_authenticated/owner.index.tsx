import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Users,
  ClipboardList,
  Mail,
  Loader2,
  TrendingUp,
  Building2,
  Activity,
  Settings as SettingsIcon,
  Plus,
} from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/")({
  head: () => ({ meta: [{ title: "Admin Hub — TransitionForward" }] }),
  component: OwnerDashboardPage,
});

function MetricCard({
  label,
  value,
  delta,
  icon: Icon,
  accent = "text-primary",
}: {
  label: string;
  value: number | string;
  delta?: string;
  icon: typeof Users;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
        </div>
        <div className={"rounded-md bg-muted p-2 " + accent}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function OwnerDashboardPage() {
  const fetchMetrics = useServerFn(getDashboardMetrics);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics()
      .then((m) => setMetrics(m))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, [fetchMetrics]);

  return (
    <OwnerShell
      title="Dashboard"
      description="Website and platform overview for TransitionForward."
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading metrics…
        </div>
      ) : !metrics ? (
        <p className="text-sm text-muted-foreground">No metrics available.</p>
      ) : (
        <div className="space-y-6">
          {/* Site status banner */}
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Site status
            </span>
            <Badge variant={metrics.siteStatus.maintenanceMode ? "destructive" : "secondary"}>
              {metrics.siteStatus.maintenanceMode ? "Maintenance" : "Live"}
            </Badge>
            <Badge variant={metrics.siteStatus.waitlistOpen ? "default" : "outline"}>
              Waitlist {metrics.siteStatus.waitlistOpen ? "open" : "closed"}
            </Badge>
            <Badge variant="outline">{metrics.siteStatus.launchStatus.replace(/_/g, " ")}</Badge>
          </div>

          {/* Metrics grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total users"
              value={metrics.totalUsers}
              delta={`+${metrics.newUsersThisWeek} this week`}
              icon={Users}
            />
            <MetricCard
              label="Waitlist entries"
              value={metrics.totalWaitlist}
              delta={`${metrics.newWaitlist} new`}
              icon={ClipboardList}
            />
            <MetricCard
              label="Contact submissions"
              value={metrics.totalContacts}
              delta={`${metrics.newContacts} new`}
              icon={Mail}
            />
            <MetricCard
              label="Pending partners"
              value={metrics.partnerInquiries}
              icon={Building2}
            />
          </div>

          {/* Quick actions */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Quick actions
            </h2>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="default" size="sm">
                <Link to="/owner/waitlist">
                  <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> View waitlist
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/owner/contacts">
                  <Mail className="mr-1.5 h-3.5 w-3.5" /> Review contacts
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/owner/admins">
                  <Users className="mr-1.5 h-3.5 w-3.5" /> Manage admins
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/owner/settings">
                  <SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> Site settings
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" disabled>
                <span>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add resource (Phase 3)
                </span>
              </Button>
              <Button asChild variant="outline" size="sm" disabled>
                <span>
                  <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Analytics (Phase 3)
                </span>
              </Button>
            </div>
          </section>

          {/* Recent activity */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent admin activity
              </h2>
              <Link to="/owner/activity" className="text-xs text-primary hover:underline">
                View all →
              </Link>
            </div>
            <div className="overflow-hidden rounded-lg border border-border bg-background">
              {metrics.recentActivity.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {metrics.recentActivity.slice(0, 10).map((a) => (
                    <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{a.action_type.replace(/_/g, " ")}</span>
                      {a.target_type && (
                        <span className="text-muted-foreground">
                          · {a.target_type}
                          {a.target_id ? ` ${a.target_id.slice(0, 8)}` : ""}
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}
    </OwnerShell>
  );
}
