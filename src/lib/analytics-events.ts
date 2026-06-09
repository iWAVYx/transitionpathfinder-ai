/**
 * Lightweight analytics event tracker.
 *
 * Writes a single row to the `usage_events` table. RLS allows:
 *  - authenticated users to insert their own (or anonymous) row
 *  - anon users to insert anonymous rows (user_id = null)
 *
 * Designed to be fire-and-forget. Failures are swallowed so analytics
 * tracking never breaks a user flow.
 *
 * Usage:
 *   import { track } from "@/lib/analytics-events";
 *   track("feedback_submitted", { type: "bug" });
 */
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsEventType =
  | "feedback_submitted"
  | "pathway_report_viewed"
  | "pathway_report_shared"
  | "student_created"
  | "demo_started"
  | "waitlist_joined"
  | "contact_submitted"
  | "partner_applied"
  | "onboarding_completed"
  | "resource_saved"
  | "partner_saved"
  | (string & {});

export type TrackMetadata = Record<string, unknown> | undefined;

export function track(eventType: AnalyticsEventType, metadata?: TrackMetadata) {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data?.user?.id ?? null;
      const userRole =
        (data?.user?.user_metadata?.primary_role as string | undefined) ?? null;
      const page = window.location?.pathname ?? null;
      await supabase.from("usage_events").insert({
        event_type: eventType,
        user_id: userId,
        user_role: userRole,
        page,
        metadata: metadata ?? null,
      });
    } catch {
      // swallow — analytics must never break a user flow
    }
  })();
}
