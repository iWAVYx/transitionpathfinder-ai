import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AnalyticsPoint = { label: string; count: number };

export type AnalyticsSummary = {
  scope: "org" | "platform" | "none";
  org_id: string | null;
  totals: {
    students: number;
    reports: number;
    documents: number;
    meetings: number;
    action_items_open: number;
    messages: number;
  };
  reports_by_status: AnalyticsPoint[];
  documents_by_category: AnalyticsPoint[];
  action_items_by_status: AnalyticsPoint[];
  recent_activity: AnalyticsPoint[]; // last 14 days, reports per day
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

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T): AnalyticsPoint[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "unknown");
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }));
}

export const getAnalyticsSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<AnalyticsSummary> => {
    const { supabase, userId } = context;

    let scope: "org" | "platform" | "none" = "none";
    let orgId: string | null = null;
    let studentIds: string[] | null = null;

    // Determine scope
    if (data.org_id) {
      const { data: m } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", data.org_id)
        .eq("status", "active")
        .in("role_within_org", ["admin", "owner", "school_admin"])
        .maybeSingle();
      if (m) {
        scope = "org";
        orgId = data.org_id;
      }
    }
    if (scope === "none") {
      const admin = await isAdmin(supabase, userId);
      if (admin) scope = "platform";
    }
    if (scope === "none") {
      // Fall back to first admin org
      const { data: ms } = await supabase
        .from("organization_memberships")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .in("role_within_org", ["admin", "owner", "school_admin"])
        .limit(1);
      if (ms && ms.length > 0) {
        scope = "org";
        orgId = ms[0].organization_id;
      }
    }

    if (scope === "none") {
      return {
        scope: "none",
        org_id: null,
        totals: { students: 0, reports: 0, documents: 0, meetings: 0, action_items_open: 0, messages: 0 },
        reports_by_status: [],
        documents_by_category: [],
        action_items_by_status: [],
        recent_activity: [],
      };
    }

    if (scope === "org" && orgId) {
      const { data: orgStudents } = await supabase
        .from("students")
        .select("id")
        .eq("organization_id", orgId);
      studentIds = (orgStudents ?? []).map((s: { id: string }) => s.id);
    }

    const filterByStudent = <Q extends { in: Function }>(q: Q): Q => {
      if (scope === "org" && studentIds) return q.in("student_id", studentIds) as Q;
      return q;
    };

    const [
      studentsCount,
      reportsRows,
      docsRows,
      meetingsCount,
      actionItemsRows,
      messagesCount,
    ] = await Promise.all([
      scope === "org" && studentIds
        ? { count: studentIds.length }
        : supabase.from("students").select("id", { count: "exact", head: true }),
      filterByStudent(
        supabase.from("pathway_reports").select("report_status, created_at"),
      ),
      filterByStudent(supabase.from("documents").select("document_category")),
      filterByStudent(
        supabase.from("meetings").select("id", { count: "exact", head: true }),
      ),
      filterByStudent(supabase.from("action_items").select("status")),
      filterByStudent(
        supabase.from("messages").select("id", { count: "exact", head: true }),
      ),
    ]);

    const reports = (reportsRows?.data ?? []) as { report_status: string; created_at: string }[];
    const docs = (docsRows?.data ?? []) as { document_category: string }[];
    const actions = (actionItemsRows?.data ?? []) as { status: string }[];

    // Last 14 days activity
    const days = new Map<string, number>();
    const now = Date.now();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const label = d.toISOString().slice(5, 10); // MM-DD
      days.set(label, 0);
    }
    for (const r of reports) {
      const label = r.created_at.slice(5, 10);
      if (days.has(label)) days.set(label, (days.get(label) ?? 0) + 1);
    }

    return {
      scope,
      org_id: orgId,
      totals: {
        students: studentsCount?.count ?? (studentIds?.length ?? 0),
        reports: reports.length,
        documents: docs.length,
        meetings: meetingsCount?.count ?? 0,
        action_items_open: actions.filter((a) => a.status !== "completed").length,
        messages: messagesCount?.count ?? 0,
      },
      reports_by_status: countBy(reports, "report_status"),
      documents_by_category: countBy(docs, "document_category"),
      action_items_by_status: countBy(actions, "status"),
      recent_activity: [...days.entries()].map(([label, count]) => ({ label, count })),
    };
  });
