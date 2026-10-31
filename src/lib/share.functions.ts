import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { projectSharedReport } from "@/lib/shared-report-projection";

// Public application entry point; the database RPCs are server-only.
// The token resolver still checks revocation/expiry and binds the report and
// audience. Never replace this with a public-key client or direct table reads.
export const resolveShareToken = createServerFn({ method: "POST" })
  .validator((i: unknown) => z.object({ token: z.string().min(8).max(128) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin;
    const { data: rows, error } = await sb.rpc("resolve_share_token", { _token: data.token });
    if (error || !rows || rows.length === 0) {
      return { ok: false as const };
    }
    const r = rows[0] as { report_id: string; audience: string; content: unknown; created_at: string };
    const audience = z.enum(["family", "educator"]).safeParse(r.audience);
    if (!audience.success) return { ok: false as const };
    const report = projectSharedReport(r.content, audience.data);
    if (!report) return { ok: false as const };
    // Track only links with a valid audience and a renderable document.
    await sb.rpc("track_share_view", { _token: data.token });
    return {
      ok: true as const,
      audience: audience.data,
      report,
      created_at: r.created_at,
    };
  });
