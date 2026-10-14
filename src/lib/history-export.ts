import type { HistoryExportRecords } from "./audit.functions";
import {
  classifyEntry,
  humanizeAction,
  HISTORY_FILTERS,
  type HistoryFilterKey,
} from "./history-display";
import { organizationCsvCell } from "./organization-report-export";
/** CSV is a limited data export, not a complete archive or printable report. */
export function createHistoryCsv(
  records: HistoryExportRecords,
  context: {
    filter: HistoryFilterKey;
    loadedCount: number;
    olderAvailable: boolean;
    exportedAt: string;
  },
): string {
  const category = (key: HistoryFilterKey) =>
    HISTORY_FILTERS.find((filter) => filter.key === key)?.label ?? "Other Activity";
  const lines: unknown[][] = [
    ["TransitionForward Activity History"],
    ["Student", [records.student.first_name, records.student.last_name].filter(Boolean).join(" ")],
    [
      "Workspace Scope",
      records.workspace_scope === "school"
        ? "School"
        : records.workspace_scope === "district"
          ? "District"
          : "Student Records",
    ],
    ["Exported At (UTC)", context.exportedAt],
    [
      "Selected Category",
      context.filter === "all" ? "All Loaded Activity" : category(context.filter),
    ],
    ["Loaded Records", context.loadedCount],
    ["Exported Records", records.entries.length],
    ["Older Activity Was Available When Loaded", context.olderAvailable ? "Yes" : "No"],
    [
      "About This File",
      "Permitted records selected from the loaded view. This is not a complete lifetime activity record. Raw identifiers and private record details are excluded.",
    ],
    [],
    ["Recorded At", "Activity", "Category", "Recorded By"],
    ...records.entries.map((entry) => [
      entry.created_at,
      humanizeAction(entry),
      classifyEntry(entry) === "all" ? "Other Activity" : category(classifyEntry(entry)),
      entry.recorded_by,
    ]),
  ];
  return "\uFEFF" + lines.map((row) => row.map(organizationCsvCell).join(",")).join("\r\n");
}
