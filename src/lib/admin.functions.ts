import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuditEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  student_id: string | null;
  created_at: string;
  metadata: unknown;
};

export type AdminSummary = {
  is_admin: boolean;
  totals: {
    students: number;
    reports: number;
    documents: number;
    collaborators: number;
    audit_entries: number;
  };
};

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}


export const getAdminSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    if (!admin) {
      return {
        is_admin: false,
        totals: { students: 0, reports: 0, documents: 0, collaborators: 0, audit_entries: 0 },
      } satisfies AdminSummary;
    }
    const counts = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }),
      supabase.from("pathway_reports").select("id", { count: "exact", head: true }),
      supabase.from("documents").select("id", { count: "exact", head: true }),
      supabase.from("student_collaborators").select("id", { count: "exact", head: true }),
      supabase.from("audit_log").select("id", { count: "exact", head: true }),
    ]);
    return {
      is_admin: true,
      totals: {
        students: counts[0].count ?? 0,
        reports: counts[1].count ?? 0,
        documents: counts[2].count ?? 0,
        collaborators: counts[3].count ?? 0,
        audit_entries: counts[4].count ?? 0,
      },
    } satisfies AdminSummary;
  });

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(200).default(100),
        action: z.string().trim().max(100).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const admin = await isAdmin(supabase, userId);
    if (!admin) {
      return { entries: [] as AuditEntry[], is_admin: false };
    }
    let q = supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, error } = await q;
    if (error) {
      console.error("listAuditLog failed", error);
      return { entries: [] as AuditEntry[], is_admin: true };
    }
    return { entries: (rows ?? []) as AuditEntry[], is_admin: true };
  });
