import { Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Network } from "lucide-react";
import { toTitleCase } from "@/lib/title-case";
import { Pill } from "@/components/ui/pill";

type Role = "student" | "family" | "educator" | "school_admin" | "district_admin" | "partner";

const COPY: Record<Role, { status: string; tone: "default" | "success" | "warning" | "critical" | "muted"; summary: string; bullets: { label: string; value: string }[]; cta: string }> = {
  student: {
    status: "4 matches",
    tone: "success",
    summary: "Programs, internships, and clubs that match your interests, age, and supports.",
    bullets: [
      { label: "New this week", value: "2" },
      { label: "Age-eligible", value: "4" },
    ],
    cta: "Open Partner Network",
  },
  family: {
    status: "5 for Jordan",
    tone: "success",
    summary: "Vetted community partners with age-appropriate opportunities and family-ready details.",
    bullets: [
      { label: "Verified partners", value: "7" },
      { label: "Application windows", value: "3" },
    ],
    cta: "See Matches",
  },
  educator: {
    status: "6 relevant",
    tone: "default",
    summary: "Refer students to work-based learning, college pathways, and life-skills programs.",
    bullets: [
      { label: "Verified partners", value: "7" },
      { label: "Awaiting referral", value: "2" },
    ],
    cta: "Browse Partners",
  },
  school_admin: {
    status: "12 partners",
    tone: "default",
    summary: "Community partners active with your school — coverage across pathways and programs.",
    bullets: [
      { label: "Active MOUs", value: "5" },
      { label: "Coverage gaps", value: "2" },
    ],
    cta: "Open Partner Network",
  },
  district_admin: {
    status: "28 partners",
    tone: "default",
    summary: "District-wide partner coverage, verification status, and referral flow across schools.",
    bullets: [
      { label: "Verified", value: "24" },
      { label: "Under review", value: "4" },
    ],
    cta: "Open Partner Network",
  },
  partner: {
    status: "De-identified",
    tone: "muted",
    summary: "See how families and educators are discovering your opportunities. No student PII.",
    bullets: [
      { label: "Views this month", value: "142" },
      { label: "Referrals started", value: "9" },
    ],
    cta: "Open Partner Network",
  },
};

/**
 * Consolidated Partner Network entry point. Every role dashboard shows
 * exactly one Partner Network tile. Partners see de-identified data only —
 * no student names, IDs, or PII surface here.
 *
 * In sample/demo mode the tile routes to the isolated demo Partner Network
 * preview instead of the live signed-in route.
 */
export function PartnerNetworkTile({ role, isSample = false }: { role: Role; isSample?: boolean }) {
  const copy = COPY[role];
  const demoRoleParam: Record<Role, string> = {
    student: "student",
    family: "family",
    educator: "educator",
    school_admin: "school-admin",
    district_admin: "district-admin",
    partner: "partner",
  };
  const linkProps = isSample
    ? ({ to: "/demo/partner-network", search: { role: demoRoleParam[role] } } as const)
    : ({ to: "/partner-network" } as const);
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">

      <span className="h-1 w-full bg-gradient-to-r from-primary/70 via-primary/30 to-transparent" aria-hidden />
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
            <Network className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="min-w-0 truncate font-display text-[15px] font-semibold tracking-tight">
            Partner Network
          </h3>
        </div>
        <Pill tone={copy.tone}>{copy.status}</Pill>
      </div>
      <p className="mt-1.5 line-clamp-2 px-3.5 text-[13px] leading-snug text-muted-foreground">
        {copy.summary}
      </p>
      <dl className="mx-3.5 mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
        {copy.bullets.map((b) => (
          <div key={b.label} className="flex min-w-0 flex-col">
            <dt className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {toTitleCase(b.label)}
            </dt>
            <dd className="truncate text-[13px] font-semibold text-foreground">{b.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 px-3.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground/80">
        Explainable matches · Verified partners
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/60 bg-muted/20 px-3.5 py-2">
        <Link
          {...linkProps}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:text-primary"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden /> Preview
        </Link>
        <Link
          {...linkProps}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Open Partner Network
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      </div>

    </div>
  );
}
