/**
 * Cron entry: purge obs_events older than 30 days (nightly).
 */

import { createFileRoute } from "@tanstack/react-router";
import { authorizeScheduledHook } from "@/lib/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/obs-events-purge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authorization = await authorizeScheduledHook(request);
        if (!authorization.ok) {
          return Response.json({ error: authorization.error }, { status: authorization.status });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("obs_events_purge_expired");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, deleted: data });
      },
    },
  },
});
