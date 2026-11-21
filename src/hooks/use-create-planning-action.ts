import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createStudentActionItem, type StudentActionItem } from "@/lib/action-items.functions";
import { usePlanningLifetime } from "./use-planning-lifetime";
export type PlanningActionDraft = {
  student_id: string;
  title: string;
  description?: string;
  category?: "family" | "educator" | "student" | "school" | "team";
  priority?: "low" | "medium" | "high";
  due_date?: string;
  related_goal_area?: string;
  pathway_report_id?: string;
};
const unconfirmed =
  "We couldn't confirm this action item. Check saved action items, then refresh this page before trying again.";
/** No retry: an uncertain response can follow a committed insert. */
export function useCreatePlanningAction(contextKey?: string) {
  const scope = usePlanningLifetime(contextKey),
    create = useServerFn(createStudentActionItem);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setPending(false);
  }, [scope.viewerId, contextKey, scope.available]);
  async function run(draft: PlanningActionDraft): Promise<StudentActionItem | null> {
    draft = {
      ...draft,
      title: draft.title.trim(),
      description: draft.description?.trim(),
      related_goal_area: draft.related_goal_area?.trim(),
    };
    if (!scope.begin()) return null;
    setPending(true);
    try {
      const request_id = crypto.randomUUID(),
        payload = { ...draft, request_id, expected_viewer_id: scope.viewerId };
      const reply = await create({ data: payload });
      if (!scope.current()) return null;
      const row = reply?.item;
      if (
        !row ||
        row.id !== request_id ||
        row.student_id !== draft.student_id ||
        row.created_by_user_id !== scope.viewerId ||
        row.status !== "not_started" ||
        row.title !== draft.title ||
        row.category !== (draft.category ?? "family") ||
        row.priority !== (draft.priority ?? "medium") ||
        Object.entries(draft).some(
          ([key, value]) =>
            value !== undefined && (row as unknown as Record<string, unknown>)[key] !== value,
        )
      )
        throw Error(unconfirmed);
      return row;
    } catch {
      if (!scope.current()) return null;
      scope.markUncertain();
      throw Error(unconfirmed);
    } finally {
      scope.finish();
      if (scope.current()) setPending(false);
    }
  }
  return {
    run,
    available: scope.available,
    pending,
    uncertain: scope.uncertain,
    viewerId: scope.viewerId,
    current: scope.current,
  };
}
