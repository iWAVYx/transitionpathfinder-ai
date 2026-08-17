import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { PathwayReport } from "@/lib/pathway.functions";

// Public, unauthenticated share-token resolver.
// Uses anon key — RLS + the security-definer resolver function gate access.
function publicClient() {
  const url = process.env.SUPABASE_URL!;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, anon, { auth: { persistSession: false } });
}

export const resolveShareToken = createServerFn({ method: "POST" })
  .validator((i: unknown) => z.object({ token: z.string().min(8).max(128) }).parse(i))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: rows, error } = await sb.rpc("resolve_share_token", { _token: data.token });
    if (error || !rows || rows.length === 0) {
      return { ok: false as const };
    }
    const r = rows[0] as { report_id: string; audience: string; content: unknown; created_at: string };
    // Fire-and-forget view tracking
    await sb.rpc("track_share_view", { _token: data.token });
    return {
      ok: true as const,
      audience: r.audience as "family" | "educator",
      report: r.content as PathwayReport,
      created_at: r.created_at,
    };
  });
