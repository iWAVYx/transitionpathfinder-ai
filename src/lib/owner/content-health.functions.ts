import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type {
  ContentHealthReport,
  ContentHealthCheck,
  ContentHealthSeverity,
  ContentHealthSample,
} from "./content-health.server";

export const getContentHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requirePlatformAdminAccess, buildContentHealthReport } = await import(
      "./content-health.server"
    );
    await requirePlatformAdminAccess(context.supabase, context.userId);
    return buildContentHealthReport(context.supabase);
  });
