import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageSquareQuote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getStudentVoiceResponses,
  type StudentVoiceResponse,
} from "@/lib/student-voice.functions";
import { STUDENT_VOICE_PROMPTS } from "@/lib/student-voice-prompts";
import { TrustNote } from "@/components/site/TrustNote";

type Props = { studentId: string };

export function StudentVoicePanel({ studentId }: Props) {
  const load = useServerFn(getStudentVoiceResponses);
  const [responses, setResponses] = useState<StudentVoiceResponse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    load({ data: { studentId } })
      .then(({ responses }) => {
        if (!cancelled) setResponses(responses);
      })
      .catch(() => {
        if (!cancelled) setResponses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, load]);

  const answered = (responses ?? []).filter((r) => r.response_text?.trim());

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageSquareQuote className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-display text-xl font-medium">Student Voice</h2>
            <p className="text-sm text-muted-foreground">
              What the student wants their team to know — in their own words.
            </p>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/student-voice">
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {answered.length === 0 ? "Add answers" : "Edit"}
          </Link>
        </Button>
      </div>

      {responses === null ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : answered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No answers yet. Add the student's voice so it shows up in the pathway
          report and meeting prep.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {answered.slice(0, 3).map((r) => {
            const prompt = STUDENT_VOICE_PROMPTS.find((p) => p.key === r.prompt_key);
            return (
              <li
                key={r.id}
                className="rounded-2xl border bg-background p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {prompt?.question ?? r.prompt_key}
                </p>
                <p className="mt-1 text-sm italic text-foreground">
                  "{r.response_text}"
                </p>
              </li>
            );
          })}
          {answered.length > 3 && (
            <li className="text-xs text-muted-foreground">
              +{answered.length - 3} more —{" "}
              <Link to="/student-voice" className="text-primary hover:underline">
                see all
              </Link>
            </li>
          )}
        </ul>
      )}
      <TrustNote variant="student-voice" display="inline" className="mt-4" />
    </section>
  );
}
