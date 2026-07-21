/**
 * Slice F — Channel-activity digest tick.
 *
 * Called by pg_cron every ~15 minutes. Uses service-role for internal access,
 * then finds users whose digest cadence + last-sent + quiet-hours window
 * qualify them for a send, aggregates their channel activity, and delivers
 * the digest email through the internal transactional email pipeline.
 *
 * Auth: Supabase anon key in `apikey` header (canonical cron auth pattern).
 * Public-prefix routes bypass edge auth; we still verify the shared apikey.
 */
import { createFileRoute } from "@tanstack/react-router";
import { render } from "@react-email/components";
import { createClient } from "@supabase/supabase-js";
import * as React from "react";
import { TEMPLATES } from "@/lib/email-templates/registry";

const DIGEST_TEMPLATE = "channel-activity-digest";
const MAX_USERS_PER_TICK = 50;
const MAX_CHANNELS_PER_USER = 8;

type DigestChannel = {
  channel_title: string;
  channel_url: string;
  unread_count: number;
  mentions: number;
  open_actions: number;
  latest_preview?: string;
};

export const Route = createFileRoute("/api/public/channel-digest-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const anon = process.env.SUPABASE_ANON_KEY;
        const url = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const apiKey = request.headers.get("apikey");
        if (!anon || !url || !serviceKey) {
          return Response.json({ error: "misconfigured" }, { status: 500 });
        }
        if (apiKey !== anon) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        const admin = createClient(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // 1. Candidate users: cadence != 'off' and (never sent OR older than
        // cadence interval) and NOT currently in quiet hours.
        // We compute cadence eligibility client-side to keep SQL simple.
        const { data: prefs, error: prefsErr } = await admin
          .from("notification_prefs")
          .select(
            "user_id, channel_digest_frequency, last_channel_digest_at, quiet_hours_start, quiet_hours_end, quiet_hours_tz",
          )
          .neq("channel_digest_frequency", "off")
          .limit(500);
        if (prefsErr) {
          console.error("digest prefs read failed", prefsErr);
          return Response.json({ error: prefsErr.message }, { status: 500 });
        }
        if (!prefs || prefs.length === 0) {
          return Response.json({ sent: 0, reason: "no_subscribers" });
        }

        const now = Date.now();
        const dueUsers = prefs
          .filter((p) => {
            const cadence = p.channel_digest_frequency as "daily" | "weekly";
            const intervalMs =
              cadence === "weekly" ? 7 * 24 * 3600 * 1000 : 24 * 3600 * 1000;
            const last = p.last_channel_digest_at
              ? new Date(p.last_channel_digest_at).getTime()
              : 0;
            return now - last >= intervalMs;
          })
          .filter((p) => !isInQuietHours(p))
          .slice(0, MAX_USERS_PER_TICK);

        if (dueUsers.length === 0) {
          return Response.json({ sent: 0, reason: "none_due" });
        }

        const origin = new URL(request.url).origin;
        let sent = 0;
        const errors: string[] = [];

        for (const p of dueUsers) {
          try {
            const digest = await buildDigestForUser(admin, p.user_id, origin);
            // Skip empty digests but still stamp last_sent so we don't churn.
            if (digest.totalUnread === 0 && digest.totalMentions === 0 && digest.totalOpenActions === 0) {
              await admin
                .from("notification_prefs")
                .update({ last_channel_digest_at: new Date().toISOString() })
                .eq("user_id", p.user_id);
              continue;
            }

            const { data: profile } = await admin
              .from("profiles")
              .select("email, full_name, first_name")
              .eq("id", p.user_id)
              .maybeSingle();
            const email = profile?.email;
            if (!email) continue;

            const recipientName =
              (profile?.first_name as string | null)?.trim() ||
              (profile?.full_name as string | null)?.trim()?.split(" ")[0] ||
              "there";

            const templateData = {
              recipientName,
              siteName: "TransitionForward",
              hubUrl: `${origin}/transition-channel`,
              cadence: p.channel_digest_frequency,
              ...digest,
            };

            const tpl = TEMPLATES[DIGEST_TEMPLATE];
            if (!tpl) throw new Error("digest template missing");
            const html = await render(
              React.createElement(tpl.component, templateData),
            );
            const subject =
              typeof tpl.subject === "function"
                ? tpl.subject(templateData)
                : tpl.subject;

            const idempotencyKey = `channel-digest-${p.user_id}-${new Date().toISOString().slice(0, 10)}`;

            await admin.rpc("enqueue_email", {
              queue_name: "transactional_emails",
              payload: {
                template_name: DIGEST_TEMPLATE,
                recipient_email: email,
                subject,
                html,
                idempotency_key: idempotencyKey,
                template_data: templateData,
              },
            });

            await admin
              .from("notification_prefs")
              .update({ last_channel_digest_at: new Date().toISOString() })
              .eq("user_id", p.user_id);
            sent += 1;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("digest failed for user", p.user_id, msg);
            errors.push(`${p.user_id}: ${msg}`);
          }
        }

        return Response.json({ sent, errors: errors.slice(0, 10) });
      },
    },
  },
});

function isInQuietHours(p: {
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_tz: string | null;
}): boolean {
  if (!p.quiet_hours_start || !p.quiet_hours_end) return false;
  const tz = p.quiet_hours_tz || "UTC";
  let localHm: string;
  try {
    localHm = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    })
      .format(new Date())
      .replace(/[^\d:]/g, "");
  } catch {
    localHm = new Date().toISOString().slice(11, 16);
  }
  const [hh, mm] = localHm.split(":").map((n) => parseInt(n, 10));
  const nowMin = hh * 60 + mm;
  const [sh, sm] = p.quiet_hours_start.split(":").map((n) => parseInt(n, 10));
  const [eh, em] = p.quiet_hours_end.split(":").map((n) => parseInt(n, 10));
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  if (start < end) return nowMin >= start && nowMin < end;
  return nowMin >= start || nowMin < end;
}

async function buildDigestForUser(
  admin: any,
  userId: string,
  origin: string,
): Promise<{
  totalUnread: number;
  totalMentions: number;
  totalOpenActions: number;
  channels: DigestChannel[];
}> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: memberships } = (await admin
    .from("channel_members")
    .select(
      "channel_id, notify_email, muted, left_at, channels!inner(id, title, last_message_at)",
    )
    .eq("user_id", userId)
    .eq("notify_email", true)
    .eq("muted", false)
    .is("left_at", null)
    .order("joined_at", { ascending: false })
    .limit(50)) as {
    data: Array<{
      channel_id: string;
      channels: { id: string; title: string; last_message_at: string | null } | Array<{ id: string; title: string; last_message_at: string | null }>;
    }> | null;
  };

  if (!memberships || memberships.length === 0) {
    return { totalUnread: 0, totalMentions: 0, totalOpenActions: 0, channels: [] };
  }

  const channels: DigestChannel[] = [];
  let totalUnread = 0;
  let totalMentions = 0;
  let totalOpenActions = 0;

  for (const m of memberships.slice(0, MAX_CHANNELS_PER_USER)) {
    const channelId = m.channel_id;
    const ch = pickNested<{ id: string; title: string; last_message_at: string | null }>(m.channels);
    if (!ch) continue;

    const { count: unread } = await admin
      .from("channel_messages")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channelId)
      .gte("created_at", since)
      .neq("author_user_id", userId);

    const { count: mentions } = await admin
      .from("channel_message_mentions")
      .select("id", { count: "exact", head: true })
      .eq("mentioned_user_id", userId)
      .gte("created_at", since);

    const { count: openActions } = await admin
      .from("channel_actions")
      .select("id", { count: "exact", head: true })
      .eq("channel_id", channelId)
      .eq("assignee_user_id", userId)
      .in("status", ["open", "in_progress"]);

    const { data: latest } = (await admin
      .from("channel_messages")
      .select("body")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()) as { data: { body: string | null } | null };

    const unreadN = (unread as number | null) ?? 0;
    const mentionsN = (mentions as number | null) ?? 0;
    const openN = (openActions as number | null) ?? 0;
    if (unreadN === 0 && mentionsN === 0 && openN === 0) continue;

    totalUnread += unreadN;
    totalMentions += mentionsN;
    totalOpenActions += openN;

    channels.push({
      channel_title: ch.title || "Channel",
      channel_url: `${origin}/transition-channel?channel=${channelId}`,
      unread_count: unreadN,
      mentions: mentionsN,
      open_actions: openN,
      latest_preview: redactChannelPreviewForEmail(latest?.body),
    });
  }

  return { totalUnread, totalMentions, totalOpenActions, channels };
}

function pickNested<T>(val: unknown): T | null {
  if (Array.isArray(val)) return (val[0] as T) ?? null;
  return (val as T) ?? null;
}
