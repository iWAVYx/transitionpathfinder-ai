import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProgressRow = {
  id: string;
  student_id: string;
  pathway_id: string;
  step_index: number;
  completed: boolean;
  note: string | null;
  updated_at: string;
};

export const listProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid(), pathway_id: z.string().min(1).max(80) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("pathway_progress")
      .select("id, student_id, pathway_id, step_index, completed, note, updated_at")
      .eq("student_id", data.student_id)
      .eq("pathway_id", data.pathway_id);
    if (error) {
      console.error("listProgress failed", error);
      return { progress: [] as ProgressRow[] };
    }
    return { progress: (rows ?? []) as ProgressRow[] };
  });

export const upsertProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        pathway_id: z.string().min(1).max(80),
        step_index: z.number().int().min(0).max(200),
        completed: z.boolean(),
        note: z.string().trim().max(1000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("pathway_progress")
      .select("id")
      .eq("student_id", data.student_id)
      .eq("pathway_id", data.pathway_id)
      .eq("step_index", data.step_index)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("pathway_progress")
        .update({
          completed: data.completed,
          note: data.note ?? null,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw new Error("Could not save progress.");
    } else {
      const { error } = await supabase.from("pathway_progress").insert({
        student_id: data.student_id,
        pathway_id: data.pathway_id,
        step_index: data.step_index,
        completed: data.completed,
        note: data.note ?? null,
        updated_by: userId,
      });
      if (error) throw new Error("Could not save progress.");
    }
    return { ok: true };
  });
