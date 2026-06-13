import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Check, MessageSquareQuote } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  getStudentVoiceResponses,
  upsertStudentVoiceResponse,
} from "@/lib/student-voice.functions";
import { MIDDLE_SCHOOL_VOICE_PROMPTS } from "@/lib/bridgeforward.functions";

export const Route = createFileRoute("/_authenticated/bridgeforward/voice")({
  head: () => ({
    meta: [{ title: "Student Voice — Grades 6–8" }],
  }),
  component: () => (
    <RoleGuard path="/bridgeforward">
      <VoicePage />
    </RoleGuard>
  ),
});

function VoicePage() {
  const loadStudents = useServerFn(listStudents);
  const loadResponses = useServerFn(getStudentVoiceResponses);
  const saveResponse = useServerFn(upsertStudentVoiceResponse);

  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents().then(({ students }) => {
      setStudents(students);
      if (students[0]) setStudentId(students[0].id);
      else setLoading(false);
    });
  }, [loadStudents]);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    loadResponses({ data: { studentId } })
      .then(({ responses }) => {
        const map: Record<string, string> = {};
        responses.forEach((r) => {
          map[r.prompt_key] = r.response_text;
        });
        setAnswers(map);
        setSavedKeys(new Set(Object.keys(map).filter((k) => map[k]?.trim())));
      })
      .finally(() => setLoading(false));
  }, [studentId, loadResponses]);

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
          ageBand: "middle_school",
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
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          <Breadcrumbs
            trail={[
              { label: "BridgeForward", to: "/bridgeforward" },
              { label: "Student Voice" },
            ]}
          />
          <p className="mt-6 text-sm text-muted-foreground">
            Add a student first to start capturing their voice.
          </p>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10">
        <Breadcrumbs
          trail={[
            { label: "BridgeForward", to: "/bridgeforward" },
            { label: "Student Voice" },
          ]}
        />

        <div className="mt-6 rounded-3xl border bg-gradient-hero p-6 shadow-soft sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <MessageSquareQuote className="h-4 w-4" />
            In their own words
          </div>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Student Voice (Grades 6–8)
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Short prompts in plain language. Answer what fits — leave the rest.
          </p>
        </div>

        {students.length > 1 && (
          <div className="mt-6 max-w-xs">
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

        {loading ? (
          <div className="mt-10 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {MIDDLE_SCHOOL_VOICE_PROMPTS.map((p) => {
              const value = answers[p.key] ?? "";
              const isSaved = savedKeys.has(p.key);
              const isSaving = savingKey === p.key;
              return (
                <section
                  key={p.key}
                  className="rounded-2xl border bg-card p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-display text-lg font-medium">
                      {p.question}
                    </h2>
                    {isSaved && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    )}
                  </div>
                  <Textarea
                    className="mt-3 min-h-[80px]"
                    value={value}
                    maxLength={4000}
                    placeholder="Type here — or skip."
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
