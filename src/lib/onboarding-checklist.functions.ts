import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RoleSurface =
  | "family"
  | "student"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner"
  | "admin";

export type ChecklistStep = {
  id: string;
  label: string;
  hint?: string;
  to?: string;
};

const ROLE_CHECKLISTS: Record<RoleSurface, ChecklistStep[]> = {
  family: [
    { id: "review_pathway", label: "Review your student's Pathway Report", hint: "See AI-suggested goals and next steps", to: "/dashboard" },
    { id: "add_action_item", label: "Mark one action item as in progress", hint: "Small wins build momentum", to: "/dashboard" },
    { id: "save_resource", label: "Save a resource from the library", to: "/resources" },
    { id: "explore_partner", label: "Browse partner programs", to: "/partners" },
    { id: "invite_team", label: "Invite a team member (educator, family)", to: "/dashboard" },
  ],
  student: [
    { id: "tell_story", label: "Share your strengths in Student Voice", to: "/dashboard" },
    { id: "review_pathway", label: "Read your Pathway Report", to: "/dashboard" },
    { id: "browse_partners", label: "Explore programs that match your interests", to: "/partners" },
    { id: "next_step", label: "Pick one next step to try this week", to: "/dashboard" },
  ],
  educator: [
    { id: "open_caseload", label: "Open your caseload", to: "/caseload" },
    { id: "review_student", label: "Open a student profile", to: "/caseload" },
    { id: "log_note", label: "Log a case-manager note", to: "/caseload" },
    { id: "assign_action", label: "Assign one action item", to: "/caseload" },
    { id: "prep_meeting", label: "Prep an upcoming meeting", to: "/meetings" },
  ],
  school_admin: [
    { id: "view_overview", label: "Review School Overview", to: "/school/overview" },
    { id: "check_team", label: "Confirm your school team roster", to: "/school/team" },
    { id: "review_reports", label: "Open the most recent reports", to: "/school/reports" },
    { id: "share_implementation", label: "Share the implementation guide with staff", to: "/school/implementation" },
  ],
  district_admin: [
    { id: "view_overview", label: "Open District Overview", to: "/district/overview" },
    { id: "connect_schools", label: "Confirm connected schools", to: "/district/schools" },
    { id: "review_team", label: "Review district team members", to: "/district/team" },
    { id: "scan_reports", label: "Skim district reports", to: "/district/reports" },
  ],
  partner: [
    { id: "review_profile", label: "Check your partner profile is current", to: "/partners-manage" },
    { id: "post_opportunity", label: "Post or refresh one opportunity", to: "/partners-manage" },
    { id: "respond_inquiry", label: "Respond to a student/family inquiry", to: "/partners-manage" },
  ],
  admin: [
    { id: "seed_demo", label: "Seed demo accounts", to: "/owner/demo" },
    { id: "run_health", label: "Run System Health checks", to: "/owner/health" },
    { id: "review_waitlist", label: "Review the waitlist", to: "/owner/waitlist" },
    { id: "moderate_partners", label: "Moderate pending partner submissions", to: "/owner/partner-submissions" },
  ],
};

export const getOnboardingChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { surface: RoleSurface }) => input)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    type Row = { onboarding: Record<string, Record<string, boolean>> | null };
    const { data: row, error } = await (supabase as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: Row | null; error: { message: string } | null }> } };
      };
    })
      .from("user_ui_prefs")
      .select("onboarding")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const completedMap = (row?.onboarding?.[data.surface] ?? {}) as Record<string, boolean>;
    const steps = ROLE_CHECKLISTS[data.surface] ?? [];
    return {
      surface: data.surface,
      steps: steps.map((s) => ({ ...s, completed: Boolean(completedMap[s.id]) })),
    };
  });

export const setOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { surface: RoleSurface; stepId: string; completed: boolean }) => input)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    type Sb = {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: { onboarding: Record<string, Record<string, boolean>> | null } | null; error: { message: string } | null }> } };
        upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => Promise<{ error: { message: string } | null }>;
      };
    };
    const sb = supabase as unknown as Sb;
    const { data: row, error: readErr } = await sb
      .from("user_ui_prefs")
      .select("onboarding")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    const onboarding = (row?.onboarding ?? {}) as Record<string, Record<string, boolean>>;
    const surfaceMap = { ...(onboarding[data.surface] ?? {}) };
    if (data.completed) surfaceMap[data.stepId] = true;
    else delete surfaceMap[data.stepId];
    onboarding[data.surface] = surfaceMap;
    const { error: writeErr } = await sb
      .from("user_ui_prefs")
      .upsert({ user_id: userId, onboarding }, { onConflict: "user_id" });
    if (writeErr) throw new Error(writeErr.message);
    return { ok: true };
  });
