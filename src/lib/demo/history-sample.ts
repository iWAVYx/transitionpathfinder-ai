import type { HistoryExportRecords } from "@/lib/audit.functions";
/** Explicit fictional events, tied only to the selected public demo profile. */
export function demoHistoryRecords(displayName: string): HistoryExportRecords {
  const [first_name, ...last] = displayName.split(" ");
  return {
    student: { first_name, last_name: last.join(" ") || null },
    workspace_scope: null,
    entries: [
      {
        created_at: "2026-10-01T15:00:00Z",
        action: "document.view",
        entity_type: "document",
        recorded_by: "Fictional Family Member",
      },
      {
        created_at: "2026-10-01T14:00:00Z",
        action: "document.download",
        entity_type: "document",
        recorded_by: "Fictional Team Member",
      },
      {
        created_at: "2026-10-01T13:00:00Z",
        action: "sharing.updated",
        entity_type: "permission",
        recorded_by: "Fictional Family Member",
      },
    ],
  };
}
