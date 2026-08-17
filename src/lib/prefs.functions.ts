import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationCadence = "instant" | "daily" | "weekly";

export type NotificationPrefs = {
  user_id: string;
  email_collab_invites: boolean;
  email_goal_reminders: boolean;
  email_weekly_digest: boolean;
  email_report_ready: boolean;
  notification_cadence: NotificationCadence;
  in_app_enabled: boolean;
  sms_enabled: boolean;
  sms_phone_e164: string | null;
  sms_verified_at: string | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_tz: string | null;
  updated_at: string;
};

const PrefsInput = z.object({
  email_collab_invites: z.boolean().optional(),
  email_goal_reminders: z.boolean().optional(),
  email_weekly_digest: z.boolean().optional(),
  email_report_ready: z.boolean().optional(),
  notification_cadence: z.enum(["instant", "daily", "weekly"]).optional(),
  in_app_enabled: z.boolean().optional(),
  // sms_enabled can be toggled OFF here; turning ON requires phone verification via sms.functions.ts.
  sms_enabled: z.boolean().optional(),
});

export const getNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notification_prefs")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("Could not load preferences.");
    if (!data) {
      const { data: inserted, error: insErr } = await supabase
        .from("notification_prefs")
        .insert({ user_id: userId })
        .select("*")
        .single();
      if (insErr || !inserted) throw new Error("Could not initialize preferences.");
      return inserted as NotificationPrefs;
    }
    return data as NotificationPrefs;
  });

export const updateNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => PrefsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Guard: turning SMS on requires a verified phone on file.
    if (data.sms_enabled === true) {
      const { data: existing } = await supabase
        .from("notification_prefs")
        .select("sms_phone_e164, sms_verified_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing?.sms_phone_e164 || !existing?.sms_verified_at) {
        throw new Error("Verify your phone number before turning on text alerts.");
      }
    }

    const { error } = await supabase
      .from("notification_prefs")
      .upsert({ user_id: userId, ...data }, { onConflict: "user_id" });
    if (error) throw new Error("Could not save preferences.");
    return { ok: true };
  });
