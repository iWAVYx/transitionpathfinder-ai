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
      .object({
        student_id: z.string().uuid(),
        limit: z.number().int().min(1).max(200).optional(),
        organization: z
          .object({ scope: z.enum(["school", "district"]), id: z.string().uuid() })
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    if (data.organization) {
      const { assertHistoryStudent } = await import("./organization-history.server");
      await assertHistoryStudent(context, data.organization, data.student_id);
    }
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("audit_log")
      .select("id, action, entity_type, entity_id, actor_id, actor_email, metadata, created_at")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return { entries: (rows ?? []) as AuditEntry[] };
  });

/** Complete minimal caller-visible roster for existing unscoped history pages. */
export const listHistoryStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { readReportPages } = await import("./report-query-pages");
    try {
      const students = await readReportPages<import("./organization-history.types").HistoryStudent>(
        (from, to) =>
          context.supabase
            .from("students")
            .select("id, first_name, last_name", { count: "exact" })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false })
            .range(from, to),
      );
      return {
        students: students.map(({ id, first_name, last_name }) => ({ id, first_name, last_name })),
        loadFailed: false,
      };
    } catch {
      throw new Error("Student records could not be fully loaded. Please try again.");
    }
  });
