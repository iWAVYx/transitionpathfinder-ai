import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudentActionItem = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to_user_id: string | null;
  created_by_user_id: string;
  related_goal_area: string | null;
  pathway_report_id: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ["family", "educator", "student", "school", "team"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;
const STATUSES = ["not_started", "in_progress", "completed", "blocked"] as const;

export const listStudentActionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("action_items")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listStudentActionItems", error);
      return { items: [] as StudentActionItem[] };
    }
    return { items: (rows ?? []) as StudentActionItem[] };
  });

export const createStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        category: z.enum(CATEGORIES).default("family"),
        priority: z.enum(PRIORITIES).default("medium"),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        related_goal_area: z.string().trim().max(80).optional(),
        pathway_report_id: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("action_items")
      .insert({
        student_id: data.student_id,
        title: data.title,
        description: data.description ?? null,
        category: data.category,
        priority: data.priority,
        due_date: data.due_date ?? null,
        related_goal_area: data.related_goal_area ?? null,
        pathway_report_id: data.pathway_report_id ?? null,
        created_by_user_id: userId,
        status: "not_started",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: row as StudentActionItem };
  });

export const updateStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(STATUSES).optional(),
        priority: z.enum(PRIORITIES).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: {
      status?: string;
      priority?: string;
      due_date?: string | null;
      title?: string;
      description?: string | null;
    } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.due_date !== undefined) patch.due_date = data.due_date;
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    const { error } = await supabase.from("action_items").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);

    // When an action item is completed, ripple into the activity feed and
    // flag any linked Pathway Report as stale so users see "refresh" prompts.
    if (data.status === "completed") {
      const { data: row } = await supabase
        .from("action_items")
        .select("id, student_id, title, pathway_report_id")
        .eq("id", data.id)
        .maybeSingle();
      if (row) {
        await supabase.from("feed_events").insert({
          student_id: (row as { student_id: string }).student_id,
          actor_id: userId,
          kind: "action_item.completed",
          title: `Action completed: ${(row as { title: string }).title}`,
          body: null,
          ref_table: "action_items",
          ref_id: data.id,
        });
        const reportId = (row as { pathway_report_id: string | null }).pathway_report_id;
        if (reportId) {
          await supabase
            .from("pathway_reports")
            .update({ inputs_stale_at: new Date().toISOString() })
            .eq("id", reportId);
        }
      }
    }
    return { ok: true };
  });

export const deleteStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("action_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
