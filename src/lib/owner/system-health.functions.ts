import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * System Health checks for the Platform Admin Hub.
 *
 * Each probe reports one of:
 *   - "working"     : query succeeded — backend reachable, policies allow read
 *   - "attention"   : query errored — table missing, policy/connection problem
 *   - "manual"      : no automated probe yet — owner must verify by hand
 *   - "coming_soon" : feature staged but not wired to backend yet
 *
 * Platform-admin only. Used as the QA dashboard before demos and after
 * releases.
 */

export type HealthStatus = "working" | "attention" | "manual" | "coming_soon";

export type HealthCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  detail: string;
  category: "data" | "people" | "ops" | "ui" | "infra";
};

type Client = {
  from: (t: string) => {
    select: (
      cols: string,
      opts?: { count?: "exact"; head?: boolean },
    ) => Promise<{ count: number | null; error: { message: string } | null }>;
  };
  rpc?: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

function getClient(c: { supabase: unknown }): Client {
  return c.supabase as Client;
}

async function tableProbe(
  client: Client,
  table: string,
): Promise<{ ok: boolean; count: number | null; message: string }> {
  const { count, error } = await client
    .from(table as never)
    .select("*", { count: "exact", head: true });
  if (error) return { ok: false, count: null, message: error.message };
  return { ok: true, count: count ?? 0, message: `${count ?? 0} rows reachable` };
}

export const runSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const client = getClient(context);

    // Gate to platform admins. Non-admins get an explicit refusal rather than
    // a probe of their own RLS-scoped data.
    const { data: adminRow, error: adminErr } = await (client as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }> };
        };
      };
    })
      .from("admin_roles")
      .select("user_id")
      .eq("user_id", (context as { userId: string }).userId)
      .maybeSingle();
    if (adminErr) {
      throw new Error("Could not verify admin access: " + adminErr.message);
    }
    if (!adminRow) {
      throw new Error("Platform admin access required to run system health.");
    }

    type Probe = {
      key: string;
      label: string;
      table?: string;
      category: HealthCheck["category"];
      manualNote?: string;
      comingSoonNote?: string;
    };

    const probes: Probe[] = [
      // Infra
      { key: "supabase_connection", label: "Backend Connection", table: "profiles", category: "infra" },
      { key: "rls_policies", label: "RLS / Security Policies", category: "infra", manualNote: "Run the Supabase linter and review `can_access_student` paths. All student-scoped tables must enforce per-row access." },

      // Auth & roles
      { key: "auth", label: "Authentication", category: "people", manualNote: "Sign-in/sign-up tested with QA accounts for parent, educator, student. Recheck after any auth provider change." },
      { key: "profile_creation", label: "Profile Creation", table: "profiles", category: "people" },
      { key: "role_selection", label: "Role Selection", table: "user_roles", category: "people" },
      { key: "onboarding", label: "Onboarding Completion", table: "profiles", category: "people" },
      { key: "role_dashboards", label: "Role Dashboards", category: "people", manualNote: "Sign in as each role and confirm correct landing dashboard + nav. Roles in scope: parent/guardian, educator/case manager, student, school admin, district admin, partner, platform admin." },
      { key: "admin_hub_access", label: "Admin Hub Access", table: "admin_roles", category: "people" },
      { key: "role_permissions", label: "Role Permissions", table: "user_roles", category: "people" },

      // Student data flows
      { key: "add_student", label: "Add Student", table: "students", category: "data" },
      { key: "student_connections", label: "Student Connections", table: "student_collaborators", category: "data" },
      { key: "pathway_reports", label: "Pathway Reports", table: "pathway_reports", category: "data" },
      { key: "resource_saves", label: "Resource Saves", table: "saved_resources", category: "data" },
      { key: "action_items", label: "Action Items", table: "action_items", category: "data" },
      { key: "meeting_prep", label: "Meeting Prep", table: "meeting_prep_items", category: "data" },
      { key: "data_persistence", label: "Data Persistence", category: "data", manualNote: "After each demo flow, hard-refresh and log out/in. Data must still appear." },

      // Inbound forms / public surfaces
      { key: "waitlist", label: "Waitlist Entries", table: "waitlist", category: "ops" },
      { key: "contact_forms", label: "Contact Form Submissions", table: "contact_submissions", category: "ops" },
      { key: "partner_submissions", label: "Partner Submissions", table: "partner_opportunities", category: "ops" },
      { key: "partner_directory", label: "Partner Directory", table: "organizations", category: "ops" },

      // Experience
      { key: "mobile_responsiveness", label: "Mobile Responsiveness", category: "ui", manualNote: "Verified at 375px, 768px, 1024px across signup, onboarding, dashboards, Pathway Report, Admin Hub. Recheck after layout changes." },
    ];

    const results: HealthCheck[] = [];
    for (const p of probes) {
      if (p.comingSoonNote) {
        results.push({
          key: p.key,
          label: p.label,
          status: "coming_soon",
          detail: p.comingSoonNote,
          category: p.category,
        });
        continue;
      }
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
      coming_soon: results.filter((r) => r.status === "coming_soon").length,
      total: results.length,
      checked_at: new Date().toISOString(),
    };

    return { results, summary };
  });
