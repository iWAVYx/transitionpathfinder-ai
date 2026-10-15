import { assertExpectedViewer, optionalViewerIntent, viewerIntentSchema } from "./viewer-intent";
// Transition Channel — server functions (v1 slice).
//
// Reads and writes flow through the caller's RLS-scoped supabase client. All
// authorization is enforced by the channel_* RLS policies via
// is_channel_member / is_channel_admin. This module only validates input,
// shapes DTOs, and adds idempotent send via `client_dedupe_key`.

import { z } from "zod";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export type ChannelSummary = {
  id: string;
  kind: string;
  title: string;
  purpose: string | null;
  student_id: string | null;
  organization_id: string | null;
  partner_organization_id: string | null;
  last_message_at: string | null;
  archived_at: string | null;
  unread_count: number;
  muted: boolean;
  member_role: string;
};

export type ChannelMessage = {
  id: string;
  channel_id: string;
  author_id: string | null;
  parent_id: string | null;
  body: string;
  pinned: boolean;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
  author_name: string | null;
};

/** Only students and people already linked to the same student may be offered
 * as conversation starters; the RPC checks the JWT user again on every call. */
const startStudentsSchema = z.array(z.object({ student_id: uuid, student_name: z.string() }));
const startRecipientsSchema = z.array(z.object({ user_id: uuid, display_name: z.string() }));

export const listStartableStudentChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data ?? {}, context.userId);
    const result = await context.supabase.rpc("list_student_channel_students");
    const parsed = startStudentsSchema.safeParse(result.data);
    if (
      result.error ||
      !parsed.success ||
      new Set(parsed.data.map((s) => s.student_id)).size !== parsed.data.length
    )
      throw new Error("Could not load your student teams.");
    // Existing RPC limits this list to 100; do not describe it as a complete roster.
    return { students: parsed.data, may_have_more: parsed.data.length >= 100 };
  });

export const listStudentChannelRecipients = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z.object({ student_id: uuid, ...viewerIntentSchema.shape }).parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const result = await context.supabase.rpc("list_student_channel_recipients", {
      p_student_id: data.student_id,
    });
    const parsed = startRecipientsSchema.safeParse(result.data);
    if (
      result.error ||
      !parsed.success ||
      parsed.data.some((r) => r.user_id === context.userId) ||
      new Set(parsed.data.map((r) => r.user_id)).size !== parsed.data.length
    )
      throw new Error("Could not load this student team.");
    return { student_id: data.student_id, recipients: parsed.data };
  });

export const startStudentChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) =>
    z
      .object({
        ...viewerIntentSchema.shape,
        student_id: uuid,
        recipient_id: uuid,
        title: z.string().trim().min(1).max(120),
        first_message: z.string().trim().min(1).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    if (data.recipient_id === context.userId)
      throw new Error("Choose a different student-team member.");
    // Existing RPC performs caller/recipient eligibility, creation, first message
    // and audit insertion in one transaction. No client-supplied actor is used.
    const { data: channelId, error } = await context.supabase.rpc("start_student_channel", {
      p_student_id: data.student_id,
      p_recipient_id: data.recipient_id,
      p_title: data.title,
      p_first_message: data.first_message,
    });
    if (error || !uuid.safeParse(channelId).success)
      throw new Error(
        "We couldn't confirm this conversation. Check your conversations before trying again.",
      );
    return { channel_id: channelId, student_id: data.student_id, recipient_id: data.recipient_id };
  });

export const listMyChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data ?? {}, context.userId);
    const { supabase, userId } = context;

    const { data: memberships, error: mErr } = await supabase
      .from("channel_members")
      .select(
        "channel_id, member_role, muted, channels(id, kind, title, purpose, student_id, organization_id, partner_organization_id, last_message_at, archived_at)",
      )
      .eq("user_id", userId)
      .is("left_at", null);
    if (mErr) throw new Error(mErr.message);

    const rows = memberships ?? [];
    const channelIds = rows.map((r) => r.channel_id);
    let unreadByChannel = new Map<string, number>();

    if (channelIds.length > 0) {
      const { data: reads } = await supabase
        .from("channel_message_reads")
        .select("channel_id, last_read_at")
        .in("channel_id", channelIds)
        .eq("user_id", userId);
      const readMap = new Map<string, string>();
      (reads ?? []).forEach((r) => readMap.set(r.channel_id, r.last_read_at));

      // Count unread per channel via a lightweight aggregate.
      for (const cid of channelIds) {
        const lastRead = readMap.get(cid) ?? "1970-01-01T00:00:00Z";
        const { count } = await supabase
          .from("channel_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", cid)
          .is("deleted_at", null)
          .gt("created_at", lastRead);
        unreadByChannel.set(cid, count ?? 0);
      }
    }

    const channels: ChannelSummary[] = rows
      .filter((r) => r.channels)
      .map((r) => {
        const c = r.channels as NonNullable<typeof r.channels>;
        return {
          id: c.id,
          kind: c.kind,
          title: c.title,
          purpose: c.purpose,
          student_id: c.student_id,
          organization_id: c.organization_id,
          partner_organization_id: c.partner_organization_id,
          last_message_at: c.last_message_at,
          archived_at: c.archived_at,
          unread_count: unreadByChannel.get(c.id) ?? 0,
          muted: !!r.muted,
          member_role: String(r.member_role ?? "member"),
        };
      })
      .sort((a, b) => {
        const at = a.last_message_at ?? "";
        const bt = b.last_message_at ?? "";
        return bt.localeCompare(at);
      });

    return { channels };
  });

export const listChannelMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { channel_id: string; before?: string | null; expected_viewer_id?: string }) =>
    z
      .object({
        channel_id: uuid,
        ...viewerIntentSchema.shape,
        before: z.string().datetime().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase } = context;

    let q = supabase
      .from("channel_messages")
      .select(
        "id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at",
      )
      .eq("channel_id", data.channel_id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.before) q = q.lt("created_at", data.before);

    const { data: rows, error } = await q;
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

    const messages: ChannelMessage[] = (rows ?? [])
      .map((r) => ({
        ...r,
        author_name: r.author_id ? (nameMap.get(r.author_id) ?? "Member") : null,
      }))
      .reverse();

    return { messages };
  });

export const sendChannelMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      expected_viewer_id?: string;
      channel_id: string;
      body: string;
      parent_id?: string | null;
      client_dedupe_key?: string | null;
    }) =>
      z
        .object({
          channel_id: uuid,
          ...viewerIntentSchema.shape,
          body: z.string().trim().min(1, "Message is required").max(4000),
          parent_id: uuid.optional().nullable(),
          client_dedupe_key: z.string().max(80).optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;

    if (data.parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from("channel_messages")
        .select("id,channel_id,deleted_at")
        .eq("id", data.parent_id)
        .eq("channel_id", data.channel_id)
        .maybeSingle();
      if (
        parentError ||
        !parent ||
        parent.id !== data.parent_id ||
        parent.channel_id !== data.channel_id ||
        parent.deleted_at
      )
        throw new Error("This thread is no longer available for replies. Reload the conversation.");
    }

    const dedupe =
      data.client_dedupe_key?.trim() || `${userId}:${Date.now()}:${crypto.randomUUID()}`;

    // Idempotent send: if a message with this dedupe key already exists in the
    // last 24h from this author, return it instead of inserting again.
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing, error: dedupeError } = await supabase
      .from("channel_messages")
      .select(
        "id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at",
      )
      .eq("channel_id", data.channel_id)
      .eq("author_id", userId)
      .eq("client_dedupe_key", dedupe)
      .gt("created_at", cutoff)
      .maybeSingle();

    if (dedupeError)
      throw new Error(
        "We couldn't check whether this message was already sent. Reload the conversation before trying again.",
      );
    if (existing) {
      if (
        typeof existing.body !== "string" ||
        existing.channel_id !== data.channel_id ||
        existing.author_id !== userId ||
        existing.body.trim() !== data.body.trim() ||
        (existing.parent_id ?? null) !== (data.parent_id ?? null)
      )
        throw new Error(
          "This message request no longer matches the original. Reload the conversation before trying again.",
        );
      return { message: { ...existing, author_name: null } as ChannelMessage };
    }

    const { data: inserted, error } = await supabase
      .from("channel_messages")
      .insert({
        channel_id: data.channel_id,
        author_id: userId,
        parent_id: data.parent_id ?? null,
        body: data.body.trim(),
        client_dedupe_key: dedupe,
      })
      .select(
        "id, channel_id, author_id, parent_id, body, pinned, edited_at, deleted_at, created_at",
      )
      .single();
    if (
      error ||
      !inserted ||
      inserted.channel_id !== data.channel_id ||
      inserted.author_id !== userId ||
      (inserted.parent_id ?? null) !== (data.parent_id ?? null) ||
      !inserted.id
    )
      throw new Error(
        "We couldn't confirm this message was sent. Check the conversation before trying again.",
      );

    return { message: { ...inserted, author_name: null } as ChannelMessage };
  });

export const markChannelRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (input: {
      channel_id: string;
      last_read_message_id?: string | null;
      expected_viewer_id?: string;
    }) =>
      z
        .object({
          channel_id: uuid,
          ...viewerIntentSchema.shape,
          last_read_message_id: uuid.optional().nullable(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data, context.userId);
    const { supabase, userId } = context;
    if (data.last_read_message_id) {
      const { data: message, error: messageError } = await supabase
        .from("channel_messages")
        .select("id,channel_id")
        .eq("id", data.last_read_message_id)
        .eq("channel_id", data.channel_id)
        .maybeSingle();
      if (
        messageError ||
        !message ||
        message.channel_id !== data.channel_id ||
        message.id !== data.last_read_message_id
      )
        throw new Error("We couldn't confirm this conversation's read status. Please try again.");
    }
    const { data: saved, error } = await supabase
      .from("channel_message_reads")
      .upsert(
        {
          channel_id: data.channel_id,
          user_id: userId,
          last_read_message_id: data.last_read_message_id ?? null,
          last_read_at: new Date().toISOString(),
        },
        { onConflict: "channel_id,user_id" },
      )
      .select("channel_id,user_id,last_read_message_id")
      .single();
    if (
      error ||
      !saved ||
      saved.channel_id !== data.channel_id ||
      saved.user_id !== userId ||
      (saved.last_read_message_id ?? null) !== (data.last_read_message_id ?? null)
    )
      throw new Error("We couldn't confirm this conversation's read status. Please try again.");
    return { ok: true };
  });
