import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

// Narrow, reviewed boundary for the staging-verified RPC. Do not rewrite the
// platform-generated types or substitute an admin client for the caller.
type HistoryDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      save_pathway_report_content_atomic: {
        Args: { _report_id: string; _expected_content: Json; _next_content: Json; _change_summary: string | null };
        Returns: number;
      };
    };
  };
};

/** One authenticated RPC; any failure stops the write without a split-write fallback. */
export async function writeReportContent(
  supabase: SupabaseClient<Database>,
  reportId: string,
  expectedContent: unknown,
  nextContent: unknown,
  summary: string | null,
  operation: "save" | "regenerate",
): Promise<number> {
  const failure = operation === "save" ? "Could not save the report." : "Could not save the regenerated report.";
  try {
    const content = (value: unknown): Json => {
      const normalized = JSON.parse(JSON.stringify(value));
      if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) throw new Error(failure);
      return normalized as Json;
    };
    if (summary !== null && summary.length > 500) throw new Error(failure);
    const client = supabase as unknown as SupabaseClient<HistoryDatabase>;
    const { data, error } = await client.rpc("save_pathway_report_content_atomic", {
      _report_id: reportId,
      _expected_content: content(expectedContent),
      _next_content: content(nextContent),
      _change_summary: summary,
    });
    if (error) throw error;
    if (typeof data !== "number" || !Number.isSafeInteger(data) || data < 1 || data > 2147483647) throw new Error(failure);
    return data;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "40001") {
      throw new Error(operation === "save"
        ? "This report changed while you were saving. Reload it before trying again."
        : "This report changed during generation. Reload it before trying again.");
    }
    // Database/provider messages may contain private details. Do not expose them.
    throw new Error(failure);
  }
}
