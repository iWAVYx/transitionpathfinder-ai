import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { RecommendationBatchV1 } from "./pathway-recommendation-v1";
import type { CurrentReportClient } from "./pathway-report-diff.server";

const StoredComparison = z.object({
  rules_version: z.string().nullable(),
  prompt_version: z.string().nullable(),
  model_version: z.string().nullable(),
  engine_channel: z.enum(["shadow", "canary", "production", "retired"]).nullable(),
  knowledge_snapshot: z.object({ knowledge_ref: z.array(z.string()).nullable().optional() }).nullable(),
  recommended_pathways: RecommendationBatchV1,
});

/** Read actual stored columns; never reinterpret legacy prose as versioned recommendations. */
export function createCurrentReportClient(client: SupabaseClient<Database>): CurrentReportClient {
  return {
    async fetchReport(reportId) {
      const { data, error } = await client.from("pathway_reports")
        .select("rules_version, prompt_version, model_version, engine_channel, knowledge_snapshot, recommended_pathways")
        .eq("id", reportId)
        .maybeSingle();
      if (error) return { data: null, error: { message: "Could not read the saved report for comparison." } };
      if (!data) return { data: null, error: null };
      const parsed = StoredComparison.safeParse(data);
      if (!parsed.success) return { data: null, error: { message: "This saved report uses a format that cannot be compared yet." } };
      const { recommended_pathways, ...provenance } = parsed.data;
      return { data: { ...provenance, recommendations: recommended_pathways }, error: null };
    },
  };
}
