/**
 * Workstream 6 — Access code redemption.
 *
 * Thin server-function wrapper around the `public.redeem_access_code`
 * SECURITY DEFINER RPC. The RPC does all validation, capacity, and
 * audit-write work atomically; this function only proxies the call as
 * the authenticated user and normalizes the JSON response.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CODE_INPUT = z.object({
  code: z.string().trim().min(1).max(128),
});

export type RedeemAccessCodeResult =
  | {
      ok: true;
      code_id: string;
      org_id: string | null;
      sponsor_org_id?: string | null;
      role: string;
      scope: string;
    }
  | {
      ok: false;
      reason:
        | "invalid_code"
        | "unknown_code"
        | "revoked"
        | "expired"
        | "over_capacity"
        | "already_redeemed"
        | "role_mismatch"
        | "unknown_error";
      code_id?: string;
      org_id?: string | null;
      role?: string;
      account_role?: string | null;
      required_role?: string;
    };

export const getMyActivatedLicenseRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string | null> => {
    const { data, error } = await context.supabase.rpc(
      "my_activated_license_role",
    );
    if (error) {
      console.error("my_activated_license_role failed", error);
      throw new Error("Could not verify your activated license.");
    }
    return typeof data === "string" && data.length > 0 ? data : null;
  });

export const redeemAccessCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => CODE_INPUT.parse(i))
  .handler(async ({ data, context }): Promise<RedeemAccessCodeResult> => {
    const { supabase } = context;
    const { data: rpc, error } = await supabase.rpc("redeem_access_code", {
      _code: data.code,
    });
    if (error) {
      console.error("redeemAccessCode RPC failed", error);
      return { ok: false, reason: "unknown_error" };
    }
    // Postgres jsonb comes back as an object; validate shape defensively.
    if (rpc && typeof rpc === "object" && "ok" in rpc) {
      return rpc as RedeemAccessCodeResult;
    }
    return { ok: false, reason: "unknown_error" };
  });
