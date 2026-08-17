import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Workstream 5 — Student navigation contract.
 *
 * `student_workflow_drafts` stores in-progress work keyed by
 * (user_id, task_key). All access is scoped to `auth.uid()` via RLS;
 * these server functions are the only supported client entry point.
 */

export type DraftPayload =
  | null
  | string
  | number
  | boolean
  | { [key: string]: DraftPayload }
  | DraftPayload[];

export type StudentWorkflowDraft = {
  id: string;
  task_key: string;
  payload: DraftPayload;
  return_to: string | null;
  updated_at: string;
};

const draftPayloadSchema: z.ZodType<DraftPayload> = z.lazy(() =>
  z.union([
    z.null(),
    z.string(),
    z.number(),
    z.boolean(),
    z.array(draftPayloadSchema),
    z.record(z.string(), draftPayloadSchema),
  ]),
);

const TASK_KEY = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9_.:-]+$/, "task_key must be lowercase slug");

export const getStudentWorkflowDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ taskKey: TASK_KEY }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("student_workflow_drafts")
      .select("id,task_key,payload,return_to,updated_at")
      .eq("user_id", userId)
      .eq("task_key", data.taskKey)
      .maybeSingle();
    if (error) {
      console.error("getStudentWorkflowDraft failed", error);
      return { draft: null as StudentWorkflowDraft | null };
    }
    return { draft: (row ?? null) as unknown as StudentWorkflowDraft | null };
  });

export const listStudentWorkflowDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("student_workflow_drafts")
      .select("id,task_key,payload,return_to,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(data.limit ?? 5);
    if (error) {
      console.error("listStudentWorkflowDrafts failed", error);
      return { drafts: [] as StudentWorkflowDraft[] };
    }
    return { drafts: (rows ?? []) as unknown as StudentWorkflowDraft[] };
  });

export const saveStudentWorkflowDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        taskKey: TASK_KEY,
        payload: draftPayloadSchema,
        returnTo: z.string().max(512).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("student_workflow_drafts")
      .upsert(
        {
          user_id: userId,
          task_key: data.taskKey,
          payload: (data.payload ?? {}) as never,
          return_to: data.returnTo ?? null,
        },
        { onConflict: "user_id,task_key" },
      );
    if (error) {
      console.error("saveStudentWorkflowDraft failed", error);
      throw new Error("Could not save draft");
    }
    return { ok: true };
  });

export const clearStudentWorkflowDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ taskKey: TASK_KEY }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("student_workflow_drafts")
      .delete()
      .eq("user_id", userId)
      .eq("task_key", data.taskKey);
    if (error) {
      console.error("clearStudentWorkflowDraft failed", error);
      throw new Error("Could not clear draft");
    }
    return { ok: true };
  });
