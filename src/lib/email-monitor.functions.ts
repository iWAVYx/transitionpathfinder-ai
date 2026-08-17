import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EmailLogEntry = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

export type EmailMonitorResult = {
  is_admin: boolean;
  stats: { total: number; sent: number; failed: number; suppressed: number; pending: number };
  templates: string[];
  entries: EmailLogEntry[];
  total_count: number;
};

async function isPlatformAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .maybeSingle();
  return Boolean(data);
}

const FAILED_STATUSES = new Set(["failed", "dlq", "bounced", "complained"]);
const SUPPRESSED_STATUSES = new Set(["suppressed"]);
const SENT_STATUSES = new Set(["sent"]);
const PENDING_STATUSES = new Set(["pending"]);

export const getEmailMonitor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        range: z.enum(["24h", "7d", "30d", "custom"]).default("7d"),
        start: z.string().datetime().optional(),
        end: z.string().datetime().optional(),
        template: z.string().trim().max(200).optional(),
        status: z.enum(["all", "sent", "failed", "suppressed", "pending"]).default("all"),
        search: z.string().trim().max(255).optional(),
        limit: z.number().int().min(1).max(200).default(50),
        offset: z.number().int().min(0).max(10000).default(0),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<EmailMonitorResult> => {
    const { supabase, userId } = context;
    const admin = await isPlatformAdmin(supabase, userId);
    if (!admin) {
      return {
        is_admin: false,
        stats: { total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 },
        templates: [],
        entries: [],
        total_count: 0,
      };
    }

    // Compute time window
    const now = Date.now();
    let startISO: string;
    let endISO: string = new Date(now).toISOString();
    if (data.range === "custom" && data.start && data.end) {
      startISO = data.start;
      endISO = data.end;
    } else {
      const hours = data.range === "24h" ? 24 : data.range === "30d" ? 24 * 30 : 24 * 7;
      startISO = new Date(now - hours * 60 * 60 * 1000).toISOString();
    }

    // Fetch all rows in window (cap at 5000 for safety), then dedupe in memory.
    const { data: rows, error } = await supabase
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .gte("created_at", startISO)
      .lte("created_at", endISO)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      console.error("getEmailMonitor query failed", error);
      return {
        is_admin: true,
        stats: { total: 0, sent: 0, failed: 0, suppressed: 0, pending: 0 },
        templates: [],
        entries: [],
        total_count: 0,
      };
    }

    // Dedupe by message_id, keeping latest (rows already ordered desc).
    const seen = new Set<string>();
    const deduped: EmailLogEntry[] = [];
    const templateSet = new Set<string>();
    for (const r of rows ?? []) {
      const key = r.message_id ?? `__no_mid__:${r.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r as EmailLogEntry);
      if (r.template_name) templateSet.add(r.template_name);
    }

    // Apply filters
    let filtered = deduped;
    if (data.template) {
      filtered = filtered.filter((r) => r.template_name === data.template);
    }
    if (data.status !== "all") {
      filtered = filtered.filter((r) => {
        if (data.status === "sent") return SENT_STATUSES.has(r.status);
        if (data.status === "failed") return FAILED_STATUSES.has(r.status);
        if (data.status === "suppressed") return SUPPRESSED_STATUSES.has(r.status);
        if (data.status === "pending") return PENDING_STATUSES.has(r.status);
        return true;
      });
    }
    if (data.search) {
      const q = data.search.toLowerCase();
      filtered = filtered.filter((r) => {
        const emailMatch = (r.recipient_email ?? "").toLowerCase().includes(q);
        const metaUserId = (r as any).metadata?.user_id ?? (r as any).metadata?.userId ?? "";
        const uidMatch = String(metaUserId).toLowerCase().includes(q);
        return emailMatch || uidMatch;
      });
    }

    // Stats from filtered (template-filtered) set, ignoring status filter
    const statsSource = data.template
      ? deduped.filter((r) => r.template_name === data.template)
      : deduped;
    const stats = {
      total: statsSource.length,
      sent: statsSource.filter((r) => SENT_STATUSES.has(r.status)).length,
      failed: statsSource.filter((r) => FAILED_STATUSES.has(r.status)).length,
      suppressed: statsSource.filter((r) => SUPPRESSED_STATUSES.has(r.status)).length,
      pending: statsSource.filter((r) => PENDING_STATUSES.has(r.status)).length,
    };

    const total_count = filtered.length;
    const entries = filtered.slice(data.offset, data.offset + data.limit);

    return {
      is_admin: true,
      stats,
      templates: Array.from(templateSet).sort(),
      entries,
      total_count,
    };
  });
