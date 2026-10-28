import { documentRegistrationRequestSchema, documentUploadReservationRequestSchema, documentUploadRecoveryRequestSchema } from "./document-upload-intent";
import { documentUploadFingerprint } from "./document-upload-fingerprint";
import { documentUploadOutcome } from "./document-upload-outcome";
import { assertDocumentFileReady } from "./document-file-readiness";
import { buildStructuredOutputSystem } from "@/lib/structured-output-system";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertAuthorized } from "./authz";
import { assertProtectedFileUploadsEnabled } from "./protected-file-uploads";
import { assertPrivacySafeDerivedUpload, redactSensitiveText } from "./sensitive-text-redaction";
import { PLANNING_SOURCE_GROUNDING } from "./planning-source-grounding";
import { assertExpectedViewer, viewerIntentSchema } from "./viewer-intent";

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
  .validator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
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

export const reserveDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => documentUploadReservationRequestSchema.parse(i))
  .handler(async ({ data, context }) => {
    assertProtectedFileUploadsEnabled();
    assertExpectedViewer(data, context.userId);
    assertPrivacySafeDerivedUpload("privacy-safe-document.txt", data.mime_type ?? null);
    const { reserveDocumentUploadIntent } = await import("./document-upload-reservation.server");
    return reserveDocumentUploadIntent(context.supabase, context.userId, data);
  });

export const recoverDocumentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => documentUploadRecoveryRequestSchema.parse(i))
  .handler(async ({ data, context }) => {
    assertProtectedFileUploadsEnabled();
    assertExpectedViewer(data, context.userId);
    const { recoverDocumentUploadIntent } = await import("./document-upload-reservation.server");
    return recoverDocumentUploadIntent(context.supabase, context.userId, data);
  });

export const registerDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    documentRegistrationRequestSchema.parse(i),
  )

  .handler(async ({ data, context }) => {
    assertProtectedFileUploadsEnabled();
    assertPrivacySafeDerivedUpload(data.storage_path, data.mime_type ?? null);
    const { supabase, userId } = context;
    assertExpectedViewer(data, userId);

    // Recheck edit access at registration, including duplicate-return paths,
    // before any privileged storage read, scan, cleanup or pipeline processing.
    // The earlier browser preflight does not authorize this later request.
    let canRegister = false;
    try {
      const access = await supabase.rpc("can_edit_student", {
        _user_id: userId,
        _student_id: data.student_id,
      });
      canRegister = !access.error && access.data === true;
    } catch {
      // Fail closed without exposing database details or retrying the request.
    }
    if (!canRegister) {
      throw new Error("We couldn't confirm permission to add this document. Refresh the page and check your access before continuing.");
    }

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

    // Reconfirm the exact reserved intent before any storage read or scan.
    // Missing proposal RPCs fail closed; never fall back to unreserved inserts.
    const { reserveDocumentUploadIntent } = await import("./document-upload-reservation.server");
    const reservation = await reserveDocumentUploadIntent(supabase, userId, {
      ...data, attempt_id: data.upload_attempt_id,
    }, data.upload_review_context_sha256);
    if (reservation.storage_path !== data.storage_path) throw new Error("The upload reservation could not be confirmed.");

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

    // Do not scan or purge an object already bound to any document, including
    // records hidden from this caller. This narrow trusted probe grants no access.
    const { assertDocumentUploadPathAvailable } = await import("./document-upload-duplicate.server");
    const { supabaseAdmin: registrationAdmin } = await import("@/integrations/supabase/client.server");
    await assertDocumentUploadPathAvailable(registrationAdmin, data.storage_path);

    // Derive identity from the actual caller-readable stored bytes. Never trust
    // a supplied or legacy placeholder hash as evidence of file contents.
    let contentHash: string;
    let reviewedCopy: Blob;
    try {
      const stored = await supabase.storage.from("student-documents").download(data.storage_path);
      if (stored.error || !(stored.data instanceof Blob)) throw new Error("Unconfirmed uploaded bytes");
      // Blob bytes are immutable. Keep this exact copy through fingerprint,
      // type checks and AV submission instead of reading a changing path again.
      reviewedCopy = stored.data;
      contentHash = await documentUploadFingerprint(reviewedCopy);
      if (data.content_hash && data.content_hash.toLowerCase() !== contentHash) {
        throw new Error("Uploaded bytes do not match the reviewed copy");
      }
    } catch {
      throw new Error("We couldn't confirm the uploaded copy. Refresh the page and review the document list before uploading again.");
    }

    const { recordPipelineRun, newCorrelationId } = await import("./document-pipeline.server");
    const correlationId = newCorrelationId();
    const uploadStartedAt = new Date().toISOString();

    // Proposal columns are intentionally scoped here; canonical generated types
    // remain unchanged until the reviewed migration is promoted.
    // Duplicate checks happen before browser storage upload. Do not return a
    // different path here: that would leave this attempted object unaccounted for.
    const { data: row, error } = await supabase
      .from("documents")
      .insert({
        student_id: data.student_id,
        uploaded_by: userId,
        upload_attempt_id: data.upload_attempt_id,
        upload_review_context_sha256: data.upload_review_context_sha256,
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
        content_hash: contentHash,
      } as never)
      .select("*")
      .single();
    if (error || !row) {
      console.error("Document registration could not be confirmed.");
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

    // This fingerprint was computed from stored bytes, not a client claim.
    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "hash",
      status: "succeeded",
      payload: { algorithm: "sha256", source: "stored_bytes" },
    });

    // Magic-byte/type checks inspect the same held copy used for hashing.
    // Confirm it matches the
    // declared mime_type against a strict allowlist. Rejections quarantine
    // the row (review_status='rejected' + archived) and skip AI extract.
    const { sniffUploadedDocument, MAX_UPLOAD_BYTES } = await import("./document-sniff.server");
    const sniff = await sniffUploadedDocument({
      storage_path: data.storage_path,
      declared_mime: data.mime_type ?? null,
      declared_size: data.size_bytes ?? null,
    }, reviewedCopy);

    if (!sniff.ok) {
      // Quarantine: reject the row and mark it archived with an audit reason.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let quarantinedDocument: DocumentRow;
      try {
        const receipt = await supabaseAdmin
          .from("documents")
          .update({
            review_status: "rejected",
            archived_at: new Date().toISOString(),
            archived_by: userId,
            archive_reason: `auto-quarantined: ${sniff.error_code}`,
          })
          .eq("id", row.id)
          .select("*")
          .single();
        if (receipt.error || receipt.data?.id !== row.id ||
            receipt.data.scan_status !== "pending" ||
            documentUploadOutcome(receipt.data, data.student_id, data.storage_path) !== "blocked") {
          throw new Error("Unconfirmed quarantine receipt");
        }
        quarantinedDocument = receipt.data as DocumentRow;
      } catch {
        throw new Error("We couldn't confirm the document's security review. Refresh the page and review its status before trying again.");
      }

      await recordPipelineRun({
        document_id: row.id,
        student_id: data.student_id,
        correlation_id: correlationId,
        stage: "sniff",
        status: "quarantined",
        error_code: sniff.error_code,
        error_message: sniff.error_message,
        payload: {
          declared_mime: data.mime_type ?? null,
          detected_kind: sniff.detected_kind,
          declared_size: data.size_bytes ?? null,
          max_bytes: MAX_UPLOAD_BYTES,
        },
      });
      await recordPipelineRun({
        document_id: row.id,
        student_id: data.student_id,
        correlation_id: correlationId,
        stage: "extract",
        status: "skipped",
        error_code: "quarantined",
        payload: { reason: sniff.error_code },
      });

      await supabase.from("document_access_log").insert({
        document_id: row.id,
        student_id: data.student_id,
        actor_id: userId,
        actor_role: uploaderRole,
        action: "upload_quarantined",
        metadata: { error_code: sniff.error_code, declared_mime: data.mime_type ?? null },
      });

      return quarantinedDocument;
    }

    // Sniff passed — record breadcrumb before running the AV scan.
    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "sniff",
      status: "succeeded",
      payload: {
        declared_mime: data.mime_type ?? null,
        detected_kind: sniff.detected_kind,
        declared_size: data.size_bytes ?? null,
      },
    });

    // ── Private Cloudmersive advanced malware scan ────────────────────
    // Bytes are quarantined (scan_status = 'pending' via default) until we
    // receive a "clean" verdict. Everything else fails closed: no AI job
    // is enqueued. Non-clean files stay quarantined. Storage removal awaits
    // a guarded claim, reference checks, receipt and independent absence proof.
    const { MALWARE_SCAN_PROVIDER, scanUploadedDocument } = await import(
      "./document-av-scan.server"
    );
    const scanStartedAt = new Date().toISOString();
    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "av_scan",
      status: "running",
      started_at: scanStartedAt,
      payload: { provider: MALWARE_SCAN_PROVIDER, mode: "advanced", fail_closed: true },
    });
    const scanResult = await scanUploadedDocument({
      storage_path: data.storage_path,
      declared_mime: data.mime_type ?? null,
      declared_size: data.size_bytes ?? null,
    }, reviewedCopy);
    const scanFinishedAt = new Date().toISOString();
    const scanLatencyMs = Date.parse(scanFinishedAt) - Date.parse(scanStartedAt);
    const { supabaseAdmin: adminForScan } = await import("@/integrations/supabase/client.server");

    if (!scanResult.ok) {
      // ── Not clean: fail closed. ───────────────────────────────────
      const isInfected = scanResult.code === "infected";
      const now = new Date().toISOString();

      // Do not delete bytes here: a scan result is not a reference-safe
      // deletion claim, and a successful Storage response would not by itself
      // prove permanent absence. Preserve the record and quarantine instead.

      let quarantinedDocument: DocumentRow;
      try {
        const receipt = await adminForScan
          .from("documents")
          .update({
            scan_status: isInfected ? "infected" : "failed",
            scan_verdict: {
              code: scanResult.code,
              provider: scanResult.provider,
              clean_result: scanResult.clean_result,
              blocked_reasons: scanResult.blocked_reasons,
              threats: scanResult.threats,
              error_message: scanResult.error_message,
            },
            scan_data_id: scanResult.scan_id,
            scanned_at: now,
            review_status: "rejected",
            archived_at: now,
            archived_by: userId,
            archive_reason: `auto-quarantined by av_scan: ${scanResult.code}`,
          })
          .eq("id", row.id)
          .select("*")
          .single();
        if (receipt.error || receipt.data?.id !== row.id ||
            receipt.data.scan_status !== (isInfected ? "infected" : "failed") ||
            documentUploadOutcome(receipt.data, data.student_id, data.storage_path) !== "blocked") {
          throw new Error("Unconfirmed quarantine receipt");
        }
        quarantinedDocument = receipt.data as DocumentRow;
      } catch {
        throw new Error("We couldn't confirm the document's security review. Refresh the page and review its status before trying again.");
      }

      // Pipeline breadcrumbs
      await recordPipelineRun({
        document_id: row.id,
        student_id: data.student_id,
        correlation_id: correlationId,
        stage: "av_scan",
        status: "quarantined",
        started_at: scanStartedAt,
        finished_at: scanFinishedAt,
        latency_ms: scanLatencyMs,
        error_code: scanResult.code,
        error_message: scanResult.error_message,
        payload: {
          provider: scanResult.provider,
          scan_id: scanResult.scan_id,
          clean_result: scanResult.clean_result,
          blocked_reason_count: scanResult.blocked_reasons.length,
          threat_count: scanResult.threats.length,
        },
      });
      await recordPipelineRun({
        document_id: row.id,
        student_id: data.student_id,
        correlation_id: correlationId,
        stage: "extract",
        status: "skipped",
        error_code: "av_scan_" + scanResult.code,
        payload: { reason: `blocked_by_av_scan:${scanResult.code}` },
      });

      // Audit + access-log breadcrumbs. Access log's action column has a
      // narrow CHECK constraint (view_metadata|download|preview|summarize|
      // archive|restore|hard_delete|admin_override|upload) so scan-specific
      // events go through audit_log where the shape is richer.
      const baseMeta = {
        title: data.title,
        doc_type: data.doc_type,
        scan_code: scanResult.code,
        provider: scanResult.provider,
        scan_id: scanResult.scan_id,
        clean_result: scanResult.clean_result,
        blocked_reasons: scanResult.blocked_reasons,
        threats: scanResult.threats,
        uploader_role: uploaderRole,
      };

      if (isInfected) {
        await supabase.from("audit_log").insert([
          {
            actor_id: userId,
            action: "document.scan.infected",
            entity_type: "document",
            entity_id: row.id,
            student_id: data.student_id,
            metadata: baseMeta,
          },
          {
            actor_id: userId,
            action: "document.scan.quarantined",
            entity_type: "document",
            entity_id: row.id,
            student_id: data.student_id,
            metadata: { ...baseMeta, removal_status: "not_attempted" },
          },
        ]);
      } else {
        await supabase.from("audit_log").insert([
          {
            actor_id: userId,
            action:
              scanResult.code === "failed" || scanResult.code === "timeout"
                ? "document.scan.failed"
                : "document.scan.quarantined",
            entity_type: "document",
            entity_id: row.id,
            student_id: data.student_id,
            metadata: { ...baseMeta, error_message: scanResult.error_message },
          },
          {
            actor_id: userId,
            action: "document.scan.quarantined",
            entity_type: "document",
            entity_id: row.id,
            student_id: data.student_id,
            metadata: baseMeta,
          },
        ]);
      }

      return quarantinedDocument;
    }

    // ── Clean verdict: mark the row clean and proceed to AI extract. ─
    let confirmedDocument: DocumentRow;
    try {
      const cleanReceipt = await adminForScan
        .from("documents")
        .update({
          scan_status: "clean",
          scan_verdict: {
            code: "clean",
            content_sha256: contentHash,
            source: "registration_reviewed_copy",
            provider: scanResult.provider,
            clean_result: scanResult.clean_result,
            blocked_reasons: scanResult.blocked_reasons,
          },
          scan_data_id: scanResult.scan_id,
          scanned_at: scanFinishedAt,
        })
        .eq("id", row.id)
        .select("*")
        .single();
      if (cleanReceipt.error || cleanReceipt.data?.id !== row.id ||
          documentUploadOutcome(cleanReceipt.data, data.student_id, data.storage_path) !== "saved") {
        // A scanner verdict alone does not prove the database transition committed.
        // Never queue summary processing or claim a clean result without a receipt.
        throw new Error("Unconfirmed security-review receipt");
      }

      confirmedDocument = cleanReceipt.data as DocumentRow;
    } catch {
      throw new Error("We couldn't confirm the document's security review. Refresh the page and review its status before trying again.");
    }

    await recordPipelineRun({
      document_id: row.id,
      student_id: data.student_id,
      correlation_id: correlationId,
      stage: "av_scan",
      status: "succeeded",
      started_at: scanStartedAt,
      finished_at: scanFinishedAt,
      latency_ms: scanLatencyMs,
      payload: {
        provider: scanResult.provider,
        scan_id: scanResult.scan_id,
        clean_result: scanResult.clean_result,
      },
    });

    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.scan.clean",
      entity_type: "document",
      entity_id: row.id,
      student_id: data.student_id,
      metadata: {
        title: data.title,
        doc_type: data.doc_type,
        provider: scanResult.provider,
        scan_id: scanResult.scan_id,
        clean_result: scanResult.clean_result,
      },
    });

    // Only now — after a clean verdict — do we hand the file to AI.
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

    return confirmedDocument;
  });

/**
 * Soft-archive a document. The file is retained but hidden from active views.
 * Editors can restore via the same fn with `restore: true`. Hard delete is
 * paused pending guarded cleanup; `hardDeleteDocument` fails closed.
 */
export const archiveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({
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
 * Permanent removal is paused until a guarded cleanup protocol can prove
 * exact references, deletion receipts and independent object absence.
 * Keep the existing endpoint and admin check; never delete bytes first or
 * bypass restrictive document/upload-attempt retention to report success.
 */
export const hardDeleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({
    id: z.string().uuid(),
    reason: z.string().trim().min(8, "Reason must be at least 8 characters.").max(500),
  }).parse(i))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    let isAdmin = false;
    try {
      const receipt = await supabase.rpc("is_platform_admin", { _user_id: userId });
      isAdmin = !receipt.error && receipt.data === true;
    } catch {
      // Uncertain authorization grants no data or deletion access.
    }
    if (!isAdmin) throw new Error("Only platform admins may permanently delete documents.");
    throw new Error("Permanent removal is temporarily unavailable while safe removal is being finalized.");
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
  .validator((i: unknown) => z.object({ student_id: z.string().uuid(), content_hash: z.string().regex(/^[a-f0-9]{64}$/i).optional(), ...viewerIntentSchema.shape }).parse(i))
  .handler(async ({ data, context }) => {
    assertProtectedFileUploadsEnabled();
    const { supabase, userId } = context;
    assertExpectedViewer(data, userId);
    let allowed = false;
    try {
      const edit = await supabase.rpc("can_edit_student", {
        _user_id: userId,
        _student_id: data.student_id,
      });
      const partner = await supabase.rpc("is_partner_only", { _user_id: userId });
      allowed = !edit.error && edit.data === true && !partner.error && partner.data === false;
    } catch {
      // Fail closed without copying private service details to the client.
    }
    if (!allowed) {
      throw new Error("We couldn't confirm permission to upload. Refresh the page and check your access before continuing.");
    }
    const { hasVerifiedDocumentDuplicate } = await import("./document-upload-duplicate.server");
    const duplicate = data.content_hash
      ? await hasVerifiedDocumentDuplicate(supabase, userId, data.student_id, data.content_hash)
      : false;
    return { ok: true, duplicate };
  });

export const getDocumentSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Look up the document. RLS on `documents` returns no row if the caller
    // has lost access to the student — we use that as the revoked-access
    // signal and raise an alert before refusing.
    const { data: row, error } = await supabase
      .from("documents")
      .select("id, storage_path, student_id, doc_type, title, scan_status, scan_verdict")
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

    assertDocumentFileReady(row);

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
  .validator((i: unknown) => z.object({
    document_id: z.string().uuid(),
    reason: z.string().trim().min(8, "Please describe why this access is needed.").max(500),
    scope: z
      .enum(["single_document", "compliance_audit", "support_ticket", "data_request"])
      .default("single_document"),
    case_reference: z.string().trim().max(120).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Only platform admins may request override access.");

    const { error: grantErr } = await supabase.from("admin_doc_access_grants").insert({
      actor_id: userId,
      document_id: data.document_id,
      reason: data.reason,
      scope: data.scope,
      case_reference: data.case_reference ?? null,
    });
    if (grantErr) throw new Error("Could not record override grant.");


    // Now that the grant exists, RLS lets us load metadata + mint a URL.
    const { data: doc } = await supabase
      .from("documents")
      .select("id, student_id, storage_path, doc_type, title, scan_status, scan_verdict")
      .eq("id", data.document_id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found.");

    assertDocumentFileReady(doc);

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
        title: z.string().trim().min(3).max(180),
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
        description: z.string().trim().max(1200).default(""),
        measurable_criteria: z.string().trim().max(600).default(""),
      }),
    )
    .max(12)
    .default([]),
});

export type ExtractedGoal = z.infer<typeof GoalsExtractSchema>["goals"][number];

export const extractGoalsFromText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({
      ...viewerIntentSchema.shape,
      text: z.string().trim().min(40).max(120_000),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const privacySafeText = redactSensitiveText(data.text).text;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const prompt = `You are reading a U.S. Individualized Education Program (IEP) or transition plan. Extract the post-secondary / transition GOALS as a clean list a family can act on.

Rules:
- Each goal: a short plain-language "title" (under 90 chars), an optional one-paragraph "description" in family-friendly language, and "measurable_criteria" if the IEP states how progress is measured.
- "category" must be one of: academic, life-skills, career, college, transportation, communication, general.
- DO NOT invent goals. Only include goals explicitly stated in the source. Do not turn interests, supports, needs or suggested activities into goals. If no explicit goal is supplied, return an empty goals array.
- Preserve baseline numbers, units, dates and prompting conditions. Do not invent measurable criteria or treat a proposed target as measured progress.
- Strip last names, school names, dates of birth, and other identifiers from the text you produce.
- Return at most 12 goals, most important first.

IEP TEXT:
"""
${privacySafeText}
"""`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: GoalsExtractSchema }),
        system: await buildStructuredOutputSystem(GoalsExtractSchema, PLANNING_SOURCE_GROUNDING),
        prompt,
      });
      return { goals: GoalsExtractSchema.parse(experimental_output).goals };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Document goal extraction failed.");
      if (msg.includes("429")) throw new Error("The AI is busy right now. Try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't read goals out of this document.");
    }
  });

export const saveExtractedGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({
      ...viewerIntentSchema.shape,
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
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    let mayEdit = false;
    try {
      const access = await supabase.rpc("can_edit_student", { _user_id: userId, _student_id: data.student_id });
      mayEdit = !access.error && access.data === true;
    } catch { /* Access must be confirmed before any write. */ }
    if (!mayEdit) throw new Error("Your access to this student could not be confirmed. Please refresh before saving goals.");
    const rows = data.goals.map((g) => ({
      student_id: data.student_id,
      created_by: userId,
      title: g.title,
      description: g.description || null,
      measurable_criteria: g.measurable_criteria || null,
      category: g.category,
      status: "not-started",
    }));
    try {
      const { data: inserted, error } = await supabase.from("goals").insert(rows).select("id");
      if (error) throw new Error("Goal write was not confirmed.");
      const receipt = z.array(z.object({ id: z.string().uuid() })).length(rows.length)
        .refine(ids => new Set(ids.map(row => row.id)).size === ids.length).safeParse(inserted);
      if (!receipt.success) throw new Error("Goal receipt was not confirmed.");
      return { inserted: receipt.data.length };
    } catch {
      console.error("Extracted goal save could not be confirmed.");
      throw new Error("We couldn't confirm that all goals were saved. Refresh this page and review the saved goals before trying again.");
    }
  });

/* ---------- DOCUMENT PERMISSIONS ---------- */

const PERMISSION_LEVELS = ["none", "view_summary", "view_document", "edit_metadata", "manage"] as const;
const ROLE_TYPES = ["family", "student", "educator", "school_admin", "district_admin", "partner"] as const;

export const listDocumentPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ document_id: z.string().uuid() }).parse(i))
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
  .validator((i: unknown) =>
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
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
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
  .validator((i: unknown) =>
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
  .validator((i: unknown) => z.object({ document_id: z.string().uuid() }).parse(i))
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
  .validator((i: unknown) =>
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
  .validator((i: unknown) =>
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

/**
 * Re-run the Cloudmersive advanced scan on a document whose previous scan
 * ended in `failed` / `timeout` / other indeterminate state. Fails closed:
 * a non-clean verdict leaves the row quarantined and never enqueues an AI
 * job. Previously infected or retired files cannot be retried, even while
 * their bytes are retained awaiting guarded cleanup.
 */
export const rescanDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: readErr } = await supabase
      .from("documents")
      .select("id, student_id, title, doc_type, storage_path, mime_type, size_bytes, scan_status, scan_verdict")
      .eq("id", data.id)
      .maybeSingle();
    if (readErr || !row) throw new Error("Document not found or access denied.");

    await assertAuthorized(
      { supabase, userId, action: "edit", resourceType: "student", resourceId: row.student_id },
      "You don't have permission to rescan this document.",
    );

    if (row.scan_status === "clean") {
      throw new Error("This document already passed the scan; nothing to retry.");
    }
    const priorVerdict = row.scan_verdict && typeof row.scan_verdict === "object" && !Array.isArray(row.scan_verdict)
      ? row.scan_verdict.code : null;
    if (row.scan_status === "deleted" || row.scan_status === "infected" || priorVerdict === "infected") {
      throw new Error("This file was blocked for your safety and cannot be rescanned.");
    }
    if (!row.storage_path) {
      throw new Error("This document has no file attached to rescan.");
    }

    const { recordPipelineRun, newCorrelationId } = await import("./document-pipeline.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { MALWARE_SCAN_PROVIDER, scanUploadedDocument } = await import(
      "./document-av-scan.server"
    );

    const correlationId = newCorrelationId();
    const startedAt = new Date().toISOString();

    await supabaseAdmin
      .from("documents")
      .update({ scan_status: "pending" })
      .eq("id", row.id);

    await recordPipelineRun({
      document_id: row.id,
      student_id: row.student_id,
      correlation_id: correlationId,
      stage: "av_scan",
      status: "running",
      started_at: startedAt,
      payload: {
        provider: MALWARE_SCAN_PROVIDER,
        mode: "advanced",
        fail_closed: true,
        retry: true,
      },
    });

    const scanResult = await scanUploadedDocument({
      storage_path: row.storage_path,
      declared_mime: row.mime_type ?? null,
      declared_size: row.size_bytes ?? null,
    });
    const finishedAt = new Date().toISOString();
    const latencyMs = Date.parse(finishedAt) - Date.parse(startedAt);

    if (!scanResult.ok) {
      const isInfected = scanResult.code === "infected";
      // A failed security review never authorizes storage deletion.
      // Confirm quarantine for this exact row before reporting its outcome.
      try {
        const receipt = await supabaseAdmin
          .from("documents")
          .update({
            scan_status: isInfected ? "infected" : "failed",
            scan_verdict: {
              code: scanResult.code,
              provider: scanResult.provider,
              clean_result: scanResult.clean_result,
              blocked_reasons: scanResult.blocked_reasons,
              threats: scanResult.threats,
              error_message: scanResult.error_message,
              retry: true,
            },
            scan_data_id: scanResult.scan_id,
            scanned_at: finishedAt,
            review_status: "rejected",
            archived_at: finishedAt,
            archived_by: userId,
            archive_reason: `auto-quarantined by av_scan retry: ${scanResult.code}`,
          })
          .eq("id", row.id)
          .eq("student_id", row.student_id)
          .eq("storage_path", row.storage_path)
          .select("*")
          .single();
        if (receipt.error || receipt.data?.id !== row.id ||
            receipt.data.scan_status !== (isInfected ? "infected" : "failed") ||
            documentUploadOutcome(receipt.data, row.student_id, row.storage_path) !== "blocked") {
          throw new Error("Unconfirmed quarantine receipt");
        }
      } catch {
        throw new Error("We couldn't confirm the document's security review. Refresh the page and review its status before trying again.");
      }

      await recordPipelineRun({
        document_id: row.id,
        student_id: row.student_id,
        correlation_id: correlationId,
        stage: "av_scan",
        status: "quarantined",
        started_at: startedAt,
        finished_at: finishedAt,
        latency_ms: latencyMs,
        error_code: scanResult.code,
        error_message: scanResult.error_message,
        payload: {
          retry: true,
          provider: scanResult.provider,
          scan_id: scanResult.scan_id,
          clean_result: scanResult.clean_result,
          blocked_reason_count: scanResult.blocked_reasons.length,
          threat_count: scanResult.threats.length,
        },
      });

      const meta = {
        title: row.title,
        doc_type: row.doc_type,
        scan_code: scanResult.code,
        provider: scanResult.provider,
        scan_id: scanResult.scan_id,
        clean_result: scanResult.clean_result,
        blocked_reasons: scanResult.blocked_reasons,
        threats: scanResult.threats,
        retry: true,
      };
      if (isInfected) {
        await supabase.from("audit_log").insert([
          { actor_id: userId, action: "document.scan.infected", entity_type: "document", entity_id: row.id, student_id: row.student_id, metadata: meta },
          { actor_id: userId, action: "document.scan.quarantined", entity_type: "document", entity_id: row.id, student_id: row.student_id, metadata: { ...meta, removal_status: "not_attempted" } },
        ]);
      } else {
        await supabase.from("audit_log").insert([
          {
            actor_id: userId,
            action:
              scanResult.code === "failed" || scanResult.code === "timeout"
                ? "document.scan.failed"
                : "document.scan.quarantined",
            entity_type: "document",
            entity_id: row.id,
            student_id: row.student_id,
            metadata: { ...meta, error_message: scanResult.error_message },
          },
        ]);
      }

      return {
        ok: false as const,
        code: scanResult.code,
        error_message: scanResult.error_message,
      };
    }

    await supabaseAdmin
      .from("documents")
      .update({
        scan_status: "clean",
        scan_verdict: {
          code: "clean",
          provider: scanResult.provider,
          clean_result: scanResult.clean_result,
          blocked_reasons: scanResult.blocked_reasons,
          retry: true,
        },
        scan_data_id: scanResult.scan_id,
        scanned_at: finishedAt,
        review_status: "pending_review",
        archived_at: null,
        archived_by: null,
        archive_reason: null,
      })
      .eq("id", row.id);

    await recordPipelineRun({
      document_id: row.id,
      student_id: row.student_id,
      correlation_id: correlationId,
      stage: "av_scan",
      status: "succeeded",
      started_at: startedAt,
      finished_at: finishedAt,
      latency_ms: latencyMs,
      payload: {
        retry: true,
        provider: scanResult.provider,
        scan_id: scanResult.scan_id,
        clean_result: scanResult.clean_result,
      },
    });

    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "document.scan.clean",
      entity_type: "document",
      entity_id: row.id,
      student_id: row.student_id,
      metadata: {
        title: row.title,
        doc_type: row.doc_type,
        provider: scanResult.provider,
        scan_id: scanResult.scan_id,
        clean_result: scanResult.clean_result,
        retry: true,
      },
    });

    const { error: jobErr } = await supabase.from("ai_jobs").insert({
      student_id: row.student_id,
      triggered_by_user_id: userId,
      job_type: "document_summary",
      status: "queued",
      input_source: {
        document_id: row.id,
        title: row.title,
        doc_type: row.doc_type,
        storage_path: row.storage_path,
      },
    });
    if (jobErr) console.error("rescanDocument: ai_jobs enqueue failed", jobErr);

    await recordPipelineRun({
      document_id: row.id,
      student_id: row.student_id,
      correlation_id: correlationId,
      stage: "extract",
      status: jobErr ? "failed" : "pending",
      error_code: jobErr ? "ai_jobs_enqueue_failed" : null,
      error_message: jobErr?.message ?? null,
      payload: { job_type: "document_summary", retry: true },
    });

    return { ok: true as const, code: "clean" as const };
  });




