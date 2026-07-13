import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MessageSquareQuote, Check } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listStudents, type Student } from "@/lib/students.functions";
import {
  getStudentVoiceResponses,
  upsertStudentVoiceResponse,
  type StudentVoiceResponse,
} from "@/lib/student-voice.functions";
import {
  STUDENT_VOICE_PROMPTS,
  type StudentVoicePrompt,
} from "@/lib/student-voice-prompts";
import { StudentVoiceModule } from "@/components/dashboard/student-voice/StudentVoiceModule";

export const Route = createFileRoute("/_authenticated/student-voice")({
  head: () => ({
    meta: [
      { title: "Student Voice — TransitionForward" },
      {
        name: "description",
        content:
          "Capture what the student wants their team to know — in their own words.",
      },
    ],
  }),
  component: () => (<RoleGuard path="/student-voice"><StudentVoicePage /></RoleGuard>),
});

type AgeBand = "middle" | "early-high" | "late-high" | "post-secondary";

const AGE_BANDS: { value: AgeBand; label: string }[] = [
  { value: "middle", label: "Middle school" },
  { value: "early-high", label: "Grades 9–10" },
  { value: "late-high", label: "Grades 11–12" },
  { value: "post-secondary", label: "After high school" },
];

function StudentVoicePage() {
  const loadStudents = useServerFn(listStudents);
  const loadResponses = useServerFn(getStudentVoiceResponses);
  const saveResponse = useServerFn(upsertStudentVoiceResponse);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState<string>("");
  const [ageBand, setAgeBand] = useState<AgeBand>("early-high");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents().then(({ students }) => {
      setStudents(students);
      if (students[0]) setStudentId(students[0].id);
      if (!students[0]) setLoading(false);
    });
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadResponses({ data: { studentId } })
      .then(({ responses }) => {
        const map: Record<string, string> = {};
        responses.forEach((r: StudentVoiceResponse) => {
          map[r.prompt_key] = r.response_text;
        });
        setAnswers(map);
        setSavedKeys(new Set(Object.keys(map).filter((k) => map[k]?.trim())));
      })
      .finally(() => setLoading(false));
  }, [studentId, loadResponses]);

  const visiblePrompts = useMemo<StudentVoicePrompt[]>(
    () => STUDENT_VOICE_PROMPTS.filter((p) => p.ageBands.includes(ageBand)),
    [ageBand],
  );

  async function handleSave(key: string) {
    if (!studentId) return;
    const text = (answers[key] ?? "").trim();
    setSavingKey(key);
    try {
      await saveResponse({
        data: {
          studentId,
          promptKey: key,
          responseText: text,
          ageBand,
        },
      });
      setSavedKeys((prev) => {
        const next = new Set(prev);
        if (text) next.add(key);
        else next.delete(key);
        return next;
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSavingKey(null);
    }
  }

  if (students.length === 0 && !loading) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
          <Breadcrumbs trail={[{ label: "Student Voice" }]} />
          <h1 className="mt-6 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Student Voice
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Add a student to your plan first, then come back here to capture
            their voice.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs trail={[{ label: "Student Voice" }]} />

        <div className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <MessageSquareQuote className="h-4 w-4" />
            In their own words
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Student Voice
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            These answers help your team build a plan around the real student.
            Skip what doesn't fit. Come back anytime to update.
          </p>
        </div>

        <div className="mt-8">
          <StudentVoiceModule />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {students.length > 1 && (
            <div>
              <Label htmlFor="student">Student</Label>
              <Select value={studentId} onValueChange={setStudentId}>
                <SelectTrigger id="student" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name ?? ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label htmlFor="age">Reading level</Label>
            <Select
              value={ageBand}
              onValueChange={(v) => setAgeBand(v as AgeBand)}
            >
              <SelectTrigger id="age" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGE_BANDS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="mt-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {visiblePrompts.map((p) => {
              const value = answers[p.key] ?? "";
              const isSaved = savedKeys.has(p.key);
              const isSaving = savingKey === p.key;
              return (
                <section
                  key={p.key}
                  className="rounded-2xl border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-medium">
                        {p.question}
                      </h2>
                      {p.helper && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.helper}
                        </p>
                      )}
                    </div>
                    {isSaved && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                  <Textarea
                    className="mt-3 min-h-[88px]"
                    value={value}
                    maxLength={4000}
                    placeholder="Type here — or leave blank if it doesn't fit."
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [p.key]: e.target.value,
                      }))
                    }
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleSave(p.key)}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        "Save"
                      )}
                    </Button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
