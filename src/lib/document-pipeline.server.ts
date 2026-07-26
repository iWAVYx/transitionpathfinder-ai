// Workstream C, Slice C4 — Document pipeline breadcrumb writer.
//
// Writes rows to public.document_pipeline_runs so we can observe upload →
// hash → extract → verify → publish stages, retries, latency, and failure
// codes without changing user-visible behavior.
//
// The table is admin-only under RLS (see 20260719223510 migration), so all
// inserts route through the service-role client. Every call MUST be
// best-effort: swallow errors, log to console, and never break the caller.
//
// This module is `.server.ts` so it is stripped from client bundles by the
// Vite plugin. Import it lazily from server-function handlers:
//
//   const { recordPipelineRun } = await import("./document-pipeline.server");
//
// Do NOT import it at module scope of a `*.functions.ts` file.

import type { Json } from "@/integrations/supabase/types";

export type PipelineStage =
  | "upload"
  | "sniff"
  | "hash"
  | "av_scan"
  | "sanitize"
  | "extract"
  | "verify"
  | "publish";

export type PipelineStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "quarantined"
  | "skipped";

export interface PipelineRunInput {
  document_id: string;
  student_id?: string | null;
  stage: PipelineStage;
  status: PipelineStatus;
  correlation_id?: string;
  attempt?: number;
  engine_version?: string | null;
  model_version?: string | null;
  prompt_version?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  latency_ms?: number | null;
  cost_cents?: number | null;
  payload?: Record<string, unknown>;
  started_at?: string | null;
  finished_at?: string | null;
}

/**
 * Insert a single pipeline-run breadcrumb. Best-effort: any error is logged
 * and swallowed so the caller's primary flow is never blocked by
 * observability writes.
 */
export async function recordPipelineRun(input: PipelineRunInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nowIso = new Date().toISOString();
    const terminal = input.status === "succeeded"
      || input.status === "failed"
      || input.status === "skipped"
      || input.status === "quarantined";

    const { error } = await supabaseAdmin.from("document_pipeline_runs").insert({
      document_id: input.document_id,
      student_id: input.student_id ?? null,
      correlation_id: input.correlation_id, // undefined lets DB default fire
      attempt: input.attempt ?? 1,
      stage: input.stage,
      status: input.status,
      engine_version: input.engine_version ?? null,
      model_version: input.model_version ?? null,
      prompt_version: input.prompt_version ?? null,
      error_code: input.error_code ?? null,
      error_message: input.error_message ?? null,
      latency_ms: input.latency_ms ?? null,
      cost_cents: input.cost_cents ?? null,
      payload: (input.payload ?? {}) as unknown as Json,
      started_at: input.started_at ?? (input.status === "running" ? nowIso : null),
      finished_at: input.finished_at ?? (terminal ? nowIso : null),
    });
    if (error) {
      console.warn("[pipeline] recordPipelineRun insert failed", {
        stage: input.stage,
        status: input.status,
        document_id: input.document_id,
        error: error.message,
      });
    }
  } catch (err) {
    console.warn("[pipeline] recordPipelineRun threw", {
      stage: input.stage,
      status: input.status,
      document_id: input.document_id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Generate a correlation id shared across the breadcrumb rows for a single
 * upload attempt. Callers should mint one at the top of a flow and pass it
 * to every recordPipelineRun call within that flow.
 */
export function newCorrelationId(): string {
  // crypto.randomUUID is available in the Worker runtime.
  return crypto.randomUUID();
}
