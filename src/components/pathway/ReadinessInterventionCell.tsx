/**
 * Static, presentational mapping from readiness pillar → recommended
 * interventions + suggested resource route. Rendered by the educator
 * readiness gaps table so each low-scoring row shows a concrete next
 * move instead of just a number.
 *
 * This is intentionally not personalized per-student — it's a
 * cross-team starting point drawn from the transition-planning
 * framework. Educators can adapt in the student profile.
 */

import { Link } from "@tanstack/react-router";
import { ArrowRight, Lightbulb } from "lucide-react";

const INTERVENTIONS: Record<
  string,
  { intervention: string; resource: { label: string; href: string } }
> = {
  employment: {
    intervention:
      "Schedule a paid or community work experience this term; add a job-coach check-in.",
    resource: { label: "Employment resources", href: "/resources" },
  },
  education: {
    intervention:
      "Set up a postsecondary program tour and confirm the accommodations plan carries forward.",
    resource: { label: "Education pathways", href: "/opportunities" },
  },
  independent_living: {
    intervention:
      "Add a life-skills module (transportation, budgeting, or self-care) to the IEP for this quarter.",
    resource: { label: "Independent-living resources", href: "/resources" },
  },
  self_advocacy: {
    intervention:
      "Have the student co-lead the next PPT check-in and answer one Student Voice prompt weekly.",
    resource: { label: "Student Voice prompts", href: "/student-voice" },
  },
};

export function ReadinessInterventionCell({
  pillar,
  score,
}: {
  pillar: string | null;
  score: number | null;
}) {
  if (!pillar) return <span className="text-muted-foreground">—</span>;
  const meta = INTERVENTIONS[pillar];
  if (!meta) return <span className="text-muted-foreground">—</span>;
  const severity =
    score == null
      ? "unknown"
      : score < 50
        ? "high"
        : score < 75
          ? "medium"
          : "low";
  const chip =
    severity === "high"
      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
      : severity === "medium"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  return (
    <div className="max-w-xs space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${chip}`}
        >
          <Lightbulb className="h-3 w-3" />
          {severity === "high"
            ? "Priority"
            : severity === "medium"
              ? "Watch"
              : "On track"}
        </span>
      </div>
      <p className="text-xs leading-snug text-foreground/90">
        {meta.intervention}
      </p>
      <Link
        to={meta.resource.href}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        {meta.resource.label} <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
