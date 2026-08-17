import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SECURITY: lazy-load service-role client to keep `client.server` out of client bundle graph.
let _supabaseAdmin: any;
async function getAdmin() {
  if (!_supabaseAdmin) {
    const m = await import("@/integrations/supabase/client.server");
    _supabaseAdmin = m.supabaseAdmin;
  }
  return _supabaseAdmin;
}

async function requirePlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: Platform admin access required.");
}

async function logActivity(
  userId: string,
  action_type: string,
  target_type: string | null,
  target_id: string | null,
  details: Record<string, unknown> = {},
) {
  try {
    await (await getAdmin()).from("admin_activity_logs").insert({
      admin_user_id: userId,
      action_type,
      target_type,
      target_id,
      details: details as any,
    });
  } catch (e) {
    console.error("logActivity failed", e);
  }
}

// ---------- Organizations ----------

export type OrgRow = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  state: string | null;
  website: string | null;
  contact_email: string | null;
  verified_status: "pending" | "verified" | "rejected";
  created_at: string;
  member_count: number;
  opportunity_count: number;
};

export const platformListOrganizations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { data: orgs, error } = await (await getAdmin())
      .from("organizations")
      .select("id, name, type, city, state, website, contact_email, verified_status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error(error);
      return { organizations: [] as OrgRow[] };
    }
    const ids = (orgs ?? []).map((o: any) => o.id);
    const [{ data: members }, { data: opps }] = await Promise.all([
      ids.length
        ? (await getAdmin())
            .from("organization_memberships")
            .select("organization_id")
            .in("organization_id", ids)
            .eq("status", "active")
        : Promise.resolve({ data: [] as any[] }),
      ids.length
        ? (await getAdmin())
            .from("partner_opportunities")
            .select("organization_id")
            .in("organization_id", ids)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const memCount = new Map<string, number>();
    for (const m of members ?? []) memCount.set(m.organization_id, (memCount.get(m.organization_id) ?? 0) + 1);
    const oppCount = new Map<string, number>();
    for (const o of opps ?? []) oppCount.set(o.organization_id, (oppCount.get(o.organization_id) ?? 0) + 1);
    return {
      organizations: (orgs ?? []).map((o: any) => ({
        ...o,
        member_count: memCount.get(o.id) ?? 0,
        opportunity_count: oppCount.get(o.id) ?? 0,
      })) as OrgRow[],
    };
  });

export const platformDecideOrganization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["verified", "rejected", "pending"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { error } = await (await getAdmin())
      .from("organizations")
      .update({ verified_status: data.decision, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `org.${data.decision}`, "organization", data.id);
    return { ok: true };
  });

// ---------- Opportunities ----------

export type OpportunityRow = {
  id: string;
  title: string;
  opportunity_type: string;
  status: "draft" | "pending_review" | "approved" | "inactive";
  location: string | null;
  organization_id: string;
  organization_name: string | null;
  organization_verified: string | null;
  created_at: string;
  updated_at: string;
};

export const platformListOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        status: z
          .enum(["draft", "pending_review", "approved", "inactive", "all"])
          .default("pending_review"),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    let q = (await getAdmin())
      .from("partner_opportunities")
      .select("id, title, opportunity_type, status, location, organization_id, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) {
      console.error(error);
      return { opportunities: [] as OpportunityRow[] };
    }
    const orgIds = Array.from(new Set((rows ?? []).map((r: any) => r.organization_id)));
    const { data: orgs } = orgIds.length
      ? await (await getAdmin())
          .from("organizations")
          .select("id, name, verified_status")
          .in("id", orgIds)
      : { data: [] as any[] };
    const orgMap = new Map<string, { name: string; verified_status: string }>();
    for (const o of orgs ?? []) orgMap.set(o.id, { name: o.name, verified_status: o.verified_status });
    return {
      opportunities: (rows ?? []).map((r: any) => ({
        ...r,
        organization_name: orgMap.get(r.organization_id)?.name ?? null,
        organization_verified: orgMap.get(r.organization_id)?.verified_status ?? null,
      })) as OpportunityRow[],
    };
  });

export const platformDecideOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "inactive", "pending_review", "draft"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { error } = await (await getAdmin())
      .from("partner_opportunities")
      .update({ status: data.decision, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(context.userId, `opportunity.${data.decision}`, "partner_opportunity", data.id);
    return { ok: true };
  });

// ---------- Users ----------

export type PlatformUserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  admin_roles: string[];
};

export const platformListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ search: z.string().trim().max(120).optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const map = new Map<string, { email: string | null; created_at: string; last_sign_in_at: string | null }>();
    try {
      let page = 1;
      while (true) {
        const { data: list, error } = await (await getAdmin()).auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        for (const u of list.users) {
          map.set(u.id, {
            email: u.email ?? null,
            created_at: u.created_at,
            last_sign_in_at: (u as any).last_sign_in_at ?? null,
          });
        }
        if (list.users.length < 200) break;
        page++;
        if (page > 10) break;
      }
    } catch (e) {
      console.error("listUsers failed", e);
    }
    const ids = Array.from(map.keys());
    if (!ids.length) return { users: [] as PlatformUserRow[] };
    const [{ data: profiles }, { data: userRoles }, { data: adminRoles }] = await Promise.all([
      (await getAdmin()).from("profiles").select("id, full_name").in("id", ids),
      (await getAdmin()).from("user_roles").select("user_id, role").in("user_id", ids),
      (await getAdmin()).from("admin_roles").select("user_id, role").in("user_id", ids),
    ]);
    const nameMap = new Map<string, string | null>();
    for (const p of profiles ?? []) nameMap.set(p.id, p.full_name ?? null);
    const roleMap = new Map<string, string[]>();
    for (const r of userRoles ?? []) {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    }
    const adminMap = new Map<string, string[]>();
    for (const r of adminRoles ?? []) {
      const arr = adminMap.get(r.user_id) ?? [];
      arr.push(r.role);
      adminMap.set(r.user_id, arr);
    }
    let users: PlatformUserRow[] = ids.map((id) => {
      const u = map.get(id)!;
      return {
        id,
        email: u.email,
        full_name: nameMap.get(id) ?? null,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        roles: roleMap.get(id) ?? [],
        admin_roles: adminMap.get(id) ?? [],
      };
    });
    if (data.search) {
      const q = data.search.toLowerCase();
      users = users.filter(
        (u) =>
          (u.email ?? "").toLowerCase().includes(q) ||
          (u.full_name ?? "").toLowerCase().includes(q),
      );
    }
    users.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { users: users.slice(0, 500) };
  });
