import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type IepAuditEntry = {
  id: string;
  created_at: string;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  student_id: string | null;
  document_id: string | null;
  role: string | null;
  doc_type: string | null;
  title: string | null;
  ttl_seconds: number | null;
  storage_path: string | null;
  reason: string | null;
};

const ACTIONS = ["document.signed_url.mint", "document.signed_url.denied"] as const;

const FilterSchema = z.object({
  role: z.enum(["owner", "editor", "viewer", "admin", "other", "any"]).default("any"),
  student_id: z.string().uuid().optional().nullable(),
  document_id: z.string().uuid().optional().nullable(),
  from: z.string().datetime().optional().nullable(),
  to: z.string().datetime().optional().nullable(),
  action: z.enum([...ACTIONS, "any"]).default("any"),
  limit: z.number().int().min(1).max(2000).default(500),
});

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

function rowToEntry(r: any): IepAuditEntry {
  const meta = (r.metadata ?? {}) as Record<string, any>;
  return {
    id: r.id,
    created_at: r.created_at,
    action: r.action,
    actor_id: r.actor_id,
    actor_email: r.actor_email,
    student_id: r.student_id,
    document_id: r.entity_id,
    role: meta.role ?? null,
    doc_type: meta.doc_type ?? null,
    title: meta.title ?? null,
    ttl_seconds: typeof meta.ttl_seconds === "number" ? meta.ttl_seconds : null,
    storage_path: meta.storage_path ?? null,
    reason: meta.reason ?? null,
  };
}

export const searchIepAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => FilterSchema.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!(await isAdmin(supabase, userId))) {
      return { entries: [] as IepAuditEntry[], is_admin: false };
    }

    let q = supabase
      .from("audit_log")
      .select("*")
      .in("action", data.action === "any" ? (ACTIONS as readonly string[]) : [data.action])
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.student_id) q = q.eq("student_id", data.student_id);
    if (data.document_id) q = q.eq("entity_id", data.document_id);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    if (data.role !== "any") q = q.eq("metadata->>role", data.role);

    const { data: rows, error } = await q;
    if (error) {
      console.error("searchIepAuditLog failed", error);
      return { entries: [] as IepAuditEntry[], is_admin: true };
    }
    return { entries: (rows ?? []).map(rowToEntry), is_admin: true };
  });
