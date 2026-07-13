/**
 * Shared client-side storage for the opportunity outreach pipeline.
 *
 * Two keys live in localStorage:
 *  - tf.opportunity-lifecycle.v1  → per-(student,partner) stage
 *  - tf.opportunity-deadlines.v1  → per-(student,partner) ISO date (next step by)
 *
 * These are read by both the standalone tracker on /opportunities and by the
 * pipeline summary embedded in the Pathway Report and the shared plan view,
 * so families and educators see the same status wherever the report appears.
 */

export type LifecycleStage =
  | "saved"
  | "contacted"
  | "applied"
  | "enrolled"
  | "not_a_fit";

export const LIFECYCLE_STORAGE_KEY = "tf.opportunity-lifecycle.v1";
export const DEADLINE_STORAGE_KEY = "tf.opportunity-deadlines.v1";

export function keyFor(studentId: string, partnerId: string) {
  return `${studentId}::${partnerId}`;
}

function safeRead<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return JSON.parse(window.localStorage.getItem(k) ?? "null") ?? fallback;
  } catch {
    return fallback;
  }
}

export function readLifecycleStore(): Record<string, LifecycleStage> {
  return safeRead<Record<string, LifecycleStage>>(LIFECYCLE_STORAGE_KEY, {});
}

export function readDeadlineStore(): Record<string, string> {
  return safeRead<Record<string, string>>(DEADLINE_STORAGE_KEY, {});
}

export function writeDeadlineStore(next: Record<string, string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEADLINE_STORAGE_KEY, JSON.stringify(next));
}

export type PipelineSnapshot = {
  totalTracked: number;
  counts: Record<LifecycleStage, number>;
  activePct: number; // % of tracked that are contacted/applied/enrolled
  upcoming: Array<{
    partnerId: string;
    stage: LifecycleStage | null;
    dueIso: string;
    daysAway: number;
  }>;
  overdue: number;
};

export function snapshotForStudent(studentId: string): PipelineSnapshot {
  const lifecycle = readLifecycleStore();
  const deadlines = readDeadlineStore();
  const counts: Record<LifecycleStage, number> = {
    saved: 0,
    contacted: 0,
    applied: 0,
    enrolled: 0,
    not_a_fit: 0,
  };
  const prefix = `${studentId}::`;
  let total = 0;
  let active = 0;
  for (const [k, stage] of Object.entries(lifecycle)) {
    if (!k.startsWith(prefix)) continue;
    total += 1;
    counts[stage] += 1;
    if (stage === "contacted" || stage === "applied" || stage === "enrolled") active += 1;
  }
  const today = new Date();
  const todayMs = today.getTime();
  const upcoming: PipelineSnapshot["upcoming"] = [];
  let overdue = 0;
  for (const [k, iso] of Object.entries(deadlines)) {
    if (!k.startsWith(prefix)) continue;
    const partnerId = k.slice(prefix.length);
    const dueMs = new Date(iso).getTime();
    if (Number.isNaN(dueMs)) continue;
    const days = Math.round((dueMs - todayMs) / (1000 * 60 * 60 * 24));
    const stage = lifecycle[k] ?? null;
    if (stage === "enrolled" || stage === "not_a_fit") continue;
    if (days < 0) overdue += 1;
    upcoming.push({ partnerId, stage, dueIso: iso, daysAway: days });
  }
  upcoming.sort((a, b) => a.daysAway - b.daysAway);
  return {
    totalTracked: total,
    counts,
    activePct: total === 0 ? 0 : Math.round((active / total) * 100),
    upcoming,
    overdue,
  };
}
