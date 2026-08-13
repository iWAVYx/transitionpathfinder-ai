/**
 * Cron entry: evaluate observability alert rules every 5 minutes.
 * Called by pg_cron with a dedicated per-environment bearer secret.
 */

import { createFileRoute } from "@tanstack/react-router";
import { authorizeScheduledHook } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/obs-alert-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = await authorizeScheduledHook(request);
        if (!authorization.ok) {
          return Response.json({ error: authorization.error }, { status: authorization.status });
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
