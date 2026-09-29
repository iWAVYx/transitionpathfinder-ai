import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("channel_history_grants")
      .select("channel_id, title, removed_at")
      .eq("user_id", context.userId)
      .order("removed_at", { ascending: false });
    if (error) throw new Error("Could not load retained chat history.");
    return data ?? [];
  });

export const readChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        channel_id: z.string().uuid(),
        offset: z.number().int().min(0).default(0),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("channel_history_messages")
      .select("message_id, body, author_name, sent_at, parent_id")
      .eq("channel_id", data.channel_id)
      .eq("user_id", context.userId)
      .order("sent_at", { ascending: false })
      .order("message_id", { ascending: false })
      .range(data.offset, data.offset + 50);
    if (error) throw new Error("Could not load chat history.");
    const messages = (rows ?? []).slice(0, 50);
    const { data: attachments, error: attachmentError } = messages.length
      ? await context.supabase
          .from("channel_history_attachments")
          .select("attachment_id, message_id, file_name")
          .eq("channel_id", data.channel_id)
          .eq("user_id", context.userId)
          .in(
            "message_id",
            messages.map((m) => m.message_id),
          )
      : { data: [], error: null };
    if (attachmentError) throw new Error("Could not load history attachments.");
    return { messages, attachments: attachments ?? [], hasMore: (rows?.length ?? 0) > 50 };
  });

export const downloadChatHistoryAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ attachment_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: attachment, error } = await context.supabase
      .from("channel_history_attachments")
      .select("storage_path, file_name")
      .eq("attachment_id", data.attachment_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error || !attachment) throw new Error("Attachment unavailable.");
    // Storage RLS checks the captured identity and current malware verdict.
    const { data: signed, error: signError } = await context.supabase.storage
      .from("channel-attachments")
      .createSignedUrl(attachment.storage_path, 60, { download: attachment.file_name });
    if (signError || !signed)
      throw new Error("Attachment unavailable or blocked by security scanning.");
    return { url: signed.signedUrl };
  });
