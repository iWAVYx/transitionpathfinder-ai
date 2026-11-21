import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { HistoryStudent, OrganizationHistoryRoster } from "./organization-history.types";
export const getOrganizationHistoryRoster = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        scope: z.enum(["school", "district"]),
        organization_id: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<OrganizationHistoryRoster> => {
    const { resolveHistoryOrganization } = await import("./organization-history.server");
    const { readOrganizationBatches } = await import("./organization-query-pages");
    const resolved = await resolveHistoryOrganization(context, data.scope, data.organization_id);
    const students = await readOrganizationBatches<HistoryStudent>(
      resolved.studentOrganizationIds,
      (ids, from, to) =>
        context.supabase
          .from("students")
          .select("id, first_name, last_name", { count: "exact" })
          .in("organization_id", ids)
          .order("id")
          .range(from, to),
    );
    return {
      organization_id: resolved.organization_id,
      students: students.map(({ id, first_name, last_name }) => ({ id, first_name, last_name })),
    };
  });
