import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseRightsReadRequest, parseRightsSaveRequest } from "./rights-status-contract";
import { readCurrentRightsStatus, saveCurrentRightsStatus } from "./rights-status.server";
export { RIGHTS_STATUS_VALUES, RIGHTS_STATUS_LABELS } from "./rights-status-contract";
export type { RightsStatus, RightsTransferRow } from "./rights-status-contract";
export const getRightsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(parseRightsReadRequest)
  .handler(({ data, context }) => readCurrentRightsStatus(context.supabase, context.userId, data));
export const setRightsStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(parseRightsSaveRequest)
  .handler(({ data, context }) => saveCurrentRightsStatus(context.supabase, context.userId, data));
