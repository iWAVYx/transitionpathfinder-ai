/**
 * Slice D11 — previewPathwayReportDiffShadow server function (DORMANT).
 *
 * Read-only companion to Slice D9's `previewPathwayReportShadow`. Runs
 * the D11 `previewPathwayReportDiff` orchestrator, which composes the
 * D9 preview with a fetch of the current `pathway_reports` row and
 * hands both to the D10 diff. Returns the structured drift report an
 * operator uses before flipping the shadow write flag.
 *
 * Off by default. `enabled: false` is the only path exercised today.
 * When flipped:
 *   1. `requireSupabaseAuth` establishes the caller.
 *   2. We verify the caller has the `admin` role via the user-scoped
 *      `context.supabase` — never via `supabaseAdmin`.
 *   3. Only then do we lazily import `supabaseAdmin` (loader + current-
 *      row reader; no writer client is built here) and hand it to the
 *      diff orchestrator.
 *
 * No route, page, or hook imports this yet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  previewPathwayReportDiff,
  type CurrentReportClient,
  type PreviewPathwayReportDiffResult,
} from "./pathway-report-diff.server";
import type {
  RegistryClient,
  RegistryListResult,
} from "./pathway-registry-loader.server";
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
  /** MUST be true to perform any DB read. Default false = dormant. */
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

export type PreviewPathwayReportDiffShadowInput = z.infer<typeof InputSchema>;

export type PreviewPathwayReportDiffShadowResult =
  | PreviewPathwayReportDiffResult
  | { ok: false; error_code: "forbidden"; message: string };

export const previewPathwayReportDiffShadow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<PreviewPathwayReportDiffShadowResult> => {
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
          message: "previewPathwayReportDiffShadow requires platform_admin",
        };
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const registryClient = buildRegistryClient(supabaseAdmin);
      const currentClient = buildCurrentReportClient(supabaseAdmin);
      const generate = createShadowLovableRecommendationGenerator({
        model: data.modelVersion,
      });

      return await previewPathwayReportDiff({
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
      });
    },
  );

/* ---------- adapters over supabaseAdmin (read-only) ---------- */

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
