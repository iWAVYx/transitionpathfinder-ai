import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ListPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useCreatePlanningAction } from "@/hooks/use-create-planning-action";
import { listStudents, type Student } from "@/lib/students.functions";
type Props = { title: string; description?: string | null; link?: string | null };
export function AddToPathwayButton(props: Props) {
  const { user, loading } = useAuth();
  if (loading) return <span>Loading…</span>;
  if (!user)
    return (
      <Link
        to="/login"
        search={{ redirect: "/resources" }}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold"
      >
        <ListPlus className="h-3.5 w-3.5" /> Add to pathway
      </Link>
    );
  return <ResourceActionPicker key={user.id} {...props} />;
}
function ResourceActionPicker({ title, description, link }: Props) {
  const action = useCreatePlanningAction(),
    fetchStudents = useServerFn(listStudents);
  const [open, setOpen] = useState(false),
    [students, setStudents] = useState<Student[] | null>(null),
    [loadError, setLoadError] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadError(false);
    setStudents(null);
    fetchStudents({ data: { expected_viewer_id: action.viewerId } })
      .then((result) => {
        if (cancelled) return;
        if (result.loadFailed) throw Error();
        setStudents(result.students);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, attempt, fetchStudents, action.viewerId]);
  async function add(student: Student) {
    try {
      const saved = await action.run({
        student_id: student.id,
        title: title.slice(0, 200),
        description: [description, link].filter(Boolean).join("\n\n").slice(0, 2000) || undefined,
        category: "family",
        priority: "medium",
      });
      if (!saved) return;
      toast.success("Added to pathway", {
        description: `Saved to ${student.first_name}'s action items.`,
      });
      setOpen(false);
    } catch {
      if (action.current())
        toast.error(
          "We couldn't confirm this action item. Check saved action items before trying again.",
        );
    }
  }
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
      >
        <ListPlus className="h-3.5 w-3.5" /> Add to pathway
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-2 shadow-lift">
          <p className="px-2 py-1 text-xs font-semibold">Add to which student?</p>
          {action.uncertain ? (
            <p role="status" className="px-2 py-2 text-xs">
              Check saved action items, then refresh this page before trying again.
            </p>
          ) : loadError ? (
            <p role="status" className="px-2 py-2 text-xs">
              Students are unavailable.{" "}
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Refresh Students
              </button>
            </p>
          ) : students === null ? (
            <p className="px-2 py-2 text-xs">Loading…</p>
          ) : students.length === 0 ? (
            <Link to="/students" className="block px-2 py-2 text-xs text-primary">
              Create a student first →
            </Link>
          ) : (
            <ul className="max-h-64 overflow-y-auto">
              {students.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    disabled={!action.available || action.pending}
                    onClick={() => void add(student)}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-muted disabled:opacity-50"
                  >
                    <span>
                      {student.first_name} {student.last_name}
                    </span>
                    {action.pending && <span>Saving…</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
