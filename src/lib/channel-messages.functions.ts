import { assertExpectedViewer, optionalViewerIntent, viewerIntentSchema } from "./viewer-intent";
// Transition Channel — message capabilities (Slice C).
//
// Threads, edit/delete, pin, bookmark, and attachments. All reads and writes
// flow through the caller's RLS-scoped supabase client so channel_*
// policies enforce membership; helper checks below only shape errors and
// gate write intent (author vs. admin).

import { z } from "zod";
import { channelMessageReadSchema } from "./channel-message-read-contract";
import { readReportPages, readReportBatches } from "./report-query-pages";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ChannelMessage } from "@/lib/channels.functions";
import { assertProtectedFileUploadsEnabled } from "@/lib/protected-file-uploads";
import { assertPrivacySafeDerivedUpload } from "@/lib/sensitive-text-redaction";

const uuid = z.string().uuid();
const messageIntentSchema = z.object({
  message_id: uuid,
  expected_channel_id: uuid.optional(),
  ...viewerIntentSchema.shape,
});
function assertMessageTarget(
  input: z.infer<typeof messageIntentSchema>,
  row: { id: string; channel_id: string } | null,
) {
  if (
    !row ||
    row.id !== input.message_id ||
    (input.expected_channel_id && row.channel_id !== input.expected_channel_id)
  )
    throw new Error("This message is no longer available. Refresh the conversation.");
}

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
  .validator(
    (input: { parent_id: string; expected_channel_id?: string; expected_viewer_id?: string }) =>
      z
        .object({
          parent_id: uuid,
          expected_channel_id: uuid.optional(),
          ...viewerIntentSchema.shape,
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;

    const { data: parent, error: pErr } = await supabase
      .from("channel_messages")
      .select(
        "id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at",
      )
      .eq("id", data.parent_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (
      !parent ||
      parent.id !== data.parent_id ||
      (data.expected_channel_id && parent.channel_id !== data.expected_channel_id)
    )
      throw new Error("Thread not available.");

    const { data: rows, error } = await supabase
      .from("channel_messages")
      .select(
        "id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at",
      )
      .eq("parent_id", data.parent_id)
      .eq("channel_id", parent.channel_id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(201);
    if (error) throw new Error(error.message);

    if (
      !Array.isArray(rows) ||
      rows.some(
        (reply) => reply.parent_id !== data.parent_id || reply.channel_id !== parent.channel_id,
      )
    )
      throw new Error("Thread replies unavailable.");
    const visible = rows.slice(0, 200);
    const authorIds = Array.from(
      new Set([parent, ...visible].map((r) => r.author_id).filter((v): v is string => !!v)),
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
      author_name: r.author_id ? (nameMap.get(r.author_id) ?? "Member") : null,
    });

    return {
      parent: shape(parent),
      replies: visible.map(shape),
      hasMore: rows.length > 200,
    };
  });
// ─── Edit / Delete ─────────────────────────────────────────────────────────

export const editChannelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: z.input<typeof messageIntentSchema> & { body: string; expected_body?: string }) =>
      z
        .object({
          ...messageIntentSchema.shape,
          expected_body: z.string().max(4000).optional(),
          body: z.string().trim().min(1).max(4000),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    const { data: existing, error: eErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, body, deleted_at")
      .eq("id", data.message_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    assertMessageTarget(data, existing);
    if (!existing) throw new Error("Message not found");
    if (existing.author_id !== userId) throw new Error("Only the author can edit this message");
    if (existing.deleted_at) throw new Error("Message has been deleted");
    if (data.expected_body !== undefined && data.expected_body !== existing.body)
      throw new Error(
        "This message changed while you were editing. Refresh the conversation before saving.",
      );
    if (existing.body === data.body.trim()) return { ok: true };

    const { error: histErr } = await supabase.from("channel_message_edits").insert({
      message_id: existing.id,
      channel_id: existing.channel_id,
      editor_id: userId,
      previous_body: existing.body,
    });
    if (histErr) throw new Error(histErr.message);

    const now = new Date().toISOString();
    const { data: saved, error } = await supabase
      .from("channel_messages")
      .update({ body: data.body.trim(), edited_at: now })
      .eq("id", existing.id)
      .eq("channel_id", existing.channel_id)
      .eq("author_id", userId)
      .eq("body", existing.body)
      .is("deleted_at", null)
      .select("id,channel_id,author_id,body,edited_at,deleted_at")
      .single();
    if (
      error ||
      !saved ||
      saved.id !== existing.id ||
      saved.channel_id !== existing.channel_id ||
      saved.author_id !== userId ||
      saved.body !== data.body.trim() ||
      saved.edited_at !== now ||
      saved.deleted_at
    )
      throw new Error("We couldn't confirm this message was updated. Refresh the conversation.");
    return { ok: true };
  });

export const deleteChannelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.input<typeof messageIntentSchema>) => messageIntentSchema.parse(input))
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    const { data: existing, error: eErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id, deleted_at")
      .eq("id", data.message_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    assertMessageTarget(data, existing);
    if (!existing) throw new Error("Message not found");
    // Author can delete their own. Admin path uses moderation flow.
    if (existing.author_id !== userId) {
      throw new Error("Only the author can delete this message here");
    }
    if (existing.deleted_at) return { ok: true };

    const { data: saved, error } = await supabase
      .from("channel_messages")
      .update({ deleted_at: new Date().toISOString(), body: "" })
      .eq("id", existing.id)
      .eq("channel_id", existing.channel_id)
      .eq("author_id", userId)
      .is("deleted_at", null)
      .select("id,channel_id,author_id,body,deleted_at")
      .single();
    if (
      error ||
      !saved ||
      saved.id !== existing.id ||
      saved.channel_id !== existing.channel_id ||
      saved.author_id !== userId ||
      saved.body !== "" ||
      !saved.deleted_at
    )
      throw new Error("We couldn't confirm this message was removed. Refresh the conversation.");
    return { ok: true };
  });

// ─── Pin ───────────────────────────────────────────────────────────────────

export const setMessagePinned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: z.input<typeof messageIntentSchema> & { pinned: boolean }) =>
    z.object({ ...messageIntentSchema.shape, pinned: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    const { data: existing, error: eErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id, deleted_at")
      .eq("id", data.message_id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);
    assertMessageTarget(data, existing);
    if (!existing) throw new Error("Message not found");

    if (existing.deleted_at) throw new Error("Message has been deleted");
    const { data: isAdmin, error: aErr } = await supabase.rpc("is_channel_admin", {
      _channel_id: existing.channel_id,
      _user_id: userId,
    });
    if (aErr) throw new Error(aErr.message);
    if (isAdmin !== true) throw new Error("Only channel admins can pin or unpin messages");

    const patch = data.pinned
      ? { pinned: true, pinned_at: new Date().toISOString(), pinned_by: userId }
      : { pinned: false, pinned_at: null, pinned_by: null };
    const { data: saved, error } = await supabase
      .from("channel_messages")
      .update(patch)
      .eq("id", existing.id)
      .eq("channel_id", existing.channel_id)
      .is("deleted_at", null)
      .select("id,channel_id,pinned,pinned_at,pinned_by")
      .single();
    if (
      error ||
      !saved ||
      saved.id !== existing.id ||
      saved.channel_id !== existing.channel_id ||
      saved.pinned !== patch.pinned ||
      saved.pinned_at !== patch.pinned_at ||
      saved.pinned_by !== patch.pinned_by
    )
      throw new Error("We couldn't confirm this pin change. Refresh the conversation.");
    return { ok: true };
  });

export const listPinnedMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { channel_id: string; expected_viewer_id?: string }) =>
    z.object({ channel_id: uuid, ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;
    const rows = await readReportPages((from, to) =>
      supabase
        .from("channel_messages")
        .select(
          "id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at",
          { count: "exact" },
        )
        .eq("channel_id", data.channel_id)
        .eq("pinned", true)
        .is("deleted_at", null)
        .order("pinned_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    const messages = z.array(channelMessageReadSchema.omit({ author_name: true })).parse(rows);
    if (
      new Set(messages.map((m) => m.id)).size !== messages.length ||
      messages.some((m) => m.channel_id !== data.channel_id || !m.pinned || m.deleted_at !== null)
    )
      throw new Error("Pinned messages are unavailable. Reload pinned messages.");
    const authorIds = [...new Set(messages.flatMap((m) => (m.author_id ? [m.author_id] : [])))];
    const profiles = await readReportBatches(authorIds, (ids, from, to) =>
      supabase
        .from("profiles")
        .select("id, full_name, preferred_name", { count: "exact" })
        .in("id", ids)
        .order("id")
        .range(from, to),
    );
    const parsedProfiles = z
      .array(
        z.object({
          id: z.string().min(1),
          full_name: z.string().nullable(),
          preferred_name: z.string().nullable(),
        }),
      )
      .parse(profiles);
    if (
      new Set(parsedProfiles.map((p) => p.id)).size !== parsedProfiles.length ||
      parsedProfiles.some((p) => !authorIds.includes(p.id))
    )
      throw new Error("Pinned author details are unavailable.");
    const names = new Map(
      parsedProfiles.map((p) => [p.id, (p.preferred_name || p.full_name || "").trim() || "Member"]),
    );
    return {
      channel_id: data.channel_id,
      pinned: messages.map((m) => ({
        ...m,
        author_name: m.author_id ? (names.get(m.author_id) ?? "Member") : null,
      })),
    };
  });

// ─── Bookmarks ─────────────────────────────────────────────────────────────

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: z.input<typeof messageIntentSchema> & { note?: string | null; bookmarked?: boolean }) =>
      z
        .object({
          ...messageIntentSchema.shape,
          bookmarked: z.boolean().optional(),
          note: z.string().trim().max(280).optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    const { data: msg, error: mErr } = await supabase
      .from("channel_messages")
      .select("id, channel_id")
      .eq("id", data.message_id)
      .maybeSingle();
    if (mErr) throw new Error(mErr.message);
    assertMessageTarget(data, msg);
    if (!msg) throw new Error("Message not found");

    const { data: existing, error: eErr } = await supabase
      .from("channel_bookmarks")
      .select("id")
      .eq("user_id", userId)
      .eq("message_id", msg.id)
      .maybeSingle();
    if (eErr) throw new Error(eErr.message);

    const desired = data.bookmarked ?? !existing;
    if (!!existing === desired) return { bookmarked: desired };
    if (existing) {
      const { data: removed, error } = await supabase
        .from("channel_bookmarks")
        .delete()
        .eq("id", existing.id)
        .eq("user_id", userId)
        .eq("message_id", msg.id)
        .select("id")
        .single();
      if (error || !removed || removed.id !== existing.id)
        throw new Error("We couldn't confirm this bookmark was removed. Refresh the conversation.");
      return { bookmarked: false };
    }

    const { data: saved, error } = await supabase
      .from("channel_bookmarks")
      .insert({
        user_id: userId,
        channel_id: msg.channel_id,
        message_id: msg.id,
        note: data.note ?? null,
      })
      .select("user_id,channel_id,message_id")
      .single();
    if (
      error ||
      !saved ||
      saved.user_id !== userId ||
      saved.channel_id !== msg.channel_id ||
      saved.message_id !== msg.id
    )
      throw new Error("We couldn't confirm this bookmark was saved. Refresh the conversation.");
    return { bookmarked: true };
  });

const bookmarkIdentitySchema = z.object({
  id: uuid,
  user_id: z.string().min(1),
  channel_id: uuid,
  message_id: uuid,
});
function related<T>(value: T | T[] | null): T {
  if (Array.isArray(value)) {
    if (value.length !== 1) throw new Error("Bookmark source is unavailable.");
    return value[0];
  }
  if (!value) throw new Error("Bookmark source is unavailable.");
  return value;
}
export const listMyBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data ?? {}, context.userId);
    const { supabase, userId } = context;
    const rows = await readReportPages((from, to) =>
      supabase
        .from("channel_bookmarks")
        .select(
          "id,user_id,channel_id,message_id,note,created_at,channel_messages!inner(id,channel_id,body,author_id,created_at,deleted_at),channels!inner(id,title)",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .is("channel_messages.deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    );
    const identities = z.array(bookmarkIdentitySchema).parse(rows);
    if (
      new Set(identities.map((r) => r.id)).size !== rows.length ||
      new Set(identities.map((r) => r.message_id)).size !== rows.length
    )
      throw new Error("Bookmarks changed while loading. Reload bookmarks.");
    const bookmarks: ChannelBookmark[] = rows.map((r) => {
      const m = related(r.channel_messages),
        c = related(r.channels);
      if (
        r.user_id !== userId ||
        m.id !== r.message_id ||
        m.channel_id !== r.channel_id ||
        m.deleted_at !== null ||
        c.id !== r.channel_id
      )
        throw new Error("Bookmark source is unavailable.");
      const result = z
        .object({
          note: z.string().nullable(),
          created_at: z.string().datetime({ offset: true }),
          message_body: z.string(),
          message_author_id: z.string().min(1).nullable(),
          message_created_at: z.string().datetime({ offset: true }),
          channel_title: z.string(),
        })
        .parse({
          note: r.note,
          created_at: r.created_at,
          message_body: m.body,
          message_author_id: m.author_id,
          message_created_at: m.created_at,
          channel_title: c.title,
        });
      return { id: r.id, channel_id: r.channel_id, message_id: r.message_id, ...result };
    });
    return { bookmarks };
  });

export const listChannelBookmarkIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { channel_id: string; expected_viewer_id?: string }) =>
    z.object({ channel_id: uuid, ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    const rows = await readReportPages((from, to) =>
      supabase
        .from("channel_bookmarks")
        .select(
          "id,user_id,channel_id,message_id,channel_messages!inner(id,channel_id,deleted_at),channels!inner(id)",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .eq("channel_id", data.channel_id)
        .is("channel_messages.deleted_at", null)
        .order("id")
        .range(from, to),
    );
    const identities = z.array(bookmarkIdentitySchema).parse(rows);
    if (
      new Set(identities.map((r) => r.id)).size !== rows.length ||
      new Set(identities.map((r) => r.message_id)).size !== rows.length
    )
      throw new Error("Bookmarks changed while loading. Reload bookmarks.");
    for (const r of rows) {
      const m = related(r.channel_messages),
        c = related(r.channels);
      if (
        r.user_id !== userId ||
        r.channel_id !== data.channel_id ||
        m.id !== r.message_id ||
        m.channel_id !== data.channel_id ||
        m.deleted_at !== null ||
        c.id !== data.channel_id
      )
        throw new Error("Bookmarks are unavailable. Reload bookmarks.");
    }
    return { channel_id: data.channel_id, message_ids: rows.map((r) => r.message_id) };
  });

// ─── Attachments ───────────────────────────────────────────────────────────

async function scanRegisteredAttachment(row: ChannelAttachment, actorId: string) {
  // Keep the object quarantined until the private Cloudmersive pipeline
  // returns a clean verdict. Missing credentials, timeouts, unknown verdicts,
  // or write failures all leave the attachment unavailable.
  const { scanUploadedDocument } = await import("./document-av-scan.server");
  const scanResult = await scanUploadedDocument({
    bucket: "channel-attachments",
    storage_path: row.storage_path,
    declared_mime: row.content_type,
    declared_size: row.size_bytes,
  });
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const isInfected = !scanResult.ok && scanResult.code === "infected";
  const nextStatus = scanResult.ok ? "clean" : isInfected ? "deleted" : "failed";
  let storagePurged = false;

  if (isInfected) {
    const { error: removeError } = await supabaseAdmin.storage
      .from("channel-attachments")
      .remove([row.storage_path]);
    storagePurged = !removeError;
    if (removeError) {
      console.error("channel_attachment_scan: infected object purge failed", {
        attachmentId: row.id,
      });
    }
  }

  const { error: statusError } = await supabaseAdmin
    .from("channel_attachments")
    .update({ scan_status: nextStatus })
    .eq("id", row.id)
    .eq("scan_status", "pending");
  if (statusError) {
    // The database default is pending, so an update failure remains closed.
    throw new Error("Attachment security scan state could not be recorded");
  }

  const { error: auditError } = await supabaseAdmin.from("channel_audit_events").insert({
    channel_id: row.channel_id,
    event_type: scanResult.ok
      ? "attachment_scan_clean"
      : isInfected
        ? "attachment_scan_blocked"
        : "attachment_scan_quarantined",
    actor_id: actorId,
    metadata: {
      attachment_id: row.id,
      scan_code: scanResult.code,
      scan_provider: scanResult.provider,
      scan_id: scanResult.scan_id,
      clean_result: scanResult.clean_result,
      blocked_reason_count: scanResult.blocked_reasons.length,
      threat_count: scanResult.threats.length,
      storage_purged: storagePurged,
    },
  });
  if (auditError) {
    console.error("channel_attachment_scan: audit event write failed", {
      attachmentId: row.id,
    });
  }

  return { ...row, scan_status: nextStatus } as ChannelAttachment;
}

export const prepareChannelAttachmentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      expected_viewer_id?: string;
      channel_id: string;
      message_id: string;
      file_name: string;
      content_type?: string | null;
      size_bytes?: number | null;
    }) =>
      z
        .object({
          channel_id: uuid,
          ...viewerIntentSchema.shape,
          message_id: uuid,
          file_name: z.string().min(1).max(255),
          content_type: z.string().max(200).optional().nullable(),
          size_bytes: z.number().int().min(0).max(26214400).optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    assertProtectedFileUploadsEnabled();
    assertPrivacySafeDerivedUpload(data.file_name, data.content_type ?? null);
    const { supabase, userId } = context;

    const { data: message, error: messageError } = await supabase
      .from("channel_messages")
      .select("id, channel_id, author_id")
      .eq("id", data.message_id)
      .maybeSingle();
    if (messageError) throw new Error(messageError.message);
    if (!message || message.channel_id !== data.channel_id) {
      throw new Error("Attachment message does not belong to this channel");
    }
    if (message.author_id !== userId) {
      throw new Error("Attachments may only be added by the message author");
    }

    // Generate the entire object path on the trusted server. The signed token
    // below is scoped to this single randomized path and never exposes the
    // service-role credential to the browser.
    const cleanName = data.file_name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120);
    const storagePath = `${data.channel_id}/${data.message_id}/${crypto.randomUUID()}-${cleanName || "attachment"}`;

    const { data: row, error } = await supabase
      .from("channel_attachments")
      .insert({
        channel_id: data.channel_id,
        message_id: data.message_id,
        storage_path: storagePath,
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

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: signed, error: signedError } = await supabaseAdmin.storage
        .from("channel-attachments")
        .createSignedUploadUrl(storagePath, { upsert: false });
      if (signedError || !signed) {
        throw new Error("Signed upload authorization failed");
      }

      return {
        attachment: row as ChannelAttachment,
        upload: {
          storage_path: storagePath,
          token: signed.token,
        },
      };
    } catch (error) {
      // A token is never returned unless the pending row and signed path both
      // exist. Best-effort removal prevents an unusable pending row when token
      // creation fails; either outcome remains quarantined.
      const { error: cleanupError } = await supabase
        .from("channel_attachments")
        .delete()
        .eq("id", row.id)
        .eq("uploaded_by", userId)
        .eq("scan_status", "pending");
      if (cleanupError) {
        console.error("channel attachment upload authorization cleanup failed", {
          attachmentId: row.id,
        });
      }
      throw error;
    }
  });

export const failChannelAttachmentUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { attachment_id: string; expected_viewer_id?: string }) =>
    z.object({ attachment_id: uuid, ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("channel_attachments")
      .select("id, channel_id, storage_path, scan_status, uploaded_by")
      .eq("id", data.attachment_id)
      .eq("uploaded_by", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row || row.scan_status !== "pending") return { ok: true };

    // The RLS-scoped lookup above proves that the caller owns this pending
    // attachment. Only then may the server-only client purge a partial object
    // and record a terminal, still-quarantined failure state.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: removeError } = await supabaseAdmin.storage
      .from("channel-attachments")
      .remove([row.storage_path]);
    const { error: statusError } = await supabaseAdmin
      .from("channel_attachments")
      .update({ scan_status: "failed" })
      .eq("id", row.id)
      .eq("scan_status", "pending");
    if (statusError) throw new Error("Attachment upload failure could not be recorded");

    const { error: auditError } = await supabaseAdmin.from("channel_audit_events").insert({
      channel_id: row.channel_id,
      event_type: "attachment_upload_failed",
      actor_id: userId,
      metadata: {
        attachment_id: row.id,
        storage_purged: !removeError,
      },
    });
    if (auditError) {
      console.error("channel_attachment_upload_failed: audit event write failed", {
        attachmentId: row.id,
      });
    }

    return {
      ok: true,
    };
  });

export const scanChannelAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { attachment_id: string; expected_viewer_id?: string }) =>
    z.object({ attachment_id: uuid, ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    // The caller's RLS-scoped client proves current channel membership, and
    // the uploaded_by predicate prevents other members from spending scanner
    // capacity for somebody else's attachment.
    const { data: row, error } = await supabase
      .from("channel_attachments")
      .select(
        "id, channel_id, message_id, storage_path, file_name, content_type, size_bytes, scan_status, uploaded_by, created_at",
      )
      .eq("id", data.attachment_id)
      .eq("uploaded_by", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Attachment not found or scan is not permitted");

    // A completed verdict is idempotent. Only a quarantined pending object may
    // enter the private scanner, and only the service-role path below can
    // record the resulting verdict.
    if (row.scan_status !== "pending") {
      return { attachment: row as ChannelAttachment };
    }

    return { attachment: await scanRegisteredAttachment(row as ChannelAttachment, userId) };
  });

export const listMessageAttachments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: { message_ids: string[]; expected_channel_id?: string; expected_viewer_id?: string }) =>
      z
        .object({
          message_ids: z.array(uuid).max(200),
          expected_channel_id: uuid.optional(),
          ...viewerIntentSchema.shape,
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    let attachments: ChannelAttachment[];
    try {
      attachments = await readReportBatches<ChannelAttachment>(
        data.message_ids,
        (ids, from, to) => {
          let query = context.supabase
            .from("channel_attachments")
            .select(
              "id, channel_id, message_id, storage_path, file_name, content_type, size_bytes, scan_status, uploaded_by, created_at",
              { count: "exact" },
            )
            .in("message_id", ids)
            .order("id")
            .range(from, to);
          if (data.expected_channel_id) query = query.eq("channel_id", data.expected_channel_id);
          return query;
        },
      );
    } catch {
      throw new Error("We couldn't load all message attachments. Please try again.");
    }
    if (
      attachments.some(
        (attachment) =>
          !data.message_ids.includes(attachment.message_id) ||
          (data.expected_channel_id && attachment.channel_id !== data.expected_channel_id),
      )
    )
      throw new Error("Message attachments changed. Please try again.");
    return { attachments };
  });

export const getAttachmentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      attachment_id: string;
      expected_channel_id?: string;
      expected_message_id?: string;
      expected_viewer_id?: string;
    }) =>
      z
        .object({
          attachment_id: uuid,
          expected_channel_id: uuid.optional(),
          expected_message_id: uuid.optional(),
          ...viewerIntentSchema.shape,
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;
    const { data: row, error: rErr } = await supabase
      .from("channel_attachments")
      .select("id, storage_path, file_name, scan_status, channel_id, message_id")
      .eq("id", data.attachment_id)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!row) throw new Error("Attachment not found");
    if (row.scan_status !== "clean") {
      throw new Error(
        row.scan_status === "pending"
          ? "Attachment security scanning is still in progress"
          : "Attachment was blocked by security scanning",
      );
    }

    if (
      row.id !== data.attachment_id ||
      (data.expected_channel_id && row.channel_id !== data.expected_channel_id) ||
      (data.expected_message_id && row.message_id !== data.expected_message_id)
    )
      throw new Error("Attachment no longer matches this message.");
    const { data: signed, error } = await supabase.storage
      .from("channel-attachments")
      .createSignedUrl(row.storage_path, 60, { download: row.file_name });
    if (error || !signed?.signedUrl)
      throw new Error("We couldn't prepare this attachment. Please try again.");
    return { url: signed.signedUrl };
  });
