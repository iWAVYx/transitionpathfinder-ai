import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Phase 1 — Demo Readiness System
 *
 * Seeds a fixed set of demo accounts plus one shared demo student wired
 * across goals, action items, and calendar events. All rows are tagged
 * `is_demo = true` so they can never be confused with real data and can
 * be wiped in one call via `resetDemoData`.
 *
 * Platform-admin only. Uses the admin client (service role) so we can
 * create auth users + bypass RLS for the seed. Never call from client code
 * without going through these server fns.
 */

export type DemoAccountRole =
  | "parent"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "platform_admin";

export type DemoAccount = {
  role: DemoAccountRole;
  label: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  user_id?: string | null;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { role: "parent",         label: "Demo Parent / Guardian",  email: "demo.parent@transitionforward.demo",   password: "DemoParent2026!",   first_name: "Maya",   last_name: "Rivera (Demo)" },
  { role: "educator",       label: "Demo Educator / CM",      email: "demo.educator@transitionforward.demo", password: "DemoEducator2026!", first_name: "Sam",    last_name: "Patel (Demo)" },
  { role: "school_admin",   label: "Demo School Admin",       email: "demo.school@transitionforward.demo",   password: "DemoSchool2026!",   first_name: "Lena",   last_name: "Brooks (Demo)" },
  { role: "district_admin", label: "Demo District Admin",     email: "demo.district@transitionforward.demo", password: "DemoDistrict2026!", first_name: "Marcus", last_name: "Holt (Demo)" },
  { role: "partner",        label: "Demo Partner Org",        email: "demo.partner@transitionforward.demo",  password: "DemoPartner2026!",  first_name: "Dana",   last_name: "Kim (Demo)" },
  { role: "platform_admin", label: "Demo Platform Admin",     email: "demo.admin@transitionforward.demo",    password: "DemoAdmin2026!",    first_name: "Owen",   last_name: "Sterling (Demo)" },
];

const PRIMARY_ROLE: Record<DemoAccountRole, string> = {
  parent: "parent",
  educator: "case_manager",
  school_admin: "school_admin",
  district_admin: "district_admin",
  partner: "partner",
  platform_admin: "admin",
};

const APP_ROLE: Record<DemoAccountRole, string> = {
  parent: "parent",
  educator: "case_manager",
  school_admin: "school_admin",
  district_admin: "district_admin",
  partner: "partner",
  platform_admin: "admin",
};

type AdminClient = {
  auth: {
    admin: {
      listUsers: (opts: { page?: number; perPage?: number }) => Promise<{ data: { users: Array<{ id: string; email?: string | null }> }; error: { message: string } | null }>;
      createUser: (attrs: { email: string; password: string; email_confirm: boolean; user_metadata?: Record<string, unknown> }) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
      updateUserById: (id: string, attrs: { password?: string }) => Promise<{ data: unknown; error: { message: string } | null }>;
      deleteUser: (id: string) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
  };
  from: (table: string) => {
    upsert: (rows: unknown, opts?: { onConflict?: string }) => {
      select?: () => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    } & Promise<{ data: unknown; error: { message: string } | null }>;
    insert: (rows: unknown) => {
      select: () => { single: () => Promise<{ data: unknown; error: { message: string } | null }> };
    } & Promise<{ data: unknown; error: { message: string } | null }>;
    update: (patch: unknown) => {
      eq: (col: string, val: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    delete: () => {
      eq: (col: string, val: unknown) => Promise<{ data: unknown; error: { message: string } | null }>;
    };
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        maybeSingle: () => Promise<{ data: { id?: string; user_id?: string } | null; error: { message: string } | null }>;
        limit?: (n: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
    };
  };
};

async function assertPlatformAdmin(supabase: unknown, userId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data: adminRow } = await sb.from("admin_roles").select("role").eq("user_id", userId).maybeSingle();
  if (adminRow) return;
  const { data: legacy } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!legacy) throw new Error("Forbidden — platform admin only");
}

async function ensureAuthUser(admin: AdminClient, email: string, password: string): Promise<string> {
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw new Error(listErr.message);
  const existing = list.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: email.split("@")[0], demo: true },
  });
  if (createErr) throw new Error(createErr.message);
  if (!created.user) throw new Error("Auth user creation returned no user");
  return created.user.id;
}

export const listDemoAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminClient;

    const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);
    const byEmail = new Map<string, string>(list.users.map((u) => [(u.email ?? "").toLowerCase(), u.id]));
    return {
      accounts: DEMO_ACCOUNTS.map((a) => ({
        ...a,
        password: "",
        user_id: byEmail.get(a.email.toLowerCase()) ?? null,
      })) as DemoAccount[],
    };
  });

export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase, userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminClient;

    const created: Array<DemoAccount & { user_id: string }> = [];

    for (const acc of DEMO_ACCOUNTS) {
      const uid = await ensureAuthUser(admin, acc.email, acc.password);

      // Upsert profile with is_demo=true
      await admin.from("profiles").upsert(
        {
          id: uid,
          first_name: acc.first_name,
          last_name: acc.last_name,
          full_name: `${acc.first_name} ${acc.last_name}`,
          email: acc.email,
          primary_role: PRIMARY_ROLE[acc.role],
          onboarding_completed: true,
          is_demo: true,
        },
        { onConflict: "id" },
      );

      // Upsert user_roles entry
      await admin.from("user_roles").upsert(
        { user_id: uid, role: APP_ROLE[acc.role] },
        { onConflict: "user_id,role" },
      );

      created.push({ ...acc, user_id: uid });
    }

    // Shared demo student owned by parent, with educator as collaborator
    const parent = created.find((c) => c.role === "parent")!;
    const educator = created.find((c) => c.role === "educator")!;

    // Find or create the demo student
    let studentId: string | null = null;
    const existingStudent = await admin
      .from("students")
      .select("id")
      .eq("owner_id", parent.user_id)
      .maybeSingle();
    if (existingStudent.data?.id) {
      studentId = existingStudent.data.id;
      await admin.from("students").update({
        first_name: "Jordan",
        last_name: "Rivera (Demo)",
        preferred_name: "Jordan",
        grade_band: "11",
        age: 17,
        expected_graduation_year: 2027,
        primary_disability_category: "Autism Spectrum / ADHD",
        strengths_summary: "Strong visual memory, detail-oriented, patient mentor to younger kids, hands-on builder.",
        interests_summary: "Video game design, animal care, music production, cooking with family.",
        support_needs_summary: "Quiet workspace, written instructions, extra time on multi-step tasks, breaks during long meetings.",
        family_priorities: "Independent living readiness; pathway to part-time work + community college.",
        student_voice_statement: "I want to keep learning about computers and maybe work with animals too.",
        current_transition_status: "active_planning",
        readiness_level: "developing",
        is_demo: true,
      }).eq("id", studentId!);
    } else {
      const ins = await admin.from("students").insert({
        owner_id: parent.user_id,
        first_name: "Jordan",
        last_name: "Rivera (Demo)",
        preferred_name: "Jordan",
        grade_band: "11",
        age: 17,
        expected_graduation_year: 2027,
        primary_disability_category: "Autism Spectrum / ADHD",
        strengths_summary: "Strong visual memory, detail-oriented, patient mentor to younger kids, hands-on builder.",
        interests_summary: "Video game design, animal care, music production, cooking with family.",
        support_needs_summary: "Quiet workspace, written instructions, extra time on multi-step tasks, breaks during long meetings.",
        family_priorities: "Independent living readiness; pathway to part-time work + community college.",
        student_voice_statement: "I want to keep learning about computers and maybe work with animals too.",
        current_transition_status: "active_planning",
        readiness_level: "developing",
        is_demo: true,
      }).select().single();
      if (ins.error) throw new Error(ins.error.message);
      studentId = (ins.data as { id: string }).id;
    }

    // Educator as collaborator (editor / accepted)
    await admin.from("student_collaborators").upsert(
      { student_id: studentId, user_id: educator.user_id, role: "editor", status: "accepted" },
      { onConflict: "student_id,user_id" },
    );

    // Wipe + re-seed goals / action items / calendar events for the demo student
    await admin.from("goals").delete().eq("student_id", studentId);
    await admin.from("action_items").delete().eq("student_id", studentId);
    await admin.from("calendar_events").delete().eq("student_id", studentId);

    await admin.from("goals").insert([
      { student_id: studentId, created_by: parent.user_id, category: "postsecondary_education", title: "Tour 2 community colleges by June", description: "Visit Manchester CC and Naugatuck Valley CC.", target_date: "2026-06-15", status: "in-progress", position: 1 },
      { student_id: studentId, created_by: parent.user_id, category: "employment", title: "Complete one job-shadow at a vet clinic", description: "Half-day shadow arranged through Connecticut Animal Rescue.", target_date: "2026-08-30", status: "not-started", position: 2 },
      { student_id: studentId, created_by: parent.user_id, category: "independent_living", title: "Practice public-transit route to community college", description: "Bus route from home to MCC, 3 trial runs with a caregiver.", target_date: "2026-09-30", status: "not-started", position: 3 },
    ]);

    await admin.from("action_items").insert([
      { student_id: studentId, created_by_user_id: parent.user_id, title: "Request transition assessment from school", category: "school", priority: "high", status: "not_started", due_date: "2026-07-01" },
      { student_id: studentId, created_by_user_id: parent.user_id, title: "Save 2 program brochures from Resource Library", category: "family", priority: "medium", status: "not_started", due_date: "2026-07-15" },
      { student_id: studentId, created_by_user_id: educator.user_id, title: "Recommend assistive-tech evaluation", category: "school", priority: "medium", status: "in_progress", due_date: "2026-08-01" },
      { student_id: studentId, created_by_user_id: parent.user_id, title: "Add PPT meeting to calendar", category: "family", priority: "high", status: "not_started", due_date: "2026-09-10" },
    ]);

    await admin.from("calendar_events").insert([
      { owner_user_id: parent.user_id, student_id: studentId, title: "Annual PPT Meeting (Demo)", detail: "Annual planning and placement team meeting.", event_date: "2026-09-15", event_type: "ppt_meeting", audience_roles: ["parent","educator"], status: "scheduled", visibility: "shared", source_type: "manual" },
      { owner_user_id: educator.user_id, student_id: studentId, title: "Transition Assessment Window Opens", detail: "Begin formal transition assessment work.", event_date: "2026-07-01", event_type: "deadline", audience_roles: ["educator"], status: "scheduled", visibility: "shared", source_type: "manual" },
      { owner_user_id: parent.user_id, student_id: studentId, title: "MCC Campus Tour (Demo)", detail: "Manchester Community College guided tour.", event_date: "2026-06-08", event_type: "tour", audience_roles: ["parent"], status: "scheduled", visibility: "shared", source_type: "manual" },
    ]);

    // Return credentials so admin can copy them
    return {
      ok: true,
      seeded_at: new Date().toISOString(),
      student_id: studentId,
      accounts: created.map((c) => ({
        role: c.role,
        label: c.label,
        email: c.email,
        password: c.password,
        user_id: c.user_id,
      })),
    };
  });

export const resetDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertPlatformAdmin(supabase as Parameters<typeof assertPlatformAdmin>[0], userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as AdminClient;

    const { data: list, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw new Error(error.message);

    const demoEmails = new Set(DEMO_ACCOUNTS.map((a) => a.email.toLowerCase()));
    const demoUsers = list.users.filter((u) => demoEmails.has((u.email ?? "").toLowerCase()));

    let deleted = 0;
    for (const u of demoUsers) {
      // CASCADE on student.owner_id etc. takes care of student-scoped rows.
      await admin.auth.admin.deleteUser(u.id);
      deleted += 1;
    }
    return { ok: true, deleted_accounts: deleted };
  });
