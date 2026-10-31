import { z } from "zod";

const date = z.string().refine((value) => Number.isFinite(Date.parse(value)));
export const channelMessageReadSchema = z.object({
  id: z.string().uuid(),
  channel_id: z.string().uuid(),
  author_id: z.string().min(1).nullable(),
  parent_id: z.string().uuid().nullable(),
  body: z.string(),
  pinned: z.boolean(),
  edited_at: date.nullable(),
  deleted_at: date.nullable(),
  created_at: date,
  author_name: z.string().nullable(),
});
export const channelPinnedReadSchema = z.object({
  channel_id: z.string().uuid(),
  pinned: z.array(channelMessageReadSchema),
});
export function validatePinnedRead(value: unknown, channelId: string) {
  const result = channelPinnedReadSchema.parse(value);
  if (
    result.channel_id !== channelId ||
    new Set(result.pinned.map((m) => m.id)).size !== result.pinned.length ||
    result.pinned.some((m) => m.channel_id !== channelId || !m.pinned || m.deleted_at !== null)
  )
    throw new Error("Pinned message response mismatch.");
  return result;
}
export function validateBookmarkRead(value: unknown, channelId: string) {
  const result = z
    .object({ channel_id: z.string().uuid(), message_ids: z.array(z.string().uuid()) })
    .parse(value);
  if (
    result.channel_id !== channelId ||
    new Set(result.message_ids).size !== result.message_ids.length
  )
    throw new Error("Bookmark response mismatch.");
  return result;
}
