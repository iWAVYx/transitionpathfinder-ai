import { createFileRoute, Link } from "@tanstack/react-router";
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
      <div className="demo-shell">
        <DemoStepBar current="meeting" student={s} />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-14">
        {/* Header */}
        <div className="rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                Meeting Center
              </p>
              <h1 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
                {profile.first_name}'s Next PPT Meeting
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything {profile.first_name}'s family and team need to walk in
                prepared — drawn directly from the Pathway Report so no one has to
                rebuild it the night before.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" /> {nextMeetingDate}
              </Badge>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4" /> Print Packet
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4" /> Export Prep Packet
                </Button>
              </div>
            </div>
          </div>

          {/* Suggested agenda */}
          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Suggested Agenda · 45 Min
            </p>
            <ol className="mt-3 grid gap-2 sm:grid-cols-2">
              {[
                "Welcome + Introductions (5 Min)",
                `${profile.first_name}'s Voice — What's Working / What's Hard (8 Min)`,
                "Review Strengths And Current Goals (10 Min)",
                "Discuss Recommended Pathways + Services (12 Min)",
                "Family Questions + Decisions (8 Min)",
                "Action Items + Next Meeting Date (2 Min)",
              ].map((item, i) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-foreground/85">{item}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Mini calendar — preview of the shared schedule */}
        <div className="mt-8">
          <DemoCalendarPreview
            student={s}
            title="On The Shared Calendar"
            subtitle="What the family and care team will see in the days around this meeting."
            limit={4}
          />
        </div>

        {/* Two-column grids */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Panel icon={<HelpCircle className="h-5 w-5" />} title="Questions To Ask" tone="primary">
            <ul className="space-y-2.5">
              {prep?.questions_to_ask.map((q) => (
                <li key={q} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<Sparkles className="h-5 w-5" />} title="Strengths To Highlight" tone="emerald">
            <ul className="space-y-2.5">
              {prep?.strengths_to_highlight.map((q) => (
                <li key={q} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<AlertTriangle className="h-5 w-5" />} title="Concerns To Raise" tone="amber">
            <ul className="space-y-2.5">
              {prep?.concerns_to_raise.map((q) => (
                <li key={q} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<Target className="h-5 w-5" />} title="Goals To Review">
            <ul className="space-y-2.5">
              {prep?.goals_to_review.map((q) => (
                <li key={q} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<FileText className="h-5 w-5" />} title="Documents To Bring">
            <ul className="space-y-2">
              {prep?.documents_to_bring.map((q) => (
                <li
                  key={q}
                  className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm"
                >
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<MessageCircle className="h-5 w-5" />} title={`${profile.first_name}'s Voice Prompts`}>
            <ul className="space-y-2.5">
              {prep?.student_voice_prompts.map((q) => (
                <li
                  key={q}
                  className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-sm italic leading-relaxed text-foreground/85"
                >
                  "{q}"
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={<Users className="h-5 w-5" />} title="Services To Discuss">
            <div className="flex flex-wrap gap-2">
              {prep?.services_to_discuss.map((q) => (
                <span
                  key={q}
                  className="inline-flex items-center rounded-full border border-border/60 bg-background px-3 py-1 text-xs font-medium"
                >
                  {q}
                </span>
              ))}
            </div>
          </Panel>

          <Panel icon={<CheckSquare className="h-5 w-5" />} title="Follow-Up Items">
            <ul className="space-y-2.5">
              {prep?.follow_up_items.map((q) => (
                <li key={q} className="flex items-start gap-2 text-sm leading-relaxed">
                  <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="text-foreground/85">{q}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Previous meeting minutes */}
        <div className="mt-8 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                <ClipboardList className="mr-1 inline h-3.5 w-3.5" />
                Previous Meeting Minutes
              </p>
              <h2 className="mt-1 font-display text-xl">{minutes.date}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                A sample of how decisions, owners, and follow-ups carry forward — so the
                next prep packet and the Pathway Report stay in step with what the team
                actually agreed to.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {minutes.attendees.map((a) => (
                <Badge key={a} variant="outline" className="text-[11px]">{a}</Badge>
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {isDirty ? (
              <Badge variant="secondary" className="gap-1 text-[11px]">
                <Save className="h-3 w-3" /> Edits Saved In This Browser
              </Badge>
            ) : null}
            {isDirty ? (
              <Button size="sm" variant="ghost" onClick={reset} className="h-7 px-2 text-xs">
                <RotateCcw className="mr-1 h-3 w-3" /> Reset To Sample
              </Button>
            ) : null}
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
        </div>


        {/* Phase 5 — Agenda → Pathway Report linkage */}
        <div className="mt-8 rounded-3xl border border-primary/25 bg-primary/5 p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-2">
            <Link2 className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                How this prep packet shapes the Pathway Report
              </p>
              <h2 className="mt-1 font-display text-xl">Every agenda item has a home in the report.</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                In the signed-in product, decisions captured here flow back into the report and 30/60/90 plan —
                no double-entry.
              </p>
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Agenda item</th>
                  <th className="px-3 py-2 font-semibold">Shapes</th>
                  <th className="px-3 py-2 font-semibold">Via</th>
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
                        aria-label="Data path"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>


        <DemoStepFooter current="meeting" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}

function Panel({
  icon,
  title,
  tone = "default",
  children,
}: {
  icon: React.ReactNode;
  title: string;
  tone?: "default" | "primary" | "emerald" | "amber";
  children: React.ReactNode;
}) {
  const toneCls =
    tone === "primary"
      ? "border-primary/25"
      : tone === "emerald"
        ? "border-emerald-500/25"
        : tone === "amber"
          ? "border-amber-500/30"
          : "border-border";
  const iconCls =
    tone === "primary"
      ? "text-primary"
      : tone === "emerald"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "amber"
          ? "text-amber-600 dark:text-amber-400"
          : "text-foreground/70";
  return (
    <div className={`rounded-3xl border bg-card p-5 shadow-soft sm:p-6 ${toneCls}`}>
      <h2 className="flex items-center gap-2 border-b border-border/60 pb-3 font-display text-lg">
        <span className={iconCls}>{icon}</span>
        {title}
      </h2>
      <div className="pt-4">{children}</div>
    </div>
  );
}
