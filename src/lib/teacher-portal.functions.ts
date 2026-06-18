import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ageFromDob,
  transitionBand,
  TRANSITION_PROMPTS,
  type TransitionBand,
} from "@/lib/transition-age";

export type TeacherPortalStudent = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade_band: string | null;
  school: string | null;
  date_of_birth: string | null;
  age: number | null;
  band: TransitionBand;
};

export type UpcomingGoal = {
  id: string;
  student_id: string;
  student_name: string;
  title: string;
  category: string;
  status: string;
  target_date: string | null;
  days_until: number | null; // negative = overdue
};

export type UpcomingMeeting = {
  id: string;
  student_id: string;
  student_name: string;
  title: string;
  kind: string;
  scheduled_at: string;
  days_until: number;
};

export type ComplianceReminder = {
  student_id: string;
  student_name: string;
  band: TransitionBand;
  severity: "info" | "due" | "overdue";
  title: string;
  body: string;
};

export type TeacherPortalPayload = {
  students: TeacherPortalStudent[];
  upcomingGoals: UpcomingGoal[];
  upcomingMeetings: UpcomingMeeting[];
  reminders: ComplianceReminder[];
};

function daysBetween(target: Date, now: Date): number {
  const ms = target.getTime() - now.getTime();
  return Math.round(ms / 86_400_000);
}

function buildReminders(s: TeacherPortalStudent): ComplianceReminder[] {
  const out: ComplianceReminder[] = [];
  const studentName = `${s.first_name}${s.last_name ? " " + s.last_name : ""}`;
  const prompt = TRANSITION_PROMPTS[s.band];
  const baseSeverity: "info" | "due" =
    s.band === "early" ? "info" : "due";
  out.push({
    student_id: s.id,
    student_name: studentName,
    band: s.band,
    severity: baseSeverity,
    title: prompt.title,
    body: prompt.body,
  });

  // CT-specific compliance escalations
  if (s.age != null) {
    if (s.age >= 13 && s.age < 14) {
      out.push({
        student_id: s.id,
        student_name: studentName,
        band: s.band,
        severity: "due",
        title: "Add transition goals before the next IEP",
        body: "Connecticut requires transition planning in the first IEP in effect when the student turns 14. Draft postsecondary goals and a course of study now.",
      });
    }
    if (s.age >= 17 && s.age < 18) {
      out.push({
        student_id: s.id,
        student_name: studentName,
        band: s.band,
        severity: "due",
        title: "Notice of transfer of rights due",
        body: "Provide written notice to the student and parent at least one year before age 18 that rights will transfer at 18.",
      });
    }
    if (s.age >= 18) {
      out.push({
        student_id: s.id,
        student_name: studentName,
        band: s.band,
        severity: "overdue",
        title: "Confirm adult-decision-making plan",
        body: "Rights have transferred. Document supported decision-making, power of attorney, or guardianship status in the IEP file.",
      });
    }
  }

  return out;
}

export const getTeacherPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeacherPortalPayload> => {
    const { supabase, userId } = context;

    // Students owned OR collaborated on (auto-accept pending invites first).
    await supabase
      .from("student_collaborators")
      .update({ status: "accepted" })
      .eq("user_id", userId)
      .eq("status", "pending");

    const [{ data: owned }, { data: collabs }] = await Promise.all([
      supabase
        .from("students")
        .select("id, first_name, last_name, grade_band, school, date_of_birth")
        .eq("owner_id", userId),
      supabase
        .from("student_collaborators")
        .select(
          "students:student_id (id, first_name, last_name, grade_band, school, date_of_birth)",
        )
        .eq("user_id", userId)
        .eq("status", "accepted"),
    ]);

    const map = new Map<string, TeacherPortalStudent>();
    const add = (raw: any) => {
      if (!raw || map.has(raw.id)) return;
      const age = ageFromDob(raw.date_of_birth);
      map.set(raw.id, {
        id: raw.id,
        first_name: raw.first_name,
        last_name: raw.last_name,
        grade_band: raw.grade_band,
        school: raw.school,
        date_of_birth: raw.date_of_birth,
        age,
        band: transitionBand(age, raw.grade_band),
      });
    };
    for (const s of owned ?? []) add(s);
    for (const c of (collabs ?? []) as any[]) add(c.students);

    const students = Array.from(map.values()).sort((a, b) => {
      const order: TransitionBand[] = [
        "exit_year",
        "age_18_plus",
        "age_17",
        "age_16",
        "age_14",
        "early",
      ];
      return order.indexOf(a.band) - order.indexOf(b.band);
    });

    const ids = students.map((s) => s.id);
    if (ids.length === 0) {
      return { students: [], upcomingGoals: [], upcomingMeetings: [], reminders: [] };
    }

    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 86_400_000);
    const horizonIso = horizon.toISOString().slice(0, 10);
    const todayIso = now.toISOString().slice(0, 10);

    const [{ data: goalsRows }, { data: meetingsRows }] = await Promise.all([
      supabase
        .from("goals")
        .select("id, student_id, title, category, status, target_date")
        .in("student_id", ids)
        .neq("status", "met")
        .order("target_date", { ascending: true, nullsFirst: false }),
      supabase
        .from("meetings")
        .select("id, student_id, title, kind, scheduled_at, status")
        .in("student_id", ids)
        .gte("scheduled_at", now.toISOString())
        .neq("status", "completed")
        .order("scheduled_at", { ascending: true }),
    ]);

    const upcomingGoals: UpcomingGoal[] = (goalsRows ?? [])
      .filter((g) => !g.target_date || g.target_date <= horizonIso)
      .slice(0, 50)
      .map((g) => {
        const s = map.get(g.student_id)!;
        const days_until = g.target_date
          ? daysBetween(new Date(g.target_date + "T00:00:00"), new Date(todayIso + "T00:00:00"))
          : null;
        return {
          id: g.id,
          student_id: g.student_id,
          student_name: `${s.first_name}${s.last_name ? " " + s.last_name : ""}`,
          title: g.title,
          category: g.category,
          status: g.status,
          target_date: g.target_date,
          days_until,
        };
      });

    const upcomingMeetings: UpcomingMeeting[] = (meetingsRows ?? [])
      .slice(0, 25)
      .map((m) => {
        const s = map.get(m.student_id)!;
        return {
          id: m.id,
          student_id: m.student_id,
          student_name: `${s.first_name}${s.last_name ? " " + s.last_name : ""}`,
          title: m.title,
          kind: m.kind,
          scheduled_at: m.scheduled_at!,
          days_until: daysBetween(new Date(m.scheduled_at!), now),
        };
      });

    const reminders: ComplianceReminder[] = students.flatMap(buildReminders);

    return { students, upcomingGoals, upcomingMeetings, reminders };
  });
