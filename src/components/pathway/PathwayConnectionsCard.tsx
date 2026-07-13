/**
 * PathwayConnectionsCard — shows the six surfaces that feed and consume
 * the Pathway Report so any role landing on the pathway page can jump
 * to the next relevant action. Role-neutral by default; pass `role` to
 * tune labels for family vs. student vocabulary.
 */

import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  FileText,
  ListChecks,
  BookOpen,
  Compass,
  ClipboardList,
  ArrowRight,
} from "lucide-react";

export type PathwayRole = "student" | "family" | "educator";

type Connection = {
  label: string;
  body: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  direction: "feeds" | "consumes";
};

function connectionsFor(role: PathwayRole): Connection[] {
  const familyOrStudent = role === "student" ? "you" : "your student";
  return [
    {
      label: "Student Voice",
      body:
        role === "student"
          ? "Your answers shape the summary at the top of the report."
          : `Answers from ${familyOrStudent} shape the report summary.`,
      href: "/student-voice",
      icon: MessageSquare,
      direction: "feeds",
    },
    {
      label: "Documents",
      body: "IEPs, evaluations, and transition assessments feed evidence.",
      href: "/documents",
      icon: FileText,
      direction: "feeds",
    },
    {
      label: "Meeting Prep",
      body: "Bring the report's questions and priorities into your next PPT.",
      href: "/ppt-prep",
      icon: ClipboardList,
      direction: "consumes",
    },
    {
      label: "Action Items",
      body: "Next steps from the report become tracked action items.",
      href: "/action-items",
      icon: ListChecks,
      direction: "consumes",
    },
    {
      label: "Resources",
      body: "Recommended resources match the report's focus areas.",
      href: "/resources",
      icon: BookOpen,
      direction: "consumes",
    },
    {
      label: "Opportunities",
      body: "Matched partner programs align to recommended pathways.",
      href: "/opportunities",
      icon: Compass,
      direction: "consumes",
    },
  ];
}

export function PathwayConnectionsCard({
  role,
  className,
}: {
  role: PathwayRole;
  className?: string;
}) {
  const conns = connectionsFor(role);
  return (
    <section
      className={`rounded-2xl border bg-card p-5 shadow-soft ${className ?? ""}`}
      aria-labelledby="pathway-connections-heading"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Connected To Your Pathway
          </p>
          <h2
            id="pathway-connections-heading"
            className="mt-1 font-display text-xl"
          >
            What Feeds The Report — And What The Report Feeds
          </h2>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {conns.map((c) => {
          const Icon = c.icon;
          return (
            <li key={c.label}>
              <Link
                to={c.href}
                className="group flex items-start gap-3 rounded-xl border bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{c.label}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        c.direction === "feeds"
                          ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                          : "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                      }`}
                    >
                      {c.direction === "feeds" ? "Feeds report" : "Uses report"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.body}
                  </p>
                </div>
                <ArrowRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Recommended-next-steps card. Content is role-specific and static —
 * safe to render even when no report exists yet, doubling as an
 * onboarding nudge.
 */
export function PathwayNextStepsCard({
  role,
  hasReport,
  className,
}: {
  role: PathwayRole;
  hasReport: boolean;
  className?: string;
}) {
  const steps = nextStepsFor(role, hasReport);
  return (
    <section
      className={`rounded-2xl border bg-card p-5 shadow-soft ${className ?? ""}`}
      aria-labelledby="pathway-next-steps-heading"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
        Recommended Next Steps
      </p>
      <h2
        id="pathway-next-steps-heading"
        className="mt-1 font-display text-xl"
      >
        {hasReport ? "Act On The Latest Report" : "Get Ready To Generate A Report"}
      </h2>
      <ol className="mt-3 space-y-2 text-sm">
        {steps.map((s, i) => (
          <li key={s.label} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
              {i + 1}
            </span>
            <div className="min-w-0">
              <Link
                to={s.href}
                className="font-medium text-foreground underline-offset-2 hover:underline"
              >
                {s.label}
              </Link>
              <p className="text-xs text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function nextStepsFor(
  role: PathwayRole,
  hasReport: boolean,
): { label: string; body: string; href: string }[] {
  if (!hasReport) {
    return [
      { label: "Answer Student Voice prompts", body: "Two minutes shapes the summary.", href: "/student-voice" },
      { label: "Upload your current IEP", body: "It anchors goals and services.", href: "/documents" },
      { label: "Set family priorities", body: "What matters most for after high school.", href: "/family/priorities" },
    ];
  }
  if (role === "student") {
    return [
      { label: "Read your summary out loud", body: "Star what feels right; flag one thing to change.", href: "/pathway/student" },
      { label: "Prep for your next meeting", body: "Bring your top three questions.", href: "/ppt-prep" },
      { label: "Pick one small action this week", body: "Small wins build momentum.", href: "/action-items" },
    ];
  }
  if (role === "family") {
    return [
      { label: "Review the family view together", body: "Star two goals as a family.", href: "/pathway/family" },
      { label: "Draft your PPT questions", body: "Use the report's suggested prompts.", href: "/ppt-prep" },
      { label: "Confirm sharing and consent", body: "Renew any consents that expire soon.", href: "/family/consent" },
    ];
  }
  return [
    { label: "Review readiness gaps", body: "Assign owners for each open gap.", href: "/action-items" },
    { label: "Confirm evidence is attached", body: "Missing docs weaken the report.", href: "/documents" },
    { label: "Route report for reviewer sign-off", body: "Approve before family share.", href: "/reports" },
  ];
}
