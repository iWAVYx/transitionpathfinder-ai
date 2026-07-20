import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UserPreferences = {
  user_id: string;
  reduced_motion: boolean;
  high_contrast: boolean;
  dyslexia_friendly: boolean;
  reading_level: "plain" | "standard";
  calendar_view: "list" | "week" | "month";
  updated_at: string;
};

const PrefsInput = z.object({
  reduced_motion: z.boolean().optional(),
  high_contrast: z.boolean().optional(),
  dyslexia_friendly: z.boolean().optional(),
  reading_level: z.enum(["plain", "standard"]).optional(),
  calendar_view: z.enum(["list", "week", "month"]).optional(),
});

export const getUserPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("user_preferences" as never)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error("Could not load preferences.");
    if (!data) {
      const { data: inserted, error: insErr } = await supabase
        .from("user_preferences" as never)
        .insert({ user_id: userId } as never)
        .select("*")
        .single();
      if (insErr || !inserted) throw new Error("Could not initialize preferences.");
      return inserted as unknown as UserPreferences;
    }
    return data as unknown as UserPreferences;
  });

export const updateUserPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PrefsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_preferences" as never)
      .upsert({ user_id: userId, ...data } as never, { onConflict: "user_id" });
    if (error) throw new Error("Could not save preferences.");
    const { recordSecurityEvent } = await import("@/lib/security/audit.server");
    await recordSecurityEvent(userId, "preferences_change", {
      fields: Object.keys(data),
    });
    return { ok: true };
  });

const QuietHoursInput = z.object({
  quiet_hours_start: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  quiet_hours_end: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  quiet_hours_tz: z.string().min(2).max(64).nullable(),
});

export const updateQuietHours = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => QuietHoursInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notification_prefs")
      .upsert(
        {
          user_id: userId,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          quiet_hours_tz: data.quiet_hours_tz,
        } as never,
        { onConflict: "user_id" },
      );
    if (error) throw new Error("Could not save quiet hours.");
    const { recordSecurityEvent } = await import("@/lib/security/audit.server");
    await recordSecurityEvent(userId, "notification_prefs_change", {
      quiet_hours: true,
    });
    return { ok: true };
  });

type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
export type SecurityEvent = {
  id: string;
  event_type: string;
  metadata: Json;
  created_at: string;
};

export const listSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SecurityEvent[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("security_events" as never)
      .select("id, event_type, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) throw new Error("Could not load security activity.");
    return (data ?? []) as unknown as SecurityEvent[];
  });
