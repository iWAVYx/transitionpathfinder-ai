import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Users,
import { StudioPage } from "@/studio/StudioPage";
  GraduationCap,
  Sparkles,
  Plus,
  Bell,
  Clock,
  ArrowRight,
} from "lucide-react";

import { validateStudentSearch } from "@/components/site/DemoStepBar";
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";
import {
  type EventKind,
  EVENT_KIND_META as KIND,
  buildDemoCalendarEvents,
} from "@/lib/demo-calendar";
import {
  PublicationSpread, PublicationCallout, PublicationSidebar,
} from "@/components/publication/PublicationPage";
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
    <StudioPage stage="calendar" student={s} preserveStudent={!!search.s} title={"Shared Calendar"} dek={"Meetings, deadlines, tours, and weekly action steps — kept on one shared calendar so nobody has to chase dates."}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">

            <PublicationCallout kind="means">
              Meetings, deadlines, tours, and the weekly action steps land here automatically
              from {profile.first_name}'s Pathway Report and Meeting Prep packet. Families and
              educators see the same view — no double-booking, no surprises.
            </PublicationCallout>

            {/* Calendar header — stats + actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--pub-rule-soft)] pb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Everything On One Page — For Everyone
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" /> {events.length} Upcoming Events
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Visible To Family + Care Team
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5" /> Next PPT: {nextMeetingDate}
                  </span>
                </div>
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

            {/* Main spread — events + sidebar */}
            <PublicationSpread
              lead={
                <div className="space-y-10">
                  {/* This Week */}
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> This Week
                    </p>
                    <ul>
                      {upNext.map((e, i) => (
                        <EventRow key={i} {...e} />
                      ))}
                    </ul>
                  </section>

                  {/* Coming Up */}
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Coming Up
                    </p>
                    <ul>
                      {later.map((e, i) => (
                        <EventRow key={i} {...e} />
                      ))}
                    </ul>
                  </section>
                </div>
              }
              side={
                <div className="space-y-6">
                  <PublicationSidebar label="Legend">
                    <ul className="space-y-2">
                      {(Object.keys(KIND) as EventKind[]).map((k) => (
                        <li key={k} className="flex items-center gap-2 border-b border-[color:var(--pub-rule-soft)] py-2 last:border-b-0">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND[k].chip}`}
                          >
                            {KIND[k].icon}
                            {KIND[k].label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </PublicationSidebar>

                  <PublicationSidebar label="Where Do Events Come From?">
                    <ul className="space-y-3 text-sm text-foreground/85">
                      <li className="border-b border-[color:var(--pub-rule-soft)] pb-3">
                        <span className="font-medium">Pathway Report →</span>{" "}
                        the weekly action steps from the 30-Day Plan.
                      </li>
                      <li className="border-b border-[color:var(--pub-rule-soft)] pb-3">
                        <span className="font-medium">Meeting Prep →</span>{" "}
                        PPT meetings and any pre-meeting check-ins.
                      </li>
                      <li>
                        <span className="font-medium">Care Team →</span>{" "}
                        deadlines and tours added by the case manager or family.
                      </li>
                    </ul>
                    <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                      <Link to="/demo/plan" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                        See The 30-Day Plan <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </PublicationSidebar>

                  <PublicationSidebar label="Shared With">
                    <ul className="space-y-1 text-sm text-foreground/85">
                      {["Student", "Family", "Case Manager", "Educator", "Partner Agency"].map((r) => (
                        <li key={r} className="flex items-center gap-2 border-b border-[color:var(--pub-rule-soft)] py-2 last:border-b-0">
                          <Users className="h-3.5 w-3.5 text-primary/60" /> {r}
                        </li>
                      ))}
                    </ul>
                  </PublicationSidebar>
                </div>
              }
            />
          </div>
        </StudioPage>
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
    <li className="flex gap-4 border-b border-[color:var(--pub-rule-soft)] py-4 last:border-b-0">
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted text-center py-2">
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
