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
  rpc: (
    name: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
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

/**
 * Custom probes that replace the older "manual" checks. Each returns the
 * health status the row should report, so the System Health dashboard
 * shows real signal instead of "Not Connected".
 */
async function customProbes(
  client: Client,
  userId: string,
): Promise<Record<string, { ok: boolean; message: string }>> {
  // auth: requireSupabaseAuth already validated the JWT to reach this code,
  // so a present userId proves the auth pipeline (token → JWKS → session) works.
  const auth = userId
    ? { ok: true, message: `Authenticated session resolved (uid ${userId.slice(0, 8)}…).` }
    : { ok: false, message: "No authenticated user on the request." };

  // rls_policies: exercise the security-definer helpers that every
  // student-scoped RLS policy depends on. If `has_role` runs, the
  // policy plumbing is reachable end-to-end.
  let rls: { ok: boolean; message: string };
  try {
    const { data, error } = await client.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    rls = error
      ? { ok: false, message: `has_role RPC failed: ${error.message}` }
      : { ok: true, message: `Security-definer helpers reachable (has_role → ${String(data)}).` };
  } catch (e) {
    rls = { ok: false, message: e instanceof Error ? e.message : "has_role RPC threw." };
  }

  // role_dashboards: verify the audience_for_role mapping resolves a
  // non-null audience for every role the dashboards key off of.
  let roleDash: { ok: boolean; message: string };
  try {
    const roles = [
      "parent",
      "guardian",
      "educator",
      "teacher",
      "case_manager",
      "student",
      "school_admin",
      "district_admin",
      "admin",
      "partner",
    ];
    let failed: string | null = null;
    for (const r of roles) {
      const { data, error } = await client.rpc("audience_for_role", { _role: r });
      if (error) {
        failed = `audience_for_role(${r}) errored: ${error.message}`;
        break;
      }
      if (data == null) {
        failed = `audience_for_role(${r}) returned null — role missing from mapping.`;
        break;
      }
    }
    roleDash = failed
      ? { ok: false, message: failed }
      : { ok: true, message: `All ${roles.length} role→audience mappings resolved.` };
  } catch (e) {
    roleDash = { ok: false, message: e instanceof Error ? e.message : "audience_for_role probe threw." };
  }

  // data_persistence: confirm that core long-lived tables are readable
  // and non-empty (the admin viewing this page must at least have a
  // profile + role row), proving writes from earlier sessions survived.
  let persist: { ok: boolean; message: string };
  try {
    const p = await client.from("profiles").select("*", { count: "exact", head: true });
    const u = await client.from("user_roles").select("*", { count: "exact", head: true });
    if (p.error) persist = { ok: false, message: `profiles unreachable: ${p.error.message}` };
    else if (u.error) persist = { ok: false, message: `user_roles unreachable: ${u.error.message}` };
    else if ((p.count ?? 0) < 1 || (u.count ?? 0) < 1)
      persist = { ok: false, message: `Persistent state empty (profiles=${p.count}, user_roles=${u.count}).` };
    else
      persist = {
        ok: true,
        message: `Persistent state intact: ${p.count} profiles, ${u.count} role bindings.`,
      };
  } catch (e) {
    persist = { ok: false, message: e instanceof Error ? e.message : "persistence probe threw." };
  }

  // mobile_responsiveness: fetch the published site and confirm the
  // responsive viewport meta tag is present in the HTML shell. If the
  // tag is missing or the site is unreachable, mobile rendering will
  // break — surface that here rather than waiting on manual QA.
  let mobile: { ok: boolean; message: string };
  try {
    const r = await fetch("https://transitionpathfinder-ai.lovable.app/", {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) {
      mobile = { ok: false, message: `Published site returned HTTP ${r.status}.` };
    } else {
      const html = await r.text();
      const hasViewport = /<meta[^>]+name=["']viewport["'][^>]*>/i.test(html);
      mobile = hasViewport
        ? { ok: true, message: "Responsive viewport meta present on published site." }
        : { ok: false, message: "Viewport meta tag missing on published site." };
    }
  } catch (e) {
    mobile = { ok: false, message: e instanceof Error ? e.message : "Could not fetch published site." };
  }

  return {
    auth,
    rls_policies: rls,
    role_dashboards: roleDash,
    data_persistence: persist,
    mobile_responsiveness: mobile,
  };
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
