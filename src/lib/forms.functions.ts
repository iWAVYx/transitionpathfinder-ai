import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FormField = {
  id: string;
  type: "text" | "textarea" | "single-select" | "multi-select" | "checklist" | "scale";
  label: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
};

export type FormSchema = { fields: FormField[] };

export type FormTemplate = {
  slug: string;
  title: string;
  description: string | null;
  audience: "family" | "student" | "educator";
  category: string;
  schema: FormSchema;
  created_at: string;
};

export type FormResponse = {
  id: string;
  student_id: string;
  template_slug: string;
  respondent_id: string;
  respondent_role: string;
  answers: any;
  status: "draft" | "completed";
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("form_templates")
      .select("*")
      .order("title", { ascending: true });
    if (error) {
      console.error("listTemplates failed", error);
      return { templates: [] as FormTemplate[] };
    }
    return { templates: (data ?? []) as unknown as FormTemplate[] };
  });

export const getTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("form_templates")
      .select("*")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error || !row) throw new Error("Form not found.");
    return row as unknown as FormTemplate;
  });

export const listResponses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid().optional(),
        template_slug: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase.from("form_responses").select("*").order("updated_at", { ascending: false });
    if (data.student_id) q = q.eq("student_id", data.student_id);
    if (data.template_slug) q = q.eq("template_slug", data.template_slug);
    const { data: rows, error } = await q;
    if (error) return { responses: [] as FormResponse[] };
    return { responses: (rows ?? []) as FormResponse[] };
  });

export const saveResponse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        student_id: z.string().uuid(),
        template_slug: z.string().min(1).max(120),
        respondent_role: z.enum(["family", "student", "educator"]).default("family"),
        answers: z.record(z.string(), z.unknown()),
        status: z.enum(["draft", "completed"]).default("draft"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payload = {
      student_id: data.student_id,
      template_slug: data.template_slug,
      respondent_id: userId,
      respondent_role: data.respondent_role,
      answers: data.answers,
      status: data.status,
      completed_at: data.status === "completed" ? new Date().toISOString() : null,
    };
    let result;
    if (data.id) {
      result = await supabase.from("form_responses").update(payload as any).eq("id", data.id).select("*").single();
    } else {
      result = await supabase.from("form_responses").insert(payload as any).select("*").single();
    }
    if (result.error || !result.data) {
      console.error("saveResponse failed", result.error);
      throw new Error("Could not save form.");
    }
    if (data.status === "completed") {
      // Get the template title for the feed event
      const { data: tpl } = await supabase
        .from("form_templates")
        .select("title")
        .eq("slug", data.template_slug)
        .maybeSingle();
      await supabase.from("feed_events").insert({
        student_id: data.student_id,
        actor_id: userId,
        kind: "form.completed",
        title: `Form completed: ${tpl?.title ?? data.template_slug}`,
        ref_table: "form_responses",
        ref_id: result.data.id,
        payload: { template_slug: data.template_slug },
      });
    }
    return result.data as FormResponse;
  });
