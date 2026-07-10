import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { HeartHandshake, Loader2, Save } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  getFamilyPriorities,
  updateFamilyPriorities,
} from "@/lib/family.functions";

export const Route = createFileRoute("/_authenticated/family/priorities")({
  head: () => ({
    meta: [
      { title: "Family Priorities — TransitionForward" },
      {
        name: "description",
        content:
          "What matters most for your student's life after high school — the north star for the Pathway Report.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/family/priorities">
      <FamilyPrioritiesPage />
    </RoleGuard>
  ),
});

function FamilyPrioritiesPage() {
  const loadStudents = useServerFn(listStudents);
  const loadPriorities = useServerFn(getFamilyPriorities);
  const savePriorities = useServerFn(updateFamilyPriorities);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents()
      .then(({ students }) => {
        setStudents(students);
        if (students[0]) setStudentId(students[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadPriorities({ data: { student_id: studentId } })
      .then((row) => setText(row.family_priorities ?? ""))
      .catch(() => toast.error("Could not load priorities"))
      .finally(() => setLoading(false));
  }, [studentId, loadPriorities]);

  async function handleSave() {
    if (!studentId) return;
    setSaving(true);
    try {
      await savePriorities({
        data: { student_id: studentId, family_priorities: text },
      });
      toast.success("Priorities saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SiteShell>
      <main
        data-testid="family-priorities-page"
        className="mx-auto max-w-3xl px-4 py-8"
      >
        <Breadcrumbs trail={[{ label: "Family Priorities" }]} />
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <HeartHandshake className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight">
              Family Priorities
            </h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            What matters most for your student's life after high school? This
            feeds directly into the Pathway Report.
          </p>
        </header>

        {students.length > 1 ? (
          <div className="mb-6 max-w-sm">
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : students.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <h2 className="text-lg font-medium">No student connected yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Once a student is linked to your account, you can capture family
              priorities here.
            </p>
            <Button asChild className="mt-4">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Independence, steady employment, staying connected to friends, transportation, safety, mental health support…"
              className="text-base"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {text.length}/4000
              </p>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save priorities
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </SiteShell>
  );
}
