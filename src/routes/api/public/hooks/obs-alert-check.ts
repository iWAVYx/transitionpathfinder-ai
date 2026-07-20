/**
 * Cron entry: evaluate observability alert rules every 5 minutes.
 * Called by pg_cron with the project anon key in the `apikey` header.
 */

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/obs-alert-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apikey || !expected || apikey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const { runAlertCheck } = await import("@/lib/obs/alerts.server");
        try {
          const result = await runAlertCheck();
          return Response.json({ ok: true, ...result });
        } catch (e) {
          console.error("[obs-alert-check] failed:", e);
          return Response.json({ ok: false, error: String(e) }, { status: 500 });
        }
      },
    },
  },
});
