import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Sparkles } from "lucide-react";
import {
  getStudentFriendlyDocumentSummary,
  listStudentFriendlyDocuments,
  type StudentFriendlySummary,
} from "@/lib/student-access.functions";

type Props = { studentId: string };

/**
 * Student-facing IEP summary card. Pulls only the plain-language sections
 * from the latest extraction of an IEP / transition-plan document the student
 * has access to. If extraction isn't ready or nothing is shared, shows a
 * friendly "your team is preparing this" message instead of hiding the entry.
 */
export function MyIepSummaryCard({ studentId }: Props) {
  const listFn = useServerFn(listStudentFriendlyDocuments);
  const summaryFn = useServerFn(getStudentFriendlyDocumentSummary);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<StudentFriendlySummary | null>(null);
  const [docTitle, setDocTitle] = useState<string | null>(null);
  const [hasDocs, setHasDocs] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const list = await listFn({ data: { student_id: studentId } });
        if (cancelled) return;
        const docs = list.documents;
        setHasDocs(docs.length > 0);
        const first = docs[0];
        if (!first) {
          setSummary(null);
          setDocTitle(null);
          return;
        }
        setDocTitle(first.title);
        if (first.summary_ready) {
          const s = await summaryFn({ data: { document_id: first.id } });
          if (cancelled) return;
          setSummary(s.summary);
        } else {
          setSummary(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, listFn, summaryFn]);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl">Your IEP summary</h2>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : !hasDocs ? (
        <p className="text-sm text-muted-foreground">
          Your team hasn't shared your IEP here yet. When they do, you'll see a
          plain-language summary of your strengths, supports, and goals.
        </p>
      ) : !summary ? (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Your team is still preparing this summary.</p>
          {docTitle && <p className="mt-1 text-xs text-muted-foreground">From: {docTitle}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Once it's ready, you'll be able to read about your goals, supports, and what your
            team is working on with you.
          </p>
        </div>
      ) : summary.sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Your team has shared an IEP, but a student-friendly summary hasn't been written yet.
          Ask your case manager to walk through it with you.
        </p>
      ) : (
        <>
          {docTitle && (
            <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> From {docTitle}
            </p>
          )}
          <ul className="space-y-3">
            {summary.sections.slice(0, 6).map((s) => (
              <li key={s.key} className="rounded-xl border bg-background p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground/90">{s.value}</p>
                {!s.accepted && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Draft — your team is still reviewing this.
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            This is a planning summary to help you understand your IEP. It does not replace the
            official IEP from your school team.
          </p>
        </>
      )}
    </section>
  );
}
