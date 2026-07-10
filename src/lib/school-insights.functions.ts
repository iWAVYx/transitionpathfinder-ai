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
