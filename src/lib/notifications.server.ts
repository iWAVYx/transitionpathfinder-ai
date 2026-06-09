/**
 * Server-only helper to append a row to the `email_notifications` ledger.
 *
 * This does NOT actually send the email. Outbound delivery still happens
 * through the existing Lovable email pipeline (auth + transactional queues).
 * This ledger gives Platform Admins a single audit trail of every
 * notification we triggered, with the related record id when known.
 *
 * Always import lazily from a `.functions.ts` handler:
 *
 *   const { logEmailNotification } = await import("@/lib/notifications.server");
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type EmailNotificationInput = {
  recipient_email: string;
  recipient_user_id?: string | null;
  notification_type: string;
  subject: string;
  body_preview?: string | null;
  related_record_type?: string | null;
  related_record_id?: string | null;
  status?: "queued" | "sent" | "failed" | "skipped";
  error_message?: string | null;
};

export async function logEmailNotification(input: EmailNotificationInput) {
  try {
    const row = {
      ...input,
      status: input.status ?? "queued",
    };
    const { error } = await supabaseAdmin.from("email_notifications").insert(row);
    if (error) {
      console.warn("[notifications] ledger insert failed:", error.message);
    }
  } catch (err) {
    console.warn("[notifications] ledger insert threw:", err);
  }
}
