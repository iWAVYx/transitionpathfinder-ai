import { z } from "zod";
import { documentUploadOutcome } from "./document-upload-outcome";

const attemptId = z.string().uuid();
type Storage = Pick<globalThis.Storage, "getItem" | "setItem" | "removeItem">;
export type UploadInterruption = { state: "clear" } | { state: "pending"; attemptId: string } | { state: "unavailable" };
const key = (actor: string, student: string) => `tf.document-upload-interruption.v1:${encodeURIComponent(actor)}:${encodeURIComponent(student)}`;
const browserStorage = () => window.sessionStorage;
/** Tab-local reminder only; never authorization, backend state or drain proof.
 * Stores only an opaque attempt UUID, without names, file details, text, review
 * metadata, capabilities or credentials. No expiry or absence-based reset. */
export function readUploadInterruption(actor: string, student: string, storage?: Storage): UploadInterruption {
  try {
    const raw = (storage ?? browserStorage()).getItem(key(actor, student));
    if (raw === null) return { state: "clear" };
    const id = attemptId.safeParse(raw);
    return id.success ? { state: "pending", attemptId: id.data } : { state: "unavailable" };
  } catch { return { state: "unavailable" }; }
}
export function rememberUploadInterruption(actor: string, student: string, attempt: string, storage?: Storage): boolean {
  try {
    const id = attemptId.parse(attempt), target = storage ?? browserStorage(), name = key(actor, student);
    if (target.getItem(name) !== null) return false;
    target.setItem(name, id);
    return target.getItem(name) === id;
  } catch { return false; }
}
/** Only a confirmed terminal result for this exact attempt can call this. A
 * failed clear stays blocked. Never erase another attempt's reminder. */
export function forgetCompletedUploadInterruption(actor: string, student: string, attempt: string, storage?: Storage): boolean {
  try {
    const id = attemptId.parse(attempt), target = storage ?? browserStorage(), name = key(actor, student);
    if (target.getItem(name) !== id) return false;
    target.removeItem(name);
    return target.getItem(name) === null;
  } catch { return false; }
}

/** Check the completed-only endpoint's exact caller/attempt result. This is
 * still a display/reminder check, never permission to replay an old upload. */
export function confirmedInterruptedUploadOutcome(value: unknown, actor: string, student: string, attempt: string) {
  const parsed = z.object({
    schema: z.literal("document-upload-registration-v1"), actor_id: z.literal(actor),
    attempt_id: z.literal(attempt), student_id: z.literal(student), document_id: z.string().uuid(), id: z.string().uuid(),
    storage_path: z.literal(`${student}/${attempt}-privacy-safe-document.txt`),
    scan_status: z.enum(["clean", "infected", "failed", "deleted"]), review_status: z.string().min(1),
    archived_at: z.string().nullable(), deleted_at: z.string().nullable(),
  }).safeParse(value);
  if (!parsed.success || parsed.data.id !== parsed.data.document_id) return "uncertain" as const;
  const outcome = documentUploadOutcome(parsed.data, student, parsed.data.storage_path);
  return outcome === "saved" || outcome === "blocked" ? outcome : "uncertain" as const;
}
