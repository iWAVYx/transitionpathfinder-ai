import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChecklistStatus = "working" | "needs_attention" | "not_connected" | "coming_soon";
export type ChecklistPriority = "low" | "medium" | "high" | "critical";

export type SystemHealthChecklistItem = {
  id: string;
  key: string;
  label: string;
  category: string;
  status: ChecklistStatus;
  notes: string | null;
  route: string | null;
  backend_table: string | null;
  priority: ChecklistPriority;
  action_needed: string | null;
  last_checked_at: string | null;
  sort_order: number;
  pass_criteria: string | null;
  fail_criteria: string | null;
  reference: string | null;
};

type AnySupabase = {
  from: (table: string) => {
    select: (cols: string) => {
      order?: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown; error: { message: string } | null }>;
      eq?: (col: string, val: string) => {
        eq?: (col: string, val: string) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> };
        maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: string) => {
        select: (cols: string) => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
      };
    };
  };
};

async function assertAdmin(supabase: AnySupabase, userId: string) {
  const adminRolesQ = supabase.from("admin_roles").select("role").eq?.("user_id", userId);
  const adminRow = await adminRolesQ?.maybeSingle();
  if (adminRow?.data) return;
  const legacy = await supabase
    .from("user_roles")
    .select("role")
    .eq?.("user_id", userId)
    .eq?.("role", "admin")
    .maybeSingle();
  if (!legacy?.data) throw new Error("Forbidden");
}

export const listSystemHealthChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase as unknown as AnySupabase, userId);
    const { data, error } = await (supabase as unknown as AnySupabase)
      .from("system_health_checks")
      .select("*")
      .order!("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as SystemHealthChecklistItem[] };
  });

export const updateSystemHealthChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: {
    id: string;
    status?: ChecklistStatus;
    notes?: string | null;
    priority?: ChecklistPriority;
    action_needed?: string | null;
  }) => input)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase as unknown as AnySupabase, userId);
    const patch: Record<string, unknown> = {
      last_checked_at: new Date().toISOString(),
      last_checked_by: userId,
    };
    if (data.status !== undefined) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.action_needed !== undefined) patch.action_needed = data.action_needed;
    const { data: updated, error } = await (supabase as unknown as AnySupabase)
      .from("system_health_checks")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: updated as SystemHealthChecklistItem };
  });
