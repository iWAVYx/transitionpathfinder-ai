import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAuthorized } from "./authz";

/** School / district search + request-to-join + membership approval. */

export type Organization = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  state: string | null;
  parent_organization_id: string | null;
  status: string;
};

export const searchOrganizations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        q: z.string().trim().min(1).max(120),
        type: z.enum(["school", "district", "partner", "any"]).default("any"),
        limit: z.number().int().min(1).max(50).default(20),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    let q = supabase
      .from("organizations")
      .select("id, name, type, city, state, parent_organization_id, status")
      .ilike("name", `%${data.q}%`)
      .order("name", { ascending: true })
      .limit(data.limit);
    if (data.type !== "any") q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) {
      console.error("searchOrganizations failed", error);
      return { organizations: [] as Organization[] };
    }
    return { organizations: (rows ?? []) as Organization[] };
  });

export const requestOrgAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        organization_id: z.string().uuid(),
        requested_role: z.enum([
          "educator",
          "case_manager",
          "school_admin",
          "district_admin",
          "partner",
        ]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("organization_memberships")
      .upsert(
        {
          organization_id: data.organization_id,
          user_id: userId,
          role_within_org: data.requested_role,
          status: "pending",
          membership_status: "pending",
        } as never,
        { onConflict: "organization_id,user_id" },
      );
    if (error) {
      console.error("requestOrgAccess failed", error);
      throw new Error("Could not submit access request.");
    }
    return { ok: true };
  });

export const approveOrgMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        membership_id: z.string().uuid(),
        decision: z.enum(["approve", "deny"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Caller must be org admin (enforced via RLS + this guard).
    const { data: mem, error: findErr } = await supabase
      .from("organization_memberships")
      .select("id, organization_id")
      .eq("id", data.membership_id)
      .maybeSingle();
    if (findErr || !mem) throw new Error("Membership not found.");

    const orgId = (mem as { organization_id: string }).organization_id;
    await assertAuthorized(
      { supabase, userId, action: "manage", resourceType: "organization", resourceId: orgId },
      "Not authorized to approve memberships for this organization.",
    );

    const patch =
      data.decision === "approve"
        ? { status: "active", membership_status: "active" }
        : { status: "removed", membership_status: "removed" };
    const { error } = await supabase
      .from("organization_memberships")
      .update(patch as never)
      .eq("id", data.membership_id);
    if (error) throw new Error("Could not update membership.");
    return { ok: true };
  });

export const listMyOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("organization_memberships")
      .select(
        "id, role_within_org, membership_status, organization:organizations(id, name, type, city, state, parent_organization_id, status)",
      )
      .eq("user_id", userId);
    if (error) {
      console.error("listMyOrganizations failed", error);
      return { memberships: [] };
    }
    return { memberships: data ?? [] };
  });
