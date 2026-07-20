/**
 * Alert rule evaluator — server-only.
 *
 * Called by /api/public/hooks/obs-alert-check. For each rule that fires
 * outside its cooldown, we enqueue a transactional email to every platform
 * admin via the existing pgmq queue (`transactional_emails`) and update
 * obs_alert_state.last_fired_at.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AlertRule = {
  key: string;
  cooldown_minutes: number;
  severity: "warn" | "error" | "fatal";
  evaluate: () => Promise<{ fired: boolean; subject?: string; body?: string; payload?: Record<string, unknown> }>;
};

async function fastBurnRule() {
  // Fast burn: >5% error rate over last 1h, at least 20 events.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { data } = await supabaseAdmin
    .from("obs_events")
    .select("status", { count: "exact" })
    .gte("ts", since);
  const total = data?.length ?? 0;
  const errs = (data ?? []).filter((r: { status: string }) => r.status !== "ok").length;
  if (total < 20) return { fired: false };
  const rate = errs / total;
  if (rate < 0.05) return { fired: false };
  return {
    fired: true,
    subject: `TransitionForward — fast error burn (${(rate * 100).toFixed(1)}%)`,
    body: `Error rate ${(rate * 100).toFixed(1)}% over last 1h (${errs}/${total} events).\n\nReview /admin/orgs → Health tab.`,
    payload: { rate, errs, total, window: "1h" },
  };
}

async function slowBurnRule() {
  // Slow burn: >2% error rate over last 6h, at least 100 events.
  const since = new Date(Date.now() - 6 * 3600_000).toISOString();
  const { data } = await supabaseAdmin
    .from("obs_events")
    .select("status")
    .gte("ts", since);
  const total = data?.length ?? 0;
  const errs = (data ?? []).filter((r: { status: string }) => r.status !== "ok").length;
  if (total < 100) return { fired: false };
  const rate = errs / total;
  if (rate < 0.02) return { fired: false };
  return {
    fired: true,
    subject: `TransitionForward — slow error burn (${(rate * 100).toFixed(1)}%)`,
    body: `Error rate ${(rate * 100).toFixed(1)}% over last 6h (${errs}/${total} events).\n\nReview /admin/orgs → Health tab.`,
    payload: { rate, errs, total, window: "6h" },
  };
}

async function dlqBacklogRule() {
  // DLQ backlog on either email queue > 0 msgs.
  let anyDlq = false;
  try {
    const auth = await (supabaseAdmin as any).rpc("read_email_batch", { queue_name: "auth_emails_dlq", batch_size: 1, vt: 1 });
    if (auth?.data && Array.isArray(auth.data) && auth.data.length > 0) anyDlq = true;
  } catch { /* queue may not exist */ }
  try {
    const tx = await (supabaseAdmin as any).rpc("read_email_batch", { queue_name: "transactional_emails_dlq", batch_size: 1, vt: 1 });
    if (tx?.data && Array.isArray(tx.data) && tx.data.length > 0) anyDlq = true;
  } catch { /* queue may not exist */ }
  if (!anyDlq) return { fired: false };
  return {
    fired: true,
    subject: "TransitionForward — email DLQ has messages",
    body: "One or more email dead-letter queues contain messages. Inspect via /admin/orgs → Health tab.",
    payload: {},
  };
}

const RULES: AlertRule[] = [
  { key: "fast_burn", cooldown_minutes: 30, severity: "error", evaluate: fastBurnRule },
  { key: "slow_burn", cooldown_minutes: 120, severity: "warn", evaluate: slowBurnRule },
  { key: "dlq_backlog", cooldown_minutes: 60, severity: "error", evaluate: dlqBacklogRule },
];

async function inCooldown(key: string): Promise<{ inCooldown: boolean; cooldown_minutes: number }> {
  const { data } = await supabaseAdmin
    .from("obs_alert_state")
    .select("last_fired_at, cooldown_minutes")
    .eq("rule_key", key)
    .maybeSingle();
  const cooldown = data?.cooldown_minutes ?? 60;
  if (!data?.last_fired_at) return { inCooldown: false, cooldown_minutes: cooldown };
  const elapsed = (Date.now() - new Date(data.last_fired_at).getTime()) / 60_000;
  return { inCooldown: elapsed < cooldown, cooldown_minutes: cooldown };
}

async function markFired(key: string, payload: Record<string, unknown>, cooldown_minutes: number) {
  await (supabaseAdmin.from("obs_alert_state") as any)
    .upsert({ rule_key: key, last_fired_at: new Date().toISOString(), last_payload: payload as any, cooldown_minutes });
}

async function fetchAdminEmails(): Promise<string[]> {
  const { data: admins } = await supabaseAdmin
    .from("admin_roles")
    .select("user_id")
    .in("role", ["platform_owner", "platform_admin"]);
  if (!admins?.length) return [];
  const ids = admins.map((a: { user_id: string }) => a.user_id);
  const { data: profs } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .in("id", ids);
  return (profs ?? []).map((p: { email: string | null }) => p.email).filter((e): e is string => !!e);
}

async function enqueueAlertEmail(to: string, subject: string, body: string, rule_key: string) {
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px"><h2 style="margin:0 0 12px">${subject}</h2><pre style="white-space:pre-wrap;font-family:inherit;color:#334155;background:#f8fafc;padding:12px;border-radius:8px">${body}</pre><p style="color:#64748b;font-size:12px">Alert rule: <code>${rule_key}</code></p></div>`;
  await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      template_name: `obs_alert_${rule_key}`,
      to,
      subject,
      html,
      text: body,
      message_id: `obs-alert-${rule_key}-${Date.now()}`,
    },
  });
}

export async function runAlertCheck(): Promise<{ evaluated: number; fired: string[] }> {
  const fired: string[] = [];
  for (const rule of RULES) {
    try {
      const state = await inCooldown(rule.key);
      if (state.inCooldown) continue;
      const res = await rule.evaluate();
      if (!res.fired || !res.subject || !res.body) continue;
      const emails = await fetchAdminEmails();
      for (const to of emails) {
        await enqueueAlertEmail(to, res.subject, res.body, rule.key);
      }
      await markFired(rule.key, res.payload ?? {}, state.cooldown_minutes);
      fired.push(rule.key);
    } catch (e) {
      console.warn(`[obs alerts] rule ${rule.key} threw:`, e);
    }
  }
  return { evaluated: RULES.length, fired };
}
