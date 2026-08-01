/**
 * CSV export for the immutable entitlement audit trail.
 *
 * Pure, browser-safe helpers: they format rows the Governance panel already
 * fetched. Nothing here reads the database, so no new access path is created —
 * an administrator can only export what row-level security already returned.
 */
import type { AuditEventRow } from "./governance.functions";

export const AUDIT_CSV_HEADERS = [
  "recorded_at",
  "event",
  "event_label",
  "license_type",
  "reason",
  "organization_id",
  "subject_user_id",
  "allocation_id",
  "pool_id",
  "actor_id",
  "record_id",
] as const;

/** Quotes a value so spreadsheets cannot interpret it as a formula. */
export function csvCell(value: string | null | undefined): string {
  const raw = value ?? "";
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Builds the full CSV document for a set of audit rows (newest first). */
export function toAuditCsv(
  rows: AuditEventRow[],
  labelFor: (event: string) => string,
): string {
  const lines = [AUDIT_CSV_HEADERS.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.created_at,
        row.event,
        labelFor(row.event),
        row.license_type,
        row.reason,
        row.organization_id,
        row.subject_user_id,
        row.allocation_id,
        row.pool_id,
        row.actor_id,
        row.id,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}

/** Stable, sortable file name for a download. */
export function auditCsvFilename(orgId: string, windowDays: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `entitlement-audit_${orgId.slice(0, 8)}_${windowDays}d_${stamp}.csv`;
}
