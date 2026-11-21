import type { HistoryExportRecords } from "./audit.functions";
import {
  classifyEntry,
  humanizeAction,
  HISTORY_FILTERS,
  type HistoryFilterKey,
} from "./history-display";
import { organizationCsvCell } from "./organization-report-export";
export type HistoryExportContext = {
  filter: HistoryFilterKey;
  loadedCount: number;
  olderAvailable: boolean;
  exportedAt: string;
  sample?: boolean;
};
export function historyCategoryLabel(key: HistoryFilterKey) {
  return key === "all"
    ? "All Loaded Activity"
    : (HISTORY_FILTERS.find((filter) => filter.key === key)?.label ?? "Other Activity");
}
export function historyWorkspaceLabel(scope: HistoryExportRecords["workspace_scope"]) {
  return scope === "school" ? "School" : scope === "district" ? "District" : "Student Records";
}
export function historyTimestamp(value: string) {
  const time = new Date(value);
  if (Number.isNaN(time.getTime())) return "Recorded Time Unavailable";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(time);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const fraction = value.match(/\.([0-9]+)(?:Z|[+-][0-9]{2}:?[0-9]{2})$/)?.[1];
  return `${part("month")} ${part("day")}, ${part("year")} at ${part("hour")}:${part("minute")}:${part("second")}${fraction ? `.${fraction}` : ""} ${part("dayPeriod")} UTC`;
}
/** CSV is a limited data export, not a complete archive or printable report. */
export function createHistoryCsv(
  records: HistoryExportRecords,
  context: HistoryExportContext,
): string {
  const category = (key: HistoryFilterKey) =>
    HISTORY_FILTERS.find((filter) => filter.key === key)?.label ?? "Other Activity";
  const lines: unknown[][] = [
    [
      context.sample
        ? "TransitionForward Activity History - Fictional Sample"
        : "TransitionForward Activity History",
    ],
    ...(context.sample
      ? [
          [
            "Sample Notice",
            "Fictional demonstration only. Contains no real student records or real access events.",
          ],
        ]
      : []),
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
