import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { textWorkQueueInput, textWorkDetailInput } from "./text-work-review-contract";
export const loadOwnerTextWork = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => textWorkQueueInput.parse(input)).handler(async ({ context, data }) => {
  const server = await import("./text-work-review.server"); return server.loadOwnerTextWork(context, data);
});
export const inspectOwnerTextWork = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => textWorkDetailInput.parse(input)).handler(async ({ context, data }) => {
  const server = await import("./text-work-review.server"); return server.inspectOwnerTextWork(context, data);
});
