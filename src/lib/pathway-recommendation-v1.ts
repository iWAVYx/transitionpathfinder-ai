/**
 * Slice D2 — RecommendationV1 contract + schema-first generation gate.
 *
 * DORMANT: no writer or reader consumes this yet. This module defines the
 * canonical Zod schema every future engine invocation must satisfy BEFORE
 * any narrative/prose stage, plus a refusal path that emits an "assessment"
 * recommendation instead of fabricating content when evidence is too sparse.
 *
 * Design goals:
 *  - Pure, isomorphic (no supabase / no react / no server imports).
 *  - Additive to `pathway-v2.ts` — reuses the same `SourceRef` / `OwnerRole`
 *    vocabulary via a local re-declaration so this file stays standalone.
 *  - Every recommendation carries traceable provenance
 *    (`rules_version`, `prompt_version`, `model_version`, `knowledge_ref[]`)
 *    matching the columns added in Slice D1.
 *  - `parseRecommendationV1` / `parseRecommendationBatchV1` throw on invalid
 *    shape — callers MUST NOT downgrade a failed parse to a partial rec.
 *  - `assessEvidenceSufficiency` + `buildAssessmentRefusal` produce a valid
 *    RecommendationV1 whose intent is to gather the missing signal, so the
 *    schema-first gate is never bypassed by a "no data" branch.
 */
import { z } from "zod";

/* ---------- shared enums (mirrored from pathway-v2 for isolation) ---------- */

export const RecOwnerRole = z.enum([
  "student",
  "family",
  "case_manager",
  "educator",
  "school_team",
  "partner",
  "outside_provider",
]);
export type RecOwnerRole = z.infer<typeof RecOwnerRole>;

export const RecSourceKind = z.enum([
  "profile",
  "student_voice",
  "iep_doc",
  "iep_extraction",
  "goal",
  "readiness",
  "action_item",
  "meeting_prep",
  "saved_resource",
  "partner_match",
  "family_priority",
  "educator_input",
  "outcome",
]);
export type RecSourceKind = z.infer<typeof RecSourceKind>;

export const RecSourceRef = z.object({
  kind: RecSourceKind,
  id: z.string().trim().max(120).optional(),
  label: z.string().trim().min(1).max(240),
  occurred_at: z.string().trim().max(40).optional(),
});
export type RecSourceRef = z.infer<typeof RecSourceRef>;

export const RecPillar = z.enum([
  "postsecondary_education",
  "employment",
  "independent_living",
  "community_participation",
  "assessment", // refusal / next-best-question path
]);
export type RecPillar = z.infer<typeof RecPillar>;

export const RecTimeframe = z.enum(["30_day", "90_day", "6_month", "1_year"]);
export type RecTimeframe = z.infer<typeof RecTimeframe>;

export const RecConfidence = z.enum(["low", "medium", "high"]);
export type RecConfidence = z.infer<typeof RecConfidence>;

export const RecAgeBand = z.enum([
  "middle_school", // ~11–14
  "early_high_school", // ~14–16
  "late_high_school", // ~16–18
  "post_18", // 18–22 transition
]);
export type RecAgeBand = z.infer<typeof RecAgeBand>;

export const RecProvenance = z.object({
  rules_version: z.string().trim().min(1).max(80),
  prompt_version: z.string().trim().min(1).max(80),
  model_version: z.string().trim().min(1).max(120),
  engine_channel: z.enum(["shadow", "canary", "production", "retired"]),
  knowledge_ref: z.array(z.string().trim().min(1).max(120)).max(20),
});
export type RecProvenance = z.infer<typeof RecProvenance>;

/**
 * Canonical recommendation contract. Every field is required so a partial
 * / hallucinated recommendation cannot silently pass. Optional fields use
 * explicit nulls elsewhere; here we prefer required-plus-min to force the
 * generator to think about each dimension.
 */
export const RecommendationV1 = z.object({
  schema_version: z.literal(1),
  id: z.string().trim().min(1).max(120),
  pillar: RecPillar,
  age_band: RecAgeBand,
  title: z.string().trim().min(4).max(160),
  summary: z.string().trim().min(20).max(800),
  why: z.string().trim().min(20).max(800),
  next_action: z.string().trim().min(6).max(400),
  owner_role: RecOwnerRole,
  timeframe: RecTimeframe,
  confidence: RecConfidence,
  discuss_at_next_meeting: z.boolean(),
  sources: z.array(RecSourceRef).min(1).max(8),
  provenance: RecProvenance,
});
export type RecommendationV1 = z.infer<typeof RecommendationV1>;

export const RecommendationBatchV1 = z
  .array(RecommendationV1)
  .max(40)
  .refine(
    (recs) => new Set(recs.map((r) => r.id)).size === recs.length,
    { message: "recommendation ids must be unique within a batch" },
  );
export type RecommendationBatchV1 = z.infer<typeof RecommendationBatchV1>;

/* ---------- schema-first gate ---------- */

export type SchemaGateResult =
  | { ok: true; value: RecommendationV1 }
  | { ok: false; error_code: "schema_invalid"; issues: z.core.$ZodIssue[] };

export function parseRecommendationV1(input: unknown): SchemaGateResult {
  const parsed = RecommendationV1.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error_code: "schema_invalid", issues: parsed.error.issues };
}

export type SchemaGateBatchResult =
  | { ok: true; value: RecommendationV1[] }
  | { ok: false; error_code: "schema_invalid"; issues: z.core.$ZodIssue[] };

export function parseRecommendationBatchV1(input: unknown): SchemaGateBatchResult {
  const parsed = RecommendationBatchV1.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return { ok: false, error_code: "schema_invalid", issues: parsed.error.issues };
}

/* ---------- refusal / assessment path ---------- */

export type EvidenceSignal = {
  kind: RecSourceKind;
  count: number;
};

export type SufficiencyResult =
  | { sufficient: true }
  | { sufficient: false; missing: RecSourceKind[]; reason: string };

/**
 * Minimum evidence footprint before the engine is allowed to emit a
 * non-assessment recommendation for a pillar. Deliberately conservative —
 * anything below this triggers `buildAssessmentRefusal`.
 */
export const MIN_EVIDENCE_FOR_PILLAR: ReadonlyArray<RecSourceKind> = [
  "profile",
  "student_voice",
];

export function assessEvidenceSufficiency(signals: EvidenceSignal[]): SufficiencyResult {
  const byKind = new Map<RecSourceKind, number>();
  for (const s of signals) byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + s.count);
  const missing = MIN_EVIDENCE_FOR_PILLAR.filter((k) => (byKind.get(k) ?? 0) === 0);
  if (missing.length === 0) return { sufficient: true };
  return {
    sufficient: false,
    missing,
    reason: `insufficient evidence — missing signals: ${missing.join(", ")}`,
  };
}

export type AssessmentRefusalInput = {
  id: string;
  age_band: RecAgeBand;
  pillar_asked: Exclude<RecPillar, "assessment">;
  missing: RecSourceKind[];
  provenance: RecProvenance;
  owner_role?: RecOwnerRole;
};

/**
 * Builds a valid `RecommendationV1` whose entire purpose is to gather the
 * signals the engine judged missing. The result MUST pass the schema gate —
 * this is the guarantee that the refusal path can never bypass it.
 */
export function buildAssessmentRefusal(input: AssessmentRefusalInput): RecommendationV1 {
  const missingLabel = input.missing.map((m) => m.replace(/_/g, " ")).join(", ");
  const rec: RecommendationV1 = {
    schema_version: 1,
    id: input.id,
    pillar: "assessment",
    age_band: input.age_band,
    title: "Gather more information before recommending",
    summary:
      `We don't have enough grounded evidence yet to recommend a next step for the ${input.pillar_asked.replace(/_/g, " ")} pillar. ` +
      `Missing: ${missingLabel}.`,
    why:
      "The Pathway engine refuses to fabricate recommendations. Recording the missing signals below will unlock a grounded plan on the next generation pass.",
    next_action:
      `Collect the missing signals (${missingLabel}) via the student profile, Student Voice prompts, or an uploaded IEP, then regenerate the Pathway Report.`,
    owner_role: input.owner_role ?? "case_manager",
    timeframe: "30_day",
    confidence: "low",
    discuss_at_next_meeting: true,
    sources: [
      {
        kind: "profile",
        label: `Refusal reason: missing ${missingLabel}`,
      },
    ],
    provenance: input.provenance,
  };
  // Belt-and-suspenders: the refusal object still passes the gate.
  const parsed = RecommendationV1.safeParse(rec);
  if (!parsed.success) {
    throw new Error(
      `buildAssessmentRefusal produced an invalid RecommendationV1: ${parsed.error.message}`,
    );
  }
  return parsed.data;
}
