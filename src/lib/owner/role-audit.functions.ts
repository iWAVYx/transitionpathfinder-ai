import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RoleAuditReadiness = "ready" | "needs_review" | "staged" | "blocked";

export type RoleAuditReview = {
  id: string;
  role_key: string;
  role_label: string;
  purpose: string;
  issues_found: string;
  issues_fixed: string;
  staged_items: string;
  notes: string;
  readiness: RoleAuditReadiness;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  updated_at: string;
};

type AnySupabase = {
  from: (t: string) => {
    select: (c: string) => {
      order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        select: (c: string) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
      };
    };
  };
};

async function assertPlatformAdmin(supabase: unknown, userId: string) {
  const s = supabase as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (c: string, v: string) => {
          maybeSingle?: () => Promise<{ data: unknown }>;
          eq?: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> };
        };
      };
    };
  };
  const adminRow = await s.from("admin_roles").select("role").eq("user_id", userId).maybeSingle?.();
  if (adminRow?.data) return;
  const legacy = await s.from("user_roles").select("role").eq("user_id", userId).eq?.("role", "admin").maybeSingle();
  if (!legacy?.data) throw new Error("Forbidden");
}

export const listRoleAuditReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const { data, error } = await (supabase as unknown as AnySupabase)
      .from("admin_audit_reviews")
      .select("*")
      .order("role_label", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as RoleAuditReview[];
  });

export const updateRoleAuditReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: {
    id: string;
    purpose?: string;
    issues_found?: string;
    issues_fixed?: string;
    staged_items?: string;
    notes?: string;
    readiness?: RoleAuditReadiness;
    mark_reviewed?: boolean;
  }) => data)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);
    const patch: Record<string, unknown> = {};
    for (const k of ["purpose", "issues_found", "issues_fixed", "staged_items", "notes"] as const) {
      if (typeof data[k] === "string") patch[k] = data[k];
    }
    if (data.readiness && ["ready", "needs_review", "staged", "blocked"].includes(data.readiness)) {
      patch.readiness = data.readiness;
    }
    if (data.mark_reviewed) {
      patch.last_reviewed_at = new Date().toISOString();
      patch.last_reviewed_by = userId;
    }
    const { data: row, error } = await (supabase as unknown as AnySupabase)
      .from("admin_audit_reviews")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as RoleAuditReview;
  });
