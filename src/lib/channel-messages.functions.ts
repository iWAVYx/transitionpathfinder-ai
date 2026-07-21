// Transition Channel — message capabilities (Slice C).
//
// Threads, edit/delete, pin, bookmark, and attachments. All reads and writes
// flow through the caller's RLS-scoped supabase client so channel_*
// policies enforce membership; helper checks below only shape errors and
// gate write intent (author vs. admin).

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ChannelMessage } from "@/lib/channels.functions";

const uuid = z.string().uuid();

export type ChannelAttachment = {
  id: string;
  message_id: string;
  channel_id: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  scan_status: string | null;
  uploaded_by: string;
  created_at: string;
};

export type ChannelBookmark = {
  id: string;
  channel_id: string;
  message_id: string;
  note: string | null;
  created_at: string;
  message_body: string;
  message_author_id: string | null;
  message_created_at: string;
  channel_title: string;
};

// ─── Threads ───────────────────────────────────────────────────────────────

export const listThreadMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { parent_id: string }) =>
    z.object({ parent_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: parent, error: pErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at")
      .eq("id", data.parent_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!parent) throw new Error("Thread not found");

    const { data: rows, error } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at")
      .eq("parent_id", data.parent_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    const authorIds = Array.from(
      new Set(
        [parent, ...(rows ?? [])]
          .map((r) => r.author_id)
          .filter((v): v is string => !!v),
      ),
    );
    const nameMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("id", authorIds);
      (profs ?? []).forEach((p) =>
        nameMap.set(p.id, (p.preferred_name || p.full_name || "").trim() || "Member"),
      );
    }

    const shape = (r: typeof parent): ChannelMessage => ({
      ...(r as ChannelMessage),
      author_name: r.author_id ? nameMap.get(r.author_id) ?? "Member" : null,
    });

    return {
      parent: shape(parent),
      replies: (rows ?? []).map(shape),
    };
  });

// ─── Edit / Delete ─────────────────────────────────────────────────────────

export const editChannelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message_id: string; body: string }) =>
    z
      .object({
        message_id: uuid,
        body: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: eErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, body, deleted_at")
      .eq("id", data.message_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!existing) throw new Error("Message not found");
    if (existing.author_id !== userId) throw new Error("Only the author can edit this message");
    if (existing.deleted_at) throw new Error("Message has been deleted");
    if (existing.body === data.body.trim()) return { ok: true };

    const { error: histErr } = await supabase.from("channel_message_edits").insert({
      message_id: existing.id,
      channel_id: existing.channel_id,
      editor_id: userId,
      previous_body: existing.body,
    });
    if (histErr) throw new Error(histErr.message);

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("channel_messages")
      .update({ body: data.body.trim(), edited_at: now })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteChannelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message_id: string }) =>
    z.object({ message_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: eErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, deleted_at")
      .eq("id", data.message_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!existing) throw new Error("Message not found");
    if (existing.deleted_at) return { ok: true };

    // Author can delete their own. Admin path uses moderation flow.
    if (existing.author_id !== userId) {
      throw new Error("Only the author can delete this message here");
    }

    const { error } = await supabase
      .from("channel_messages")
      .update({ deleted_at: new Date().toISOString(), body: "" })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Pin ───────────────────────────────────────────────────────────────────

export const setMessagePinned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message_id: string; pinned: boolean }) =>
    z.object({ message_id: uuid, pinned: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: eErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id")
      .eq("id", data.message_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    if (!existing) throw new Error("Message not found");

    const { data: isAdmin, error: aErr } = await supabase.rpc("is_channel_admin", {
      _channel_id: existing.channel_id,
      _user_id: userId,
    });
    if (aErr) throw new Error(aErr.message);
    if (!isAdmin) throw new Error("Only channel admins can pin or unpin messages");

    const patch = data.pinned
      ? { pinned: true, pinned_at: new Date().toISOString(), pinned_by: userId }
      : { pinned: false, pinned_at: null, pinned_by: null };
    const { error } = await supabase
      .from("channel_messages")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listPinnedMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channel_id: string }) =>
    z.object({ channel_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at")
      .eq("channel_id", data.channel_id)
      .eq("pinned", true)
      .is("deleted_at", null)
      .order("pinned_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const authorIds = Array.from(
      new Set((rows ?? []).map((r) => r.author_id).filter((v): v is string => !!v)),
    );
    const nameMap = new Map<string, string>();
    if (authorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, preferred_name")
        .in("id", authorIds);
      (profs ?? []).forEach((p) =>
        nameMap.set(p.id, (p.preferred_name || p.full_name || "").trim() || "Member"),
      );
    }

    return {
      pinned: (rows ?? []).map(
        (r): ChannelMessage => ({
          ...(r as ChannelMessage),
          author_name: r.author_id ? nameMap.get(r.author_id) ?? "Member" : null,
        }),
      ),
    };
  });

// ─── Bookmarks ─────────────────────────────────────────────────────────────

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message_id: string; note?: string | null }) =>
    z
      .object({
        message_id: uuid,
        note: z.string().trim().max(280).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: msg, error: mErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id")
      .eq("id", data.message_id)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    if (!msg) throw new Error("Message not found");

    const { data: existing, error: eErr } = await supabase
      .from("channel_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("message_id", msg.id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);

    if (existing) {
      const { error } = await supabase
        .from("channel_bookmarks")
        .delete()
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { bookmarked: false };
    }

    const { error } = await supabase.from("channel_bookmarks").insert({
      user_id: userId,
      channel_id: msg.channel_id,
      message_id: msg.id,
      note: data.note ?? null,
    });
    if (error) throw new Error(error.message);
    return { bookmarked: true };
  });

export const listMyBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("channel_bookmarks")
      .select(
        "id, channel_id, message_id, note, created_at, channel_messages!inner(body, author_id, created_at), channels!inner(title)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const bookmarks: ChannelBookmark[] = (rows ?? []).map((r) => {
      const m = Array.isArray(r.channel_messages) ? r.channel_messages[0] : r.channel_messages;
      const c = Array.isArray(r.channels) ? r.channels[0] : r.channels;
      return {
        id: r.id,
        channel_id: r.channel_id,
        message_id: r.message_id,
        note: r.note,
        created_at: r.created_at,
        message_body: m?.body ?? "",
        message_author_id: m?.author_id ?? null,
        message_created_at: m?.created_at ?? r.created_at,
        channel_title: c?.title ?? "Channel",
      };
    });
    return { bookmarks };
  });

export const listChannelBookmarkIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { channel_id: string }) =>
    z.object({ channel_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("channel_bookmarks")
      .select("message_id")
      .eq("user_id", userId)
      .eq("channel_id", data.channel_id);
    if (error) throw new Error(error.message);
    return { message_ids: (rows ?? []).map((r) => r.message_id) };
  });

// ─── Attachments ───────────────────────────────────────────────────────────

export const registerAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      channel_id: string;
      message_id: string;
      storage_path: string;
      file_name: string;
      content_type?: string | null;
      size_bytes?: number | null;
    }) =>
      z
        .object({
          channel_id: uuid,
          message_id: uuid,
          storage_path: z.string().min(1).max(1000),
          file_name: z.string().min(1).max(255),
          content_type: z.string().max(200).optional().nullable(),
          size_bytes: z.number().int().min(0).max(26214400).optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Path must live under this channel's prefix (matches the storage policy).
    const firstSegment = data.storage_path.split("/")[0];
    if (firstSegment !== data.channel_id) {
      throw new Error("Attachment path does not match its channel");
    }

    const { data: row, error } = await supabase
      .from("channel_attachments")
      .insert({
        channel_id: data.channel_id,
        message_id: data.message_id,
        storage_path: data.storage_path,
        file_name: data.file_name,
        content_type: data.content_type ?? null,
        size_bytes: data.size_bytes ?? null,
        uploaded_by: userId,
      })
      .select(
        "id, channel_id, message_id, storage_path, file_name, content_type, size_bytes, scan_status, uploaded_by, created_at",
      )
      .single();
    if (error) throw new Error(error.message);
    return { attachment: row as ChannelAttachment };
  });

export const listMessageAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { message_ids: string[] }) =>
    z.object({ message_ids: z.array(uuid).max(200) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.message_ids.length === 0) return { attachments: [] as ChannelAttachment[] };
    const { data: rows, error } = await supabase
      .from("channel_attachments")
      .select(
        "id, channel_id, message_id, storage_path, file_name, content_type, size_bytes, scan_status, uploaded_by, created_at",
      )
      .in("message_id", data.message_ids)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { attachments: (rows ?? []) as ChannelAttachment[] };
  });

export const getAttachmentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { attachment_id: string }) =>
    z.object({ attachment_id: uuid }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error: rErr } = await supabase
      .from("channel_attachments")
      .select("id, storage_path, file_name")
      .eq("id", data.attachment_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Attachment not found");

    const { data: signed, error } = await supabase.storage
      .from("channel-attachments")
      .createSignedUrl(row.storage_path, 60 * 10, { download: row.file_name });
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });
