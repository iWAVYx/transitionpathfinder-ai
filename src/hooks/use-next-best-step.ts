import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";

import {
  listStudentWorkflowDrafts,
  type StudentWorkflowDraft,
} from "@/lib/student-workflow/drafts.functions";
import {
  labelForStudentTask,
  returnToForStudentTask,
} from "@/lib/student-workflow/task-keys";

/**
 * Workstream 5 — Student navigation contract.
 *
 * Resolves the single "Next Best Step" for a signed-in student:
 *
 *   1. The most recently saved workflow draft (Resume where you left off).
 *   2. A safe fallback pointing at Student Voice, so the loop
 *      "Dashboard → Next Best Step → Task → Dashboard" never dead-ends.
 *
 * The hook is intentionally read-only and never mutates route history.
 * Callers render whatever CTA fits their surface (card, row, button).
 */

export type NextBestStep = {
  /** Short, plain-language label. */
  label: string;
  /** Where the CTA sends the student. */
  to: string;
  /** True when the step comes from a saved draft (Resume). */
  isResume: boolean;
  /** Underlying draft, when the step comes from `student_workflow_drafts`. */
  draft: StudentWorkflowDraft | null;
};

const FALLBACK: NextBestStep = {
  label: "Open Student Voice",
  to: "/student-voice",
  isResume: false,
  draft: null,
};

export function useNextBestStep(): {
  step: NextBestStep;
  loading: boolean;
  refresh: () => void;
} {
  const loadDrafts = useServerFn(listStudentWorkflowDrafts);
  const [step, setStep] = useState<NextBestStep>(FALLBACK);
  const [loading, setLoading] = useState<boolean>(true);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDrafts({ data: { limit: 1 } })
      .then(({ drafts }) => {
        if (cancelled) return;
        const draft = drafts[0] ?? null;
        if (!draft) {
          setStep(FALLBACK);
          return;
        }
        setStep({
          label: `Resume ${labelForStudentTask(draft.task_key)}`,
          to: draft.return_to ?? returnToForStudentTask(draft.task_key),
          isResume: true,
          draft,
        });
      })
      .catch(() => {
        if (!cancelled) setStep(FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadDrafts, tick]);

  return { step, loading, refresh };
}
