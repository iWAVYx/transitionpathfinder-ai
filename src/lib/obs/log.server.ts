/**
 * Observability log writer — server-only.
 * Batched, fire-and-forget append to public.obs_events.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ObsSeverity = "debug" | "info" | "warn" | "error" | "fatal";
export type ObsStatus = "ok" | "error" | "timeout" | "rejected";

export interface ObsEventInput {
  trace_id: string;
  span_id: string;
  parent_span_id?: string | null;
  user_id?: string | null;
  route?: string | null;
  server_fn?: string | null;
  severity: ObsSeverity;
  status: ObsStatus;
  duration_ms?: number | null;
  attributes?: Record<string, unknown>;
  error?: { message: string; name?: string; stack?: string } | null;
}

const BATCH_SIZE = 50;
const FLUSH_INTERVAL_MS = 250;

let buffer: ObsEventInput[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function flushNow(): Promise<void> {
  if (buffer.length === 0) return;
  const rows = buffer.splice(0, buffer.length).map((r) => ({
    trace_id: r.trace_id,
    span_id: r.span_id,
    parent_span_id: r.parent_span_id ?? null,
    user_id: r.user_id ?? null,
    route: r.route ?? null,
    server_fn: r.server_fn ?? null,
    severity: r.severity,
    status: r.status,
    duration_ms: r.duration_ms ?? null,
    attributes: (r.attributes ?? {}) as unknown as any,
    error: (r.error ?? null) as unknown as any,
  }));
  try {
    const { error } = await (supabaseAdmin.from("obs_events") as any).insert(rows);
    if (error) console.warn("[obs] flush failed:", error.message);
  } catch (e) {
    console.warn("[obs] flush threw:", e);
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushNow();
  }, FLUSH_INTERVAL_MS);
}

export function logObsEvent(evt: ObsEventInput): void {
  try {
    buffer.push(evt);
    if (buffer.length >= BATCH_SIZE) void flushNow();
    else scheduleFlush();
  } catch (e) {
    console.warn("[obs] enqueue threw:", e);
  }
}

export async function flushObsEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  await flushNow();
}
