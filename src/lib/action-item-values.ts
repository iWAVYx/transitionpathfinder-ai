/** Read both recorded completion forms; never rewrite historical records. */
export const ACTION_COMPLETE_VALUES = ["complete", "completed"] as const;
export const ACTION_OPEN_FILTER = "(complete,completed)";
export function isActionItemComplete(status: string | null | undefined) {
  return status === "complete" || status === "completed";
}
export function normalizeActionRecord<T extends { status: string; category: string }>(row: T): T {
  return {
    ...row,
    status: isActionItemComplete(row.status) ? "completed" : row.status,
    category: row.category === "teacher" ? "educator" : row.category,
  };
}
