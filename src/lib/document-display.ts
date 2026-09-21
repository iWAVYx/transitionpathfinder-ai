/**
 * Database rows created before the current document taxonomy can still carry
 * an empty or null `doc_type` at runtime, even when generated types describe
 * the current column as non-null. Keep display code tolerant of that legacy
 * data so one old row cannot crash the entire student workspace.
 */
export function normalizeDocumentType(value: unknown): string {
  if (typeof value !== "string") return "other";
  const normalized = value.trim();
  return normalized || "other";
}

export function formatDocumentTypeLabel(value: unknown): string {
  return normalizeDocumentType(value).replace(/-/g, " ");
}
