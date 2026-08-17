import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NotificationRow = {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string | null;
  read_status: boolean;
  related_student_id: string | null;
  related_record_type: string | null;
  related_record_id: string | null;
  created_at: string;
};

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      console.error("listNotifications failed", error);
      return { notifications: [] as NotificationRow[], unread: 0 };
    }
    const rows = (data ?? []) as NotificationRow[];
    return { notifications: rows, unread: rows.filter((n) => !n.read_status).length };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read_status: true })
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("Could not mark notification read.");
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("notifications")
      .update({ read_status: true })
      .eq("user_id", userId)
      .eq("read_status", false);
    if (error) throw new Error("Could not mark notifications read.");
    return { ok: true };
  });
