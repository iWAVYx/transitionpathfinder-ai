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

const auditOrganizationSchema = z.object({
  scope: z.enum(["school", "district"]),
  id: z.string().uuid(),
});
const auditCursorSchema = z.object({
  student_id: z.string().uuid(),
  organization: auditOrganizationSchema.optional(),
  created_at: z.string().datetime({ offset: true }),
  id: z.string().uuid(),
});
export type AuditCursor = z.infer<typeof auditCursorSchema>;
/** Caller-visible keyset pages; cursors are navigation state, never access grants. */
export const listStudentAuditPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        limit: z.number().int().min(1).max(200).optional(),
        organization: auditOrganizationSchema.optional(),
        cursor: auditCursorSchema.optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const sameOrganization =
      data.cursor?.organization?.scope === data.organization?.scope &&
      data.cursor?.organization?.id === data.organization?.id;
    if (data.cursor && (data.cursor.student_id !== data.student_id || !sameOrganization))
      throw new Error("History could not be loaded. Please try again.");
    if (data.organization) {
      const { assertHistoryStudent } = await import("./organization-history.server");
      await assertHistoryStudent(context, data.organization, data.student_id);
    }
    const limit = data.limit ?? 200;
    let query = context.supabase
      .from("audit_log")
      .select("id, action, entity_type, entity_id, actor_id, actor_email, metadata, created_at", {
        count: "exact",
      })
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (data.cursor) {
      // Validated UUID/ISO timestamp values only; retain database timestamp precision.
      query = query.or(
        `created_at.lt.${data.cursor.created_at},and(created_at.eq.${data.cursor.created_at},id.lt.${data.cursor.id})`,
      );
    }
    const { data: rows, error, count } = await query.limit(limit + 1);
    if (error || !rows || count == null || rows.length < Math.min(count, limit + 1))
      throw new Error("History could not be fully loaded. Please try again.");
    const entries = rows.slice(0, limit) as AuditEntry[];
    const last = entries.at(-1);
    const next_cursor: AuditCursor | null =
      rows.length > limit && last
        ? {
            student_id: data.student_id,
            ...(data.organization ? { organization: data.organization } : {}),
            created_at: last.created_at,
            id: last.id,
          }
        : null;
    return { entries, next_cursor };
  });

export type HistoryExportRecords = {
  student: { first_name: string; last_name: string | null };
  workspace_scope: "school" | "district" | null;
  entries: Array<{ created_at: string; action: string; entity_type: string; recorded_by: string }>;
};
/** Recheck requested loaded records before returning an explicit export-safe projection. */
export const exportStudentAuditRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        organization: auditOrganizationSchema.optional(),
        filter: z.enum(["all", "documents", "sharing", "meetings", "plan"]).default("all"),
        entry_ids: z
          .array(z.string().uuid())
          .min(1)
          .max(10000)
          .refine((ids) => new Set(ids).size === ids.length),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<HistoryExportRecords> => {
    const failure = () => new Error("Activity could not be exported. Please try again.");
    try {
      if (data.organization) {
        const { assertHistoryStudent } = await import("./organization-history.server");
        await assertHistoryStudent(context, data.organization, data.student_id);
      }
      const { data: student, error } = await context.supabase
        .from("students")
        .select("first_name, last_name")
        .eq("id", data.student_id)
        .maybeSingle();
      if (error || !student) throw failure();
      const { readReportBatches } = await import("./report-query-pages");
      type Row = Pick<
        AuditEntry,
        "id" | "created_at" | "action" | "entity_type" | "actor_email" | "actor_id"
      >;
      const rows = await readReportBatches<Row>(data.entry_ids, (ids, from, to) =>
        context.supabase
          .from("audit_log")
          .select("id, created_at, action, entity_type, actor_email, actor_id", { count: "exact" })
          .eq("student_id", data.student_id)
          .in("id", ids)
          .order("id")
          .range(from, to),
      );
      const { classifyEntry } = await import("./history-display");
      if (data.filter !== "all" && rows.some((row) => classifyEntry(row) !== data.filter))
        throw failure();
      const byId = new Map(rows.map((row) => [row.id, row]));
      if (byId.size !== data.entry_ids.length || data.entry_ids.some((id) => !byId.has(id)))
        throw failure();
      return {
        student: { first_name: student.first_name, last_name: student.last_name },
        workspace_scope: data.organization?.scope ?? null,
        entries: data.entry_ids.map((id) => {
          const row = byId.get(id)!;
          return {
            created_at: row.created_at,
            action: row.action,
            entity_type: row.entity_type,
            recorded_by: row.actor_email || (row.actor_id ? "Team member" : "System"),
          };
        }),
      };
    } catch {
      throw failure();
    }
  });
