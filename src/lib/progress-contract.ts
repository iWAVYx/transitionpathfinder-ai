import { z } from "zod";
import { FLAT, PATHWAY_ID } from "./transition-roadmap";
export const PROGRESS_LOAD_UNAVAILABLE = "We couldn't load the saved roadmap. Refresh to check your access and current progress.";
export const PROGRESS_SAVE_UNCONFIRMED = "We couldn't confirm this roadmap update. Refresh saved progress before trying again.";
const timestamp = z.string().datetime({ offset: true }).refine(value => (value.match(/T\d{2}:\d{2}:\d{2}\.(\d+)/)?.[1].length ?? 0) <= 6);
const stepIds = new Set(FLAT.map(item => item.step_index));
export const progressScope = z.object({ student_id: z.string().uuid(), pathway_id: z.literal(PATHWAY_ID), expected_viewer_id: z.string().uuid() }).strict();
export const progressSaveIntent = progressScope.extend({
  step_index: z.number().int().refine(value => stepIds.has(value)), completed: z.boolean(),
  note: z.string().trim().max(1000).nullable().default(null).transform(value => value || null),
  expected: z.object({ id: z.string().uuid(), updated_at: timestamp }).strict().nullable(),
}).strict();
export const progressRow = z.object({ id: z.string().uuid(), student_id: z.string().uuid(), pathway_id: z.literal(PATHWAY_ID),
  step_index: z.number().int(), completed: z.boolean(), note: z.string().nullable(), updated_at: timestamp }).strict();
export type ProgressRow = z.infer<typeof progressRow>;
export const progressReadReceipt = z.object({ schema: z.literal("student-roadmap-read-v1"), actor_id: z.string().uuid(),
  student_id: z.string().uuid(), pathway_id: z.literal(PATHWAY_ID), can_edit: z.boolean(), progress: z.array(progressRow), total: z.number().int().nonnegative() }).strict();
export const progressWriteReceipt = z.object({ schema: z.literal("student-roadmap-save-v1"), actor_id: z.string().uuid(),
  student_id: z.string().uuid(), pathway_id: z.literal(PATHWAY_ID), step_index: z.number().int(),
  row: progressRow.extend({ updated_by: z.string().uuid() }).strict() }).strict();
export function parseProgressScope(input: unknown) { try { return progressScope.parse(input); } catch { throw new Error(PROGRESS_LOAD_UNAVAILABLE); } }
export function parseProgressSave(input: unknown) { try { return progressSaveIntent.parse(input); } catch { throw new Error(PROGRESS_SAVE_UNCONFIRMED); } }
// Preserve database microseconds rather than rounding an optimistic version to JS milliseconds.
export function progressTimestampKey(value: string) {
  timestamp.parse(value); const micros = (value.match(/T\d{2}:\d{2}:\d{2}\.(\d+)/)?.[1] ?? "").padEnd(6, "0").slice(3, 6);
  return BigInt(new Date(value).getTime()) * 1000n + BigInt(micros);
}
