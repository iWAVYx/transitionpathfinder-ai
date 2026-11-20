import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ownerWorkQueueInput, ownerWorkDetailInput, ownerWorkRetainInput } from "./document-work-review-contract";
export const loadOwnerDocumentWork = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => ownerWorkQueueInput.parse(input)).handler(async ({ context, data }) => {
  const server = await import("./document-work-review.server"); return server.loadOwnerDocumentWork(context, data);
});
export const inspectOwnerDocumentWork = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => ownerWorkDetailInput.parse(input)).handler(async ({ context, data }) => {
  const server = await import("./document-work-review.server"); return server.inspectOwnerDocumentWork(context, data);
});
export const retainOwnerDocumentWork = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator((input: unknown) => ownerWorkRetainInput.parse(input)).handler(async ({ context, data }) => {
  const server = await import("./document-work-review.server");
  try { return { ok: true as const, receipt: await server.retainOwnerDocumentWork(context, data) }; }
  catch (error) { return { ok: false as const, message: error instanceof Error ? error.message : "The review could not be confirmed.", verificationRequired: error instanceof server.OwnerWorkReviewError ? error.verificationRequired : false }; }
});
