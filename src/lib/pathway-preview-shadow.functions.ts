/**
 * Slice D9 — previewPathwayReportShadow server function (DORMANT).
 *
 * Read-only companion to Slice D8's `generatePathwayReportShadow`. Runs
 * the D5 loader + D6 engine adapter through the D7 `previewPathwayReport`
 * helper and returns the batch + provenance columns the shadow writer
 * *would* stamp — without ever calling the writer. This is the operator
 * inspection surface used before flipping the shadow write flag.
 *
 * Off by default. `enabled: false` is the only path exercised today.
 * When flipped:
 *   1. `requireSupabaseAuth` establishes the caller.
 *   2. We verify the caller has the `admin` role via the user-scoped
 *      `context.supabase` — never via `supabaseAdmin`.
 *   3. Only then do we lazily import `supabaseAdmin` (structural
 *      registry client only — no writer client is built here) and hand
 *      it to the D5 loader.
 *
 * No route, page, or hook imports this yet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  previewPathwayReport,
  type PreviewPathwayReportResult,
} from "./pathway-report-writer.server";
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

export type PreviewPathwayReportShadowInput = z.infer<typeof InputSchema>;

export type PreviewPathwayReportShadowResult =
  | PreviewPathwayReportResult
  | { ok: false; error_code: "forbidden"; message: string };

export const previewPathwayReportShadow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<PreviewPathwayReportShadowResult> => {
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
          message: "previewPathwayReportShadow requires platform_admin",
        };
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const registryClient = buildRegistryClient(supabaseAdmin);
      const generate = createShadowLovableRecommendationGenerator({
        model: data.modelVersion,
      });

      return await previewPathwayReport({
        enabled: true,
        reportId: data.reportId,
        age_band: data.age_band,
        pillars: data.pillars as PillarInput[],
        promptVersion: data.promptVersion,
        modelVersion: data.modelVersion,
        channel: data.channel,
        registryClient,
        generate,
      });
    },
  );

/* ---------- adapter over supabaseAdmin (loader-only) ---------- */

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
