import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Read + admin-write of access_entitlements. Data-only — no payment provider. */

export type EffectiveEntitlement = {
  organization_id: string;
  plan_type: string;
  status: string;
  via_district: boolean;
  grants_family_access: boolean;
  grants_student_access: boolean;
  grants_partner_access: boolean;
  ends_at: string | null;
};

export const getMyEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("effective_entitlement_for_user", {
      _user_id: userId,
    });
    if (error) {
      console.error("getMyEntitlement failed", error);
      return { entitlements: [] as EffectiveEntitlement[] };
    }
    const list = (data ?? []) as EffectiveEntitlement[];
    return {
      entitlements: list,
      // Convenience summary: best entitlement wins.
      summary: list.length
        ? {
            isActive: true,
            plan: list[0].plan_type,
            viaDistrict: list.some((e) => e.via_district),
            features: {
              family: list.some((e) => e.grants_family_access),
              student: list.some((e) => e.grants_student_access),
              partner: list.some((e) => e.grants_partner_access),
            },
          }
        : { isActive: false, plan: null, viaDistrict: false, features: { family: false, student: false, partner: false } },
    };
  });

export const listOrgEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ organization_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("access_entitlements")
      .select("*")
      .eq("organization_id", data.organization_id)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("listOrgEntitlements failed", error);
      return { entitlements: [] };
    }
    return { entitlements: rows ?? [] };
  });

const PLAN_TYPE = z.enum([
  "family_early_access",
  "individual",
  "school_pilot",
  "school_plan",
  "district_plan",
  "partner_org",
  "comp",
]);

export const setEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        organization_id: z.string().uuid(),
        plan_type: PLAN_TYPE,
        status: z.enum(["trial", "pilot", "active", "comped", "expired", "canceled"]),
        starts_at: z.string().optional(),
        ends_at: z.string().nullable().optional(),
        max_schools: z.number().int().min(0).max(10000).nullable().optional(),
        max_students: z.number().int().min(0).max(1000000).nullable().optional(),
        max_staff: z.number().int().min(0).max(100000).nullable().optional(),
        grants_family_access: z.boolean().optional(),
        grants_student_access: z.boolean().optional(),
        grants_partner_access: z.boolean().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleErr } = await supabase.rpc("is_platform_admin", {
      _user_id: userId,
    });
    if (roleErr || !isAdmin) throw new Error("Not authorized.");

    const payload = {
      organization_id: data.organization_id,
      plan_type: data.plan_type,
      status: data.status,
      starts_at: data.starts_at ?? new Date().toISOString(),
      ends_at: data.ends_at ?? null,
      max_schools: data.max_schools ?? null,
      max_students: data.max_students ?? null,
      max_staff: data.max_staff ?? null,
      grants_family_access: data.grants_family_access ?? false,
      grants_student_access: data.grants_student_access ?? false,
      grants_partner_access: data.grants_partner_access ?? false,
      notes: data.notes ?? null,
    };

    if (data.id) {
      const { error } = await supabase
        .from("access_entitlements")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw new Error("Could not update entitlement.");
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("access_entitlements")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error("Could not create entitlement.");
    return { ok: true, id: (row as { id: string }).id };
  });
