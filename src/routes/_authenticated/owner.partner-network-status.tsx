import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleHelp,
  CircleSlash,
  FileText,
  Flag,
  HeartHandshake,
  Loader2,
  MapPin,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  getPartnerNetworkStatus,
  getPartnerMetricRows,
  type MetricKey,
  type PartnerNetworkStatus,
} from "@/lib/partner-network-status.functions";

export const Route = createFileRoute("/_authenticated/owner/partner-network-status")({
  head: () => ({ meta: [{ title: "Partner Network Status — Admin Hub" }] }),
  component: PartnerNetworkStatusPage,
});

type CheckStatus = "connected" | "partial" | "needs_review" | "not_connected";

const STATUS_META: Record<
  CheckStatus,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  connected: {
    label: "Connected",
    icon: CheckCircle2,
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  },
  partial: {
    label: "Partially Connected",
    icon: Activity,
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  },
  needs_review: {
    label: "Needs Review",
    icon: CircleHelp,
    className: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  },
  not_connected: {
    label: "Not Connected",
    icon: CircleSlash,
    className: "bg-muted text-muted-foreground border-border",
  },
};

const CHECKLIST: Array<{ surface: string; status: CheckStatus; detail: string }> = [
  { surface: "Public Partner Directory", status: "connected", detail: "/partner-directory pulls live records via listPublicPartners with search + county filters." },
  { surface: "Signed-In Opportunity Matches", status: "connected", detail: "/opportunities renders DB-driven grid with per-student recommendations via matchPartnersForStudent." },
  { surface: "Pathway Report", status: "needs_review", detail: "Reports render student plans, but partner suggestions are not yet embedded as a report section." },
  { surface: "Action Items", status: "not_connected", detail: "Matched partners are not yet generating suggested action items on the dashboard." },
  { surface: "Meeting Prep", status: "not_connected", detail: "Meeting prep packets do not yet surface partner contacts or upcoming opportunity deadlines." },
  { surface: "Student Profile", status: "partial", detail: "Matching engine reads profile (interests, county, supports) but profile UI has no partner panel." },
  { surface: "Resource Library", status: "not_connected", detail: "Partner records live in their own tables; the resource library does not index them yet." },
  { surface: "Platform Admin Partner Manager", status: "connected", detail: "/owner/partner-network supports create, edit, bulk JSON import with Zod validation." },
  { surface: "Partner Outreach Tracker", status: "connected", detail: "/owner/partner-outreach logs contacts and follow-up dates against partner_outreach_log." },
];

const METRIC_LABEL: Record<MetricKey, string> = {
  totalPartners: "Total partners",
  totalOpportunities: "Total opportunities",
  verifiedPartners: "Verified partners",
  potentialPartners: "Potential partners",
  needsReview: "Needs review",
  outreachNeeded: "Outreach needed",
  partnerSubmissions: "Partner submissions",
  featuredPartners: "Featured partners",
  connecticutResources: "Connecticut resources",
  savedOpportunities: "Saved opportunities",
};

const STATUS_FILTER_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  partner_verification: [
    { value: "", label: "All statuses" },
    { value: "verified", label: "Verified" },
    { value: "needs_review", label: "Needs review" },
    { value: "pending_approval", label: "Pending approval" },
    { value: "archived", label: "Archived" },
  ],
  partner_partnership: [
    { value: "", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "potential", label: "Potential" },
    { value: "archived", label: "Archived" },
  ],
  partner_outreach: [
    { value: "", label: "All statuses" },
    { value: "not_contacted", label: "Not contacted" },
    { value: "outreach_needed", label: "Outreach needed" },
    { value: "follow_up", label: "Follow up" },
    { value: "contacted", label: "Contacted" },
  ],
  opportunity: [
    { value: "", label: "All statuses" },
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" },
    { value: "closed", label: "Closed" },
    { value: "draft", label: "Draft" },
  ],
  submission: [
    { value: "", label: "All statuses" },
    { value: "pending_review", label: "Pending review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ],
};

function getFilterOptions(metric: MetricKey) {
  switch (metric) {
    case "totalPartners":
    case "connecticutResources":
    case "featuredPartners":
    case "needsReview":
      return STATUS_FILTER_OPTIONS.partner_verification;
    case "verifiedPartners":
      return STATUS_FILTER_OPTIONS.partner_partnership;
    case "potentialPartners":
      return STATUS_FILTER_OPTIONS.partner_verification;
    case "outreachNeeded":
      return STATUS_FILTER_OPTIONS.partner_outreach;
    case "totalOpportunities":
      return STATUS_FILTER_OPTIONS.opportunity;
    case "partnerSubmissions":
      return STATUS_FILTER_OPTIONS.submission;
    default:
      return null;
  }
}

function getDefaultSort(metric: MetricKey): { sortBy: "name" | "status" | "updated_at" | "type" | "county"; sortDirection: "asc" | "desc" } {
  switch (metric) {
    case "needsReview":
    case "outreachNeeded":
    case "totalOpportunities":
    case "partnerSubmissions":
    case "savedOpportunities":
      return { sortBy: "updated_at", sortDirection: "desc" };
    default:
      return { sortBy: "name", sortDirection: "asc" };
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-lg border border-border bg-background p-5 text-left ${
        onClick ? "cursor-pointer transition hover:border-primary/50 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          {onClick && (
            <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-primary">
              View details →
            </p>
          )}
        </div>
        <div className="rounded-md bg-muted p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Wrapper>
  );
}

function ChecklistRow({
  surface,
  status,
  detail,
}: {
  surface: string;
  status: CheckStatus;
  detail: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <li className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium">{surface}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
      </div>
      <Badge variant="outline" className={`shrink-0 gap-1 ${meta.className}`}>
        <Icon className="h-3.5 w-3.5" />
        {meta.label}
      </Badge>
    </li>
  );
}

function DrillSheet({
  metric,
  onClose,
}: {
  metric: MetricKey | null;
  onClose: () => void;
}) {
  const fetchRows = useServerFn(getPartnerMetricRows);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["owner", "partner-metric-rows", metric],
    queryFn: () => fetchRows({ data: { metric: metric as MetricKey } }),
    enabled: !!metric,
  });

  return (
    <Sheet open={!!metric} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{metric ? METRIC_LABEL[metric] : ""}</SheetTitle>
          <SheetDescription>
            Underlying records contributing to this metric.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}
          {isError && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : "Failed to load."}
            </p>
          )}
          {data && data.rows.length === 0 && (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No records yet.
            </p>
          )}
          {data && data.rows.length > 0 && (
            <>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2 text-left">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{r.primary}</div>
                          {r.secondary && (
                            <div className="text-xs text-muted-foreground">{r.secondary}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {r.status ? (
                            <Badge variant="outline" className="text-[10px]">
                              {r.status.replace(/_/g, " ")}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {r.meta && (
                            <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              {r.meta.replace(/_/g, " ")}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {formatDate(r.updated_at ?? null)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.truncated && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Showing first 200 records. Refine in the manager view for the full list.
                </p>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PartnerNetworkStatusPage() {
  const fetchStatus = useServerFn(getPartnerNetworkStatus);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["owner", "partner-network-status"],
    queryFn: () => fetchStatus(),
  });

  const [drill, setDrill] = useState<MetricKey | null>(null);

  return (
    <OwnerShell
      title="Partner Network Status"
      description="Implementation health: counts, last review, and what's actually wired across the app. Click any metric to drill into the underlying records."
    >
      {isLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading status…
        </div>
      )}

      {isError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error instanceof Error ? error.message : "Failed to load status."}</span>
        </div>
      )}

      {data && <StatusBody status={data} onDrill={setDrill} />}

      <DrillSheet metric={drill} onClose={() => setDrill(null)} />
    </OwnerShell>
  );
}

function StatusBody({
  status,
  onDrill,
}: {
  status: PartnerNetworkStatus;
  onDrill: (m: MetricKey) => void;
}) {
  const m = status.metrics;
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Network metrics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard label="Total partners" value={m.totalPartners} icon={Building2} onClick={() => onDrill("totalPartners")} />
          <MetricCard label="Total opportunities" value={m.totalOpportunities} icon={Briefcase} onClick={() => onDrill("totalOpportunities")} />
          <MetricCard label="Verified partners" value={m.verifiedPartners} icon={ShieldCheck} hint="verification_status = verified" onClick={() => onDrill("verifiedPartners")} />
          <MetricCard label="Potential partners" value={m.potentialPartners} icon={Sparkles} hint="partnership_status = potential" onClick={() => onDrill("potentialPartners")} />
          <MetricCard label="Needs review" value={m.needsReview} icon={Flag} hint="verification_status = needs_review" onClick={() => onDrill("needsReview")} />
          <MetricCard label="Outreach needed" value={m.outreachNeeded} icon={PhoneCall} hint="Not contacted or needs follow-up" onClick={() => onDrill("outreachNeeded")} />
          <MetricCard label="Partner submissions" value={m.partnerSubmissions} icon={FileText} hint="Pending review" onClick={() => onDrill("partnerSubmissions")} />
          <MetricCard label="Featured partners" value={m.featuredPartners} icon={Star} onClick={() => onDrill("featuredPartners")} />
          <MetricCard label="Connecticut resources" value={m.connecticutResources} icon={MapPin} hint="state = CT" onClick={() => onDrill("connecticutResources")} />
          <MetricCard label="Saved opportunities" value={m.savedOpportunities} icon={HeartHandshake} hint="Across all student plans" onClick={() => onDrill("savedOpportunities")} />
          <MetricCard label="Last reviewed" value={formatDate(m.lastReviewedAt)} icon={CalendarClock} />
          <MetricCard label="Next review due" value={formatDate(m.nextReviewDueAt)} icon={CalendarClock} />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Integration checklist
        </h2>
        <div className="rounded-lg border border-border bg-background px-5">
          <ul>
            {CHECKLIST.map((item) => (
              <ChecklistRow key={item.surface} {...item} />
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Status reflects current wiring in code. Update this checklist when surfaces are connected
          or audited.
        </p>
      </section>
    </div>
  );
}
