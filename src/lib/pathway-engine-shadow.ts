/**
 * Slice D6 — Pathway shadow-channel engine adapter (DORMANT, isomorphic).
 *
 * Pure orchestrator that composes the D2 schema gate + refusal path with
 * the D4/D5 provenance and a caller-supplied recommendation generator to
 * produce a schema-validated `RecommendationBatchV1`. No supabase client,
 * no AI call, no DB write here — the generator is injected so tests can
 * stub it deterministically and the eventual server function decides
 * whether to hit the Lovable AI Gateway or the demo engine.
 *
 * Contract per pillar:
 *   1. `assessEvidenceSufficiency` on the signals passed for that pillar.
 *   2. Insufficient → emit `buildAssessmentRefusal` (schema-validated).
 *   3. Sufficient   → call the injected generator, then re-parse every
 *      emitted rec through `parseRecommendationBatchV1`. Any schema
 *      failure short-circuits the whole run — we never silently drop
 *      invalid recs onto the wire.
 *
 * The engine is off by default. `runPathwayEngineShadow` respects an
 * explicit `enabled: false` short-circuit so callers can wire the
 * flag-off path without duplicating the guard.
 */
import {
  RecommendationBatchV1,
  assessEvidenceSufficiency,
  buildAssessmentRefusal,
  parseRecommendationBatchV1,
  type EvidenceSignal,
  type RecAgeBand,
  type RecPillar,
  type RecProvenance,
  type RecommendationV1,
} from "./pathway-recommendation-v1.ts";

/** Pillars the engine actually plans for — `assessment` is refusal-only. */
export type PlannablePillar = Exclude<RecPillar, "assessment">;

export interface PillarInput {
  pillar: PlannablePillar;
  signals: EvidenceSignal[];
}

export interface GenerateRecommendationsInput {
  pillar: PlannablePillar;
  age_band: RecAgeBand;
  signals: EvidenceSignal[];
  provenance: RecProvenance;
}

/**
 * Injected generator. Must return already-shaped recommendations — the
 * orchestrator re-validates them through the schema gate. Throwing here
 * surfaces as `error_code: "generator_threw"` on the run result.
 */
export type RecommendationGenerator = (
  input: GenerateRecommendationsInput,
) => Promise<RecommendationV1[]>;

export interface RunPathwayEngineInput {
  enabled: boolean;
  reportId: string;
  age_band: RecAgeBand;
  pillars: PillarInput[];
  provenance: RecProvenance;
  generate: RecommendationGenerator;
}

export type RunPathwayEngineResult =
  | {
      ok: true;
      status: "disabled";
      reason: "flag_off";
    }
  | {
      ok: true;
      status: "produced";
      batch: RecommendationV1[];
      per_pillar: Array<{
        pillar: PlannablePillar;
        outcome: "refused" | "generated";
        count: number;
      }>;
    }
  | {
      ok: false;
      error_code:
        | "duplicate_pillar"
        | "generator_threw"
        | "schema_invalid"
        | "batch_invalid";
      message: string;
      pillar?: PlannablePillar;
    };

/**
 * Deterministic refusal-id builder — keeps refusal recs stable across
 * runs of the same (report, pillar) pair so downstream diffs stay clean.
 */
export function refusalIdFor(reportId: string, pillar: PlannablePillar): string {
  return `refusal:${reportId}:${pillar}`;
}

export async function runPathwayEngineShadow(
  input: RunPathwayEngineInput,
): Promise<RunPathwayEngineResult> {
  if (!input.enabled) {
    return { ok: true, status: "disabled", reason: "flag_off" };
  }

  // Reject duplicate pillar inputs up front — silently merging them
  // would let a caller double-weight one dimension without noticing.
  const seen = new Set<PlannablePillar>();
  for (const p of input.pillars) {
    if (seen.has(p.pillar)) {
      return {
        ok: false,
        error_code: "duplicate_pillar",
        message: `pillar "${p.pillar}" appeared more than once in input`,
        pillar: p.pillar,
      };
    }
    seen.add(p.pillar);
  }

  const batch: RecommendationV1[] = [];
  const per_pillar: Array<{
    pillar: PlannablePillar;
    outcome: "refused" | "generated";
    count: number;
  }> = [];

  for (const p of input.pillars) {
    const sufficiency = assessEvidenceSufficiency(p.signals);
    if (!sufficiency.sufficient) {
      const refusal = buildAssessmentRefusal({
        id: refusalIdFor(input.reportId, p.pillar),
        age_band: input.age_band,
        pillar_asked: p.pillar,
        missing: sufficiency.missing,
        provenance: input.provenance,
      });
      batch.push(refusal);
      per_pillar.push({ pillar: p.pillar, outcome: "refused", count: 1 });
      continue;
    }

    let generated: RecommendationV1[];
    try {
      generated = await input.generate({
        pillar: p.pillar,
        age_band: input.age_band,
        signals: p.signals,
        provenance: input.provenance,
      });
    } catch (err) {
      return {
        ok: false,
        error_code: "generator_threw",
        message: err instanceof Error ? err.message : String(err),
        pillar: p.pillar,
      };
    }

    // Schema gate — never trust the generator's output shape.
    const parsed = parseRecommendationBatchV1(generated);
    if (!parsed.ok) {
      return {
        ok: false,
        error_code: "schema_invalid",
        message: parsed.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
        pillar: p.pillar,
      };
    }

    batch.push(...parsed.value);
    per_pillar.push({
      pillar: p.pillar,
      outcome: "generated",
      count: parsed.value.length,
    });
  }

  // Whole-batch validation (uniqueness across pillars is enforced by
  // `RecommendationBatchV1` — a generator that reuses an id across
  // pillars must be caught here, not shipped downstream).
  const wholeBatch = RecommendationBatchV1.safeParse(batch);
  if (!wholeBatch.success) {
    return {
      ok: false,
      error_code: "batch_invalid",
      message: wholeBatch.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    };
  }

  return { ok: true, status: "produced", batch: wholeBatch.data, per_pillar };
}
