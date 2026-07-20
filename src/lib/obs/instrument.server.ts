/**
 * withSpan — server-only span wrapper.
 *
 * Wrap any async server-side operation to auto-record success/failure,
 * duration, and any thrown error into `public.obs_events`.
 *
 * Usage:
 *   const result = await withSpan(
 *     { server_fn: "writePathwayReport", user_id, attributes: { student_id } },
 *     async ({ trace_id, span_id }) => doWork(...)
 *   );
 */

import { logObsEvent, type ObsSeverity } from "./log.server";

function uuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface SpanOpts {
  server_fn?: string | null;
  route?: string | null;
  user_id?: string | null;
  trace_id?: string;
  parent_span_id?: string | null;
  attributes?: Record<string, unknown>;
  severityOnSuccess?: ObsSeverity;
}

export interface SpanContext {
  trace_id: string;
  span_id: string;
}

export async function withSpan<T>(opts: SpanOpts, fn: (ctx: SpanContext) => Promise<T>): Promise<T> {
  const ctx: SpanContext = {
    trace_id: opts.trace_id ?? uuid(),
    span_id: uuid(),
  };
  const start = performance.now();
  try {
    const out = await fn(ctx);
    logObsEvent({
      trace_id: ctx.trace_id,
      span_id: ctx.span_id,
      parent_span_id: opts.parent_span_id ?? null,
      user_id: opts.user_id ?? null,
      route: opts.route ?? null,
      server_fn: opts.server_fn ?? null,
      severity: opts.severityOnSuccess ?? "info",
      status: "ok",
      duration_ms: Math.round(performance.now() - start),
      attributes: opts.attributes ?? {},
    });
    return out;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logObsEvent({
      trace_id: ctx.trace_id,
      span_id: ctx.span_id,
      parent_span_id: opts.parent_span_id ?? null,
      user_id: opts.user_id ?? null,
      route: opts.route ?? null,
      server_fn: opts.server_fn ?? null,
      severity: "error",
      status: "error",
      duration_ms: Math.round(performance.now() - start),
      attributes: opts.attributes ?? {},
      error: { message: err.message, name: err.name, stack: err.stack },
    });
    throw e;
  }
}
