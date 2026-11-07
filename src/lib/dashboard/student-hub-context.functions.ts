import { optionalViewerIntent, assertExpectedViewer } from "@/lib/viewer-intent";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { audiencesForRoles } from "@/lib/role-policy";
import { readOrganizationPages } from "@/lib/organization-query-pages";

/** Resolve the caller's linked profile, never the first accessible team profile. */
export const getStudentHubContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertExpectedViewer(data, userId);
    const roles = await readOrganizationPages<{ role: string }>((from, to) =>
      supabase
        .from("user_roles")
        .select("id,role", { count: "exact" })
        .eq("user_id", userId)
        .order("id")
        .range(from, to),
    );
    const audiences = audiencesForRoles(roles.map((row) => row.role));
    if (audiences.has("admin"))
      return {
        student_id: null,
        viewer_id: userId,
        management_only: true,
        connection_status: "management" as const,
      };
    if (!audiences.has("student"))
      throw new Error("This workspace is available to student accounts.");
    const students = await readOrganizationPages<{ id: string }>((from, to) =>
      supabase
        .from("students")
        .select("id", { count: "exact" })
        .eq("student_user_id", userId)
        .order("id")
        .range(from, to),
    );
    if (students.length > 1)
      return {
        student_id: null,
        viewer_id: userId,
        management_only: false,
        connection_status: "ambiguous" as const,
      };
    return {
      student_id: students[0]?.id ?? null,
      viewer_id: userId,
      management_only: false,
      connection_status: students.length ? ("ready" as const) : ("missing" as const),
    };
  });
