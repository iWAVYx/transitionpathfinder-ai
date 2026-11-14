import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import {
  readOrganizationPages,
  readOrganizationBatches,
  organizationReadError,
} from "./organization-query-pages";
import type { HistoryOrganization } from "./organization-history.types";
type Context = { supabase: SupabaseClient<Database>; userId: string };

// All reads use the authenticated caller client. Organization scope never grants student access.
export async function resolveHistoryOrganization(
  context: Context,
  scope: HistoryOrganization["scope"],
  requestedId?: string,
) {
  const { supabase, userId } = context;
  const memberships = await readOrganizationPages<{ organization_id: string }>((from, to) =>
    supabase
      .from("organization_memberships")
      .select("organization_id", { count: "exact" })
      .eq("user_id", userId)
      .eq("status", "active")
      .in(
        "role_within_org",
        scope === "school"
          ? ["admin", "owner", "school_admin"]
          : ["admin", "owner", "district_admin"],
      )
      .order("id")
      .range(from, to),
  );
  let ids = [...new Set(memberships.map((row) => row.organization_id))];
  if (requestedId && !ids.includes(requestedId)) throw organizationReadError();
  if (scope === "district") {
    const districts = await readOrganizationBatches<{ id: string }>(ids, (batch, from, to) =>
      supabase
        .from("organizations")
        .select("id", { count: "exact" })
        .in("id", batch)
        .eq("type", "district")
        .order("id")
        .range(from, to),
    );
    ids = districts.map((row) => row.id);
  }
  if (!ids.length || (requestedId && !ids.includes(requestedId))) throw organizationReadError();
  const organization_id = requestedId ?? ids[0];
  // Match existing district reporting: child-organization students only; no owner/unassigned fallback.
  const children =
    scope === "district"
      ? await readOrganizationPages<{ id: string }>((from, to) =>
          supabase
            .from("organizations")
            .select("id", { count: "exact" })
            .eq("parent_organization_id", organization_id)
            .order("id")
            .range(from, to),
        )
      : [{ id: organization_id }];
  return { organization_id, studentOrganizationIds: children.map((row) => row.id) };
}

export async function assertHistoryStudent(
  context: Context,
  organization: HistoryOrganization,
  studentId: string,
) {
  const resolved = await resolveHistoryOrganization(context, organization.scope, organization.id);
  const rows = await readOrganizationBatches<{ id: string }>(
    resolved.studentOrganizationIds,
    (ids, from, to) =>
      context.supabase
        .from("students")
        .select("id", { count: "exact" })
        .eq("id", studentId)
        .in("organization_id", ids)
        .order("id")
        .range(from, to),
  );
  if (!rows.some((row) => row.id === studentId)) throw organizationReadError();
}
