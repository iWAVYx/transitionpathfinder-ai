import { Link, useNavigate } from "@tanstack/react-router";

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
  BookOpen,
  FileText,
  Eye,
  ArrowRight,
} from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDashboardMetrics,
  getResourceCounts,
  getReviewQueueCounts,
  type DashboardMetrics,
} from "@/lib/owner/owner.functions";
import { adminListResourcesNeedingReview } from "@/lib/resource-sources.functions";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { StatGrid, StatCard } from "@/components/layout/StatGrid";
import { CollapsibleSection } from "@/components/layout/CollapsibleSection";
import { ReviewQueuesPanel, type ReviewQueueCounts } from "@/components/owner/ReviewQueuesPanel";
import { OwnerSectionsGrid } from "@/components/owner/OwnerSectionsGrid";
import { timeAgo } from "@/lib/time-ago";
import { DashboardErrorFallback } from "@/components/dashboard/DashboardErrorFallback";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function OwnerDashboardPage() {
  const fetchMetrics = useServerFn(getDashboardMetrics);
  const fetchResourceCounts = useServerFn(getResourceCounts);
  const fetchReviewCounts = useServerFn(adminListResourcesNeedingReview);
  const fetchQueueCounts = useServerFn(getReviewQueueCounts);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [resourceCounts, setResourceCounts] = useState<{
    published: number;
    drafts: number;
  } | null>(null);
  const [reviewCounts, setReviewCounts] = useState<{
    resourcesNeedingReview: number;
    brokenLinks: number;
    sourcesNeedingReview: number;
  } | null>(null);
  const [queueCounts, setQueueCounts] = useState<ReviewQueueCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchMetrics().catch(() => null),
      fetchResourceCounts().catch(() => null),
      fetchReviewCounts().catch(() => null),
      fetchQueueCounts().catch(() => null),
    ])
      .then(([m, r, rev, q]) => {
        setMetrics(m);
        setResourceCounts(r);
        setReviewCounts(rev);
        setQueueCounts(q);
      })
      .finally(() => setLoading(false));
  }, [fetchMetrics, fetchResourceCounts, fetchReviewCounts, fetchQueueCounts]);

  return (
    <OwnerShell
      title="Admin Hub"
      description="Platform operations, review queues, and launch readiness for TransitionForward."
    >
      {loading ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Loading Admin Hub — Waitlist, Contacts, Review Queues, And System Status
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Gathering platform metrics…</span>
          </div>
        </div>
      ) : !metrics ? (
        <DashboardErrorFallback role="owner" />
      ) : (
        <div className="space-y-8 lg:space-y-11">
          <NextBestAction surface="admin" />

          {/* Ops preview grid — one glanceable card per operational surface */}
          <OwnerOperationsPreview metrics={metrics} reviewCounts={reviewCounts} />

          {/* Site status banner — pills wrap cleanly on mobile */}
          <div className="flex flex-wrap items-center gap-2 border-y border-border/70 py-3 sm:px-2 sm:py-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Site Status
            </span>
            <Badge variant={metrics.siteStatus.maintenanceMode ? "destructive" : "secondary"}>
              {metrics.siteStatus.maintenanceMode ? "Maintenance" : "Live"}
            </Badge>
            <Badge variant={metrics.siteStatus.waitlistOpen ? "default" : "outline"}>
              Waitlist {metrics.siteStatus.waitlistOpen ? "Open" : "Closed"}
            </Badge>
            <Badge variant="outline">{metrics.siteStatus.launchStatus.replace(/_/g, " ")}</Badge>
          </div>

          {/* Primary KPIs */}
          <StatGrid cols={4}>
            <StatCard
              label="Total Users"
              value={metrics.totalUsers}
              hint={`+${metrics.newUsersThisWeek} this week`}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Waitlist Entries"
              value={metrics.totalWaitlist}
              hint={`${metrics.newWaitlist} new`}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Contacts"
              value={metrics.totalContacts}
              hint={`${metrics.newContacts} new`}
              icon={<Mail className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Resources"
              value={resourceCounts?.published ?? 0}
              hint={`${resourceCounts?.drafts ?? 0} drafts`}
              icon={<BookOpen className="h-3.5 w-3.5" />}
            />
          </StatGrid>

          {/* Resource library health — only renders when there's something to act on */}
          {reviewCounts &&
            reviewCounts.resourcesNeedingReview +
              reviewCounts.brokenLinks +
              reviewCounts.sourcesNeedingReview >
              0 && (
              <section className="space-y-3 sm:space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Resource Library Health
                </h2>
                <div className="grid divide-y divide-border/60 border-y border-border/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <Link
                    to="/owner/resource-review"
                    hash="needing-review"
                    aria-label="Open the resources needing review queue"
                    className="px-2 py-4 transition-colors hover:bg-muted/40 sm:px-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Resources Needing Review
                    </p>
                    <p className="mt-2 font-display text-2xl">
                      {reviewCounts.resourcesNeedingReview}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Open Review Queue →</p>
                  </Link>
                  <div className="px-2 py-4 sm:px-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Broken Links
                    </p>
                    <p
                      className={`mt-2 font-display text-2xl ${reviewCounts.brokenLinks > 0 ? "text-destructive" : ""}`}
                    >
                      {reviewCounts.brokenLinks}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Included In Review Queue
                    </p>
                  </div>

                  <Link
                    to="/owner/resource-sources"
                    className="px-2 py-4 transition-colors hover:bg-muted/40 sm:px-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Source Libraries To Review
                    </p>
                    <p className="mt-2 font-display text-2xl">
                      {reviewCounts.sourcesNeedingReview}
                    </p>
                  </Link>
                </div>
              </section>
            )}

          <ReviewQueuesPanel counts={queueCounts} loading={loading} />

          {/* Full tile grid of every Admin Hub section, grouped by area.
              This is the primary hub affordance — sub-pages remain full
              destinations (not drawers) because admin workflows require
              deep interaction. */}
          <OwnerSectionsGrid />

          {/* Quick actions — secondary, collapsed on mobile to reduce density */}
          <CollapsibleSection
            title="Quick Actions"
            description="Jump into the common admin tasks."
            icon={<SettingsIcon className="h-4 w-4 text-muted-foreground" />}
            defaultOpen={false}
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/owner/resources">
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Manage Resources
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/owner/content">
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Edit Site Content
                </Link>
              </Button>
              {/* /owner/analytics is already the "Analytics snapshot" tile
                  in the Operations preview above — do not add a second
                  <Link to="/owner/analytics"> here or the dashboard
                  regression flags duplicate hrefs inside <main>. */}
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/owner/settings">
                  <SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> Site Settings
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full justify-start">
                <Link to="/owner/partner-network">
                  <Building2 className="mr-1.5 h-3.5 w-3.5" /> Partner Network (
                  {metrics.partnerInquiries})
                </Link>
              </Button>
            </div>
          </CollapsibleSection>

          {/* Recent activity */}
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Recent Admin Activity
              </h2>
              <Link to="/owner/activity" className="text-xs text-primary hover:underline">
                Open Activity Log
              </Link>
            </div>
            <div className="border-y border-border/70">
              {metrics.recentActivity.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {metrics.recentActivity.slice(0, 10).map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
                    >
                      <Activity className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{a.action_type.replace(/_/g, " ")}</span>
                      {a.target_type && (
                        <span className="text-muted-foreground">
                          · {a.target_type}
                          {a.target_id ? ` ${a.target_id.slice(0, 8)}` : ""}
                        </span>
                      )}
                      <span
                        className="ml-auto text-xs text-muted-foreground"
                        title={new Date(a.created_at).toLocaleString()}
                      >
                        {timeAgo(a.created_at)}
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

function OwnerOperationsPreview({
  metrics,
  reviewCounts,
}: {
  metrics: DashboardMetrics;
  reviewCounts: {
    resourcesNeedingReview: number;
    brokenLinks: number;
    sourcesNeedingReview: number;
  } | null;
}) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<{
    label: string;
    value: string | number;
    hint: string;
    to: string;
    tone: string;
    summary: string;
    dataSource: string;
    stats: Array<{ label: string; value: string | number }>;
    rows: string[];
  } | null>(null);
  const tiles: Array<NonNullable<typeof selected>> = [
    // NOTE: /owner/waitlist, /owner/contacts, /owner/partner-submissions,
    // and /owner/feedback are the actionable rows in <ReviewQueuesPanel />
    // below. Do NOT re-add them here as tiles — the dashboard regression
    // suite rejects duplicate <a href> inside <main>. Keep this preview
    // to destinations that only appear once on the Admin Hub page.
    {
      label: "Users",
      value: metrics.totalUsers,
      hint: `+${metrics.newUsersThisWeek} this week`,
      to: "/owner/users",
      tone: "text-primary",
      summary: "Account growth and recent activation at a glance, without exposing user records.",
      dataSource: "Authorized aggregate profile counts",
      stats: [
        { label: "Total users", value: metrics.totalUsers },
        { label: "New this week", value: metrics.newUsersThisWeek },
      ],
      rows: [
        `${metrics.totalUsers} total platform accounts`,
        `${metrics.newUsersThisWeek} accounts added this week`,
      ],
    },
    {
      label: "Resource Review Queue",
      value: reviewCounts?.resourcesNeedingReview ?? 0,
      hint: `${reviewCounts?.brokenLinks ?? 0} broken links`,
      to: "/owner/resource-review",
      tone: (reviewCounts?.resourcesNeedingReview ?? 0) > 0 ? "text-amber-600" : "",
      summary: "Published-resource quality checks that require an owner decision.",
      dataSource: "Resource review and link-health aggregate counts",
      stats: [
        { label: "Needs review", value: reviewCounts?.resourcesNeedingReview ?? 0 },
        { label: "Broken links", value: reviewCounts?.brokenLinks ?? 0 },
        { label: "Sources due", value: reviewCounts?.sourcesNeedingReview ?? 0 },
      ],
      rows: [
        `${reviewCounts?.resourcesNeedingReview ?? 0} resources need review`,
        `${reviewCounts?.brokenLinks ?? 0} broken links detected`,
        `${reviewCounts?.sourcesNeedingReview ?? 0} source libraries need review`,
      ],
    },
    {
      label: "Launch Readiness",
      value: metrics.siteStatus.launchStatus.replace(/_/g, " "),
      hint: "Track blockers",
      to: "/owner/launch",
      tone: "text-primary",
      summary: "The current launch phase and the operational checklist used to manage blockers.",
      dataSource: "Owner-controlled public site settings",
      stats: [
        { label: "Launch status", value: metrics.siteStatus.launchStatus.replace(/_/g, " ") },
        { label: "Waitlist", value: metrics.siteStatus.waitlistOpen ? "Open" : "Closed" },
      ],
      rows: [
        `Launch status: ${metrics.siteStatus.launchStatus.replace(/_/g, " ")}`,
        `Public waitlist: ${metrics.siteStatus.waitlistOpen ? "open" : "closed"}`,
      ],
    },
    {
      label: "System Health",
      value: metrics.siteStatus.maintenanceMode ? "Maintenance" : "Live",
      hint: "Uptime & jobs",
      to: "/owner/health",
      tone: metrics.siteStatus.maintenanceMode ? "text-destructive" : "text-emerald-600",
      summary:
        "A safe status preview before opening diagnostics and protected operational controls.",
      dataSource: "Owner-controlled maintenance and launch settings",
      stats: [
        { label: "Site", value: metrics.siteStatus.maintenanceMode ? "Maintenance" : "Live" },
        { label: "Recent events", value: metrics.recentActivity.length },
      ],
      rows: [
        metrics.siteStatus.maintenanceMode
          ? "Maintenance mode is enabled"
          : "Maintenance mode is off",
        `${metrics.recentActivity.length} recent admin events are available in the activity preview`,
      ],
    },
    {
      label: "Analytics Snapshot",
      value: "View",
      hint: "Traffic & engagement",
      to: "/owner/analytics",
      tone: "text-primary",
      summary: "Privacy-safe platform adoption totals before opening the deeper analytics tool.",
      dataSource: "Aggregate user, waitlist, contact, resource, and partner counts",
      stats: [
        { label: "Users", value: metrics.totalUsers },
        { label: "Waitlist", value: metrics.totalWaitlist },
        { label: "Partner inquiries", value: metrics.partnerInquiries },
      ],
      rows: [
        `${metrics.totalContacts} total contact submissions`,
        `${metrics.publishedResources} published resources`,
        `${metrics.partnerInquiries} partner inquiries`,
      ],
    },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Operations Overview
      </h2>
      <p className="text-xs text-muted-foreground">
        Preview live aggregate status here, then open the full private tool for deeper work.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <article
            key={t.label}
            className="flex min-h-48 flex-col rounded-xl border border-border/70 bg-card p-4 shadow-sm"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.label}
            </p>
            <p className={`mt-2 font-display text-2xl ${t.tone}`}>{t.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.hint}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t.summary}</p>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 pt-3">
              <button
                type="button"
                onClick={() => setSelected(t)}
                aria-label={`Preview ${t.label}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary/60 hover:text-primary"
              >
                <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
              </button>
              <button
                type="button"
                onClick={() => navigate({ to: t.to })}
                aria-label={`Open full ${t.label} tool`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                Open Full Tool <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </article>
        ))}
      </div>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          {selected ? (
            <>
              <SheetHeader>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Private Owner Hub Preview
                </p>
                <SheetTitle className="text-left font-display text-2xl">
                  {selected.label}
                </SheetTitle>
                <SheetDescription className="text-left">{selected.summary}</SheetDescription>
              </SheetHeader>

              <dl className="mt-6 grid grid-cols-2 gap-3">
                {selected.stats.map((stat) => (
                  <div key={stat.label} className="rounded-xl border bg-card p-3">
                    <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {stat.label}
                    </dt>
                    <dd className="mt-1 font-display text-xl">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <section className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  At A Glance
                </h3>
                <ul className="mt-2 divide-y rounded-xl border bg-card">
                  {selected.rows.map((row) => (
                    <li key={row} className="px-4 py-3 text-sm">
                      {row}
                    </li>
                  ))}
                </ul>
              </section>

              <p className="mt-4 rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                Data source: {selected.dataSource}. This preview contains aggregate operational
                information only; tenant-sensitive record content stays inside the protected full
                tool.
              </p>

              <Button
                type="button"
                className="mt-6 w-full"
                onClick={() => {
                  const destination = selected.to;
                  setSelected(null);
                  navigate({ to: destination });
                }}
              >
                Open Full Tool <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              </Button>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
