import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Printer, Sparkles, CheckSquare, ClipboardList, MessageSquare, Wand2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStudent } from "@/lib/students.functions";
import {
  getMeeting,
  updateMeeting,
  addAgendaItem,
  addQuestion,
  addActionItem,
  setActionStatus,
  type Meeting,
  type AgendaItem,
  type MeetingQuestion,
  type ActionItem,
} from "@/lib/meetings.functions";

export const Route = createFileRoute("/_authenticated/meetings/$meetingId")({
  head: () => ({ meta: [{ title: "Meeting Prep — TransitionForward" }] }),
  component: MeetingDetailPage,
});

function MeetingDetailPage() {
  const { meetingId } = Route.useParams();
  const get = useServerFn(getMeeting);
  const update = useServerFn(updateMeeting);
  const addAg = useServerFn(addAgendaItem);
  const addQ = useServerFn(addQuestion);
  const addAction = useServerFn(addActionItem);
  const setStatus = useServerFn(setActionStatus);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [questions, setQuestions] = useState<MeetingQuestion[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

  const reload = () =>
    get({ data: { id: meetingId } })
      .then((r) => {
        setMeeting(r.meeting);
        setAgenda(r.agenda);
        setQuestions(r.questions);
        setActions(r.actions);
        setLoadError(null);
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Couldn't load this meeting.");
      });

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const saveField = async (field: "student_voice" | "family_concerns" | "teacher_notes", value: string) => {
    if (!meeting) return;
    setMeeting({ ...meeting, [field]: value });
    await update({ data: { id: meeting.id, [field]: value } as never });
  };

  function handlePrint() {
    window.print();
  }

  if (loadError) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl">We couldn't open this meeting</h1>
          <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
          <Link
            to="/meetings"
            className="mt-6 inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            ← Back to Meetings
          </Link>
        </div>
      </SiteShell>
    );
  }

  if (!meeting) {
    return (
      <SiteShell>
        <p className="mx-auto max-w-3xl p-10 text-sm text-muted-foreground">Loading…</p>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Meetings", to: "/meetings" },
            { label: meeting.title },
          ]}
        />
      </div>

      <section ref={printRef} className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {meeting.kind} Meeting · {meeting.status}
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight">{meeting.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : "Unscheduled"}
              {meeting.location ? ` · ${meeting.location}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Export summary
            </Button>
            {meeting.status === "upcoming" && (
              <Button
                onClick={async () => {
                  await update({ data: { id: meeting.id, status: "completed" } });
                  toast.success("Marked as completed.");
                  reload();
                }}
              >
                <CheckSquare className="h-4 w-4" />
                Mark completed
              </Button>
            )}
          </div>
        </div>

        <div className="mt-2 hidden print:block">
          <h1 className="font-display text-3xl">{meeting.title}</h1>
          <p className="text-sm">
            {meeting.kind} ·{" "}
            {meeting.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : ""}
            {meeting.location ? ` · ${meeting.location}` : ""}
          </p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Agenda */}
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-soft">
            <header className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg">
                <ClipboardList className="h-4 w-4 text-primary" />
                Agenda
              </h2>
              <AddInline
                label="Add item"
                placeholder="Agenda item"
                onAdd={async (v) => {
                  await addAg({ data: { meeting_id: meeting.id, title: v } });
                  reload();
                }}
              />
            </header>
            <ol className="mt-4 space-y-2">
              {agenda.map((a, i) => (
                <li key={a.id} className="rounded-xl border bg-background p-3 text-sm">
                  <span className="text-muted-foreground">{i + 1}.</span> {a.title}
                </li>
              ))}
              {agenda.length === 0 && <p className="text-sm text-muted-foreground">No agenda yet.</p>}
            </ol>

            <h3 className="mt-8 flex items-center gap-2 font-display text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Student voice
            </h3>
            <textarea
              rows={3}
              aria-label="Student voice"
              value={meeting.student_voice ?? ""}
              onChange={(e) => setMeeting({ ...meeting, student_voice: e.target.value })}
              onBlur={(e) => saveField("student_voice", e.target.value)}
              placeholder="What the student wants the team to know — in their own words."
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />

            <h3 className="mt-6 font-display text-base">Family concerns</h3>
            <textarea
              rows={3}
              aria-label="Family concerns"
              value={meeting.family_concerns ?? ""}
              onChange={(e) => setMeeting({ ...meeting, family_concerns: e.target.value })}
              onBlur={(e) => saveField("family_concerns", e.target.value)}
              placeholder="What the family most wants the team to hear."
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />

            <h3 className="mt-6 font-display text-base">Teacher progress notes</h3>
            <textarea
              rows={3}
              aria-label="Teacher progress notes"
              value={meeting.teacher_notes ?? ""}
              onChange={(e) => setMeeting({ ...meeting, teacher_notes: e.target.value })}
              onBlur={(e) => saveField("teacher_notes", e.target.value)}
              placeholder="Observations and progress to share with the team."
              className="mt-2 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </div>

          {/* Side rail */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <header className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Questions to ask
                </h2>
                <AddInline
                  label="Add"
                  placeholder="Add a family question"
                  onAdd={async (v) => {
                    await addQ({ data: { meeting_id: meeting.id, question: v, asker_role: "family" } });
                    reload();
                  }}
                />
              </header>
              <ul className="mt-3 space-y-2">
                {questions.map((q) => (
                  <li key={q.id} className="rounded-xl border bg-background p-3 text-sm">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {q.asker_role}
                    </span>
                    <p className="mt-1">{q.question}</p>
                  </li>
                ))}
                {questions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No questions yet.</p>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <header className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  Follow-up action items
                </h2>
                <AddInline
                  label="Add"
                  placeholder="Add action item"
                  onAdd={async (v) => {
                    await addAction({ data: { meeting_id: meeting.id, title: v } });
                    reload();
                  }}
                />
              </header>
              <ul className="mt-3 space-y-2">
                {actions.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-xl border bg-background p-3 text-sm",
                      a.status === "done" && "opacity-60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(a.status === "done" && "line-through")}>{a.title}</p>
                      <select
                        aria-label={`Status for ${a.title}`}
                        value={a.status}
                        onChange={async (e) => {
                          await setStatus({
                            data: { id: a.id, status: e.target.value as ActionItem["status"] },
                          });
                          reload();
                        }}
                        className="rounded-full border bg-card px-2 py-0.5 text-[11px]"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In progress</option>
                        <option value="done">Done</option>
                      </select>
                    </div>
                  </li>
                ))}
                {actions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No actions yet.</p>
                )}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media print {
          @page { size: Letter; margin: 0.65in; }
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </SiteShell>
  );
}

function AddInline({
  label,
  placeholder,
  onAdd,
}: {
  label: string;
  placeholder: string;
  onAdd: (v: string) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState("");
  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        {label}
      </Button>
    );
  }
  return (
    <div className="flex gap-1">
      <input
        aria-label={placeholder}
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder={placeholder}
        className="w-44 rounded-lg border bg-background px-2 py-1 text-xs"
      />
      <Button
        size="sm"
        onClick={async () => {
          if (!v.trim()) return;
          await onAdd(v.trim());
          setV("");
          setOpen(false);
        }}
      >
        Add
      </Button>
    </div>
  );
}
