import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Guardian = {
  id: string;
  student_id: string;
  guardian_user_id: string | null;
  guardian_email: string;
  relationship: string | null;
  is_primary: boolean;
  verified: boolean;
  created_at: string;
  full_name?: string | null;
};

export type TeamMember = {
  id: string;
  student_id: string;
  member_user_id: string | null;
  member_email: string;
  role_on_team: string;
  organization_id: string | null;
  status: string;
  created_at: string;
  full_name?: string | null;
};

export const listStudentMembership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [{ data: gRows }, { data: tRows }] = await Promise.all([
      supabase
        .from("student_guardians")
        .select("*")
        .eq("student_id", data.student_id)
        .order("created_at", { ascending: true }),
      supabase
        .from("student_team_members")
        .select("*")
        .eq("student_id", data.student_id)
        .order("created_at", { ascending: true }),
    ]);

    const guardians = (gRows ?? []) as Guardian[];
    const team = (tRows ?? []) as TeamMember[];

    const userIds = Array.from(
      new Set(
        [
          ...guardians.map((g) => g.guardian_user_id),
          ...team.map((t) => t.member_user_id),
        ].filter((v): v is string => !!v),
      ),
    );

    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name")
        .in("id", userIds);
      const byId = new Map(
        (profs ?? []).map((p) => [
          p.id,
          p.full_name ||
            [p.first_name, p.last_name].filter(Boolean).join(" ") ||
            null,
        ]),
      );
      guardians.forEach((g) => {
        g.full_name = g.guardian_user_id ? byId.get(g.guardian_user_id) ?? null : null;
      });
      team.forEach((t) => {
        t.full_name = t.member_user_id ? byId.get(t.member_user_id) ?? null : null;
      });
    }

    return { guardians, team };
  });
