// AI job processor for TransitionForward.
// Picks up queued ai_jobs rows, dispatches them to Lovable AI, writes the
// result back, and emits a feed_event so families/teams see the update.
//
// Invoked by pg_cron every minute (see scheduled insert). Can also be hit
// directly by an authenticated server function via supabase.functions.invoke
// to trigger immediate processing after a queue insert.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Job = {
  id: string;
  student_id: string | null;
  triggered_by_user_id: string;
  job_type:
    | "document_summary"
    | "pathway_report"
    | "resource_recommendation"
    | "meeting_prep"
    | "goal_suggestions";
  input_source: Record<string, unknown>;
  attempts: number;
};

const DISCLAIMER =
  "AI recommendations are supportive planning tools and do not replace professional judgment, school team decisions, legal advice, or official IEP/PPT determinations.";

function systemPromptFor(jobType: Job["job_type"]) {
  const base =
    "You support special-education transition planning. Be specific, actionable, plain-language, and never make clinical or legal claims.";
  switch (jobType) {
    case "document_summary":
      return `${base} Summarize the provided document and extract: key_findings, strengths_identified, needs_identified, goals_identified, important_dates, missing_information, recommended_followups. Return strict JSON.`;
    case "pathway_report":
      return `${base} Produce a pathway report with: executive_summary, student_snapshot, strengths_needs_analysis, postsecondary_goal_summary, recommended_pathways (3-5), family_action_plan, teacher_action_plan, missing_information. Return strict JSON.`;
    case "resource_recommendation":
      return `${base} Recommend 5-10 transition resources tailored to the student's profile. Return a JSON array of {title, why, topic, audience}.`;
    case "meeting_prep":
      return `${base} Generate PPT/IEP meeting prep: family_questions, student_voice_prompts, document_checklist, follow_up_items. Return strict JSON.`;
    case "goal_suggestions":
      return `${base} Suggest 3-6 measurable transition goals. Return JSON array of {title, category, measurable_criteria, target_date_hint}.`;
  }
}

async function callLovableAI(systemPrompt: string, user: string) {
  const res = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI gateway ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

// Slice C5 — Best-effort worker-side pipeline breadcrumb writer.
// Mirrors src/lib/document-pipeline.server.ts. Any error is swallowed so
// the primary job flow is never blocked by observability writes.
type PipelineStage = "upload" | "sniff" | "hash" | "sanitize" | "extract" | "verify" | "publish";
type PipelineStatus = "pending" | "running" | "succeeded" | "failed" | "quarantined" | "skipped";
async function recordPipelineRun(
  supabase: ReturnType<typeof createClient>,
  input: {
    document_id: string;
    student_id?: string | null;
    stage: PipelineStage;
    status: PipelineStatus;
    correlation_id?: string;
    attempt?: number;
    model_version?: string | null;
    prompt_version?: string | null;
    error_code?: string | null;
    error_message?: string | null;
    latency_ms?: number | null;
    payload?: Record<string, unknown>;
    started_at?: string | null;
    finished_at?: string | null;
  },
) {
  try {
    const nowIso = new Date().toISOString();
    const terminal = input.status === "succeeded" || input.status === "failed"
      || input.status === "skipped" || input.status === "quarantined";
    const { error } = await supabase.from("document_pipeline_runs").insert({
      document_id: input.document_id,
      student_id: input.student_id ?? null,
      correlation_id: input.correlation_id,
      attempt: input.attempt ?? 1,
      stage: input.stage,
      status: input.status,
      model_version: input.model_version ?? null,
      prompt_version: input.prompt_version ?? null,
      error_code: input.error_code ?? null,
      error_message: input.error_message ?? null,
      latency_ms: input.latency_ms ?? null,
      payload: input.payload ?? {},
      started_at: input.started_at ?? (input.status === "running" ? nowIso : null),
      finished_at: input.finished_at ?? (terminal ? nowIso : null),
    });
    if (error) console.warn("[pipeline] insert failed", input.stage, input.status, error.message);
  } catch (err) {
    console.warn("[pipeline] threw", input.stage, input.status, err instanceof Error ? err.message : String(err));
  }
}

async function processJob(supabase: ReturnType<typeof createClient>, job: Job) {
  const systemPrompt = systemPromptFor(job.job_type);
  const userPrompt = JSON.stringify(job.input_source ?? {}, null, 2);
  const MODEL_VERSION = "google/gemini-3-flash-preview";
  const PROMPT_VERSION = "v1";

  // Slice C5 — worker-side breadcrumbs, only for document_summary jobs
  // where the enqueue included a document_id (upload/hash/extract-pending
  // breadcrumbs already exist from the upload path).
  const docId = job.job_type === "document_summary"
    ? (job.input_source?.document_id as string | undefined)
    : undefined;

  if (docId) {
    await recordPipelineRun(supabase, {
      document_id: docId,
      student_id: job.student_id,
      stage: "extract",
      status: "running",
      attempt: job.attempts + 1,
      model_version: MODEL_VERSION,
      prompt_version: PROMPT_VERSION,
    });
  }

  const extractStartedAt = Date.now();
  let result: Record<string, unknown>;
  try {
    result = await callLovableAI(systemPrompt, userPrompt);
  } catch (err) {
    if (docId) {
      await recordPipelineRun(supabase, {
        document_id: docId,
        student_id: job.student_id,
        stage: "extract",
        status: "failed",
        attempt: job.attempts + 1,
        model_version: MODEL_VERSION,
        prompt_version: PROMPT_VERSION,
        error_code: "ai_gateway_error",
        error_message: err instanceof Error ? err.message : String(err),
        latency_ms: Date.now() - extractStartedAt,
      });
    }
    throw err;
  }
  const extractLatency = Date.now() - extractStartedAt;

  if (docId) {
    await recordPipelineRun(supabase, {
      document_id: docId,
      student_id: job.student_id,
      stage: "extract",
      status: "succeeded",
      attempt: job.attempts + 1,
      model_version: MODEL_VERSION,
      prompt_version: PROMPT_VERSION,
      latency_ms: extractLatency,
      payload: { has_raw_fallback: "raw" in result },
    });

    // Verify stage: shadow-mode check that the AI returned structured JSON
    // instead of a raw string blob. We never quarantine or drop the row —
    // downstream review still gates promotion to evidence.
    const verifyOk = !("raw" in result);
    await recordPipelineRun(supabase, {
      document_id: docId,
      student_id: job.student_id,
      stage: "verify",
      status: verifyOk ? "succeeded" : "skipped",
      attempt: job.attempts + 1,
      model_version: MODEL_VERSION,
      prompt_version: PROMPT_VERSION,
      error_code: verifyOk ? null : "non_json_response",
      payload: { checks: ["json_shape"] },
    });
  }

  await supabase
    .from("ai_jobs")
    .update({
      status: "completed",
      result_payload: { ...result, _disclaimer: DISCLAIMER },
      locked_at: null,
    })
    .eq("id", job.id);

  if (job.student_id) {
    await supabase.from("feed_events").insert({
      student_id: job.student_id,
      actor_id: job.triggered_by_user_id,
      kind: `ai.${job.job_type}.completed`,
      title: `AI ${job.job_type.replace(/_/g, " ")} ready`,
      body: "Review the AI-generated draft with your team before acting.",
      ref_table: "ai_jobs",
      ref_id: job.id,
    });
  }

  await supabase.from("notifications").insert({
    user_id: job.triggered_by_user_id,
    notification_type: "ai_job_complete",
    title: `AI ${job.job_type.replace(/_/g, " ")} ready`,
    message: "Your AI-generated draft is ready to review.",
    related_student_id: job.student_id,
    related_record_type: "ai_jobs",
    related_record_id: job.id,
  });
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Require service-role bearer token. pg_cron and authenticated server-side
  // callers pass it; anonymous browser callers cannot.
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = `Bearer ${SERVICE_ROLE}`;
  if (authHeader !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Claim up to 5 queued jobs.
  const { data: jobs, error } = await supabase
    .from("ai_jobs")
    .select("*")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const processed: { id: string; ok: boolean; error?: string }[] = [];

  for (const j of (jobs ?? []) as Job[]) {
    const { data: locked } = await supabase
      .from("ai_jobs")
      .update({
        status: "processing",
        locked_at: new Date().toISOString(),
        attempts: j.attempts + 1,
      })
      .eq("id", j.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();

    if (!locked) continue;

    try {
      await processJob(supabase, j);
      processed.push({ id: j.id, ok: true });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      await supabase
        .from("ai_jobs")
        .update({
          status: j.attempts >= 2 ? "failed" : "queued",
          error_message: message,
          locked_at: null,
        })
        .eq("id", j.id);
      processed.push({ id: j.id, ok: false, error: message });
    }
  }

  return new Response(
    JSON.stringify({ processed, count: processed.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
