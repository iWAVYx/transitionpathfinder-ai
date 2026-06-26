import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Users,
  GraduationCap,
  Sparkles,
  Plus,
  Bell,
  Clock,
  MapPin,
  ArrowRight,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DEFAULT_DEMO_STUDENT,
  DemoStepBar,
  DemoStepFooter,
  demoStudentSearch,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";
import {
  type EventKind,
  EVENT_KIND_META as KIND,
  buildDemoCalendarEvents,
} from "@/lib/demo-calendar";

export const Route = createFileRoute("/demo_/calendar")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Shared Calendar — TransitionForward Demo" },
      {
        name: "description",
        content:
          "See how meetings, deadlines, tours, and weekly action steps land on one shared calendar that families and the whole care team can see.",
      },
      { property: "og:title", content: "Shared Calendar — TransitionForward Demo" },
      {
        property: "og:description",
        content:
          "One shared calendar for families and educators — meetings, deadlines, tours, and the 30-day plan in one place.",
      },
      { property: "og:url", content: "/demo/calendar" },
    ],
    links: [{ rel: "canonical", href: "/demo/calendar" }],
  }),
  component: DemoCalendarPage,
});

function DemoCalendarPage() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile, nextMeetingDate } = bundle;
  const events = buildDemoCalendarEvents(bundle);

  const upNext = events.slice(0, 4);
  const later = events.slice(4);


  return (
    <SiteShell>
      <div className="demo-shell">
        <DemoStepBar current="calendar" student={s} />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        {/* Header */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Shared Calendar
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                Everything On One Page — For Everyone
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Meetings, deadlines, tours, and the weekly action steps land here
                automatically from {profile.first_name}'s Pathway Report and Meeting
                Prep packet. Families and educators see the same view — no double-booking,
                no surprises.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/demo/meeting" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  <Users className="h-4 w-4" /> Open Meeting Prep
                </Link>
              </Button>
              <Button size="sm" disabled aria-label="Add event (demo)">
                <Plus className="h-4 w-4" /> Add Event
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="h-3 w-3" /> {events.length} Upcoming
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> Visible To Family + Care Team
            </Badge>
            <Badge variant="outline" className="gap-1">
              <GraduationCap className="h-3 w-3" /> Next PPT: {nextMeetingDate}
            </Badge>
          </div>
        </div>

        {/* Up next */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <Panel title="This week" icon={<Sparkles className="h-5 w-5" />}>
              <ul className="space-y-3">
                {upNext.map((e, i) => (
                  <EventRow key={i} {...e} />
                ))}
              </ul>
            </Panel>

            <Panel title="Coming up" icon={<CalendarDays className="h-5 w-5" />}>
              <ul className="space-y-3">
                {later.map((e, i) => (
                  <EventRow key={i} {...e} />
                ))}
              </ul>
            </Panel>
          </div>

          {/* Side column */}
          <aside className="space-y-6">
            <Panel title="Legend" icon={<Bell className="h-5 w-5" />}>
              <ul className="space-y-2 text-sm">
                {(Object.keys(KIND) as EventKind[]).map((k) => (
                  <li key={k} className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND[k].chip}`}
                    >
                      {KIND[k].icon}
                      {KIND[k].label}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="Where do events come from?"
              icon={<ClipboardList className="h-5 w-5" />}
            >
              <ul className="space-y-2 text-sm text-foreground/85">
                <li>
                  <span className="font-medium">Pathway Report →</span> the
                  weekly action steps from the 30-Day Plan.
                </li>
                <li>
                  <span className="font-medium">Meeting Prep →</span> PPT
                  meetings and any pre-meeting check-ins.
                </li>
                <li>
                  <span className="font-medium">Care team →</span> deadlines
                  and tours added by the case manager or family.
                </li>
              </ul>
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to="/demo/plan" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  See the 30-Day Plan <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Panel>
          </aside>
        </div>

        <DemoStepFooter current="calendar" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}

function EventRow({
  day,
  date,
  time,
  title,
  kind,
  owner,
}: {
  day: string;
  date: string;
  time: string;
  title: string;
  kind: EventKind;
  owner: string;
}) {
  return (
    <li className="flex gap-4 rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {day}
        </span>
        <span className="font-display text-lg leading-none">
          {date.split(" ")[1]}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {date.split(" ")[0]}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND[kind].chip}`}
          >
            {KIND[kind].icon}
            {KIND[kind].label}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Clock className="h-3 w-3" /> {time}
          </span>
        </div>
        <p className="mt-1.5 text-sm leading-snug text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Owner: {owner}</p>
      </div>
    </li>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="flex items-center gap-2 border-b border-border/60 pb-3 font-display text-lg">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </div>
  );
}
