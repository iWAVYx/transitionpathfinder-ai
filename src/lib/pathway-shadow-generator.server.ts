/**
 * Slice D8 — Lovable AI Gateway recommendation generator (DORMANT, server-only).
 *
 * Adapter that turns a `RecommendationGenerator` (Slice D6 contract) into
 * a Lovable AI Gateway call. The gateway is asked for a lean "content
 * only" payload; pillar / age_band / provenance / schema_version are
 * stamped locally so those fields can never drift from the loader-
 * resolved values. Every output is re-validated downstream by the D6
 * orchestrator via `parseRecommendationBatchV1`.
 *
 * The heavy work — invoking the model — is injected via `runModel` so
 * unit tests drive it with a deterministic stub. The default `runModel`
 * wraps `generateText` + `Output.object` from the AI SDK.
 *
 * `.server.ts` suffix keeps this out of the client bundle.
 */
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  RecConfidence,
  RecOwnerRole,
  RecSourceRef,
  RecTimeframe,
  type RecommendationV1,
} from "./pathway-recommendation-v1.ts";
import type {
  GenerateRecommendationsInput,
  RecommendationGenerator,
} from "./pathway-engine-shadow.ts";

/* ---------- AI-facing schema (lean, no provenance / pillar) ---------- */

const AiRec = z.object({
  id: z.string().trim().min(1).max(120),
  title: z.string().trim().min(4).max(160),
  summary: z.string().trim().min(20).max(800),
  why: z.string().trim().min(20).max(800),
  next_action: z.string().trim().min(6).max(400),
  owner_role: RecOwnerRole,
  timeframe: RecTimeframe,
  confidence: RecConfidence,
  discuss_at_next_meeting: z.boolean(),
  sources: z.array(RecSourceRef).min(1).max(8),
});
export type AiRec = z.infer<typeof AiRec>;

export const AiRecBatch = z.object({
  recommendations: z.array(AiRec).min(1).max(10),
});
export type AiRecBatch = z.infer<typeof AiRecBatch>;

/* ---------- injected model runner ---------- */

export interface RunModelInput {
  system: string;
  prompt: string;
}

export type RunModel = (input: RunModelInput) => Promise<AiRecBatch>;

export interface CreateShadowGeneratorConfig {
  /** Injectable model runner. Defaults to Lovable AI Gateway via AI SDK. */
  runModel?: RunModel;
  /** Only used by the default runner. Ignored when `runModel` is injected. */
  apiKey?: string;
  /** Default: `google/gemini-3-flash-preview`. */
  model?: string;
}

/* ---------- prompt builders (pure) ---------- */

export function buildSystemPrompt(): string {
  return [
    "You are TransitionForward's Pathway engine.",
    "You produce grounded, evidence-linked next steps for a student's",
    "post-secondary transition plan. Never fabricate signals. Every",
    "recommendation MUST cite at least one source drawn from the evidence",
    "signals the caller provides. Keep language warm and concrete.",
  ].join(" ");
}

export function buildUserPrompt(input: GenerateRecommendationsInput): string {
  const signals = input.signals
    .map((s) => `- ${s.kind}: ${s.count} signal(s)`)
    .join("\n");
  return [
    `Pillar: ${input.pillar}`,
    `Age band: ${input.age_band}`,
    "Evidence signals available:",
    signals || "- (none)",
    "",
    "Produce 1-3 recommendations for this pillar. Each recommendation",
    "must be actionable within its `timeframe` and cite sources drawn",
    "from the signals above. Do NOT invent evidence.",
  ].join("\n");
}

/* ---------- factory ---------- */

/**
 * Build a `RecommendationGenerator` that talks to Lovable AI Gateway
 * (or the injected `runModel`) and stamps caller-owned fields locally.
 *
 * The returned generator is safe to hand to `runPathwayEngineShadow` —
 * the D6 orchestrator re-validates every emitted recommendation.
 */
export function createShadowLovableRecommendationGenerator(
  config: CreateShadowGeneratorConfig = {},
): RecommendationGenerator {
  const runModel: RunModel = config.runModel ?? defaultRunModel(config);

  return async (input) => {
    const batch = await runModel({
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(input),
    });

    return batch.recommendations.map<RecommendationV1>((rec) => ({
      schema_version: 1,
      id: rec.id,
      pillar: input.pillar,
      age_band: input.age_band,
      title: rec.title,
      summary: rec.summary,
      why: rec.why,
      next_action: rec.next_action,
      owner_role: rec.owner_role,
      timeframe: rec.timeframe,
      confidence: rec.confidence,
      discuss_at_next_meeting: rec.discuss_at_next_meeting,
      sources: rec.sources,
      provenance: input.provenance,
    }));
  };
}

/* ---------- default runner (Lovable AI Gateway via AI SDK) ---------- */

function defaultRunModel(config: CreateShadowGeneratorConfig): RunModel {
  return async ({ system, prompt }) => {
    const apiKey = config.apiKey ?? process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(apiKey);
    const modelId = config.model ?? "google/gemini-3-flash-preview";
    const { experimental_output } = await generateText({
      model: gateway(modelId),
      system,
      prompt,
      experimental_output: Output.object({ schema: AiRecBatch }),
    });
    return AiRecBatch.parse(experimental_output);
  };
}
