import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertAuthorized } from "./authz";

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
  permission_level: "none" | "view_summary" | "view_student_friendly_summary" | "view_document" | "edit_metadata" | "manage";
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
      doc_type: z.enum([
        "iep",
        "current-iep",
        "previous-iep",
        "evaluation",
        "transition-plan",
        "progress-report",
        "meeting-notes",
        "other",
      ]).default("current-iep"),
      visibility: z.enum(["private", "team", "family", "student"]).default("team"),
      school_year: z.string().trim().max(20).optional(),
      meeting_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      effective_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      annual_review_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      reevaluation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      notes: z.string().trim().max(2000).optional(),
      source: z.string().trim().max(200).optional(),
      consent_acknowledged: z.boolean().default(false),
      content_hash: z.string().trim().regex(/^[a-f0-9]{64}$/i).optional(),
    }).parse(i),
  )

  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Hard partner deny — RLS would block this anyway, but we want a clean error.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleList = (roles ?? []).map((r) => r.role as string);
    const isPartnerOnly =
      roleList.includes("partner") &&
      !roleList.some((r) =>
        ["student","parent","guardian","educator","teacher","case_manager","school_admin","district_admin","admin"].includes(r),
      );
    if (isPartnerOnly) {
      throw new Error("Partner accounts cannot upload documents to student records.");
    }

    // Pick the most specific uploader role for audit metadata.
    const priority = ["student","parent","guardian","case_manager","educator","teacher","school_admin","district_admin","admin"];
    const uploaderRole = priority.find((r) => roleList.includes(r)) ?? roleList[0] ?? null;

    // Find an active org membership to stamp on the doc (best-effort).
    const { data: org } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    // Sensitive document types require an explicit consent acknowledgment.
    const sensitive = ["iep","current-iep","previous-iep","evaluation","transition-plan"];
    if (sensitive.includes(data.doc_type) && !data.consent_acknowledged) {
      throw new Error("Please confirm you are authorized to upload this document before continuing.");
    }

    // Slice C4 — pipeline breadcrumbs share a correlation id across every
    // stage row emitted for this upload attempt (best-effort, admin-only RLS
    // means we route through supabaseAdmin inside the helper).
    const { recordPipelineRun, newCorrelationId } = await import("./document-pipeline.server");
    const correlationId = newCorrelationId();
    const uploadStartedAt = new Date().toISOString();

    // Slice C3 — short-circuit duplicate uploads by content hash within a student.
    // Index: documents_student_content_hash_idx (student_id, content_hash) WHERE content_hash IS NOT NULL.
    // If the caller provided a real SHA-256 and we already have a live (non-deleted)
    // document for this student with the same bytes, return that row instead of
    // creating a second record + a second AI summary job.
    if (data.content_hash) {
      const { data: existing } = await supabase
        .from("documents")
        .select("*")
        .eq("student_id", data.student_id)
        .eq("content_hash", data.content_hash.toLowerCase())
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing) {
        await supabase.from("document_access_log").insert({
          document_id: existing.id,
          student_id: data.student_id,
          actor_id: userId,
          actor_role: uploaderRole,
          action: "upload_dedupe_hit",
          metadata: { content_hash: data.content_hash.toLowerCase(), incoming_title: data.title },
        });
        // Breadcrumb: upload skipped because bytes already exist for this student.
        await recordPipelineRun({
          document_id: existing.id,
          student_id: data.student_id,
          correlation_id: correlationId,
          stage: "upload",
          status: "skipped",
          started_at: uploadStartedAt,
          payload: { reason: "dedupe_hit", incoming_title: data.title, actor_role: uploaderRole },
        });
        return existing as DocumentRow;
      }
    }


    const { data: row, error } = await supabase
      .from("documents")
      .insert({
        student_id: data.student_id,
        uploaded_by: userId,
        uploaded_by_role: uploaderRole,
        organization_id: org?.organization_id ?? null,
        title: data.title,
        storage_path: data.storage_path,
        mime_type: data.mime_type ?? null,
        size_bytes: data.size_bytes ?? null,
        doc_type: data.doc_type,
        visibility: data.visibility,
        review_status: "pending_review",
        consent_required: sensitive.includes(data.doc_type),
        school_year: data.school_year ?? null,
        meeting_date: data.meeting_date ?? null,
        effective_date: data.effective_date ?? null,
        review_date: data.review_date ?? null,
        annual_review_date: data.annual_review_date ?? null,
        reevaluation_date: data.reevaluation_date ?? null,
        notes: data.notes ?? null,
        source: data.source ?? null,
        consent_acknowledged_at: data.consent_acknowledged ? new Date().toISOString() : null,
        content_hash: data.content_hash ? data.content_hash.toLowerCase() : null,
      })
      .select("*")
      .single();
    if (error || !row) {
      console.error("registerDocument failed", error);
      throw new Error("Could not save document record.");
    }

    // Breadcrumb: upload row created.
    const uploadFinishedAt = new Date().toISOString();
    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "upload",
      status: "succeeded",
      started_at: uploadStartedAt,
      finished_at: uploadFinishedAt,
      latency_ms: Date.parse(uploadFinishedAt) - Date.parse(uploadStartedAt),
      payload: {
        doc_type: data.doc_type,
        visibility: data.visibility,
        actor_role: uploaderRole,
        size_bytes: data.size_bytes ?? null,
        mime_type: data.mime_type ?? null,
      },
    });

    // Breadcrumb: hash stage — succeeded when caller supplied a SHA-256,
    // skipped when they didn't (C3 backfill placeholder still lives on the row).
    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "hash",
      status: data.content_hash ? "succeeded" : "skipped",
      payload: data.content_hash
        ? { algorithm: "sha256", source: "client" }
        : { reason: "no_hash_provided" },
    });

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

    // Breadcrumb: extract stage is pending until the AI worker picks it up.
    // On enqueue failure, mark it failed so operators can spot the drop.
    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "extract",
      status: jobErr ? "failed" : "pending",
      error_code: jobErr ? "ai_jobs_enqueue_failed" : null,
      error_message: jobErr?.message ?? null,
      payload: { job_type: "document_summary" },
    });

    // Audit log (best-effort)
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.upload",
      entity_type: "document",
      entity_id: row.id,
      student_id: data.student_id,
      metadata: {
        title: data.title,
        doc_type: data.doc_type,
        visibility: data.visibility,
        consent: data.consent_acknowledged,
        uploader_role: uploaderRole,
        organization_id: org?.organization_id ?? null,
      },
    });

    // Structured document access log
    await supabase.from("document_access_log").insert({
      document_id: row.id,
      student_id: data.student_id,
      actor_id: userId,
      actor_role: uploaderRole,
      action: "upload",
      metadata: { doc_type: data.doc_type, visibility: data.visibility },
    });

    return row as DocumentRow;
  });

/**
 * Soft-archive a document. The file is retained but hidden from active views.
 * Editors can restore via the same fn with `restore: true`. Hard delete is
 * reserved to platform admins via `hardDeleteDocument`.
 */
export const archiveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    reason: z.string().trim().max(500).optional(),
    restore: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error: readErr } = await supabase
      .from("documents")
      .select("id, student_id")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr || !row) throw new Error("Document not found or access denied.");

    await assertAuthorized(
      { supabase, userId, action: "edit", resourceType: "student", resourceId: row.student_id },
      data.restore
        ? "You don't have permission to restore this document."
        : "You don't have permission to archive this document.",
    );

    const patch = data.restore
      ? { archived_at: null, archived_by: null, archive_reason: null }
      : { archived_at: new Date().toISOString(), archived_by: userId, archive_reason: data.reason ?? null };

    const { error } = await supabase.from("documents").update(patch).eq("id", data.id);
    if (error) throw new Error("Could not update document.");

    await supabase.from("document_access_log").insert({
      document_id: row.id,
      student_id: row.student_id,
      actor_id: userId,
      action: data.restore ? "restore" : "archive",
      reason: data.reason ?? null,
    });

    return { ok: true };
  });

/**
 * Hard delete — restricted to platform admins, requires a reason, fully audited.
 * Removes the storage object and the DB row.
 */
export const hardDeleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    reason: z.string().trim().min(8, "Reason must be at least 8 characters.").max(500),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Only platform admins may permanently delete documents.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("id, student_id, storage_path")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found.");

    if (doc.storage_path) {
      await supabaseAdmin.storage.from("student-documents").remove([doc.storage_path]);
    }
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete document.");

    await supabaseAdmin.from("document_access_log").insert({
      document_id: doc.id,
      student_id: doc.student_id,
      actor_id: userId,
      action: "hard_delete",
      reason: data.reason,
    });
    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId,
      action: "document.hard_delete",
      entity_type: "document",
      entity_id: doc.id,
      student_id: doc.student_id,
      metadata: { reason: data.reason },
    });

    return { ok: true };
  });

/**
 * Back-compat shim: existing UI call sites use `deleteDocument`.
 * Soft-archive instead of hard-delete by default.
 */
export const deleteDocument = archiveDocument;

/**
 * Server-side guard for the upload flow: confirm the caller has edit access
 * on the student before they begin uploading bytes into storage. This gives
 * a clean error UX rather than a raw storage 403 if the relationship was
 * revoked between page load and submit.
 */
export const assertCanUploadForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("can_edit_student", {
      _user_id: userId,
      _student_id: data.student_id,
    });
    const { data: partner } = await supabase.rpc("is_partner_only", { _user_id: userId });
    if (partner) {
      throw new Error("Partner accounts cannot upload documents to student records.");
    }
    if (!ok) {
      throw new Error("You don't have permission to upload documents for this student.");
    }
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

    await assertAuthorized(
      { supabase, userId, action: "view", resourceType: "document", resourceId: row.id },
      "You don't have permission to view this document.",
    );

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

    await supabase.from("document_access_log").insert({
      document_id: row.id,
      student_id: row.student_id,
      actor_id: userId,
      actor_role: role,
      action: "download",
      metadata: { doc_type: row.doc_type, ttl_seconds: 300 },
    });

    return { url: signed.signedUrl };
  });

/**
 * Platform-admin override: create a short-lived (15 min) grant that allows
 * the admin to read a single student document. RLS reads `admin_doc_access_grants`
 * to permit the row + storage object. Every override is logged.
 */
export const requestAdminDocAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    document_id: z.string().uuid(),
    reason: z.string().trim().min(8, "Please describe why this access is needed.").max(500),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Only platform admins may request override access.");

    const { error: grantErr } = await supabase.from("admin_doc_access_grants").insert({
      actor_id: userId,
      document_id: data.document_id,
      reason: data.reason,
    });
    if (grantErr) throw new Error("Could not record override grant.");

    // Now that the grant exists, RLS lets us load metadata + mint a URL.
    const { data: doc } = await supabase
      .from("documents")
      .select("id, student_id, storage_path, doc_type, title")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found.");

    const { data: signed, error: signErr } = await supabase.storage
      .from("student-documents")
      .createSignedUrl(doc.storage_path, 300);
    if (signErr || !signed) throw new Error("Could not generate link.");

    await supabase.from("document_access_log").insert({
      document_id: doc.id,
      student_id: doc.student_id,
      actor_id: userId,
      actor_role: "platform_admin",
      action: "admin_override",
      reason: data.reason,
      metadata: { doc_type: doc.doc_type, ttl_seconds: 300 },
    });
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.admin_override",
      entity_type: "document",
      entity_id: doc.id,
      student_id: doc.student_id,
      metadata: { reason: data.reason, doc_type: doc.doc_type, title: doc.title },
    });

    return { url: signed.signedUrl, expiresInSeconds: 300 };
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

/* ---------- DOCUMENT PERMISSIONS ---------- */

const PERMISSION_LEVELS = ["none", "view_summary", "view_document", "edit_metadata", "manage"] as const;
const ROLE_TYPES = ["family", "student", "educator", "school_admin", "district_admin", "partner"] as const;

export const listDocumentPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ document_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("document_permissions")
      .select("*")
      .eq("document_id", data.document_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listDocumentPermissions failed", error);
      return { permissions: [] as DocumentPermissionRow[] };
    }
    return { permissions: (rows ?? []) as DocumentPermissionRow[] };
  });

export const grantDocumentPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      document_id: z.string().uuid(),
      user_email: z.string().trim().email().max(254).optional(),
      role_type: z.enum(ROLE_TYPES).optional(),
      permission_level: z.enum(PERMISSION_LEVELS).default("view_document"),
      notes: z.string().trim().max(500).optional(),
    })
      .refine((v) => !!v.user_email !== !!v.role_type, {
        message: "Provide exactly one of user_email or role_type.",
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve the document → student_id under RLS (caller must have access).
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, student_id")
      .eq("id", data.document_id)
      .maybeSingle();
    if (docErr || !doc) throw new Error("Document not found or access denied.");

    let resolved_user_id: string | null = null;
    if (data.user_email) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", data.user_email.toLowerCase())
        .maybeSingle();
      if (!prof?.id) {
        throw new Error("No TransitionForward account found for that email yet.");
      }
      resolved_user_id = prof.id;
    }

    const { data: row, error } = await supabase
      .from("document_permissions")
      .upsert(
        {
          document_id: doc.id,
          student_id: doc.student_id,
          user_id: resolved_user_id,
          role_type: data.role_type ?? null,
          permission_level: data.permission_level,
          granted_by: userId,
          notes: data.notes ?? null,
        },
        {
          onConflict: resolved_user_id ? "document_id,user_id" : "document_id,role_type",
        },
      )
      .select("*")
      .single();
    if (error || !row) {
      console.error("grantDocumentPermission failed", error);
      throw new Error("Could not save this access grant.");
    }

    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.permission.grant",
      entity_type: "document",
      entity_id: doc.id,
      student_id: doc.student_id,
      metadata: {
        permission_level: data.permission_level,
        target_user_id: resolved_user_id,
        target_role: data.role_type ?? null,
      },
    });

    return row as DocumentPermissionRow;
  });

export const revokeDocumentPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("document_permissions")
      .select("id, document_id, student_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabase.from("document_permissions").delete().eq("id", data.id);
    if (error) throw new Error("Could not revoke this access.");
    if (row) {
      await supabase.from("audit_log").insert({
        actor_id: userId,
        action: "document.permission.revoke",
        entity_type: "document",
        entity_id: row.document_id,
        student_id: row.student_id,
        metadata: { permission_id: row.id },
      });
    }
    return { ok: true };
  });

/**
 * Audit-log a document view. Caller must have view rights (RLS scopes the
 * document fetch via `can_view_document`). Best-effort: failures are logged
 * server-side but never bubble up to the user.
 */
export const logDocumentView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        document_id: z.string().uuid(),
        context: z.string().trim().max(80).optional().default(""),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: doc } = await supabase
      .from("documents")
      .select("id, student_id")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) return { ok: false };
    const { error } = await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.viewed",
      entity_type: "document",
      entity_id: doc.id,
      student_id: (doc as { student_id: string | null }).student_id,
      metadata: { context: data.context || null },
    });
    if (error) console.error("logDocumentView failed", error);
    return { ok: true };
  });

/* ---------- Slice A: classification & review metadata ---------- */

export const DOC_TYPES = [
  "iep",
  "current-iep",
  "previous-iep",
  "evaluation",
  "transition-plan",
  "progress-report",
  "meeting-notes",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];

export type DocumentMetaRow = {
  id: string;
  student_id: string;
  title: string;
  doc_type: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  used_in_report_at: string | null;
};

export const getDocumentMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ document_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("documents")
      .select("id, student_id, title, doc_type, reviewed_at, reviewed_by, used_in_report_at")
      .eq("id", data.document_id)
      .maybeSingle();
    if (error || !row) throw new Error("Document not found or access denied.");
    return row as DocumentMetaRow;
  });

async function ensureCanEditDocument(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  userId: string,
  documentId: string,
): Promise<{ id: string; student_id: string }> {
  const { data: row } = await supabase
    .from("documents")
    .select("id, student_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!row) throw new Error("Document not found or access denied.");
  const { data: canEdit } = await supabase.rpc("can_edit_student", {
    _user_id: userId,
    _student_id: row.student_id,
  });
  if (!canEdit) throw new Error("You don't have permission to update this document.");
  return row as { id: string; student_id: string };
}

export const classifyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      doc_type: z.enum(DOC_TYPES),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const doc = await ensureCanEditDocument(supabase, userId, data.id);
    const { data: row, error } = await supabase
      .from("documents")
      .update({ doc_type: data.doc_type })
      .eq("id", data.id)
      .select("id, student_id, title, doc_type, reviewed_at, reviewed_by, used_in_report_at")
      .single();
    if (error || !row) throw new Error("Could not update document type.");
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.classify",
      entity_type: "document",
      entity_id: doc.id,
      student_id: doc.student_id,
      metadata: { doc_type: data.doc_type },
    });
    return row as DocumentMetaRow;
  });

export const markDocumentReviewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      reviewed: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const doc = await ensureCanEditDocument(supabase, userId, data.id);
    const patch = data.reviewed
      ? { reviewed_at: new Date().toISOString(), reviewed_by: userId }
      : { reviewed_at: null, reviewed_by: null };
    const { data: row, error } = await supabase
      .from("documents")
      .update(patch)
      .eq("id", data.id)
      .select("id, student_id, title, doc_type, reviewed_at, reviewed_by, used_in_report_at")
      .single();
    if (error || !row) throw new Error("Could not update review status.");
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: data.reviewed ? "document.reviewed" : "document.unreviewed",
      entity_type: "document",
      entity_id: doc.id,
      student_id: doc.student_id,
    });
    return row as DocumentMetaRow;
  });


