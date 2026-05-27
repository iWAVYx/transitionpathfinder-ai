import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type DocumentRow = {
  id: string;
  student_id: string;
  uploaded_by: string;
  doc_type: string;
  title: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  parsed_summary: Json | null;
  created_at: string;
  updated_at: string;
};

export const listDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("documents")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listDocuments failed", error);
      return { documents: [] as DocumentRow[] };
    }
    return { documents: (rows ?? []) as DocumentRow[] };
  });

export const registerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      student_id: z.string().uuid(),
      title: z.string().trim().min(1).max(200),
      storage_path: z.string().trim().min(1).max(500),
      mime_type: z.string().trim().max(120).optional(),
      size_bytes: z.number().int().nonnegative().optional(),
      doc_type: z.enum(["iep", "evaluation", "transition-plan", "other"]).default("iep"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("documents")
      .insert({
        student_id: data.student_id,
        uploaded_by: userId,
        title: data.title,
        storage_path: data.storage_path,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes ?? null,
        doc_type: data.doc_type,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("registerDocument failed", error);
      throw new Error("Could not save document record.");
    }
    return row as DocumentRow;
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (row?.storage_path) {
      await supabase.storage.from("student-documents").remove([row.storage_path]);
    }
    const { error } = await supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete document.");
    return { ok: true };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("documents")
      .select("storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Document not found.");
    const { data: signed, error: signErr } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(row.storage_path, 300);
    if (signErr || !signed) throw new Error("Could not generate link.");
    return { url: signed.signedUrl };
  });

/* ---------- AI: extract goals from IEP text ---------- */

const GoalsExtractSchema = z.object({
  goals: z
    .array(
      z.object({
        title: z.string().min(3).max(180),
        category: z
          .enum([
            "academic",
            "life-skills",
            "career",
            "college",
            "transportation",
            "communication",
            "general",
          ])
          .default("general"),
        description: z.string().max(1200).default(""),
        measurable_criteria: z.string().max(600).default(""),
      }),
    )
    .max(20)
    .default([]),
});

export type ExtractedGoal = z.infer<typeof GoalsExtractSchema>["goals"][number];

export const extractGoalsFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      text: z.string().trim().min(40).max(120_000),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `You are reading a U.S. Individualized Education Program (IEP) or transition plan. Extract the post-secondary / transition GOALS as a clean list a family can act on.

Rules:
- Each goal: a short plain-language "title" (under 90 chars), an optional one-paragraph "description" in family-friendly language, and "measurable_criteria" if the IEP states how progress is measured.
- "category" must be one of: academic, life-skills, career, college, transportation, communication, general.
- DO NOT invent goals. Only include goals that are actually stated or strongly implied.
- Strip last names, school names, dates of birth, and other identifiers from the text you produce.
- Return at most 12 goals, most important first.

IEP TEXT:
"""
${data.text.slice(0, 100_000)}
"""`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: GoalsExtractSchema }),
        prompt,
      });
      return { goals: (experimental_output as { goals: ExtractedGoal[] }).goals };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("extractGoalsFromText failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't read goals out of this document.");
    }
  });

export const saveExtractedGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      student_id: z.string().uuid(),
      goals: z
        .array(
          z.object({
            title: z.string().trim().min(1).max(200),
            category: z.enum([
              "academic",
              "life-skills",
              "career",
              "college",
              "transportation",
              "communication",
              "general",
            ]),
            description: z.string().max(2000).optional(),
            measurable_criteria: z.string().max(1000).optional(),
          }),
        )
        .min(1)
        .max(20),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const rows = data.goals.map((g) => ({
      student_id: data.student_id,
      created_by: userId,
      title: g.title,
      description: g.description || null,
      measurable_criteria: g.measurable_criteria || null,
      category: g.category,
      status: "not-started",
    }));
    const { data: inserted, error } = await supabase.from("goals").insert(rows).select("id");
    if (error) {
      console.error("saveExtractedGoals failed", error);
      throw new Error("Could not save goals.");
    }
    return { inserted: inserted?.length ?? 0 };
  });
