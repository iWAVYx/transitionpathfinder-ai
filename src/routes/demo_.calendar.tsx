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
  DemoStepBar,
  DemoStepFooter,
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
      { title: "Shared Calendar — TransitionForward demo" },
      {
        name: "description",
        content:
          "See how meetings, deadlines, tours, and weekly action steps land on one shared Calendar that the whole care team can see.",
      },
      { property: "og:title", content: "Shared Calendar — TransitionForward demo" },
      {
        property: "og:description",
        content:
          "One shared Calendar for families and educators — meetings, deadlines, tours, and the 30-day plan in one place.",
      },
      { property: "og:url", content: "/demo/calendar" },
    ],
    links: [{ rel: "canonical", href: "/demo/calendar" }],
  }),
  component: DemoCalendarPage,
});

type EventKind = "meeting" | "deadline" | "tour" | "action" | "family";

const KIND: Record<
  EventKind,
  { label: string; chip: string; icon: React.ReactNode }
> = {
  meeting: {
    label: "PPT Meeting",
    chip: "bg-primary/15 text-primary",
    icon: <Users className="h-3.5 w-3.5" />,
  },
  deadline: {
    label: "Deadline",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    icon: <Bell className="h-3.5 w-3.5" />,
  },
  tour: {
    label: "Tour / Visit",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    icon: <MapPin className="h-3.5 w-3.5" />,
  },
  action: {
    label: "Action Step",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
  },
  family: {
    label: "Family Time",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
};

function DemoCalendarPage() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile, report, nextMeetingDate } = bundle;
  const plan = report.thirty_day_plan;
  const thisWeek = report.family_action_plan?.this_week ?? [];

  // Build a fictional 4-week schedule grounded in the report.
  const events: {
    day: string;
    date: string;
    time: string;
    title: string;
    kind: EventKind;
    owner: string;
  }[] = [
    {
      day: "Mon",
      date: "Mar 9",
      time: "After school",
      title: thisWeek[0] ?? `Read the Pathway Report together`,
      kind: "family",
      owner: `${profile.first_name} + family`,
    },
    {
      day: "Wed",
      date: "Mar 11",
      time: "9:00 AM",
      title: thisWeek[1] ?? plan[0]?.action ?? "Reach out to a partner program",
      kind: "action",
      owner: `Family + ${profile.case_manager}`,
    },
    {
      day: "Fri",
      date: "Mar 13",
      time: "2:15 PM",
      title: `Check-in with ${profile.case_manager}`,
      kind: "meeting",
      owner: profile.case_manager,
    },
    {
      day: "Tue",
      date: "Mar 17",
      time: "10:00 AM",
      title: plan[1]?.action ?? "Email case manager about PPT meeting",
      kind: "action",
      owner: "Family",
    },
    {
      day: "Thu",
      date: "Mar 19",
      time: "1:00 PM",
      title: plan[2]?.action ?? "Tour partner program",
      kind: "tour",
      owner: `${profile.first_name} + family`,
    },
    {
      day: "Mon",
      date: "Mar 30",
      time: "End of day",
      title: "BRS referral packet due",
      kind: "deadline",
      owner: profile.case_manager,
    },
    {
      day: "Tue",
      date: "Apr 7",
      time: "3:00 PM",
      title: "Pre-PPT prep call (15 min)",
      kind: "meeting",
      owner: `Family + ${profile.case_manager}`,
    },
    {
      day: "Wed",
      date: "Apr 8",
      time: nextMeetingDate.split("·")[1]?.trim() ?? "3:30 PM",
      title: "Planning & Placement Team meeting",
      kind: "meeting",
      owner: "Full team",
    },
  ];

  const upNext = events.slice(0, 4);
  const later = events.slice(4);

  return (
    <SiteShell>
      <DemoStepBar current="calendar" student={s} />

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Shared Calendar
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                Everything on one page — for everyone.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Meetings, deadlines, tours, and the weekly action steps land
                here automatically from {profile.first_name}'s Pathway Report
                and Meeting Prep packet. Families and educators see the same
                view — no double-booking, no surprises.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/demo/meeting" search={{ s }}>
                  <Users className="h-4 w-4" /> Open Meeting Prep
                </Link>
              </Button>
              <Button size="sm" disabled aria-label="Add event (demo)">
                <Plus className="h-4 w-4" /> Add event
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <CalendarDays className="h-3 w-3" /> {events.length} upcoming
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> Visible to family + care team
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
                <Link to="/demo/plan" search={{ s }}>
                  See the 30-Day Plan <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Panel>
          </aside>
        </div>

        <DemoStepFooter current="calendar" student={s} />
      </section>
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
