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
  visibility: string | null;
  school_year: string | null;
  meeting_date: string | null;
  effective_date: string | null;
  review_date: string | null;
  consent_acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentPermissionRow = {
  id: string;
  document_id: string;
  student_id: string;
  user_id: string | null;
  role_type: string | null;
  permission_level: "none" | "view_summary" | "view_document" | "edit_metadata" | "manage";
  granted_by: string;
  notes: string | null;
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

    // Enqueue an AI document summary job (best-effort; don't fail upload if it errors).
    const { error: jobErr } = await supabase.from("ai_jobs").insert({
      student_id: data.student_id,
      triggered_by_user_id: userId,
      job_type: "document_summary",
      status: "queued",
      input_source: {
        document_id: row.id,
        title: data.title,
        doc_type: data.doc_type,
        storage_path: data.storage_path,
      },
    });
    if (jobErr) console.error("ai_jobs enqueue failed", jobErr);

    // Audit log (best-effort)
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.upload",
      entity_type: "document",
      entity_id: row.id,
      student_id: data.student_id,
      metadata: { title: data.title, doc_type: data.doc_type },
    });

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
    const { supabase, userId } = context;

    // Look up the document. RLS on `documents` returns no row if the caller
    // has lost access to the student — we use that as the revoked-access
    // signal and raise an alert before refusing.
    const { data: row, error } = await supabase
      .from("documents")
      .select("id, storage_path, student_id, doc_type, title")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !row) {
      // Confirm document exists (admin-elevated) so we only alert on revoked
      // access, not on truly missing/invalid ids.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: probe } = await supabaseAdmin
        .from("documents")
        .select("id, student_id, doc_type")
        .eq("id", data.id)
        .maybeSingle();
      if (probe) {
        const { data: actor } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle();
        await supabaseAdmin.from("iep_access_alerts").insert({
          actor_id: userId,
          actor_email: actor?.email ?? null,
          student_id: probe.student_id,
          document_id: probe.id,
          reason: "revoked_access_signed_url_attempt",
          metadata: { doc_type: probe.doc_type, action: "mint" },
        });
        await supabaseAdmin.from("audit_log").insert({
          actor_id: userId,
          actor_email: actor?.email ?? null,
          action: "document.signed_url.denied",
          entity_type: "document",
          entity_id: probe.id,
          student_id: probe.student_id,
          metadata: { reason: "revoked_access", doc_type: probe.doc_type },
        });
        console.warn("[iep-alert] revoked-access signed URL attempt", {
          actor: userId,
          student: probe.student_id,
          document: probe.id,
        });
      }
      throw new Error("Document not found.");
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(row.storage_path, 300);
    if (signErr || !signed) throw new Error("Could not generate link.");

    // Resolve the caller's effective role on this student for the audit row.
    let role: "owner" | "editor" | "viewer" | "admin" | "other" = "other";
    const [{ data: ownerRow }, { data: collabRow }, { data: adminRow }] = await Promise.all([
      supabase.from("students").select("id").eq("id", row.student_id).eq("owner_id", userId).maybeSingle(),
      supabase
        .from("student_collaborators")
        .select("role")
        .eq("student_id", row.student_id)
        .eq("user_id", userId)
        .eq("status", "accepted")
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    ]);
    if (ownerRow) role = "owner";
    else if (collabRow?.role === "editor") role = "editor";
    else if (collabRow?.role === "viewer") role = "viewer";
    else if (adminRow) role = "admin";

    // Audit (best-effort) — actor_id = auth.uid() satisfies RLS insert policy.
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.signed_url.mint",
      entity_type: "document",
      entity_id: row.id,
      student_id: row.student_id,
      metadata: {
        doc_type: row.doc_type,
        title: row.title,
        role,
        ttl_seconds: 300,
        storage_path: row.storage_path,
      },
    });

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
