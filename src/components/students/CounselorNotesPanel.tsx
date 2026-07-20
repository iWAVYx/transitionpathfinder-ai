// Counselor UI slice — collapsible panel rendering counselor_scope evidence
// on the shared student profile surface (family/educator/admin). RLS filters
// silently: educators who aren't the note's contributor see an empty list,
// which is the correct outcome — the panel is discoverable to all educators
// so contributors can find their own notes, but only the contributor or a
// platform admin can read the content per the Proof-7 policy.

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldCheck, ChevronDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  listCounselorNotes,
  createCounselorNote,
  type CounselorNoteRow,
} from "@/lib/counselor-notes.functions";

export function CounselorNotesPanel({ studentId }: { studentId: string }) {
  const fetchNotes = useServerFn(listCounselorNotes);
  const addNote = useServerFn(createCounselorNote);

  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<CounselorNoteRow[]>([]);
  const [note, setNote] = useState("");
  const [focus, setFocus] = useState("");

  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    fetchNotes({ data: { student_id: studentId } })
      .then(({ notes }) => setNotes(notes))
      .catch(() => setNotes([]))
      .finally(() => {
        setLoaded(true);
        setLoading(false);
      });
  }, [open, loaded, studentId, fetchNotes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      const { note: created } = await addNote({
        data: {
          student_id: studentId,
          note: note.trim(),
          focus: focus.trim() || null,
        },
      });
      setNotes((prev) => [created, ...prev]);
      setNote("");
      setFocus("");
      toast.success("Private counselor note saved.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Couldn't save this note.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      data-testid="counselor-notes-panel"
      className="rounded-2xl border border-border/70 bg-card shadow-soft"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="counselor-notes-body"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <span>
            <span className="block font-display text-base">
              Private Counselor Notes
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Visible only to the note's author and platform admins. Not shown to
              families, students, or peer educators.
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div id="counselor-notes-body" className="border-t px-5 py-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label
                htmlFor="counselor-note-focus"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Focus (optional)
              </label>
              <Input
                id="counselor-note-focus"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. Post-secondary planning, mental-health check-in"
                maxLength={120}
                className="mt-1"
              />
            </div>
            <div>
              <label
                htmlFor="counselor-note-body"
                className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
              >
                Note
              </label>
              <Textarea
                id="counselor-note-body"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write a private note. Only you and platform admins will see it."
                rows={4}
                maxLength={4000}
                className="mt-1"
                required
              />
            </div>
            <div className="flex items-center justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={saving || !note.trim()}
                data-testid="counselor-note-submit"
              >
                {saving ? "Saving…" : "Save private note"}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Your notes for this student
            </h4>
            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading…
              </p>
            ) : notes.length === 0 ? (
              <p
                data-testid="counselor-notes-empty"
                className="mt-3 text-sm text-muted-foreground"
              >
                No private notes visible to you yet. Notes you write here appear
                for you and platform admins only.
              </p>
            ) : (
              <ul
                data-testid="counselor-notes-list"
                className="mt-3 space-y-3"
              >
                {notes.map((n) => (
                  <li
                    key={n.id}
                    data-testid="counselor-note-item"
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-medium uppercase tracking-wider text-primary">
                        {n.focus ?? "Counselor note"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {n.note}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
