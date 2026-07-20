/**
 * Health / Observability server functions (platform-admin only).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SloRow = {
  server_fn: string;
  total_count: number;
  error_count: number;
  availability: number;
  p50_ms: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  availability_target: number;
  latency_p95_target: number;
};

export type ObsEventRow = {
  id: string;
  ts: string;
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  user_id: string | null;
  route: string | null;
  server_fn: string | null;
  severity: string;
  status: string;
  duration_ms: number | null;
  attributes: unknown;
  error: unknown;
};

export type InfraHealth = {
  email_sent_24h: number;
  email_failed_24h: number;
  email_suppressed_24h: number;
  cron_present: boolean;
  obs_events_24h: number;
  obs_errors_24h: number;
};

async function assertPlatformAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_platform_admin", { _user_id: ctx.userId });
  if (error) throw new Error("Authorization check failed");
  if (!data) throw new Error("Forbidden");
}

export const getSloStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { window_hours?: number }) =>
    z.object({ window_hours: z.number().int().min(1).max(2160).default(24) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { data: rows, error } = await (context.supabase as any).rpc("obs_slo_status", {
      _window_hours: data.window_hours,
    });
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as any as SloRow[], window_hours: data.window_hours };
  });

export const listRecentErrors = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { limit?: number; window_hours?: number; server_fn?: string | null }) =>
    z.object({
      limit: z.number().int().min(1).max(200).default(50),
      window_hours: z.number().int().min(1).max(720).default(24),
      server_fn: z.string().nullish(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const since = new Date(Date.now() - data.window_hours * 3600_000).toISOString();
    let q: any = (context.supabase as any)
      .from("obs_events")
      .select("id, ts, trace_id, span_id, parent_span_id, user_id, route, server_fn, severity, status, duration_ms, attributes, error")
      .in("severity", ["error", "fatal"])
      .gte("ts", since)
      .order("ts", { ascending: false })
      .limit(data.limit);
    if (data.server_fn) q = q.eq("server_fn", data.server_fn);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as any as ObsEventRow[] };
  });

export const getTrace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { trace_id: string }) =>
    z.object({ trace_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { data: rows, error } = await (context.supabase as any)
      .from("obs_events")
      .select("id, ts, trace_id, span_id, parent_span_id, user_id, route, server_fn, severity, status, duration_ms, attributes, error")
      .eq("trace_id", data.trace_id)
      .order("ts", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as any as ObsEventRow[] };
  });

export const getInfrastructureHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const sb: any = context.supabase;

    const countOf = async (fn: () => any): Promise<number> => {
      try {
        const res = await fn();
        return (res?.count as number | null) ?? 0;
      } catch {
        return 0;
      }
    };

    const [sentN, failedN, suppressedN, obsTotalN, obsErrN] = await Promise.all([
      countOf(() => sb.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "sent").gte("created_at", since)),
      countOf(() => sb.from("email_send_log").select("id", { count: "exact", head: true }).in("status", ["dlq", "failed", "bounced"]).gte("created_at", since)),
      countOf(() => sb.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "suppressed").gte("created_at", since)),
      countOf(() => sb.from("obs_events").select("id", { count: "exact", head: true }).gte("ts", since)),
      countOf(() => sb.from("obs_events").select("id", { count: "exact", head: true }).in("severity", ["error", "fatal"]).gte("ts", since)),
    ]);

    return {
      email_sent_24h: sentN,
      email_failed_24h: failedN,
      email_suppressed_24h: suppressedN,
      cron_present: true,
      obs_events_24h: obsTotalN,
      obs_errors_24h: obsErrN,
    } satisfies InfraHealth;
  });
