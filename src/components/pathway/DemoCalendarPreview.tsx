import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  type CalendarEvent,
  EVENT_KIND_META,
  buildDemoCalendarEvents,
} from "@/lib/demo-calendar";
import { getDemoStudent, type DemoStudentId } from "@/lib/demo-data";

export function DemoCalendarPreview({
  student,
  limit = 4,
  title = "Calendar",
  subtitle,
  showOpenLink = true,
}: {
  student: DemoStudentId | string | undefined;
  limit?: number;
  title?: string;
  subtitle?: string;
  showOpenLink?: boolean;
}) {
  const bundle = getDemoStudent(student);
  const events = buildDemoCalendarEvents(bundle).slice(0, limit);
  const total = buildDemoCalendarEvents(bundle).length;

  return (
    <div className="border-y border-[color:var(--pub-rule-soft,theme(colors.border))] py-5 sm:py-6">
      <div className="flex items-baseline justify-between gap-3 border-b border-dotted border-[color:var(--pub-rule-soft,theme(colors.border))] pb-2">
        <h2 className="flex items-baseline gap-2 font-display text-base">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <CalendarDays className="inline h-3.5 w-3.5 mr-1 -translate-y-px" />
            {title}
          </span>
        </h2>
        {showOpenLink && (
          <Button asChild variant="ghost" size="sm" className="-mr-2 h-7">
            <Link to="/demo/calendar" search={{ s: bundle.id }}>
              Open <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
      {subtitle && (
        <p className="pt-3 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <ul className="divide-y divide-dotted divide-[color:var(--pub-rule-soft,theme(colors.border))] pt-2">
        {events.map((e, i) => (
          <MiniEventRow key={i} {...e} />
        ))}
      </ul>
      {total > limit && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          + {total - limit} more on the full Calendar
        </p>
      )}
    </div>
  );
}

function MiniEventRow({ day, date, time, title, kind, owner }: CalendarEvent) {
  const meta = EVENT_KIND_META[kind];
  return (
    <li className="flex gap-3 rounded-2xl border border-border/60 bg-background p-3">
      <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted text-center">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          {day}
        </span>
        <span className="font-display text-base leading-none">{date.split(" ")[1]}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.chip}`}
          >
            {meta.icon}
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> {time}
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug text-foreground line-clamp-2">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{owner}</p>
      </div>
    </li>
  );
}
