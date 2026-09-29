import { z } from "zod";

// Deliberately required: a destructive membership action must carry a choice.
export const chatHistoryAccessSchema = z.enum(["remove", "keep_read_only"]);
export type ChatHistoryAccess = z.infer<typeof chatHistoryAccessSchema>;
export const memberRemovalSchema = z.object({
  id: z.string().uuid(),
  chat_history_access: chatHistoryAccessSchema,
});
