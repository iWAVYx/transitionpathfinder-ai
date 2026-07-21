/**
 * Slice F — Per-channel notification settings + digest preferences.
 * Server functions to toggle mute / email / in-app on a channel_members row,
 * and to update the current user's digest cadence in notification_prefs.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

export const setChannelNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      channel_id: string;
      muted?: boolean;
      notify_email?: boolean;
      notify_in_app?: boolean;
    }) =>
      z
        .object({
          channel_id: uuid,
          muted: z.boolean().optional(),
          notify_email: z.boolean().optional(),
          notify_in_app: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, boolean> = {};
    if (data.muted !== undefined) patch.muted = data.muted;
    if (data.notify_email !== undefined) patch.notify_email = data.notify_email;
    if (data.notify_in_app !== undefined) patch.notify_in_app = data.notify_in_app;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("channel_members")
      .update(patch)
      .eq("channel_id", data.channel_id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type ChannelDigestFrequency = "off" | "daily" | "weekly";

export const setChannelDigestPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      channel_digest_frequency?: ChannelDigestFrequency;
      channel_mentions_email?: boolean;
      channel_assignments_email?: boolean;
    }) =>
      z
        .object({
          channel_digest_frequency: z.enum(["off", "daily", "weekly"]).optional(),
          channel_mentions_email: z.boolean().optional(),
          channel_assignments_email: z.boolean().optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: Record<string, unknown> = {};
    if (data.channel_digest_frequency !== undefined)
      patch.channel_digest_frequency = data.channel_digest_frequency;
    if (data.channel_mentions_email !== undefined)
      patch.channel_mentions_email = data.channel_mentions_email;
    if (data.channel_assignments_email !== undefined)
      patch.channel_assignments_email = data.channel_assignments_email;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("notification_prefs")
      .update(patch)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyChannelDigestPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notification_prefs")
      .select(
        "channel_digest_frequency, channel_mentions_email, channel_assignments_email, quiet_hours_start, quiet_hours_end, quiet_hours_tz, last_channel_digest_at",
      )
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        channel_digest_frequency: "daily" as ChannelDigestFrequency,
        channel_mentions_email: true,
        channel_assignments_email: true,
        quiet_hours_start: null,
        quiet_hours_end: null,
        quiet_hours_tz: null,
        last_channel_digest_at: null,
      }
    );
  });
