import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Confirm the exact caller-owned mutation; an RLS-filtered no-op is not success. */
export async function revokeOwnedShareToken(
  supabase: SupabaseClient<Database>, userId: string, tokenId: string,
): Promise<void> {
  const failure = "We couldn't confirm that the link was revoked. Refresh and try again.";
  try {
    const { data, error } = await supabase.from("share_tokens")
      .update({ revoked: true })
      .eq("id", tokenId)
      .eq("created_by", userId)
      .select("id, revoked")
      .maybeSingle();
    if (error || !data || data.id !== tokenId || data.revoked !== true) throw new Error(failure);
  } catch {
    throw new Error(failure);
  }
}
