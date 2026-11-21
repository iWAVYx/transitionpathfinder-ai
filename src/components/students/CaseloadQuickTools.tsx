import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { usePlanningLifetime } from "@/hooks/use-planning-lifetime";
import { toast } from "sonner";
import { StickyNote, Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addCaseManagerNote,
  quickAssignActionItem,
  listStudentNotes,
  type CaseloadStudent,
} from "@/lib/caseload.functions";
export function CaseloadQuickTools({
  row,
  onChanged,
}: {
  row: CaseloadStudent;
  onChanged: () => void | Promise<void>;
}) {
  const scope = usePlanningLifetime(row.id);
  const [notesError, setNotesError] = useState(false);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesEditable, setNotesEditable] = useState(false);
  const editable = row.relationship !== "viewer" && notesEditable && !notesError && !notesLoading;
  const addNote = useServerFn(addCaseManagerNote);
  const addAction = useServerFn(quickAssignActionItem);
  const fetchNotes = useServerFn(listStudentNotes);

  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [actionTitle, setActionTitle] = useState("");
  const [actionPriority, setActionPriority] = useState<"low" | "medium" | "high">("medium");
  const [savingAction, setSavingAction] = useState(false);
  const [notes, setNotes] = useState<
    Array<{ id: string; content: string; created_at: string; note_type: string }>
  >([]);

  async function refreshNotes() {
    const sequence = scope.nextRead();
    setNotesLoading(true);
    setNotesError(false);
    setNotes([]);
    try {
      const result = await fetchNotes({
        data: { student_id: row.id, expected_viewer_id: scope.viewerId },
      });
      if (!scope.currentRead(sequence)) return;
      setNotes(result.notes);
      setNotesEditable(result.canEdit);
      scope.confirmRead();
    } catch {
      if (scope.currentRead(sequence)) {
        setNotesError(true);
        setNotesEditable(false);
      }
    } finally {
      if (scope.currentRead(sequence)) setNotesLoading(false);
    }
  }
  useEffect(() => {
    void refreshNotes();
  }, [row.id]);

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() || !editable || !scope.begin()) return;
    setSavingNote(true);
    try {
      const requestId = crypto.randomUUID();
      const receipt = await addNote({
        data: {
          student_id: row.id,
          expected_viewer_id: scope.viewerId,
          request_id: requestId,
          content: note.trim(),
          visibility: "team",
        },
      });
      if (!scope.current()) return;
      if (
        receipt.id !== requestId ||
        receipt.student_id !== row.id ||
        receipt.created_by_user_id !== scope.viewerId ||
        receipt.content !== note.trim()
      )
        throw Error("We could not confirm the saved note. Refresh saved records.");
      setNote("");
      toast.success("Note saved.");
      await refreshNotes();
      if (scope.current()) await onChanged();
    } catch (err) {
      if (!scope.current()) return;
      scope.markUncertain();
      toast.error(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      scope.finish();
      if (scope.current()) setSavingNote(false);
    }
  }

  async function handleAssignAction(e: React.FormEvent) {
    e.preventDefault();
    if (!actionTitle.trim() || !editable || !scope.begin()) return;
    setSavingAction(true);
    try {
      const requestId = crypto.randomUUID();
      const receipt = await addAction({
        data: {
          student_id: row.id,
          title: actionTitle.trim(),
          category: "educator",
          expected_viewer_id: scope.viewerId,
          request_id: requestId,
          priority: actionPriority,
        },
      });
      if (!scope.current()) return;
      if (
        receipt.id !== requestId ||
        receipt.student_id !== row.id ||
        receipt.created_by_user_id !== scope.viewerId ||
        receipt.title !== actionTitle.trim()
      )
        throw Error("We could not confirm the saved action. Refresh saved records.");
      setActionTitle("");
      toast.success("Action item created.");
      onChanged();
    } catch (err) {
      if (!scope.current()) return;
      scope.markUncertain();
      toast.error(err instanceof Error ? err.message : "Could not create action.");
    } finally {
      scope.finish();
      if (scope.current()) setSavingAction(false);
    }
  }

  return (
    <div className="mt-4 grid gap-4 border-t border-border/60 pt-4 md:grid-cols-2">
      {(notesError || scope.uncertain) && (
        <div role="alert" className="md:col-span-2 text-sm">
          Saved records are unavailable or the last change is unconfirmed.{" "}
          <Button variant="outline" onClick={() => void onChanged()}>
            Refresh Saved Records
          </Button>
        </div>
      )}
      {row.relationship === "viewer" && (
        <p className="md:col-span-2 text-sm">You have viewing access to this student.</p>
      )}
      {/* Quick note */}
      <form onSubmit={handleSaveNote} className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <StickyNote className="h-3.5 w-3.5" /> Add Case Manager Note
        </Label>
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What changed this week? Observations, follow-ups, family updates…"
          maxLength={4000}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!editable || scope.uncertain || savingAction || savingNote || !note.trim()}
          >
            {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save Note
          </Button>
        </div>
        {notes.length > 0 && (
          <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto border-t pt-2 text-xs">
            {notes.slice(0, 5).map((n) => (
              <li key={n.id}>
                <p className="text-foreground/75">{new Date(n.created_at).toLocaleString()}</p>
                <p className="text-foreground">{n.content}</p>
              </li>
            ))}
          </ul>
        )}
      </form>

      {/* Quick assign action */}
      <form onSubmit={handleAssignAction} className="space-y-2">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-wider">
          <Target className="h-3.5 w-3.5" /> Assign Action Item
        </Label>
        <Input
          value={actionTitle}
          onChange={(e) => setActionTitle(e.target.value)}
          placeholder="e.g. Schedule transition planning meeting"
          maxLength={200}
        />
        <div className="flex items-center gap-2">
          <Select
            value={actionPriority}
            onValueChange={(v) => setActionPriority(v as "low" | "medium" | "high")}
          >
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={
                !editable || scope.uncertain || savingNote || savingAction || !actionTitle.trim()
              }
            >
              {savingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Assign
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
