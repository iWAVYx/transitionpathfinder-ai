import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Team Calendar — aggregates calendar-worthy items across every student the
 * caller can access, plus the caller's own personal calendar entries.
 *
 * Event kinds:
 *  - "action"   action item due dates (student-scoped)
 *  - "meeting"  upcoming PPT/IEP meetings (student-scoped)
 *  - "prep"     derived meeting-prep deadlines (computed from upcoming meetings)
 *  - "team"     calendar_events row with visibility='team' on an accessible student
 *  - "personal" calendar_events row the caller owns (visibility='private')
 */

export type TeamCalendarEvent = {
  id: string;
  kind: "action" | "meeting" | "prep" | "team" | "personal";
  title: string;
  detail: string;
  /** ISO YYYY-MM-DD (local day) */
  event_date: string;
  student_id: string | null;
  student_name: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  priority: "low" | "medium" | "high" | null;
  status: "not_started" | "in_progress" | "complete" | "blocked" | null;
  is_mine: boolean;
};

const PREP_OFFSETS: Array<{ offset: number; label: string; detail: string }> = [
  {
    offset: 14,
    label: "Request records & draft documents",
    detail:
      "Ask the school for the proposed IEP draft, evaluations, and progress reports.",
  },
  {
    offset: 7,
    label: "Contact partner organizations",
    detail:
      "Reach out to top partner contacts to confirm services, eligibility, and availability.",
  },
  {
    offset: 3,
    label: "Review with the student",
    detail:
      "Walk through goals, concerns, and what they want to say in their own words.",
  },
  {
    offset: 1,
    label: "Pack the meeting folder",
    detail:
      "Print the agenda, questions, evidence list, and partner contacts.",
  },
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateOnly(input: string): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** List every student id the caller can access (owner OR accepted collaborator). */
async function listAccessibleStudentIds(
  supabase: ReturnType<typeof getSb>,
  userId: string,
): Promise<Array<{ id: string; name: string }>> {
  const [ownedRes, collabRes] = await Promise.all([
    supabase.from("students").select("id, first_name, last_name").eq("owner_id", userId),
    supabase
      .from("student_collaborators")
      .select("student_id, students:student_id (id, first_name, last_name)")
      .eq("user_id", userId)
      .eq("status", "accepted"),
  ]);

  const map = new Map<string, string>();
  for (const s of ownedRes.data ?? []) {
    map.set(s.id, `${s.first_name}${s.last_name ? ` ${s.last_name}` : ""}`);
  }
  for (const c of (collabRes.data ?? []) as Array<{
    students: { id: string; first_name: string; last_name: string | null } | null;
  }>) {
    const s = c.students;
    if (s && !map.has(s.id)) {
      map.set(s.id, `${s.first_name}${s.last_name ? ` ${s.last_name}` : ""}`);
    }
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

// Tiny type helper for the supabase client returned by middleware
type Sb = Awaited<ReturnType<typeof import("@/integrations/supabase/auth-middleware").requireSupabaseAuth>>;
function getSb(): Sb {
  return null as never;
}

export const listCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        // Optional: scope to a single student. Otherwise aggregate across all accessible students.
        student_id: z.string().uuid().optional(),
        // ISO date strings (YYYY-MM-DD). Defaults to a 6-month window centered on today.
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ events: TeamCalendarEvent[] }> => {
    const { supabase, userId } = context;

    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setMonth(defaultFrom.getMonth() - 1);
    const defaultTo = new Date(today);
    defaultTo.setMonth(defaultTo.getMonth() + 6);
    const fromIso = data.from ?? toIsoDate(defaultFrom);
    const toIso = data.to ?? toIsoDate(defaultTo);

    // Resolve accessible students (filtered to one if requested).
    const allStudents = await listAccessibleStudentIds(supabase as unknown as Sb, userId);
    const students = data.student_id
      ? allStudents.filter((s) => s.id === data.student_id)
      : allStudents;
    const ids = students.map((s) => s.id);
    const nameById = new Map(students.map((s) => [s.id, s.name]));

    // Fetch owner display names lazily for any team events not owned by caller.
    const events: TeamCalendarEvent[] = [];

    if (ids.length > 0) {
      const [actionsRes, meetingsRes] = await Promise.all([
        supabase
          .from("action_items")
          .select("id, student_id, title, description, due_date, priority, status, category")
          .in("student_id", ids)
          .not("due_date", "is", null)
          .gte("due_date", fromIso)
          .lte("due_date", toIso),
        supabase
          .from("meetings")
          .select("id, student_id, title, kind, scheduled_at, location, status")
          .in("student_id", ids)
          .not("scheduled_at", "is", null)
          .gte("scheduled_at", `${fromIso}T00:00:00`)
          .lte("scheduled_at", `${toIso}T23:59:59`),
      ]);

      for (const a of (actionsRes.data ?? []) as Array<{
        id: string;
        student_id: string;
        title: string;
        description: string | null;
        due_date: string;
        priority: "low" | "medium" | "high";
        status: "not_started" | "in_progress" | "complete" | "blocked";
        category: string;
      }>) {
        events.push({
          id: `action-${a.id}`,
          kind: "action",
          title: a.title,
          detail: a.description ?? `Action item · ${a.category}`,
          event_date: a.due_date.slice(0, 10),
          student_id: a.student_id,
          student_name: nameById.get(a.student_id) ?? null,
          owner_user_id: null,
          owner_name: null,
          priority: a.priority,
          status: a.status,
          is_mine: false,
        });
      }

      for (const m of (meetingsRes.data ?? []) as Array<{
        id: string;
        student_id: string;
        title: string;
        kind: string;
        scheduled_at: string;
        location: string | null;
        status: string;
      }>) {
        const d = parseDateOnly(m.scheduled_at);
        if (!d) continue;
        const meetingDateIso = toIsoDate(d);
        events.push({
          id: `meeting-${m.id}`,
          kind: "meeting",
          title: m.title || `${m.kind} meeting`,
          detail: m.location ? `Location: ${m.location}` : "Upcoming meeting",
          event_date: meetingDateIso,
          student_id: m.student_id,
          student_name: nameById.get(m.student_id) ?? null,
          owner_user_id: null,
          owner_name: null,
          priority: null,
          status: null,
          is_mine: false,
        });
        // Derived prep deadlines (only for upcoming meetings).
        if (m.status === "upcoming") {
          for (const step of PREP_OFFSETS) {
            const prep = new Date(d);
            prep.setDate(prep.getDate() - step.offset);
            const iso = toIsoDate(prep);
            if (iso < fromIso || iso > toIso) continue;
            events.push({
              id: `prep-${m.id}-${step.offset}`,
              kind: "prep",
              title: `PPT Prep: ${step.label}`,
              detail: step.detail,
              event_date: iso,
              student_id: m.student_id,
              student_name: nameById.get(m.student_id) ?? null,
              owner_user_id: null,
              owner_name: null,
              priority: null,
              status: null,
              is_mine: false,
            });
          }
        }
      }
    }

    // Custom calendar_events visible to the caller (RLS handles team-vs-private).
    const calRes = await supabase
      .from("calendar_events")
      .select("id, owner_user_id, student_id, title, detail, event_date, visibility")
      .gte("event_date", fromIso)
      .lte("event_date", toIso);

    const otherOwnerIds = new Set<string>();
    for (const row of (calRes.data ?? []) as Array<{ owner_user_id: string }>) {
      if (row.owner_user_id !== userId) otherOwnerIds.add(row.owner_user_id);
    }
    let ownerNames = new Map<string, string>();
    if (otherOwnerIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(otherOwnerIds));
      ownerNames = new Map(
        (profs ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [
          p.id,
          p.full_name || p.email || "Teammate",
        ]),
      );
    }

    for (const row of (calRes.data ?? []) as Array<{
      id: string;
      owner_user_id: string;
      student_id: string | null;
      title: string;
      detail: string | null;
      event_date: string;
      visibility: "private" | "team";
    }>) {
      const isMine = row.owner_user_id === userId;
      events.push({
        id: `cal-${row.id}`,
        kind: row.visibility === "team" ? "team" : "personal",
        title: row.title,
        detail: row.detail ?? "",
        event_date: row.event_date.slice(0, 10),
        student_id: row.student_id,
        student_name: row.student_id ? nameById.get(row.student_id) ?? null : null,
        owner_user_id: row.owner_user_id,
        owner_name: isMine ? "You" : ownerNames.get(row.owner_user_id) ?? "Teammate",
        priority: null,
        status: null,
        is_mine: isMine,
      });
    }

    events.sort((a, b) => a.event_date.localeCompare(b.event_date));
    return { events };
  });

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(200),
        detail: z.string().max(2000).optional().nullable(),
        event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        visibility: z.enum(["private", "team"]).default("private"),
        student_id: z.string().uuid().optional().nullable(),
      })
      .refine((v) => v.visibility === "private" || !!v.student_id, {
        message: "Team events must be linked to a student.",
        path: ["student_id"],
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("calendar_events")
      .insert({
        owner_user_id: userId,
        student_id: data.student_id ?? null,
        title: data.title,
        detail: data.detail ?? null,
        event_date: data.event_date,
        visibility: data.visibility,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", data.id)
      .eq("owner_user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
