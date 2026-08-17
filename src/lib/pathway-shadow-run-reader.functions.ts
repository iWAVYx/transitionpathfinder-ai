/**
 * Slice D15 — listPathwayShadowRuns server function (DORMANT).
 *
 * Admin-gated read-only wrapper around Slice D15's `listShadowRuns`.
 * Off by default. `enabled: false` is the only path exercised today.
 * When flipped:
 *   1. `requireSupabaseAuth` establishes the caller.
 *   2. Admin role verified via the user-scoped `context.supabase` —
 *      never via `supabaseAdmin` (platform playbook: don't use the
 *      admin client to prove you're an admin).
 *   3. Only then do we lazily import `supabaseAdmin` and wire it into a
 *      structural reader over `pathway_shadow_run_log`. No writes.
 *
 * No route, page, or hook imports this yet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  listShadowRuns,
  type ListShadowRunsResult,
  type ShadowRunLogReader,
  type NormalizedShadowRunLogQuery,
} from "./pathway-shadow-run-reader.server";

const InputSchema = z.object({
  /** MUST be true to perform any DB work. Default false = dormant. */
  enabled: z.boolean().default(false),
  reportId: z.string().uuid().nullish(),
  rulesVersion: z.string().trim().min(1).max(120).nullish(),
  channel: z.enum(["shadow", "canary", "production"]).nullish(),
  driftOnly: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

export type ListPathwayShadowRunsInput = z.infer<typeof InputSchema>;

export type ListPathwayShadowRunsResult =
  | ListShadowRunsResult
  | { ok: false; error_code: "forbidden"; message: string };

export const listPathwayShadowRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => InputSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<ListPathwayShadowRunsResult> => {
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
          message: "listPathwayShadowRuns requires platform_admin",
        };
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );

      const logReader: ShadowRunLogReader = {
        list: async (query: NormalizedShadowRunLogQuery) => {
          let q = supabaseAdmin
            .from("pathway_shadow_run_log")
            .select(
              "id, report_id, run_at, channel, rules_version, prompt_version, model_version, identical, added_count, removed_count, changed_count, unchanged_count, knowledge_added, knowledge_removed, provenance_changed, diff, actor_id, created_at",
            )
            .order("run_at", { ascending: false })
            .limit(query.limit);
          if (query.reportId) q = q.eq("report_id", query.reportId);
          if (query.rulesVersion) q = q.eq("rules_version", query.rulesVersion);
          if (query.channel) q = q.eq("channel", query.channel);
          if (query.driftOnly) q = q.eq("identical", false);
          const { data: rows, error } = await q;
          return { data: rows as any, error };
        },
      };

      return await listShadowRuns({
        enabled: true,
        reportId: data.reportId ?? null,
        rulesVersion: data.rulesVersion ?? null,
        channel: data.channel ?? null,
        driftOnly: data.driftOnly,
        limit: data.limit,
        logReader,
      });
    },
  );
