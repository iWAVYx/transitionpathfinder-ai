import { Target, Users2, Award, ClipboardCheck, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";
import { Button } from "@/components/ui/button";

export interface PartnerImpactCardProps {
  partnerName?: string;
  studentsServed?: number;
  placementRate?: number; // 0-100
  outcomesLogged?: number;
  reviewStatus?: "verified" | "in_review" | "action_needed";
  incentives?: { label: string; detail: string; href?: string }[];
  className?: string;
}

const DEFAULT_INCENTIVES = [
  {
    label: "PartnerForward Featured Placement",
    detail: "Programs with verified outcomes get top placement in Fit Finder for 90 days.",
  },
  {
    label: "Accessibility Excellence Badge",
    detail: "Complete the accessibility supports checklist to earn a public trust badge.",
  },
  {
    label: "Outcome Reporting Stipend",
    detail: "Submit 12-month follow-up outcomes to qualify for the PartnerForward stipend pool.",
  },
];

const REVIEW_TONE: Record<NonNullable<PartnerImpactCardProps["reviewStatus"]>, string> = {
  verified: "bg-emerald-100 text-emerald-900",
  in_review: "bg-amber-100 text-amber-900",
  action_needed: "bg-destructive/10 text-destructive",
};

const REVIEW_LABEL: Record<NonNullable<PartnerImpactCardProps["reviewStatus"]>, string> = {
  verified: "Verified Partner",
  in_review: "In Review",
  action_needed: "Action Needed",
};

export function PartnerImpactCard({
  partnerName = "Coastal Culinary Institute",
  studentsServed = 28,
  placementRate = 71,
  outcomesLogged = 19,
  reviewStatus = "verified",
  incentives = DEFAULT_INCENTIVES,
  className,
}: PartnerImpactCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
      aria-labelledby="partner-impact-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tf-eyebrow">{toTitleCase("Partner Impact & Standing")}</p>
          <h3
            id="partner-impact-heading"
            className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl"
          >
            {toTitleCase(partnerName)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            The operational picture families, schools, and funders see when they consider you.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            REVIEW_TONE[reviewStatus],
          )}
        >
          <ClipboardCheck className="h-3 w-3" />
          {REVIEW_LABEL[reviewStatus]}
        </span>
      </header>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Metric
          icon={<Users2 className="h-4 w-4" />}
          label="Students Served (12 mo)"
          value={String(studentsServed)}
        />
        <Metric
          icon={<Target className="h-4 w-4" />}
          label="Placement Rate"
          value={`${placementRate}%`}
        />
        <Metric
          icon={<ClipboardCheck className="h-4 w-4" />}
          label="Outcomes Logged"
          value={String(outcomesLogged)}
        />
      </div>

      <div className="mt-5 rounded-xl border bg-muted/30 p-4">
        <div className="flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5 text-primary" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {toTitleCase("PartnerForward Incentives")}
          </p>
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {incentives.map((it) => (
            <li key={it.label} className="rounded-lg border bg-background p-3">
              <p className="text-sm font-medium">{toTitleCase(it.label)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{it.detail}</p>
              {it.href && (
                <Button size="sm" variant="link" asChild className="mt-1 h-auto p-0 text-xs">
                  <a href={it.href} target="_blank" rel="noreferrer">
                    Learn more <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[11px] font-medium uppercase tracking-wider">
          {toTitleCase(label)}
        </p>
      </div>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}
