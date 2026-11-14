import { retainSearchParams } from "@tanstack/react-router";
import { z } from "zod";

// Retain only the applicable organization key on destinations that use its reader.
// A URL is selection state, never an access grant; server membership checks remain authoritative.
export const schoolDashboardNavigation = {
  validateSearch: (search: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).passthrough().parse(search),
  search: { middlewares: [retainSearchParams<{ org_id?: string }>(["org_id"])] },
};
export const districtDashboardNavigation = {
  validateSearch: (search: unknown) =>
    z.object({ district_id: z.string().uuid().optional() }).passthrough().parse(search),
  search: { middlewares: [retainSearchParams<{ district_id?: string }>(["district_id"])] },
};
