import { z } from "zod";
import { ReportSchema } from "./pathway-generation-contract";
import { PathwayReportV2 } from "./pathway-v2";

const FIELDS = new Set([...Object.keys(ReportSchema.shape), ...Object.keys(PathwayReportV2.shape)].filter(key => key !== "schema_version"));
const Entry = z.object({ recorded_at: z.string().datetime(), operation: z.enum(["generated", "saved"]) }).strict();
type Update = z.infer<typeof Entry>;
type Updates = { version: 1; fields: Record<string, Update> };
const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

/** Last observed section operation, not a review/approval or an immutable audit log. */
export function readSectionUpdates(content: unknown): Updates | undefined {
  const metadata = record(record(content)?.section_updates);
  const entries = record(metadata?.fields);
  if (metadata?.version !== 1 || !entries) return undefined;
  const fields = Object.fromEntries([...FIELDS].flatMap(key => {
    if (!Object.hasOwn(entries, key)) return [];
    const parsed = Entry.safeParse(entries[key]);
    return parsed.success ? [[key, parsed.data]] : [];
  }));
  return Object.keys(fields).length ? { version: 1, fields } : undefined;
}
function normalized(content: unknown): Record<string, unknown> {
  const value = JSON.parse(JSON.stringify(content));
  const result = record(value);
  if (!result) throw new Error("This report content could not be saved.");
  return result;
}
function canonical(value: unknown): string | undefined {
  const stable = (item: unknown): unknown => Array.isArray(item) ? item.map(stable)
    : record(item) ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => [key, stable(val)])) : item;
  return JSON.stringify(stable(value));
}
function tracked(previous: unknown, next: Record<string, unknown>, supplied: Set<string>, operation: Update["operation"], at: string) {
  const prior = record(previous) ?? {};
  const priorFields = readSectionUpdates(previous)?.fields ?? {};
  const event = Entry.parse({ recorded_at: at, operation });
  const fields = Object.fromEntries([...FIELDS].flatMap(key => {
    if (!Object.hasOwn(next, key)) return [];
    const updated = supplied.has(key) && (operation === "generated" || canonical(prior[key]) !== canonical(next[key]));
    const status = updated ? event : priorFields[key];
    return status ? [[key, status]] : [];
  }));
  // Ignore all incoming metadata, including restored versions' old claims.
  delete next.section_updates;
  next.section_updates = { version: 1, fields, write_id: crypto.randomUUID() };
  return next;
}
/** Only fields actually supplied by this generation receive a new generated event. */
export function recordGeneratedSections(previous: unknown, generated: unknown, at = new Date().toISOString()) {
  const fresh = record(generated);
  if (!fresh) throw new Error("This report content could not be saved.");
  // Normalize after merging so an explicit undefined still removes a retained field.
  const next = normalized({ ...(record(previous) ?? {}), ...fresh });
  return tracked(previous, next, new Set(Object.keys(fresh)), "generated", at);
}
/** Restoring content is a save; its earlier generation date is never promoted to today. */
export function recordSavedSections(previous: unknown, content: unknown, at = new Date().toISOString()) {
  const next = normalized(content);
  return tracked(previous, next, new Set(Object.keys(next)), "saved", at);
}
/** Share only status for fields the fixed audience actually receives. */
export function withVisibleSectionUpdates<T extends object>(source: unknown, projected: T): T {
  const metadata = readSectionUpdates(source);
  if (!metadata) return projected;
  const visible = projected as Record<string, unknown>;
  const fields = Object.fromEntries(Object.entries(metadata.fields).filter(([key]) => Object.hasOwn(visible, key) && visible[key] !== undefined));
  return Object.keys(fields).length ? { ...projected, section_updates: { version: 1, fields } } : projected;
}

/** Internal optimistic-write marker; never included in permitted shared metadata. */
export function previousReportWriteId(content: unknown): string | undefined {
  const value = record(record(content)?.section_updates)?.write_id;
  const parsed = z.string().uuid().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
