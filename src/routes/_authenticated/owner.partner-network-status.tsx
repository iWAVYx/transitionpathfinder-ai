import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
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
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import {
  getPartnerNetworkStatus,
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

const CHECKLIST: Array<{
  surface: string;
  status: CheckStatus;
  detail: string;
}> = [
  {
    surface: "Public Partner Directory",
    status: "connected",
    detail: "/partner-directory pulls live records via listPublicPartners with search + county filters.",
  },
  {
    surface: "Signed-In Opportunity Matches",
    status: "connected",
    detail: "/opportunities renders DB-driven grid with per-student recommendations via matchPartnersForStudent.",
  },
  {
    surface: "Pathway Report",
    status: "needs_review",
    detail: "Reports render student plans, but partner suggestions are not yet embedded as a report section.",
  },
  {
    surface: "Action Items",
    status: "not_connected",
    detail: "Matched partners are not yet generating suggested action items on the dashboard.",
  },
  {
    surface: "Meeting Prep",
    status: "not_connected",
    detail: "Meeting prep packets do not yet surface partner contacts or upcoming opportunity deadlines.",
  },
  {
    surface: "Student Profile",
    status: "partial",
    detail: "Matching engine reads profile (interests, county, supports) but profile UI has no partner panel.",
  },
  {
    surface: "Resource Library",
    status: "not_connected",
    detail: "Partner records live in their own tables; the resource library does not index them yet.",
  },
  {
    surface: "Platform Admin Partner Manager",
    status: "connected",
    detail: "/owner/partner-network supports create, edit, bulk JSON import with Zod validation.",
  },
  {
    surface: "Partner Outreach Tracker",
    status: "connected",
    detail: "/owner/partner-outreach logs contacts and follow-up dates against partner_outreach_log.",
  },
];

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
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-md bg-muted p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
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

function PartnerNetworkStatusPage() {
  const fetchStatus = useServerFn(getPartnerNetworkStatus);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["owner", "partner-network-status"],
    queryFn: () => fetchStatus(),
  });

  return (
    <OwnerShell
      title="Partner Network Status"
      description="Implementation health: counts, last review, and what's actually wired across the app."
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

      {data && <StatusBody status={data} />}
    </OwnerShell>
  );
}

function StatusBody({ status }: { status: PartnerNetworkStatus }) {
  const m = status.metrics;
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Network metrics
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard label="Total partners" value={m.totalPartners} icon={Building2} />
          <MetricCard label="Total opportunities" value={m.totalOpportunities} icon={Briefcase} />
          <MetricCard
            label="Verified partners"
            value={m.verifiedPartners}
            icon={ShieldCheck}
            hint="verification_status = verified"
          />
          <MetricCard
            label="Potential partners"
            value={m.potentialPartners}
            icon={Sparkles}
            hint="partnership_status = potential"
          />
          <MetricCard
            label="Needs review"
            value={m.needsReview}
            icon={Flag}
            hint="verification_status = needs_review"
          />
          <MetricCard
            label="Outreach needed"
            value={m.outreachNeeded}
            icon={PhoneCall}
            hint="Not contacted or needs follow-up"
          />
          <MetricCard
            label="Partner submissions"
            value={m.partnerSubmissions}
            icon={FileText}
            hint="Pending review"
          />
          <MetricCard label="Featured partners" value={m.featuredPartners} icon={Star} />
          <MetricCard
            label="Connecticut resources"
            value={m.connecticutResources}
            icon={MapPin}
            hint="state = CT"
          />
          <MetricCard
            label="Saved opportunities"
            value={m.savedOpportunities}
            icon={HeartHandshake}
            hint="Across all student plans"
          />
          <MetricCard
            label="Last reviewed"
            value={formatDate(m.lastReviewedAt)}
            icon={CalendarClock}
          />
          <MetricCard
            label="Next review due"
            value={formatDate(m.nextReviewDueAt)}
            icon={CalendarClock}
          />
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
