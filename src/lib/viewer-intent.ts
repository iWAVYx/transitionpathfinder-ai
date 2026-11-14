import { z } from "zod";

export const viewerIntentSchema = z.object({
  expected_viewer_id: z.string().min(1).max(100).optional(),
});
export function optionalViewerIntent(input: unknown) {
  return viewerIntentSchema.default({}).parse(input);
}
/** A mismatch rejects stale intent; this value never grants access or supplies ownership. */
export function assertExpectedViewer(data: { expected_viewer_id?: string }, userId: string) {
  if (data.expected_viewer_id && data.expected_viewer_id !== userId)
    throw new Error("Your sign-in changed. Please try again.");
}
