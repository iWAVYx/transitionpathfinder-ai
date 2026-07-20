// Server-only helper for writing security audit events with service role.
// Never import from client-reachable modules at top level — always
// `await import("@/lib/security/audit.server")` inside a server-fn handler.

export type SecurityEventType =
  | "password_change"
  | "mfa_enroll"
  | "mfa_disable"
  | "email_change_requested"
  | "email_change_confirmed"
  | "session_revoked"
  | "profile_field_change"
  | "preferences_change"
  | "notification_prefs_change"
  | "avatar_change";

export async function recordSecurityEvent(
  userId: string,
  eventType: SecurityEventType,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("security_events").insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata as never,
    });
  } catch (err) {
    // Never let audit failures break the user-facing action.
    console.error("recordSecurityEvent failed", eventType, err);
  }
}
