import { z } from "zod";
const intentSchema = z
  .object({
    version: z.literal(1),
    requestId: z.string().uuid(),
    origin: z.enum(["students", "onboarding"]),
    kind: z.enum(["linked", "self"]),
    role: z.string().min(1).max(40),
  })
  .strict();
export type CreationIntent = z.infer<typeof intentSchema>;
export const RECOVERY_UNAVAILABLE =
  "We couldn't safely check your earlier setup. Keep this page open and try checking again before adding another student.";
const key = (viewer: string) => `tf:student-creation:v1:${viewer}`;
export function readCreationIntent(storage: Storage, viewer: string): CreationIntent | null {
  try {
    const raw = storage.getItem(key(viewer));
    if (raw === null) return null;
    const parsed = intentSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) throw Error(RECOVERY_UNAVAILABLE);
    return parsed.data;
  } catch {
    throw Error(RECOVERY_UNAVAILABLE);
  }
}
export function saveCreationIntent(storage: Storage, viewer: string, intent: CreationIntent) {
  if (readCreationIntent(storage, viewer))
    throw Error("Check the earlier student setup before starting another.");
  const value = intentSchema.parse(intent);
  try {
    storage.setItem(key(viewer), JSON.stringify(value));
  } catch {
    throw Error(RECOVERY_UNAVAILABLE);
  }
  if (storage.getItem(key(viewer)) !== JSON.stringify(value)) throw Error(RECOVERY_UNAVAILABLE);
}
export function clearCreationIntent(storage: Storage, viewer: string, requestId: string) {
  const current = readCreationIntent(storage, viewer);
  if (!current || current.requestId !== requestId) throw Error(RECOVERY_UNAVAILABLE);
  try {
    storage.removeItem(key(viewer));
  } catch {
    throw Error(RECOVERY_UNAVAILABLE);
  }
  if (storage.getItem(key(viewer)) !== null) throw Error(RECOVERY_UNAVAILABLE);
}
/** One cross-tab lock for both entry points. Never queue a stale submission. */
export async function withCreationLock<T>(
  viewer: string,
  current: () => boolean,
  work: () => Promise<T>,
): Promise<T> {
  if (!navigator.locks)
    throw Error("This browser cannot safely resume student setup. Please use an updated browser.");
  return navigator.locks.request(key(viewer), { ifAvailable: true }, async (lock) => {
    if (!lock)
      throw Error("Student setup is open in another tab. Finish there, then check again here.");
    if (!current()) throw Error("Your account changed. Please check setup again.");
    return work();
  });
}
