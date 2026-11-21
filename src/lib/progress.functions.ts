import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseProgressScope, parseProgressSave } from "./progress-contract";
import { readRoadmapProgress, saveRoadmapProgress } from "./progress.server";
export type { ProgressRow } from "./progress-contract";
export const listProgress = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator(parseProgressScope)
  .handler(({ data, context }) => readRoadmapProgress(context.supabase, context.userId, data));
export const upsertProgress = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator(parseProgressSave)
  .handler(({ data, context }) => saveRoadmapProgress(context.supabase, context.userId, data));
