import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SupportNeedRow = {
  student_id: string;
  first_name: string | null;
  preferred_name: string | null;
  grade_band: string | null;
  owner_name: string | null;
  avg_score: number | null;
  weakest_category: string | null;
  weakest_score: number | null;
  has_report: boolean;
};

export type SchoolSupportNeeds = {
  is_school_admin: boolean;
  org_id: string | null;
  org_name: string | null;
  total_students: number;
  needing_support: SupportNeedRow[];
};

/**
 * Students in the selected org (or across all orgs the caller admins) who
 * need extra support: no Pathway Report yet, OR average readiness < 60,
 * OR any readiness pillar < 50. Sorted worst-first.
 */
export const getSchoolSupportNeeds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<SchoolSupportNeeds> => {
    const { supabase, userId } = context;

    const { data: myAdmin } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"]);
    const adminOrgIds = (myAdmin ?? []).map(
      (m: { organization_id: string }) => m.organization_id,
    );
    if (adminOrgIds.length === 0) {
      return {
        is_school_admin: false,
        org_id: null,
        org_name: null,
        total_students: 0,
        needing_support: [],
      };
    }

    const orgId =
      data.org_id && adminOrgIds.includes(data.org_id) ? data.org_id : adminOrgIds[0];
    const { data: orgRow } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", orgId)
      .maybeSingle();

    const { data: orgStudents } = await supabase
      .from("students")
      .select("id, first_name, preferred_name, grade_band, owner_id")
      .eq("organization_id", orgId)
      .limit(500);
    const students =
      (orgStudents ?? []) as Array<{
        id: string;
        first_name: string | null;
        preferred_name: string | null;
        grade_band: string | null;
        owner_id: string;
      }>;
    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      return {
        is_school_admin: true,
        org_id: orgId,
        org_name: orgRow?.name ?? null,
        total_students: 0,
        needing_support: [],
      };
    }

    const [scoresRes, reportsRes, ownersRes] = await Promise.all([
      supabase
        .from("readiness_scores")
        .select("student_id, category, score")
        .in("student_id", studentIds),
      supabase
        .from("pathway_reports")
        .select("student_id")
        .in("student_id", studentIds),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(new Set(students.map((s) => s.owner_id)))),
    ]);
    const scores =
      (scoresRes.data ?? []) as Array<{
        student_id: string;
        category: string;
        score: number | null;
      }>;
    const reportedIds = new Set(
      ((reportsRes.data ?? []) as Array<{ student_id: string }>).map(
        (r) => r.student_id,
      ),
    );
    const ownerNames = new Map(
      ((ownersRes.data ?? []) as Array<{ id: string; full_name: string | null }>).map(
        (p) => [p.id, p.full_name],
      ),
    );

    const byStudent = new Map<
      string,
      { total: number; count: number; weakest: { cat: string; score: number } | null }
    >();
    for (const s of scores) {
      if (s.score == null) continue;
      const cur = byStudent.get(s.student_id) ?? {
        total: 0,
        count: 0,
        weakest: null as null | { cat: string; score: number },
      };
      cur.total += s.score;
      cur.count += 1;
      if (!cur.weakest || s.score < cur.weakest.score) {
        cur.weakest = { cat: s.category, score: s.score };
      }
      byStudent.set(s.student_id, cur);
    }

    const rows: SupportNeedRow[] = students.map((s) => {
      const agg = byStudent.get(s.id);
      const avg = agg && agg.count > 0 ? Math.round(agg.total / agg.count) : null;
      return {
        student_id: s.id,
        first_name: s.first_name,
        preferred_name: s.preferred_name,
        grade_band: s.grade_band,
        owner_name: ownerNames.get(s.owner_id) ?? null,
        avg_score: avg,
        weakest_category: agg?.weakest?.cat ?? null,
        weakest_score: agg?.weakest?.score ?? null,
        has_report: reportedIds.has(s.id),
      };
    });

    const flagged = rows
      .filter(
        (r) =>
          !r.has_report ||
          (r.avg_score != null && r.avg_score < 60) ||
          (r.weakest_score != null && r.weakest_score < 50),
      )
      .sort((a, b) => {
        // No report first, then lowest average score.
        if (a.has_report !== b.has_report) return a.has_report ? 1 : -1;
        const av = a.avg_score ?? -1;
        const bv = b.avg_score ?? -1;
        return av - bv;
      })
      .slice(0, 50);

    return {
      is_school_admin: true,
      org_id: orgId,
      org_name: orgRow?.name ?? null,
      total_students: students.length,
      needing_support: flagged,
    };
  });

/* ------------------------------------------------------------------ */
/* Shared helpers                                                     */
/* ------------------------------------------------------------------ */

type SupabaseCtx = { supabase: any; userId: string };

async function myAdminOrgIds(ctx: SupabaseCtx): Promise<string[]> {
  const { data } = await ctx.supabase
    .from("organization_memberships")
    .select("organization_id")
    .eq("user_id", ctx.userId)
    .eq("status", "active")
    .in("role_within_org", ["admin", "owner", "school_admin"]);
  return (data ?? []).map((m: { organization_id: string }) => m.organization_id);
}

/* ------------------------------------------------------------------ */
/* Planning Status by Grade                                           */
/* ------------------------------------------------------------------ */

export type PlanningGradeRow = {
  grade_band: string;
  total: number;
  with_report: number;
  pct: number;
};

export type SchoolPlanningStatus = {
  is_school_admin: boolean;
  org_id: string | null;
  org_name: string | null;
  total_students: number;
  total_with_report: number;
  by_grade: PlanningGradeRow[];
};

export const getSchoolPlanningStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<SchoolPlanningStatus> => {
    const orgIds = await myAdminOrgIds(context);
    if (orgIds.length === 0) {
      return { is_school_admin: false, org_id: null, org_name: null, total_students: 0, total_with_report: 0, by_grade: [] };
    }
    const orgId = data.org_id && orgIds.includes(data.org_id) ? data.org_id : orgIds[0];
    const { data: orgRow } = await context.supabase
      .from("organizations").select("id, name").eq("id", orgId).maybeSingle();
    const { data: students } = await context.supabase
      .from("students").select("id, grade_band").eq("organization_id", orgId).limit(2000);
    const rows = (students ?? []) as Array<{ id: string; grade_band: string | null }>;
    const ids = rows.map((r) => r.id);
    const reported = new Set<string>();
    if (ids.length) {
      const { data: reps } = await context.supabase
        .from("pathway_reports").select("student_id").in("student_id", ids);
      for (const r of (reps ?? []) as Array<{ student_id: string }>) reported.add(r.student_id);
    }
    const map = new Map<string, { total: number; with_report: number }>();
    for (const s of rows) {
      const key = s.grade_band?.trim() || "Unassigned";
      const cur = map.get(key) ?? { total: 0, with_report: 0 };
      cur.total += 1;
      if (reported.has(s.id)) cur.with_report += 1;
      map.set(key, cur);
    }
    const by_grade: PlanningGradeRow[] = Array.from(map.entries())
      .map(([grade_band, v]) => ({
        grade_band,
        total: v.total,
        with_report: v.with_report,
        pct: v.total === 0 ? 0 : Math.round((v.with_report / v.total) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);
    return {
      is_school_admin: true,
      org_id: orgId,
      org_name: orgRow?.name ?? null,
      total_students: rows.length,
      total_with_report: reported.size,
      by_grade,
    };
  });

/* ------------------------------------------------------------------ */
/* Readiness Trends (school & district)                               */
/* ------------------------------------------------------------------ */

export type PillarTrendRow = {
  category: string;
  avg_score: number | null;
  scored_students: number;
  below_50: number;
  below_60: number;
};

export type ReadinessTrendData = {
  scope: "school" | "district";
  is_admin: boolean;
  org_id: string | null;
  org_name: string | null;
  total_students: number;
  scored_students: number;
  pillar_averages: PillarTrendRow[];
};

async function trendsFor(context: SupabaseCtx, orgId: string, scope: "school" | "district"): Promise<ReadinessTrendData> {
  const { data: orgRow } = await context.supabase
    .from("organizations").select("id, name").eq("id", orgId).maybeSingle();

  // For district scope: gather student IDs across child schools.
  let studentIds: string[] = [];
  if (scope === "district") {
    const { data: schools } = await context.supabase
      .from("organizations").select("id").eq("parent_organization_id", orgId);
    const schoolIds = ((schools ?? []) as Array<{ id: string }>).map((s) => s.id);
    if (schoolIds.length) {
      const { data: ss } = await context.supabase
        .from("students").select("id").in("organization_id", schoolIds).limit(5000);
      studentIds = ((ss ?? []) as Array<{ id: string }>).map((s) => s.id);
    }
  } else {
    const { data: ss } = await context.supabase
      .from("students").select("id").eq("organization_id", orgId).limit(2000);
    studentIds = ((ss ?? []) as Array<{ id: string }>).map((s) => s.id);
  }
  if (studentIds.length === 0) {
    return { scope, is_admin: true, org_id: orgId, org_name: orgRow?.name ?? null,
      total_students: 0, scored_students: 0, pillar_averages: [] };
  }
  const { data: scoresRes } = await context.supabase
    .from("readiness_scores").select("student_id, category, score").in("student_id", studentIds);
  const scores = (scoresRes ?? []) as Array<{ student_id: string; category: string; score: number | null }>;

  const byCat = new Map<string, { total: number; count: number; below50: number; below60: number; students: Set<string> }>();
  const scoredStudents = new Set<string>();
  for (const s of scores) {
    if (s.score == null) continue;
    scoredStudents.add(s.student_id);
    const cur = byCat.get(s.category) ?? { total: 0, count: 0, below50: 0, below60: 0, students: new Set<string>() };
    cur.total += s.score;
    cur.count += 1;
    if (s.score < 50) cur.below50 += 1;
    if (s.score < 60) cur.below60 += 1;
    cur.students.add(s.student_id);
    byCat.set(s.category, cur);
  }
  const pillar_averages: PillarTrendRow[] = Array.from(byCat.entries())
    .map(([category, v]) => ({
      category,
      avg_score: v.count ? Math.round(v.total / v.count) : null,
      scored_students: v.students.size,
      below_50: v.below50,
      below_60: v.below60,
    }))
    .sort((a, b) => (a.avg_score ?? 0) - (b.avg_score ?? 0));

  return {
    scope, is_admin: true, org_id: orgId, org_name: orgRow?.name ?? null,
    total_students: studentIds.length,
    scored_students: scoredStudents.size,
    pillar_averages,
  };
}

export const getSchoolReadinessTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<ReadinessTrendData> => {
    const orgIds = await myAdminOrgIds(context);
    if (orgIds.length === 0) {
      return { scope: "school", is_admin: false, org_id: null, org_name: null,
        total_students: 0, scored_students: 0, pillar_averages: [] };
    }
    const orgId = data.org_id && orgIds.includes(data.org_id) ? data.org_id : orgIds[0];
    return trendsFor(context, orgId, "school");
  });

export const getDistrictReadinessTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ district_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<ReadinessTrendData> => {
    const { data: myAdmin } = await context.supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "district_admin"]);
    const adminIds = ((myAdmin ?? []) as Array<{ organization_id: string }>).map((m) => m.organization_id);
    if (adminIds.length === 0) {
      return { scope: "district", is_admin: false, org_id: null, org_name: null,
        total_students: 0, scored_students: 0, pillar_averages: [] };
    }
    // Filter to organizations of type 'district'
    const { data: districts } = await context.supabase
      .from("organizations").select("id, name, type").in("id", adminIds).eq("type", "district");
    const districtIds = ((districts ?? []) as Array<{ id: string }>).map((d) => d.id);
    if (districtIds.length === 0) {
      return { scope: "district", is_admin: false, org_id: null, org_name: null,
        total_students: 0, scored_students: 0, pillar_averages: [] };
    }
    const districtId = data.district_id && districtIds.includes(data.district_id) ? data.district_id : districtIds[0];
    return trendsFor(context, districtId, "district");
  });

/* ------------------------------------------------------------------ */
/* Resource Usage (school)                                            */
/* ------------------------------------------------------------------ */

export type ResourceUsageRow = {
  resource_id: string;
  title: string | null;
  category: string | null;
  save_count: number;
  savers: number;
  last_saved_at: string | null;
};

export type SchoolResourceUsage = {
  is_school_admin: boolean;
  org_id: string | null;
  org_name: string | null;
  team_size: number;
  total_saves: number;
  top_resources: ResourceUsageRow[];
};

export const getSchoolResourceUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<SchoolResourceUsage> => {
    const orgIds = await myAdminOrgIds(context);
    if (orgIds.length === 0) {
      return { is_school_admin: false, org_id: null, org_name: null, team_size: 0, total_saves: 0, top_resources: [] };
    }
    const orgId = data.org_id && orgIds.includes(data.org_id) ? data.org_id : orgIds[0];
    const { data: orgRow } = await context.supabase
      .from("organizations").select("id, name").eq("id", orgId).maybeSingle();
    const { data: members } = await context.supabase
      .from("organization_memberships").select("user_id").eq("organization_id", orgId).eq("status", "active");
    const userIds = Array.from(new Set(((members ?? []) as Array<{ user_id: string }>).map((m) => m.user_id)));
    if (userIds.length === 0) {
      return { is_school_admin: true, org_id: orgId, org_name: orgRow?.name ?? null, team_size: 0, total_saves: 0, top_resources: [] };
    }
    const { data: savedRes } = await context.supabase
      .from("saved_resources").select("resource_id, user_id, created_at").in("user_id", userIds).limit(2000);
    const saves = (savedRes ?? []) as Array<{ resource_id: string; user_id: string; created_at: string }>;
    const byRes = new Map<string, { count: number; users: Set<string>; last: string | null }>();
    for (const s of saves) {
      const cur = byRes.get(s.resource_id) ?? { count: 0, users: new Set<string>(), last: null };
      cur.count += 1;
      cur.users.add(s.user_id);
      if (!cur.last || s.created_at > cur.last) cur.last = s.created_at;
      byRes.set(s.resource_id, cur);
    }
    const resourceIds = Array.from(byRes.keys());
    const titles = new Map<string, { title: string | null; category: string | null }>();
    if (resourceIds.length) {
      const { data: resRows } = await context.supabase
        .from("resources").select("id, title, topic").in("id", resourceIds);
      for (const r of (resRows ?? []) as Array<{ id: string; title: string | null; topic: string | null }>) {
        titles.set(r.id, { title: r.title, category: r.topic });
      }
    }
    const top_resources: ResourceUsageRow[] = resourceIds
      .map((id) => {
        const v = byRes.get(id)!;
        const meta = titles.get(id);
        return {
          resource_id: id,
          title: meta?.title ?? null,
          category: meta?.category ?? null,
          save_count: v.count,
          savers: v.users.size,
          last_saved_at: v.last,
        };
      })
      .sort((a, b) => b.save_count - a.save_count)
      .slice(0, 25);
    return {
      is_school_admin: true,
      org_id: orgId,
      org_name: orgRow?.name ?? null,
      team_size: userIds.length,
      total_saves: saves.length,
      top_resources,
    };
  });

