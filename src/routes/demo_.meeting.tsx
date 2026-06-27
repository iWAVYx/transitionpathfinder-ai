import { createFileRoute } from "@tanstack/react-router";
import {
  Users,
  HelpCircle,
  Sparkles,
  AlertTriangle,
  Target,
  FileText,
  MessageCircle,
  CheckSquare,
  Download,
  Printer,
  Calendar,
  ClipboardList,
  Link2,
  RotateCcw,
  Save,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDemoStudent, type DemoStudentId } from "@/lib/demo-data";
import { DemoCalendarPreview } from "@/components/pathway/DemoCalendarPreview";
import { useDemoMeetingEdits } from "@/hooks/use-demo-meeting-edits";
import {
  PublicationPage,
  PublicationSpread,
  PublicationCallout,
  PublicationSidebar,
  PublicationChecklist,
} from "@/components/publication/PublicationPage";

export const Route = createFileRoute("/demo_/meeting")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Meeting Center — TransitionForward Demo" },
      {
        name: "description",
        content:
          "See the PPT/IEP prep packet TransitionForward generates: agenda, questions to ask, strengths to highlight, documents to bring, and follow-ups.",
      },
      { property: "og:url", content: "/demo/meeting" },
    ],
    links: [{ rel: "canonical", href: "/demo/meeting" }],
  }),
  component: DemoMeetingPage,
});

function DemoMeetingPage() {
  const { s = "maya" as const } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile, report, nextMeetingDate } = bundle;
  const prep = report.meeting_prep_toolkit;
  const { state: meetingEdits, updateMinuteEntry, updateAgendaItem, reset, isDirty } =
    useDemoMeetingEdits(s as DemoStudentId);
  const minutes = meetingEdits.minutes;
  const agenda = meetingEdits.agenda;

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <DemoStepBar current="meeting" student={s} />
        <PublicationPage
          kicker="Step 07"
          chapter="Questions For The Team"
          dek="A meeting-ready packet — agenda, questions to ask, strengths to highlight, and follow-ups for after the meeting."
          part="Part Three — Plan"
          folio="p. 58"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">

            <PublicationCallout kind="means">
              Everything {profile.first_name}'s family and team need to walk in prepared —
              drawn directly from the Pathway Report so no one has to rebuild it the night before.
            </PublicationCallout>

            {/* Meeting date + actions */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--pub-rule-soft)] pb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {profile.first_name}'s Next PPT Meeting
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-display text-xl">
                  <Calendar className="h-4 w-4 text-primary" /> {nextMeetingDate}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4" /> Print Packet
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4" /> Export Prep Packet
                </Button>
              </div>
            </div>

            {/* Suggested agenda — editorial list */}
            <section className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Suggested Agenda · 45 Min
              </p>
              <ol>
                {[
                  "Welcome + Introductions (5 Min)",
                  `${profile.first_name}'s Voice — What's Working / What's Hard (8 Min)`,
                  "Review Strengths And Current Goals (10 Min)",
                  "Discuss Recommended Pathways + Services (12 Min)",
                  "Family Questions + Decisions (8 Min)",
                  "Action Items + Next Meeting Date (2 Min)",
                ].map((item, i) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 border-b border-[color:var(--pub-rule-soft)] py-4 text-sm last:border-b-0"
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {i + 1}
                    </span>
                    <span className="text-foreground/85">{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            {/* Calendar preview */}
            <div className="mt-8">
              <DemoCalendarPreview
                student={s}
                title="On The Shared Calendar"
                subtitle="What the family and care team will see in the days around this meeting."
                limit={4}
              />
            </div>

            {/* Main spread — prep panels */}
            <PublicationSpread
              lead={
                <div className="space-y-8">
                  {/* Questions to ask */}
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <HelpCircle className="h-3.5 w-3.5" /> Questions To Ask
                    </p>
                    <ul>
                      {prep?.questions_to_ask.map((q) => (
                        <li
                          key={q}
                          className="border-b border-[color:var(--pub-rule-soft)] py-4 text-sm leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Concerns to raise */}
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" /> Concerns To Raise
                    </p>
                    <ul>
                      {prep?.concerns_to_raise.map((q) => (
                        <li
                          key={q}
                          className="border-b border-[color:var(--pub-rule-soft)] py-4 text-sm leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Goals to review */}
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Target className="h-3.5 w-3.5" /> Goals To Review
                    </p>
                    <ul>
                      {prep?.goals_to_review.map((q) => (
                        <li
                          key={q}
                          className="border-b border-[color:var(--pub-rule-soft)] py-4 text-sm leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          {q}
                        </li>
                      ))}
                    </ul>
                  </section>

                  {/* Follow-up items */}
                  <section>
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <CheckSquare className="h-3.5 w-3.5" /> Follow-Up Items
                    </p>
                    {prep?.follow_up_items && (
                      <PublicationChecklist items={prep.follow_up_items} />
                    )}
                  </section>
                </div>
              }
              side={
                <div className="space-y-6">
                  <PublicationSidebar label="Strengths To Highlight">
                    <ul>
                      {prep?.strengths_to_highlight.map((q) => (
                        <li
                          key={q}
                          className="border-b border-[color:var(--pub-rule-soft)] py-3 text-sm leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          <span className="mr-2 text-emerald-500">✦</span>{q}
                        </li>
                      ))}
                    </ul>
                  </PublicationSidebar>

                  <PublicationSidebar label="Documents To Bring">
                    <ul>
                      {prep?.documents_to_bring.map((q) => (
                        <li
                          key={q}
                          className="flex items-center gap-2 border-b border-[color:var(--pub-rule-soft)] py-3 text-sm text-foreground/85 last:border-b-0"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </PublicationSidebar>

                  <PublicationSidebar label={`${profile.first_name}'s Voice Prompts`}>
                    <ul>
                      {prep?.student_voice_prompts.map((q) => (
                        <li
                          key={q}
                          className="border-b border-[color:var(--pub-rule-soft)] py-3 text-sm italic leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          <MessageCircle className="mr-1.5 inline h-3.5 w-3.5 text-primary/60 not-italic" />
                          "{q}"
                        </li>
                      ))}
                    </ul>
                  </PublicationSidebar>

                  <PublicationSidebar label="Services To Discuss">
                    <div className="flex flex-wrap gap-2 pt-1">
                      {prep?.services_to_discuss.map((q) => (
                        <span
                          key={q}
                          className="inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-medium"
                        >
                          <Users className="h-3 w-3" /> {q}
                        </span>
                      ))}
                    </div>
                  </PublicationSidebar>
                </div>
              }
            />

            {/* Previous meeting minutes */}
            <section className="mt-12">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color:var(--pub-rule-soft)] pb-4">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    <ClipboardList className="h-3.5 w-3.5" /> Previous Meeting Minutes
                  </p>
                  <h2 className="mt-1 font-display text-xl">{minutes.date}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Decisions, owners, and follow-ups that carry forward into the Pathway Report and the 30/60/90 plan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {minutes.attendees.map((a) => (
                    <Badge key={a} variant="outline" className="text-[11px]">{a}</Badge>
                  ))}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {isDirty && (
                  <Badge variant="secondary" className="gap-1 text-[11px]">
                    <Save className="h-3 w-3" /> Edits Saved In This Browser
                  </Badge>
                )}
                {isDirty && (
                  <Button size="sm" variant="ghost" onClick={reset} className="h-7 px-2 text-xs">
                    <RotateCcw className="mr-1 h-3 w-3" /> Reset To Sample
                  </Button>
                )}
              </div>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {minutes.entries.map((entry, i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-border/60 bg-background p-4 text-sm"
                  >
                    <input
                      className="w-full bg-transparent font-semibold text-foreground outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 -mx-1"
                      value={entry.topic}
                      onChange={(e) => updateMinuteEntry(i, { topic: e.target.value })}
                      aria-label="Minute topic"
                    />
                    <textarea
                      className="mt-1 w-full resize-none bg-transparent text-foreground/85 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 -mx-1"
                      rows={2}
                      value={entry.decision}
                      onChange={(e) => updateMinuteEntry(i, { decision: e.target.value })}
                      aria-label="Decision"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <label className="inline-flex items-center gap-1">
                        <span className="text-muted-foreground">Owner:</span>
                        <select
                          value={entry.owner}
                          onChange={(e) => updateMinuteEntry(i, { owner: e.target.value })}
                          className="rounded border border-border bg-background px-1 py-0.5 text-[11px]"
                        >
                          {["Student", "Family", "Case Manager", "School", "Partner"].map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </label>
                      <input
                        className="flex-1 min-w-[10rem] rounded border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                        placeholder="Follow-up (optional)"
                        value={entry.followUp ?? ""}
                        onChange={(e) => updateMinuteEntry(i, { followUp: e.target.value })}
                        aria-label="Follow-up"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Agenda → Pathway Report linkage */}
            <section className="mt-12">
              <div className="flex items-start gap-2 border-b border-[color:var(--pub-rule-soft)] pb-4">
                <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                    How This Prep Packet Shapes The Pathway Report
                  </p>
                  <h2 className="mt-1 font-display text-xl">Every Agenda Item Has A Home In The Report</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Decisions captured here flow back into the Pathway Report and the 30/60/90
                    plan, so families and educators never have to enter the same thing twice.
                  </p>
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Agenda Item</th>
                      <th className="px-3 py-2 font-semibold">Shapes</th>
                      <th className="px-3 py-2 font-semibold">How</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {agenda.map((row, i) => (
                      <tr key={i} className="align-top">
                        <td className="px-3 py-2">
                          <textarea
                            rows={2}
                            className="w-full resize-none bg-transparent text-foreground/85 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 -mx-1"
                            value={row.agendaItem}
                            onChange={(e) => updateAgendaItem(i, { agendaItem: e.target.value })}
                            aria-label="Agenda item"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <textarea
                            rows={2}
                            className="w-full resize-none bg-transparent text-foreground/85 outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 -mx-1"
                            value={row.shapes}
                            onChange={(e) => updateAgendaItem(i, { shapes: e.target.value })}
                            aria-label="Report section it shapes"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <textarea
                            rows={2}
                            className="w-full resize-none bg-transparent text-xs text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 rounded px-1 -mx-1"
                            value={row.via}
                            onChange={(e) => updateAgendaItem(i, { via: e.target.value })}
                            aria-label="How this connects"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <DemoStepFooter current="meeting" student={s} />
          </div>
        </PublicationPage>
      </div>
    </SiteShell>
  );
}
