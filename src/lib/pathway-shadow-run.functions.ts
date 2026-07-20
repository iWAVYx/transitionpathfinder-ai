/**
 * Slice D14 — runPathwayShadowDiffAndRecordShadow server function (DORMANT).
 *
 * Admin-gated server-fn wrapper around Slice D13's
 * `runShadowDiffAndRecord`. Composes the D11 preview-diff with the D12
 * audit-log writer in a single call so an operator (or a future cron)
 * can trigger drift capture without wiring three separate endpoints.
 *
 * Off by default. `enabled: false` is the only path exercised today.
 * When flipped:
 *   1. `requireSupabaseAuth` establishes the caller.
 *   2. Admin role verified via the user-scoped `context.supabase` —
 *      never via `supabaseAdmin` (the platform playbook: don't use
 *      the admin client to prove you're an admin).
 *   3. Only then do we lazily import `supabaseAdmin` and wire it into
 *      the registry loader, current-row reader, and single-row inserter
 *      for `pathway_shadow_run_log`. No other tables are touched.
 *
 * No route, page, or hook imports this yet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  runShadowDiffAndRecord,
  type RunShadowDiffAndRecordResult,
} from "./pathway-shadow-run-orchestrator.server";
import type { CurrentReportClient } from "./pathway-report-diff.server";
import type {
  RegistryClient,
  RegistryListResult,
} from "./pathway-registry-loader.server";
import type {
  ShadowRunLogClient,
  ShadowRunLogRow,
} from "./pathway-shadow-run-recorder.server";
import { createShadowLovableRecommendationGenerator } from "./pathway-shadow-generator.server";
import type { PillarInput } from "./pathway-engine-shadow";
import { RecAgeBand } from "./pathway-recommendation-v1";

const PillarSchema = z.object({
  pillar: z.enum([
    "postsecondary_education",
    "employment",
    "independent_living",
    "community_participation",
  ]),
  signals: z
    .array(
      z.object({
        kind: z.string().min(1).max(60),
        count: z.number().int().nonnegative().max(1000),
      }),
    )
    .max(50),
});

const InputSchema = z.object({
  /** MUST be true to perform any DB work. Default false = dormant. */
  enabled: z.boolean().default(false),
  reportId: z.string().uuid(),
  age_band: RecAgeBand,
  pillars: z.array(PillarSchema).min(1).max(5),
  promptVersion: z.string().trim().min(1).max(80).default("pathway.v1"),
  modelVersion: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .default("google/gemini-3-flash-preview"),
  channel: z.enum(["shadow", "canary", "production"]).default("shadow"),
});

export type RunPathwayShadowDiffAndRecordShadowInput = z.infer<
  typeof InputSchema
>;

export type RunPathwayShadowDiffAndRecordShadowResult =
  | RunShadowDiffAndRecordResult
  | { ok: false; error_code: "forbidden"; message: string };

export const runPathwayShadowDiffAndRecordShadow = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<RunPathwayShadowDiffAndRecordShadowResult> => {
      if (!data.enabled) {
        return { ok: true, status: "disabled", reason: "flag_off" };
      }

      const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
        "has_role",
        { _user_id: context.userId, _role: "admin" },
      );
      if (roleErr || !isAdmin) {
        return {
          ok: false,
          error_code: "forbidden",
          message:
            "runPathwayShadowDiffAndRecordShadow requires platform_admin",
        };
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const registryClient = buildRegistryClient(supabaseAdmin);
      const currentClient = buildCurrentReportClient(supabaseAdmin);
      const logClient = buildLogClient(supabaseAdmin);
      const generate = createShadowLovableRecommendationGenerator({
        model: data.modelVersion,
      });

      return await runShadowDiffAndRecord({
        enabled: true,
        reportId: data.reportId,
        age_band: data.age_band,
        pillars: data.pillars as PillarInput[],
        promptVersion: data.promptVersion,
        modelVersion: data.modelVersion,
        channel: data.channel,
        registryClient,
        currentClient,
        generate,
        logClient,
        actorId: context.userId,
      });
    },
  );

/* ---------- adapters over supabaseAdmin ---------- */

type AdminLike = { from: (table: string) => any };

function buildRegistryClient(admin: AdminLike): RegistryClient {
  return {
    from: (table: string) => admin.from(table),
    fromKnowledge: () => ({
      select: (columns: string) => ({
        is: async (
          column: string,
          value: unknown,
        ): Promise<RegistryListResult<any>> => {
          const { data, error } = await admin
            .from("pathway_knowledge_sources")
            .select(columns)
            .is(column, value);
          return { data, error };
        },
      }),
    }),
  } as unknown as RegistryClient;
}

function buildCurrentReportClient(admin: AdminLike): CurrentReportClient {
  return {
    fetchReport: async (reportId) => {
      const { data, error } = await admin
        .from("pathway_reports")
        .select(
          "rules_version, prompt_version, model_version, engine_channel, knowledge_snapshot, recommendations",
        )
        .eq("id", reportId)
        .maybeSingle();
      return { data, error };
    },
  };
}

function buildLogClient(admin: AdminLike): ShadowRunLogClient {
  return {
    insertRow: async (row: ShadowRunLogRow) => {
      const { data, error } = await admin
        .from("pathway_shadow_run_log")
        .insert(row);
      return { data, error };
    },
  };
}
