import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export {
  SUPPORT_ACCESS_SCOPES,
  SUPPORT_ACCESS_SCOPE_LABELS,
} from "./support-access.server";
export type { SupportAccessGrant, SupportAccessScope } from "./support-access.server";

export const listSupportAccessGrants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requirePlatformAdminAccess, listGrants } = await import("./support-access.server");
    await requirePlatformAdminAccess(context.supabase, context.userId);
    return listGrants(context.supabase, 100);
  });

export const revokeSupportAccessGrant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdminAccess, revokeGrant } = await import("./support-access.server");
    await requirePlatformAdminAccess(context.supabase, context.userId);
    await revokeGrant(context.supabase, context.userId, data.id);
    return { ok: true };
  });
