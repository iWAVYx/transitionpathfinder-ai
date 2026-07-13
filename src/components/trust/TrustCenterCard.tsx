import { ShieldCheck, Lock, Sparkles, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";
import { VisibilityBadge } from "@/components/permissions/VisibilityBadge";

export interface TrustCenterCardProps {
  studentName?: string;
  collaborators?: {
    name: string;
    role: string;
    access: "view" | "collaborate" | "manage";
  }[];
  className?: string;
}

const DEFAULT_COLLABORATORS = [
  { name: "Ms. Alvarez", role: "Case Manager", access: "manage" as const },
  { name: "Mr. Patel", role: "Transition Coordinator", access: "collaborate" as const },
  { name: "Coastal Culinary Institute", role: "Partner", access: "view" as const },
];

const ACCESS_TONE: Record<"view" | "collaborate" | "manage", string> = {
  view: "bg-muted text-muted-foreground",
  collaborate: "bg-primary/10 text-primary",
  manage: "bg-amber-100 text-amber-900",
};

export function TrustCenterCard({
  studentName = "Jordan",
  collaborators = DEFAULT_COLLABORATORS,
  className,
}: TrustCenterCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
      aria-labelledby="trust-center-heading"
    >
      <header>
        <p className="tf-eyebrow inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" /> {toTitleCase("Trust & Privacy")}
        </p>
        <h3
          id="trust-center-heading"
          className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl"
        >
          {toTitleCase(`Who Can See ${studentName}'s Information`)}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          You control who's on the team. We show every person and every level of access, in plain language.
        </p>
      </header>

      <ul className="mt-4 divide-y rounded-xl border">
        {collaborators.map((c) => (
          <li key={c.name} className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <Users2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.role}</p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
                ACCESS_TONE[c.access],
              )}
            >
              Can {c.access}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-primary" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {toTitleCase("Default Visibility")}
            </p>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            New documents and notes start as{" "}
            <VisibilityBadge visibility="team" className="align-middle" />. You
            can narrow to Private or open to Family per item.
          </p>
        </div>
        <div className="rounded-xl border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {toTitleCase("AI Assistance Disclosure")}
            </p>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            AI helps draft summaries and translations. A human on your team
            always reviews before anything appears in the final Pathway
            Report.
          </p>
        </div>
      </div>
    </section>
  );
}
