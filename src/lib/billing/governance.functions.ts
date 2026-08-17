/**
 * Admin governance: read-side of the immutable entitlement audit trail.
 *
 * Every manual capacity change (revoke, transfer, coverage-state release)
 * already writes a row with a mandatory written reason via
 * `record_entitlement_audit`. This module only reads it back — there is no
 * write, update, or delete path, and row-level security limits results to
 * organization administrators and platform admins.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuditEventRow {
  id: string;
  event: string;
  reason: string;
  license_type: string | null;
  organization_id: string | null;
  subject_user_id: string | null;
  allocation_id: string | null;
  pool_id: string | null;
  actor_id: string | null;
  created_at: string;
}

export interface GovernanceSummary {
  events: AuditEventRow[];
  byEvent: { event: string; count: number }[];
  windowDays: number;
}

/** Human labels for the audit event codes written by the database. */
export const AUDIT_EVENT_LABEL: Record<string, string> = {
  license_revoked: "License Revoked",
  license_transferred: "License Transferred",
  license_released_coverage_state: "License Released — Coverage State",
  seats_changed: "Seat Count Changed",
  entitlement_adjusted: "Entitlement Adjusted",
};

export function labelForAuditEvent(event: string): string {
  return (
    AUDIT_EVENT_LABEL[event] ??
    event
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

/**
 * Audit trail for one organization. RLS returns nothing unless the caller
 * administers the organization (or is a platform admin), so no extra
 * authorization branch is needed here.
 */
export const getGovernanceAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((data: { organizationId: string; windowDays?: number }) => {
    if (!UUID_RE.test(data.organizationId)) throw new Error("Invalid organization");
    const windowDays = Math.min(Math.max(data.windowDays ?? 180, 1), 730);
    return { organizationId: data.organizationId, windowDays };
  })
  .handler(async ({ data, context }): Promise<GovernanceSummary> => {
    const since = new Date(
      Date.now() - data.windowDays * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: rows, error } = await context.supabase
      .from("entitlement_audit_events")
      .select(
        "id, event, reason, license_type, organization_id, subject_user_id, allocation_id, pool_id, actor_id, created_at",
      )
      .eq("organization_id", data.organizationId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error) throw new Error(error.message);

    const events = (rows ?? []) as unknown as AuditEventRow[];
    const counts = new Map<string, number>();
    for (const row of events) {
      counts.set(row.event, (counts.get(row.event) ?? 0) + 1);
    }

    return {
      events,
      byEvent: [...counts.entries()]
        .map(([event, count]) => ({ event, count }))
        .sort((a, b) => b.count - a.count),
      windowDays: data.windowDays,
    };
  });
