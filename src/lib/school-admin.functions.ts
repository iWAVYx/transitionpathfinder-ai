import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SchoolOrg = {
  id: string;
  name: string;
  type: string;
  city: string | null;
  state: string | null;
  verified_status: string;
};

export type SchoolMember = {
  membership_id: string;
  user_id: string;
  role_within_org: string;
  status: string;
  full_name: string | null;
  email: string | null;
  primary_role: string | null;
  joined_at: string;
};

export type SchoolStudent = {
  id: string;
  first_name: string | null;
  preferred_name: string | null;
  grade_band: string | null;
  owner_id: string;
  owner_name: string | null;
};

export type SchoolDashboard = {
  is_school_admin: boolean;
  orgs: SchoolOrg[];
  selected_org_id: string | null;
  members: SchoolMember[];
  pending_members: SchoolMember[];
  students: SchoolStudent[];
  metrics: {
    total_members: number;
    active_members: number;
    pending_members: number;
    students_count: number;
    reports_count: number;
    documents_count: number;
  };
};

export const getSchoolDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<SchoolDashboard> => {
    const { supabase, userId } = context;

    // Orgs the user admins
    const { data: myAdminMemberships } = await supabase
      .from("organization_memberships")
      .select("organization_id, role_within_org, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role_within_org", ["admin", "owner", "school_admin"]);

    const adminOrgIds = (myAdminMemberships ?? []).map((m: { organization_id: string }) => m.organization_id);

    if (adminOrgIds.length === 0) {
      return {
        is_school_admin: false,
        orgs: [],
        selected_org_id: null,
        members: [],
        pending_members: [],
        students: [],
        metrics: {
          total_members: 0,
          active_members: 0,
          pending_members: 0,
          students_count: 0,
          reports_count: 0,
          documents_count: 0,
        },
      };
    }

    const { data: orgsData } = await supabase
      .from("organizations")
      .select("id, name, type, city, state, verified_status")
      .in("id", adminOrgIds);
    const orgs = (orgsData ?? []) as SchoolOrg[];

    const selectedOrgId =
      data.org_id && adminOrgIds.includes(data.org_id) ? data.org_id : adminOrgIds[0];

    // All memberships for selected org
    const { data: allMemberships } = await supabase
      .from("organization_memberships")
      .select("id, user_id, role_within_org, status, created_at")
      .eq("organization_id", selectedOrgId)
      .order("created_at", { ascending: false });

    const memberUserIds = Array.from(
      new Set((allMemberships ?? []).map((m: { user_id: string }) => m.user_id)),
    );

    const { data: profilesData } = memberUserIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, email, primary_role")
          .in("id", memberUserIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null; primary_role: string | null }[] };

    const profileMap = new Map(
      (profilesData ?? []).map((p) => [p.id, p]),
    );

    const allMembers: SchoolMember[] = (allMemberships ?? []).map((m: {
      id: string;
      user_id: string;
      role_within_org: string;
      status: string;
      created_at: string;
    }) => {
      const p = profileMap.get(m.user_id);
      return {
        membership_id: m.id,
        user_id: m.user_id,
        role_within_org: m.role_within_org,
        status: m.status,
        full_name: p?.full_name ?? null,
        email: p?.email ?? null,
        primary_role: p?.primary_role ?? null,
        joined_at: m.created_at,
      };
    });

    const members = allMembers.filter((m) => m.status === "active");
    const pending_members = allMembers.filter((m) => m.status !== "active");

    // Students in this org (preferred) or owned by active members (fallback)
    const { data: orgStudents } = await supabase
      .from("students")
      .select("id, first_name, preferred_name, grade_band, owner_id")
      .eq("organization_id", selectedOrgId)
      .order("created_at", { ascending: false })
      .limit(200);

    const activeMemberIds = members.map((m) => m.user_id);
    const { data: ownerStudents } = activeMemberIds.length
      ? await supabase
          .from("students")
          .select("id, first_name, preferred_name, grade_band, owner_id")
          .in("owner_id", activeMemberIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : { data: [] };

    const studentMap = new Map<string, { id: string; first_name: string | null; preferred_name: string | null; grade_band: string | null; owner_id: string }>();
    for (const s of [...(orgStudents ?? []), ...(ownerStudents ?? [])]) {
      if (s && "id" in s) studentMap.set(s.id, s);
    }
    const students: SchoolStudent[] = Array.from(studentMap.values()).map((s) => ({
      ...s,
      owner_name: profileMap.get(s.owner_id)?.full_name ?? null,
    }));

    const studentIds = students.map((s) => s.id);
    const [reportsCount, docsCount] = await Promise.all([
      studentIds.length
        ? supabase
            .from("pathway_reports")
            .select("id", { count: "exact", head: true })
            .in("student_id", studentIds)
        : Promise.resolve({ count: 0 }),
      studentIds.length
        ? supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .in("student_id", studentIds)
        : Promise.resolve({ count: 0 }),
    ]);

    return {
      is_school_admin: true,
      orgs,
      selected_org_id: selectedOrgId,
      members,
      pending_members,
      students,
      metrics: {
        total_members: allMembers.length,
        active_members: members.length,
        pending_members: pending_members.length,
        students_count: students.length,
        reports_count: reportsCount.count ?? 0,
        documents_count: docsCount.count ?? 0,
      },
    };
  });

export const updateMembershipStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        membership_id: z.string().uuid(),
        status: z.enum(["active", "invited", "suspended", "removed"]).optional(),
        role_within_org: z
          .enum(["member", "admin", "owner", "school_admin"])
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const patch: { status?: string; role_within_org?: string } = {};
    if (data.status) patch.status = data.status;
    if (data.role_within_org) patch.role_within_org = data.role_within_org;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("organization_memberships")
      .update(patch)
      .eq("id", data.membership_id);
    if (error) throw new Error("Could not update membership.");
    return { ok: true };
  });
