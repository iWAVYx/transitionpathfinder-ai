import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Plus, CheckCircle2, Circle } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  listThreads,
  createThread,
  listMessages,
  postMessage,
  setThreadStatus,
  MESSAGE_CATEGORIES,
  CATEGORY_LABEL,
  type MessageThread,
  type Message,
  type MessageCategory,
} from "@/lib/messages.functions";
import { listStudents, type Student } from "@/lib/students.functions";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({
    meta: [
      { title: "Communication Center — TransitionForward" },
      {
        name: "description",
        content:
          "Structured, transition-specific messages between families, students, and educators — organized by topic, never lost.",
      },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const fetchThreads = useServerFn(listThreads);
  const create = useServerFn(createThread);
  const fetchMsgs = useServerFn(listMessages);
  const send = useServerFn(postMessage);
  const setStatus = useServerFn(setThreadStatus);
  const fetchStudents = useServerFn(listStudents);

  const [threads, setThreads] = useState<MessageThread[] | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<MessageThread | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [showNew, setShowNew] = useState(false);

  const reload = () => fetchThreads({ data: {} }).then((r) => setThreads(r.threads));
  useEffect(() => {
    reload();
    fetchStudents().then((r) => setStudents(r.students));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetchMsgs({ data: { thread_id: selected.id } }).then((r) => setMsgs(r.messages));
  }, [selected, fetchMsgs]);

  async function handleNew(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const t = await create({
      data: {
        student_id: String(fd.get("student_id")),
        category: String(fd.get("category")) as MessageCategory,
        subject: String(fd.get("subject")),
        first_message: String(fd.get("body")),
      },
    });
    setShowNew(false);
    await reload();
    setSelected(t);
  }

  async function handleSend() {
    if (!selected || !draft.trim()) return;
    await send({ data: { thread_id: selected.id, body: draft } });
    setDraft("");
    const r = await fetchMsgs({ data: { thread_id: selected.id } });
    setMsgs(r.messages);
  }

  const studentName = (id: string) => students.find((s) => s.id === id)?.first_name ?? "Student";

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Messages" }]} />
      </div>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Communication Center</p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
              Organized, Purposeful Conversations.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              A calm, categorized space for families, students, and educators to talk about goals,
              meeting prep, family questions, and follow-ups — no more lost emails or scattered texts.
            </p>
          </div>
          <Button onClick={() => setShowNew(true)} disabled={students.length === 0}>
            <Plus className="h-4 w-4" />
            New thread
          </Button>
        </div>

        {students.length === 0 && (
          <InfoBox label="Add a student first" defaultOpen className="mt-6 max-w-2xl">
            Threads are always tied to a student so updates land in the right place. Add a student
            from the Students page to start a conversation.
          </InfoBox>
        )}

        {showNew && (
          <form
            onSubmit={handleNew}
            className="mt-6 grid gap-4 rounded-2xl border bg-card p-5 shadow-soft sm:grid-cols-2"
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium">Student *</span>
              <select required name="student_id" className="w-full rounded-lg border bg-background px-3 py-2">
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Category *</span>
              <select required name="category" defaultValue="general" className="w-full rounded-lg border bg-background px-3 py-2">
                {MESSAGE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="mb-1 block font-medium">Subject *</span>
              <input
                required
                name="subject"
                maxLength={200}
                className="w-full rounded-lg border bg-background px-3 py-2"
                placeholder="e.g. Question about Daniel's transportation goal"
              />
            </label>
            <label className="sm:col-span-2 text-sm">
              <span className="mb-1 block font-medium">First message *</span>
              <textarea
                required
                name="body"
                rows={4}
                maxLength={4000}
                className="w-full rounded-lg border bg-background px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit">Start thread</Button>
              <Button type="button" variant="outline" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Thread list */}
          <aside className="rounded-2xl border bg-card shadow-soft">
            <div className="border-b p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Threads
            </div>
            <ul className="max-h-[60vh] divide-y overflow-y-auto">
              {threads === null ? (
                <li className="p-4 text-sm text-muted-foreground">Loading…</li>
              ) : threads.length === 0 ? (
                <li className="p-4 text-sm text-muted-foreground">No threads yet.</li>
              ) : (
                threads.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => setSelected(t)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-muted",
                        selected?.id === t.id && "bg-muted",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {t.status === "resolved" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="truncate text-sm font-medium">{t.subject}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="rounded-full bg-background px-2 py-0.5">
                          {CATEGORY_LABEL[t.category]}
                        </span>
                        <span>{studentName(t.student_id)}</span>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </aside>

          {/* Thread view */}
          <div className="rounded-2xl border bg-card shadow-soft">
            {selected ? (
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3 border-b p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {CATEGORY_LABEL[selected.category]} · {studentName(selected.student_id)}
                    </p>
                    <h2 className="mt-1 font-display text-xl">{selected.subject}</h2>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await setStatus({
                        data: {
                          id: selected.id,
                          status: selected.status === "resolved" ? "open" : "resolved",
                        },
                      });
                      await reload();
                      setSelected({
                        ...selected,
                        status: selected.status === "resolved" ? "open" : "resolved",
                      });
                    }}
                  >
                    {selected.status === "resolved" ? "Reopen" : "Mark resolved"}
                  </Button>
                </div>

                <ul className="flex-1 space-y-3 overflow-y-auto p-4">
                  {msgs.map((m) => (
                    <li key={m.id} className="rounded-2xl border bg-background p-3">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>

                <div className="border-t p-3">
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a reply…"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  <div className="mt-2 flex justify-end">
                    <Button onClick={handleSend} disabled={!draft.trim()}>
                      Send
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center p-10 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Select a thread or start a new one to begin.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
