/**
 * PreMeetingChecklist — a compact rail shown on the PPT prep config
 * screen so the user can see, before hitting Generate, what still
 * needs a quick touch-up:
 *
 *   - Student Voice prompts to answer
 *   - Documents to upload (uses the same doc-type coverage as the
 *     Missing Documents Checklist)
 *   - Overdue action items
 *   - Upcoming calendar (link only — actual events on /calendar)
 *
 * Presentational only; pulls no data itself so it never blocks the
 * form. Links deep into the relevant surfaces.
 */

import { Link } from "@tanstack/react-router";
import {
  MessageSquare,
  FileText,
  ListChecks,
  Calendar,
  ArrowRight,
} from "lucide-react";

export function PreMeetingChecklist() {
  const items = [
    {
      label: "Student Voice",
      body: "Answer this week's prompt — it strengthens the summary at the top of the report.",
      icon: MessageSquare,
      href: "/student-voice",
      cta: "Open Student Voice",
    },
    {
      label: "Documents",
      body: "Confirm the current IEP, evaluation, and transition assessment are uploaded.",
      icon: FileText,
      href: "/documents",
      cta: "Review coverage",
    },
    {
      label: "Action Items",
      body: "Close any overdue items so the meeting doesn't repeat unfinished work.",
      icon: ListChecks,
      href: "/action-items",
      cta: "See open items",
    },
    {
      label: "Calendar",
      body: "Check what else is happening that week — tours, deadlines, or check-ins.",
      icon: Calendar,
      href: "/calendar",
      cta: "Open calendar",
    },
  ];

  return (
    <aside className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Before You Generate
      </p>
      <h2 className="mt-1 font-display text-lg">Pre-Meeting Readiness</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Quick self-check — every item you close makes the generated agenda stronger.
      </p>
      <ul className="mt-4 space-y-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label}>
              <Link
                to={it.href}
                className="group flex items-start gap-3 rounded-xl border bg-background/60 p-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{it.label}</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {it.body}
                  </p>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    {it.cta}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
