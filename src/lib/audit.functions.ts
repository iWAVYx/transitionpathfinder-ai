import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export type AuditEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  actor_id: string | null;
  actor_email: string | null;
  metadata: Json;
  created_at: string;
};

export const listStudentAuditTrail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({ student_id: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, entity_type, entity_id, actor_id, actor_email, metadata, created_at")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return { entries: (rows ?? []) as AuditEntry[] };
  });
