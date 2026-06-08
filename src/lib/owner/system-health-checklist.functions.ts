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
};

async function assertAdmin(supabase: ReturnType<typeof unwrap>, userId: string) {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    // fall back to legacy app_role admin
    const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!r) throw new Error("Forbidden");
  }
}
// helper to keep TS happy
function unwrap<T>(x: T): T {
  return x;
}

export const listSystemHealthChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("system_health_checks")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as SystemHealthChecklistItem[] };
  });

export const updateSystemHealthChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id: string;
    status?: ChecklistStatus;
    notes?: string | null;
    priority?: ChecklistPriority;
    action_needed?: string | null;
  }) => input)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const patch: Record<string, unknown> = {
      last_checked_at: new Date().toISOString(),
      last_checked_by: userId,
    };
    if (data.status !== undefined) patch.status = data.status;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.action_needed !== undefined) patch.action_needed = data.action_needed;
    const { data: updated, error } = await supabase
      .from("system_health_checks")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { item: updated as SystemHealthChecklistItem };
  });
