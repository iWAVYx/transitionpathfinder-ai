import { Link } from "@tanstack/react-router";
import { MessageSquareQuote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {useStudentVoiceAnswers} from "@/hooks/use-student-voice-answers";
import {studentVoiceQuestion} from "@/lib/student-voice-prompts";
import { TrustNote } from "@/components/site/TrustNote";

type Props = { studentId: string };

export function StudentVoicePanel({ studentId }: Props) {
  const {responses,loading,error,canEdit,refresh}=useStudentVoiceAnswers(studentId);
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
        {!loading&&!error&&<Button asChild size="sm" variant="outline">
          <Link to="/student-voice" search={{student:studentId}}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {canEdit?(answered.length === 0 ? "Add Answers" : "Edit"):"View Answers"}
          </Link>
        </Button>}
      </div>

      {error ? <div role="alert" className="mt-4 text-sm">{error} <Button size="sm" variant="outline" onClick={refresh}>Refresh Saved Answers</Button></div> : loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : answered.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No answers yet. Add the student's voice so it shows up in the pathway
          report and meeting prep.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {answered.slice(0, 3).map((r) => {

            return (
              <li
                key={r.id}
                className="rounded-2xl border bg-background p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {studentVoiceQuestion(r.prompt_key)}
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
              <Link to="/student-voice" search={{student:studentId}} className="text-primary hover:underline">
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
