/**
 * Slice D8 — generatePathwayReportShadow server function (DORMANT).
 *
 * TanStack `createServerFn` that wires:
 *   supabaseAdmin  →  D5 registry loader
 *   Lovable AI GW  →  D8 recommendation generator
 *                  ↓
 *              D7 writer  →  `pathway_reports`
 *
 * Off by default. `enabled: false` is the ONLY code path that runs today;
 * flipping the flag is a deliberate operator action. When flipped:
 *   1. `requireSupabaseAuth` establishes the caller.
 *   2. We verify the caller has the `platform_admin` role via the
 *      user-scoped `context.supabase` — never via supabaseAdmin. This is
 *      the non-negotiable rule from the platform playbook: don't use the
 *      admin client to prove you're an admin.
 *   3. Only then do we dynamically import supabaseAdmin (kept behind a
 *      lazy import so the client bundle can't reach it) and hand it to
 *      the D5 loader + D7 writer as structural clients.
 *
 * No route, page, or hook imports this yet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  writePathwayReport,
  type WritePathwayReportResult,
} from "./pathway-report-writer.server";
import type {
  RegistryClient,
  RegistryListResult,
} from "./pathway-registry-loader.server";
import type { ReportWriterClient } from "./pathway-report-writer.server";
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

export type GeneratePathwayReportShadowInput = z.infer<typeof InputSchema>;

export type GeneratePathwayReportShadowResult =
  | WritePathwayReportResult
  | { ok: false; error_code: "forbidden"; message: string };

export const generatePathwayReportShadow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<GeneratePathwayReportShadowResult> => {
      // Flag-off is the only path exercised today.
      if (!data.enabled) {
        return { ok: true, status: "disabled", reason: "flag_off" };
      }

      // Prove admin via the user-scoped client (never via supabaseAdmin).
      const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
        "has_role",
        { _user_id: context.userId, _role: "admin" },
      );
      if (roleErr || !isAdmin) {
        return {
          ok: false,
          error_code: "forbidden",
          message: "generatePathwayReportShadow requires platform_admin",
        };
      }

      // Lazy import — keeps admin client out of the client module graph.
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const registryClient = buildRegistryClient(supabaseAdmin);
      const writerClient = buildWriterClient(supabaseAdmin);
      const generate = createShadowLovableRecommendationGenerator({
        model: data.modelVersion,
      });

      return await writePathwayReport({
        enabled: true,
        reportId: data.reportId,
        age_band: data.age_band,
        pillars: data.pillars as PillarInput[],
        promptVersion: data.promptVersion,
        modelVersion: data.modelVersion,
        channel: data.channel,
        registryClient,
        writerClient,
        generate,
      });
    },
  );

/* ---------- adapters over supabaseAdmin ---------- */

// Structurally-typed so we don't couple to supabase-js internals.
type AdminLike = {
  from: (table: string) => any;
};

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

function buildWriterClient(admin: AdminLike): ReportWriterClient {
  return {
    updateReport: async (reportId, columns) => {
      const { data, error } = await admin
        .from("pathway_reports")
        .update(columns)
        .eq("id", reportId);
      return { data, error };
    },
  };
}
