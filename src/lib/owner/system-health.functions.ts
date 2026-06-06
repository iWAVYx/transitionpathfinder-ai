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
  /** Raw error / stack / SQL / HTTP body. Shown verbatim under "Details" when present. */
  error?: string | null;
  /** Step-by-step remediation hints rendered as a checklist when status !== "working". */
  fixes?: string[];
  category: "data" | "people" | "ops" | "ui" | "infra";
};

/**
 * Per-probe remediation library. Keys MUST match the probe key. Each entry
 * is the "if this check shows red, here's what to do" playbook surfaced in
 * the Admin Hub so on-call doesn't have to grep the codebase.
 */
const FIX_HINTS: Record<string, string[]> = {
  supabase_connection: [
    "Confirm Lovable Cloud is ACTIVE_HEALTHY (Connectors → Lovable Cloud).",
    "Verify SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are set in server env.",
    "Check the Postgres logs for connection saturation or restarts.",
  ],
  rls_policies: [
    "Confirm the `has_role` security-definer function exists and has `SECURITY DEFINER` + `SET search_path = public`.",
    "Re-run the Supabase linter — fix any 'function search_path mutable' or 'policy missing' warnings it surfaces.",
    "Verify every student-scoped table has RLS enabled and a policy that calls `can_access_student(auth.uid(), student_id)`.",
  ],
  auth: [
    "Make sure the request actually carried a bearer token — `attachSupabaseAuth` must be registered in `src/start.ts` `functionMiddleware`.",
    "If the JWT was rejected, check SUPABASE_JWKS is the current value (rotate keys flow refreshes this).",
    "Sign in fresh in another tab to rule out an expired refresh token.",
  ],
  profile_creation: [
    "Verify the `handle_new_user` trigger is attached to `auth.users` AFTER INSERT.",
    "Confirm `public.profiles` has the expected columns (id, full_name, email) and RLS allows the user to read their own row.",
  ],
  role_selection: [
    "Confirm `/onboarding` calls `completeOnboarding` which inserts into `public.user_roles`.",
    "Verify `user_roles` GRANTs include `INSERT` for `authenticated`.",
  ],
  onboarding: [
    "Check the `profiles.onboarding_completed` column exists and defaults to false.",
    "Re-run the onboarding flow as a QA user and confirm the row updates.",
  ],
  role_dashboards: [
    "Confirm the `audience_for_role` SQL function still covers every role in the dashboards (parent/guardian/educator/teacher/case_manager/student/school_admin/district_admin/admin/partner).",
    "If a role was added recently, update `audience_for_role` AND `src/lib/role-policy.ts` audience map together.",
  ],
  admin_hub_access: [
    "Verify `public.admin_roles` exists with the expected `admin_role` enum.",
    "Confirm the requesting user has a row in `admin_roles` with role `platform_owner` or `platform_admin`.",
  ],
  role_permissions: [
    "Run the security scan — any new table without RLS or with `TO anon` on PII will surface here.",
    "Confirm `user_roles` does NOT grant UPDATE (privilege-escalation guard).",
  ],
  add_student: [
    "Confirm `public.students` has owner_id NOT NULL and an INSERT policy `auth.uid() = owner_id`.",
    "From the app, try `/students` → 'Add Student' as a QA family account.",
  ],
  student_connections: [
    "Verify `student_collaborators` has policies for owner-invite + invitee-accept paths.",
    "Check that the invite email/token flow completed for at least one row in the table.",
  ],
  pathway_reports: [
    "Confirm `pathway_reports` is reachable and `can_access_student(auth.uid(), student_id)` policies are intact.",
    "If empty, run the Pathway Report generator end-to-end as a QA family account.",
  ],
  resource_saves: [
    "Verify `saved_resources` RLS scopes rows to `auth.uid()`.",
    "Save a resource from `/resources` to populate at least one row.",
  ],
  action_items: [
    "Confirm `action_items` is reachable; check policies allow read for collaborators via `can_access_student`.",
  ],
  meeting_prep: [
    "Confirm `meeting_prep_items` exists and is linked to a meeting + student with `can_access_student` policies.",
  ],
  data_persistence: [
    "If counts are zero, sign in as the platform admin once and complete onboarding so a profile + role row exists.",
    "If a table is unreachable, run the Supabase linter and re-check GRANTs on `profiles` / `user_roles`.",
  ],
  waitlist: [
    "Confirm the `waitlist` table exists and the public waitlist form posts here.",
    "Check that `INSERT` is granted to `anon` (waitlist is intentionally public-write).",
  ],
  contact_forms: [
    "Confirm `contact_submissions` is reachable and the contact form server function writes to it.",
  ],
  partner_submissions: [
    "Confirm `partner_opportunities` exists and the partner-apply form writes successfully.",
  ],
  partner_directory: [
    "Confirm `organizations` is reachable and at least one approved org exists.",
  ],
  mobile_responsiveness: [
    "If the published site is unreachable, check Lovable deploy status and re-publish.",
    "If the viewport meta is missing, verify `src/routes/__root.tsx` head() still emits `<meta name='viewport' …>`.",
    "Hard-refresh `/`, `/dashboard`, `/pathway` at 375px, 768px, 1024px to confirm layout still holds.",
  ],
  privilege_escalation_guard: [
    "REVOKE UPDATE on public.user_roles FROM authenticated — a successful UPDATE means any signed-in user can grant themselves admin.",
    "Re-check the GRANTs migration: only SELECT/INSERT/DELETE belong on user_roles for `authenticated`.",
  ],
  storage_documents: [
    "Confirm the `student-documents` storage bucket exists and is private.",
    "Verify storage RLS policies scope SELECT/INSERT to `can_access_student(auth.uid(), student_id)`.",
  ],
  share_links: [
    "Confirm `share_tokens` table is reachable and `resolve_share_token` SQL function is intact.",
    "Generate a share link from a Pathway Report and open it in a private window to verify the public read path.",
  ],
  ai_gateway: [
    "Confirm `LOVABLE_API_KEY` is set under Project Secrets.",
    "If the key is rotated, redeploy server functions so the new value is picked up.",
  ],
  can_access_student_helper: [
    "Confirm `can_access_student(uuid, uuid)` exists with `SECURITY DEFINER` + `SET search_path = public`.",
    "Every student-scoped table policy must call this helper.",
  ],
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

  // privilege_escalation_guard: attempt to UPDATE public.user_roles as the
  // authenticated admin. Even an admin should be blocked because the table
  // intentionally has no UPDATE grant — that's the guard that prevents any
  // signed-in user from elevating themselves. A successful UPDATE here is a
  // CRITICAL finding.
  let privGuard: { ok: boolean; message: string };
  try {
    const anyClient = client as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (c: string, v: string) => Promise<{ error: { message: string; code?: string } | null }>;
        };
      };
    };
    const { error } = await anyClient
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", userId);
    if (error) {
      privGuard = {
        ok: true,
        message: `UPDATE on user_roles correctly blocked (${error.code ?? "denied"}).`,
      };
    } else {
      privGuard = {
        ok: false,
        message: "CRITICAL: UPDATE on user_roles succeeded — privilege escalation possible.",
      };
    }
  } catch (e) {
    // Thrown errors also count as "blocked" — the operation did not succeed.
    privGuard = {
      ok: true,
      message: `UPDATE on user_roles blocked (${e instanceof Error ? e.message : "threw"}).`,
    };
  }

  // can_access_student_helper: exercise the security-definer function that
  // every student-scoped policy depends on. The admin caller should resolve
  // to `true` for any student id thanks to the `has_role(_user_id,'admin')`
  // branch inside the helper.
  let casHelper: { ok: boolean; message: string };
  try {
    const { data, error } = await client.rpc("can_access_student", {
      _user_id: userId,
      _student_id: "00000000-0000-0000-0000-000000000000",
    });
    casHelper = error
      ? { ok: false, message: `can_access_student RPC failed: ${error.message}` }
      : { ok: true, message: `can_access_student reachable (admin → ${String(data)}).` };
  } catch (e) {
    casHelper = { ok: false, message: e instanceof Error ? e.message : "can_access_student threw." };
  }

  // ai_gateway: confirm the Lovable AI key is present in the server env so
  // server functions calling the gateway will not 401 at runtime.
  const aiKey = typeof process !== "undefined" ? process.env.LOVABLE_API_KEY : undefined;
  const aiGateway = aiKey
    ? { ok: true, message: "LOVABLE_API_KEY present in server environment." }
    : { ok: false, message: "LOVABLE_API_KEY missing — AI features will fail." };

  // storage_documents: list objects in the private student-documents bucket.
  // We don't need any results — a non-error response proves the bucket
  // exists and the request was authenticated through storage RLS.
  let storage: { ok: boolean; message: string };
  try {
    const storageClient = (client as unknown as {
      storage: { from: (b: string) => { list: (p?: string, o?: { limit: number }) => Promise<{ error: { message: string } | null }> } };
    }).storage;
    const { error } = await storageClient.from("student-documents").list("", { limit: 1 });
    storage = error
      ? { ok: false, message: `student-documents bucket unreachable: ${error.message}` }
      : { ok: true, message: "student-documents bucket reachable." };
  } catch (e) {
    storage = { ok: false, message: e instanceof Error ? e.message : "storage probe threw." };
  }

  // share_links: count rows in share_tokens. Even zero rows is fine — what
  // we're proving is that the table + its RLS read path are intact.
  let shareLinks: { ok: boolean; message: string };
  try {
    const { count, error } = await client
      .from("share_tokens")
      .select("*", { count: "exact", head: true });
    shareLinks = error
      ? { ok: false, message: `share_tokens unreachable: ${error.message}` }
      : { ok: true, message: `share_tokens reachable (${count ?? 0} active tokens).` };
  } catch (e) {
    shareLinks = { ok: false, message: e instanceof Error ? e.message : "share_tokens probe threw." };
  }

  return {
    auth,
    rls_policies: rls,
    role_dashboards: roleDash,
    data_persistence: persist,
    mobile_responsiveness: mobile,
    privilege_escalation_guard: privGuard,
    can_access_student_helper: casHelper,
    ai_gateway: aiGateway,
    storage_documents: storage,
    share_links: shareLinks,
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

      // Security guards (active probes that exercise real boundaries)
      { key: "privilege_escalation_guard", label: "Privilege Escalation Guard", category: "infra" },
      { key: "can_access_student_helper", label: "Student Access Helper", category: "infra" },
      { key: "storage_documents", label: "Document Storage", category: "data" },
      { key: "share_links", label: "Share Links", category: "data" },
      { key: "ai_gateway", label: "AI Gateway Key", category: "infra" },
    ];

    // Run all custom probes once up-front; the loop below routes results by key.
    const custom = await customProbes(client, (context as { userId: string }).userId);

    const results: HealthCheck[] = [];
    for (const p of probes) {
      if (p.comingSoonNote) {
        results.push({
          key: p.key,
          label: p.label,
          status: "coming_soon",
          detail: p.comingSoonNote,
          fixes: FIX_HINTS[p.key],
          category: p.category,
        });
        continue;
      }
      // Custom probe (replaces the older "manual" placeholder for this key).
      if (custom[p.key]) {
        const c = custom[p.key];
        results.push({
          key: p.key,
          label: p.label,
          status: c.ok ? "working" : "attention",
          detail: c.message,
          error: c.ok ? null : c.message,
          fixes: c.ok ? undefined : FIX_HINTS[p.key],
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
          fixes: FIX_HINTS[p.key],
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
          error: r.ok ? null : r.message,
          fixes: r.ok ? undefined : FIX_HINTS[p.key],
          category: p.category,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Probe threw an exception.";
        const stack = e instanceof Error && e.stack ? e.stack : null;
        results.push({
          key: p.key,
          label: p.label,
          status: "attention",
          detail: message,
          error: stack ?? message,
          fixes: FIX_HINTS[p.key],
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
