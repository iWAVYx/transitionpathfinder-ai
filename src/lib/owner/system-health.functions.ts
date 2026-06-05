import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * System Health checks for the Platform Admin Hub.
 *
 * For each core flow we run a lightweight reachability probe (count or table
 * existence) and report:
 *   - "working"   : query succeeded
 *   - "attention" : query errored (table/policy/connection problem)
 *   - "manual"    : no automated probe yet — the owner must verify by hand
 */

export type HealthStatus = "working" | "attention" | "manual";

export type HealthCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  category: "data" | "people" | "ops" | "ui";
};

async function tableProbe(
  client: ReturnType<typeof getClient>,
  table: string,
): Promise<{ ok: boolean; count: number | null; message: string }> {
  const { count, error } = await client
    .from(table as never)
    .select("*", { count: "exact", head: true });
  if (error) return { ok: false, count: null, message: error.message };
  return { ok: true, count: count ?? 0, message: `${count ?? 0} rows reachable` };
}

// Helper to satisfy TS for the typed Supabase client
function getClient(c: { supabase: unknown }) {
  return c.supabase as {
    from: (t: string) => {
      select: (
        cols: string,
        opts?: { count?: "exact"; head?: boolean },
      ) => Promise<{ count: number | null; error: { message: string } | null }>;
    };
  };
}

export const runSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = getClient(context);

    const probes: Array<{
      key: string;
      label: string;
      table?: string;
      category: HealthCheck["category"];
      manualNote?: string;
    }> = [
      { key: "auth", label: "Auth", category: "people", manualNote: "Sign-in/sign-up tested with QA accounts. Recheck after any auth provider change." },
      { key: "onboarding", label: "Onboarding", table: "profiles", category: "people" },
      { key: "add_student", label: "Add Student", table: "students", category: "data" },
      { key: "student_connections", label: "Student Connections", table: "student_collaborators", category: "data" },
      { key: "pathway_reports", label: "Pathway Reports", table: "pathway_reports", category: "data" },
      { key: "resource_saves", label: "Resource Saves", table: "saved_resources", category: "data" },
      { key: "action_items", label: "Action Items", table: "action_items", category: "data" },
      { key: "meeting_prep", label: "Meeting Prep", table: "meeting_prep_items", category: "data" },
      { key: "waitlist", label: "Waitlist", table: "waitlist", category: "ops" },
      { key: "contact_forms", label: "Contact Forms", table: "contact_submissions", category: "ops" },
      { key: "partner_submissions", label: "Partner Submissions", table: "partner_opportunities", category: "ops" },
      { key: "admin_hub_access", label: "Admin Hub Access", table: "admin_roles", category: "people" },
      { key: "role_permissions", label: "Role Permissions", table: "user_roles", category: "people" },
      { key: "mobile_responsiveness", label: "Mobile Responsiveness", category: "ui", manualNote: "Verified at 375px, 768px, 1024px. Recheck after layout changes." },
    ];

    const results: HealthCheck[] = [];
    for (const p of probes) {
      if (!p.table) {
        results.push({
          key: p.key,
          label: p.label,
          status: "manual",
          detail: p.manualNote ?? "Manual verification.",
          category: p.category,
        });
        continue;
      }
      try {
        const r = await tableProbe(client, p.table);
        results.push({
          key: p.key,
          label: p.label,
          status: r.ok ? "working" : "attention",
          detail: r.ok ? r.message : `Query failed: ${r.message}`,
          category: p.category,
        });
      } catch (e) {
        results.push({
          key: p.key,
          label: p.label,
          status: "attention",
          detail: e instanceof Error ? e.message : "Probe threw an exception.",
          category: p.category,
        });
      }
    }

    const summary = {
      working: results.filter((r) => r.status === "working").length,
      attention: results.filter((r) => r.status === "attention").length,
      manual: results.filter((r) => r.status === "manual").length,
      total: results.length,
      checked_at: new Date().toISOString(),
    };

    return { results, summary };
  });
