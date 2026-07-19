// Central client-side authorization helper.
//
// Wraps the SQL `public.authorize(user_id, action, resource_type, resource_id)`
// function so server functions can enforce a single, uniform capability check
// on top of RLS. Also writes a denial row to `public.org_access_audit` so we
// have a durable record of enforcement events.
//
// This module is safe to import from `*.functions.ts` — it uses only the
// authenticated supabase client that `requireSupabaseAuth` puts on context.

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthorizeResourceType =
  | "student"
  | "document"
  | "organization"
  | "partner_capability";

export type AuthorizeArgs = {
  supabase: SupabaseClient;
  userId: string;
  action: string;
  resourceType: AuthorizeResourceType;
  resourceId?: string | null;
};

export class AuthorizationError extends Error {
  code = "AUTHZ_DENIED" as const;
  constructor(message = "You don't have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Returns true if the caller is allowed. Records a denial row on false.
 * Never throws for authorization outcome — call `assertAuthorized` for that.
 */
export async function isAuthorized(args: AuthorizeArgs): Promise<boolean> {
  const { supabase, userId, action, resourceType, resourceId } = args;
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: unknown }>)("authorize", {
    _user_id: userId,
    _action: action,
    _resource_type: resourceType,
    _resource_id: resourceId ?? null,
  });
  if (error) {
    // Fail closed on RPC error but still log the attempt.
    console.error("authorize() RPC failed", { action, resourceType, resourceId, error });
    await recordDenial(args, "rpc_error");
    return false;
  }
  const allowed = data === true;
  if (!allowed) await recordDenial(args, "denied");
  return allowed;
}

/**
 * Throws AuthorizationError with a caller-provided message when denied.
 */
export async function assertAuthorized(
  args: AuthorizeArgs,
  message?: string,
): Promise<void> {
  const ok = await isAuthorized(args);
  if (!ok) throw new AuthorizationError(message);
}

async function recordDenial(args: AuthorizeArgs, reason: string): Promise<void> {
  try {
    await (args.supabase.from("org_access_audit") as unknown as {
      insert: (row: Record<string, unknown>) => Promise<{ error: unknown }>;
    }).insert({
      actor_id: args.userId,
      action: args.action,
      resource_type: args.resourceType,
      resource_id: args.resourceId ?? null,
      decision: "deny",
      reason,
    });
  } catch (err) {
    // Never let audit failure block the caller — just log.
    console.warn("org_access_audit insert failed", err);
  }
}
