// Workstream C, Slice C7 — Admin-facing read view over document_pipeline_runs.
//
// The table is admin-only under RLS, so `context.supabase` already filters
// non-admins to zero rows. We still gate with an explicit is_platform_admin
// check so the UI can render a clean "not authorized" state instead of an
// empty list.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PipelineStage = "upload" | "sniff" | "hash" | "extract" | "verify" | "publish";
export type PipelineStatus =
  | "pending"
  | "running"
  | "succeeded"
  | "failed"
  | "quarantined"
  | "skipped";

export interface PipelineRunRow {
  id: string;
  document_id: string;
  student_id: string | null;
  correlation_id: string;
  attempt: number;
  stage: PipelineStage;
  status: PipelineStatus;
  engine_version: string | null;
  model_version: string | null;
  prompt_version: string | null;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number | null;
  cost_cents: number | null;
  payload: Record<string, unknown> | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PipelineRunSummary {
  total: number;
  by_stage: Record<PipelineStage, number>;
  by_status: Record<PipelineStatus, number>;
  quarantined: number;
  failed: number;
  window_hours: number;
}

const STAGES: PipelineStage[] = ["upload", "sniff", "hash", "extract", "verify", "publish"];
const STATUSES: PipelineStatus[] = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "quarantined",
  "skipped",
];

export const listDocumentPipelineRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        stage: z.enum(["upload", "sniff", "hash", "extract", "verify", "publish"]).optional(),
        status: z
          .enum(["pending", "running", "succeeded", "failed", "quarantined", "skipped"])
          .optional(),
        correlation_id: z.string().uuid().optional(),
        document_id: z.string().uuid().optional(),
        window_hours: z.number().int().min(1).max(720).default(72),
        limit: z.number().int().min(1).max(500).default(100),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Admin gate — friendlier than an empty-list RLS silent-deny.
    const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: userId });
    if (!isAdmin) {
      throw new Error("Only platform admins can view the document pipeline.");
    }

    const sinceIso = new Date(Date.now() - data.window_hours * 3600 * 1000).toISOString();

    let query = supabase
      .from("document_pipeline_runs")
      .select("*")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.stage) query = query.eq("stage", data.stage);
    if (data.status) query = query.eq("status", data.status);
    if (data.correlation_id) query = query.eq("correlation_id", data.correlation_id);
    if (data.document_id) query = query.eq("document_id", data.document_id);

    const { data: rows, error } = await query;
    if (error) {
      console.error("listDocumentPipelineRuns failed", error);
      throw new Error("Could not load pipeline runs.");
    }

    const runs = (rows ?? []) as PipelineRunRow[];

    // Summary counts (over the returned window, before per-stage/status filter).
    // To keep the summary meaningful, run a second cheap count query scoped
    // only by the time window — not by the UI filter.
    const { data: summaryRows } = await supabase
      .from("document_pipeline_runs")
      .select("stage, status")
      .gte("created_at", sinceIso)
      .limit(5000);

    const by_stage = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<PipelineStage, number>;
    const by_status = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<
      PipelineStatus,
      number
    >;
    for (const r of (summaryRows ?? []) as Array<{ stage: PipelineStage; status: PipelineStatus }>) {
      if (r.stage in by_stage) by_stage[r.stage]++;
      if (r.status in by_status) by_status[r.status]++;
    }

    const summary: PipelineRunSummary = {
      total: summaryRows?.length ?? 0,
      by_stage,
      by_status,
      quarantined: by_status.quarantined,
      failed: by_status.failed,
      window_hours: data.window_hours,
    };

    return { runs, summary };
  });
