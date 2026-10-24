import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ROUTE_AUDIENCES } from "@/lib/role-policy";
import { readOrganizationPages, organizationReadError } from "@/lib/organization-query-pages";

type OrganizationRole = "school_admin" | "district_admin";
/** A registered organization tool, never an invented fallback or another scope. */
export function organizationActionDestination(
  role: OrganizationRole,
  organizationId: string,
  destination: string | null,
) {
  if (!destination?.startsWith("/") || destination.startsWith("//") || destination.includes("\\"))
    return null;
  const url = new URL(destination, "https://workspace.invalid");
  const prefix = role === "school_admin" ? "/school/" : "/district/";
  if (
    url.origin !== "https://workspace.invalid" ||
    !url.pathname.startsWith(prefix) ||
    !ROUTE_AUDIENCES[url.pathname]?.includes(role)
  )
    return null;
  const key = role === "school_admin" ? "org_id" : "district_id";
  if (
    url.searchParams.getAll(key).length > 1 ||
    (url.searchParams.has(key) && url.searchParams.get(key) !== organizationId)
  )
    return null;
  const search: Record<string, string> = { [key]: organizationId };
  if (url.searchParams.has("student_id")) {
    const student = z.string().uuid().safeParse(url.searchParams.get("student_id"));
    if (!student.success || url.searchParams.getAll("student_id").length > 1) return null;
    search.student_id = student.data;
  }
  return { to: url.pathname, search, hash: url.hash.slice(1) };
}

export const getOrganizationWidgetActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        role: z.enum(["school_admin", "district_admin"]),
        organization_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const roles =
      data.role === "school_admin"
        ? ["admin", "owner", "school_admin"]
        : ["admin", "owner", "district_admin"];
    const { data: membership, error } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", data.organization_id)
      .eq("status", "active")
      .in("role_within_org", roles)
      .maybeSingle();
    if (error || !membership) throw organizationReadError();
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, type")
      .eq("id", data.organization_id)
      .maybeSingle();
    if (
      organizationError ||
      !organization ||
      (data.role === "district_admin" && organization.type !== "district")
    )
      throw organizationReadError();
    // Caller-owned, caller-readable stored actions only. No privileged reads or personal derivations.
    const rows = await readOrganizationPages<{
      id: string;
      title: string;
      reason: string | null;
      cta_route: string | null;
    }>((from, to) =>
      supabase
        .from("next_actions")
        .select("id, title, reason, cta_route", { count: "exact" })
        .eq("owner_user_id", userId)
        .eq("organization_id", data.organization_id)
        .or(`owner_role.eq.${data.role},owner_role.is.null`)
        .in("status", [
          "not_started",
          "in_progress",
          "waiting",
          "needs_review",
          "due_soon",
          "overdue",
        ])
        .order("priority")
        .order("updated_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    const entries = rows.flatMap((row) => {
      const destination = organizationActionDestination(
        data.role,
        data.organization_id,
        row.cta_route,
      );
      return destination
        ? [{ id: row.id, title: row.title, detail: row.reason, ...destination }]
        : [];
    });
    return { entries: entries.slice(0, 5), total: entries.length, viewer_id: userId };
  });
