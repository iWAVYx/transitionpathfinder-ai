import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calendarDayForInstant, shiftCalendarDay, validCalendarDay, validCalendarTimeZone } from "./calendar-day";
import { readCalendarPages, readCalendarBatches } from "./calendar-query-pages";
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

export type CalendarVisibility =
  | "private"
  | "team"
  | "student_team"
  | "family_team"
  | "school_team"
  | "district_team"
  | "partner_only"
  | "platform_admin_only"
  | "public_event";

export type CalendarStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "rescheduled"
  | "needs_follow_up";

export type TeamCalendarEvent = {
  id: string;
  kind: "action" | "meeting" | "prep" | "team" | "personal" | "deadline";
  event_type: string;
  title: string;
  detail: string;
  /** ISO YYYY-MM-DD (local day) */
  event_date: string;
  /** Original timestamp for scheduled meetings; retain its absolute instant. */
  start_at?: string;
  start_time: string | null;
  end_time: string | null;
  all_day: boolean;
  location: string | null;
  meeting_link: string | null;
  color_label: string | null;
  visibility: CalendarVisibility | null;
  event_status: CalendarStatus | null;
  related_organization_id: string | null;
  related_pathway_report_id: string | null;
  related_action_item_id: string | null;
  related_meeting_id: string | null;
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

/** List student ids visible to the caller through the existing students RLS.
 * This includes a student's own linked account and authorized school views,
 * not just owners and invited collaborators. Never use a service-role client.
 */
async function listAccessibleStudentIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  studentId?: string,
  organizationId?: string,
): Promise<Array<{ id: string; name: string }>> {
  const data = await readCalendarPages((from, to) => {
    let query = supabase.from("students")
      .select("id, first_name, last_name", { count: "exact" }).order("id", { ascending: true }).range(from, to);
    if (studentId) query = query.eq("id", studentId);
    if (organizationId) query = query.eq("organization_id", organizationId);
    return query;
  });
  return ((data ?? []) as Array<{
    id: string;
    first_name: string;
    last_name: string | null;
  }>).map((student) => ({
    id: student.id,
    name: `${student.first_name}${student.last_name ? ` ${student.last_name}` : ""}`,
  }));
}

export const listCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        expected_viewer_id: z.string().min(1).max(100).optional(),
        // Optional: scope to a single student. Otherwise aggregate across all accessible students.
        student_id: z.string().uuid().optional(),
        organization_id: z.string().uuid().optional(),
        // ISO date strings (YYYY-MM-DD). Defaults to a 6-month window centered on today.
        from: z.string().refine(validCalendarDay, "Choose a valid calendar date.").optional(),
        to: z.string().refine(validCalendarDay, "Choose a valid calendar date.").optional(),
        timezone: z.string().max(64).refine(validCalendarTimeZone, "Choose a valid timezone.").default("UTC"),
      }).refine(value => !value.from || !value.to || value.from <= value.to, "The start date must come before the end date.")
      .parse(i),
  )
  .handler(async ({ data, context }): Promise<{ events: TeamCalendarEvent[] }> => {
    const { supabase, userId } = context;
    if (data.expected_viewer_id && data.expected_viewer_id !== userId)
      throw new Error("Your sign-in changed. Please try again.");

    if (data.organization_id) {
      const { data: membership, error } = await supabase.from("organization_memberships")
        .select("organization_id").eq("user_id", userId).eq("organization_id", data.organization_id)
        .eq("status", "active").maybeSingle();
      if (error || !membership) throw new Error("This organization calendar is unavailable.");
    }
    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setMonth(defaultFrom.getMonth() - 1);
    const defaultTo = new Date(today);
    defaultTo.setMonth(defaultTo.getMonth() + 6);
    const fromIso = data.from ?? calendarDayForInstant(defaultFrom.toISOString(), data.timezone);
    const toIso = data.to ?? calendarDayForInstant(defaultTo.toISOString(), data.timezone);

    // Resolve accessible students (filtered to one if requested).
    const students = await listAccessibleStudentIds(supabase, data.student_id, data.organization_id);
    const ids = students.map((s) => s.id);
    const nameById = new Map(students.map((s) => [s.id, s.name]));

    // Fetch owner display names lazily for any team events not owned by caller.
    const events: TeamCalendarEvent[] = [];

    if (ids.length > 0) {
      const [actionsRes, meetingsRes] = await Promise.all([
        readCalendarBatches(ids, (batch, from, to) => supabase
          .from("action_items")
          .select("id, student_id, title, description, due_date, priority, status, category", { count: "exact" })
          .in("student_id", batch)
          .not("due_date", "is", null)
          .gte("due_date", fromIso)
          .lte("due_date", toIso).order("id", { ascending: true }).range(from, to)).then(data => ({ data })),
        readCalendarBatches(ids, (batch, from, to) => supabase
          .from("meetings")
          .select("id, student_id, title, kind, scheduled_at, location, status", { count: "exact" })
          .in("student_id", batch)
          .not("scheduled_at", "is", null)
          .gte("scheduled_at", `${shiftCalendarDay(fromIso, -1)}T00:00:00Z`)
          .lte("scheduled_at", `${shiftCalendarDay(toIso, 15)}T23:59:59Z`).order("id", { ascending: true }).range(from, to)).then(data => ({ data })),
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
          event_type: "Action Item Due",
          title: a.title,
          detail: a.description ?? `Action item · ${a.category}`,
          event_date: a.due_date.slice(0, 10),
          start_time: null,
          end_time: null,
          all_day: true,
          location: null,
          meeting_link: null,
          color_label: null,
          visibility: null,
          event_status: null,
          related_organization_id: null,
          related_pathway_report_id: null,
          related_action_item_id: a.id,
          related_meeting_id: null,
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
        const meetingDateIso = calendarDayForInstant(m.scheduled_at, data.timezone);
        if (meetingDateIso >= fromIso && meetingDateIso <= toIso) events.push({
          id: `meeting-${m.id}`,
          kind: "meeting",
          event_type: m.kind === "iep" || m.kind === "ppt" ? "PPT / IEP Meeting" : "Transition Meeting",
          title: m.title || `${m.kind} meeting`,
          detail: m.location ? `Location: ${m.location}` : "Upcoming meeting",
          event_date: meetingDateIso,
          start_at: m.scheduled_at,
          start_time: null,
          end_time: null,
          all_day: false,
          location: m.location,
          meeting_link: null,
          color_label: null,
          visibility: null,
          event_status: null,
          related_organization_id: null,
          related_pathway_report_id: null,
          related_action_item_id: null,
          related_meeting_id: m.id,
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
            const iso = shiftCalendarDay(meetingDateIso, -step.offset);
            if (iso < fromIso || iso > toIso) continue;
            events.push({
              id: `prep-${m.id}-${step.offset}`,
              kind: "prep",
              event_type: "Meeting Prep",
              title: `PPT Prep: ${step.label}`,
              detail: step.detail,
              event_date: iso,
              start_time: null,
              end_time: null,
              all_day: true,
              location: null,
              meeting_link: null,
              color_label: null,
              visibility: null,
              event_status: null,
              related_organization_id: null,
              related_pathway_report_id: null,
              related_action_item_id: null,
              related_meeting_id: m.id,
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

      // Statutory + planning deadlines pulled from the student record:
      // annual IEP review, triennial reevaluation, graduation target.
      const studentDates = await readCalendarBatches(ids, (batch, from, to) => supabase
        .from("students")
        .select(
          "id, iep_annual_review_date, iep_reevaluation_date, graduation_target_date", { count: "exact" },
        )
        .in("id", batch).order("id", { ascending: true }).range(from, to));
      for (const s of (studentDates ?? []) as Array<{
        id: string;
        iep_annual_review_date: string | null;
        iep_reevaluation_date: string | null;
        graduation_target_date: string | null;
      }>) {
        const pushDeadline = (
          dateStr: string | null,
          kindSuffix: string,
          event_type: string,
          title: string,
          detail: string,
        ) => {
          if (!dateStr) return;
          const iso = dateStr.slice(0, 10);
          if (iso < fromIso || iso > toIso) return;
          events.push({
            id: `deadline-${kindSuffix}-${s.id}`,
            kind: "deadline",
            event_type,
            title,
            detail,
            event_date: iso,
            start_time: null,
            end_time: null,
            all_day: true,
            location: null,
            meeting_link: null,
            color_label: null,
            visibility: null,
            event_status: null,
            related_organization_id: null,
            related_pathway_report_id: null,
            related_action_item_id: null,
            related_meeting_id: null,
            student_id: s.id,
            student_name: nameById.get(s.id) ?? null,
            owner_user_id: null,
            owner_name: null,
            priority: null,
            status: null,
            is_mine: false,
          });
        };
        pushDeadline(
          s.iep_annual_review_date,
          "iep-review",
          "Document Due Date",
          "IEP annual review due",
          "Annual IEP review deadline. Schedule the PPT meeting at least 10 days in advance.",
        );
        pushDeadline(
          s.iep_reevaluation_date,
          "iep-reeval",
          "Document Due Date",
          "Reevaluation due",
          "Triennial reevaluation deadline. Consents and evaluations need to be in place by this date.",
        );
        pushDeadline(
          s.graduation_target_date,
          "graduation",
          "Program Date",
          "Graduation / exit milestone",
          "Target graduation date. Confirm final transition steps, adult services, and documentation.",
        );
      }

      // Surface "next meeting date" set on completed meetings as a deadline
      // so post-meeting follow-through doesn't get lost.
      const nextMeetings = await readCalendarBatches(ids, (batch, from, to) => supabase
        .from("meetings")
        .select("id, student_id, title, next_meeting_date", { count: "exact" })
        .in("student_id", batch)
        .not("next_meeting_date", "is", null)
        .gte("next_meeting_date", fromIso)
        .lte("next_meeting_date", toIso).order("id", { ascending: true }).range(from, to));
      for (const nm of (nextMeetings ?? []) as Array<{
        id: string;
        student_id: string;
        title: string;
        next_meeting_date: string;
      }>) {
        events.push({
          id: `nextmeeting-${nm.id}`,
          kind: "deadline",
          event_type: "PPT / IEP Meeting",
          title: `Schedule next meeting (${nm.title})`,
          detail: "A next meeting date was captured. Confirm it's on the official calendar.",
          event_date: nm.next_meeting_date.slice(0, 10),
          start_time: null,
          end_time: null,
          all_day: true,
          location: null,
          meeting_link: null,
          color_label: null,
          visibility: null,
          event_status: null,
          related_organization_id: null,
          related_pathway_report_id: null,
          related_action_item_id: null,
          related_meeting_id: nm.id,
          student_id: nm.student_id,
          student_name: nameById.get(nm.student_id) ?? null,
          owner_user_id: null,
          owner_name: null,
          priority: null,
          status: null,
          is_mine: false,
        });
      }
    }

    // Resource follow-ups the caller saved with a follow_up_date.
    const savedFollowups = data.organization_id ? [] : await readCalendarPages((from, to) => supabase
      .from("saved_resources")
      .select("id, follow_up_date, resource:resources(id,title)", { count: "exact" })
      .eq("user_id", userId)
      .not("follow_up_date", "is", null)
      .gte("follow_up_date", fromIso)
      .lte("follow_up_date", toIso).order("id", { ascending: true }).range(from, to));
    for (const sr of (savedFollowups ?? []) as Array<{
      id: string;
      follow_up_date: string;
      resource: { id: string; title: string } | null;
    }>) {
      events.push({
        id: `resource-followup-${sr.id}`,
        kind: "deadline",
        event_type: "Resource Follow-Up",
        title: `Follow up: ${sr.resource?.title ?? "saved resource"}`,
        detail: "Revisit this saved resource and decide on next steps.",
        event_date: sr.follow_up_date.slice(0, 10),
        start_time: null,
        end_time: null,
        all_day: true,
        location: null,
        meeting_link: null,
        color_label: null,
        visibility: null,
        event_status: null,
        related_organization_id: null,
        related_pathway_report_id: null,
        related_action_item_id: null,
        related_meeting_id: null,
        student_id: null,
        student_name: null,
        owner_user_id: userId,
        owner_name: "You",
        priority: null,
        status: null,
        is_mine: true,
      });
    }

    // Custom calendar_events visible to the caller (RLS handles visibility tiers).
    const calendarRows = await readCalendarPages((from, to) => {
      let calendarQuery = supabase
        .from("calendar_events")
        .select(
          "id, owner_user_id, student_id, title, detail, event_date, visibility, event_type, start_time, end_time, all_day, location, meeting_link, color_label, status, related_organization_id, related_pathway_report_id, related_action_item_id, related_meeting_id", { count: "exact" },
        )
        .gte("event_date", fromIso)
        .lte("event_date", toIso);
      if (data.organization_id) calendarQuery = calendarQuery.eq("related_organization_id", data.organization_id);
      if (data.student_id) calendarQuery = calendarQuery.eq("student_id", data.student_id);
      return calendarQuery.order("id", { ascending: true }).range(from, to);
    });
    const otherOwnerIds = new Set<string>();
    for (const row of calendarRows as Array<{ owner_user_id: string }>) {
      if (row.owner_user_id !== userId) otherOwnerIds.add(row.owner_user_id);
    }
    let ownerNames = new Map<string, string>();
    if (otherOwnerIds.size > 0) {
      const profs = await readCalendarBatches(Array.from(otherOwnerIds), (batch, from, to) => supabase
        .from("profiles")
        .select("id, full_name, email", { count: "exact" })
        .in("id", batch).order("id", { ascending: true }).range(from, to));
      ownerNames = new Map(
        (profs ?? []).map((p: { id: string; full_name: string | null; email: string | null }) => [
          p.id,
          p.full_name || p.email || "Teammate",
        ]),
      );
    }

    for (const row of calendarRows as Array<{
      id: string;
      owner_user_id: string;
      student_id: string | null;
      title: string;
      detail: string | null;
      event_date: string;
      visibility: CalendarVisibility;
      event_type: string;
      start_time: string | null;
      end_time: string | null;
      all_day: boolean;
      location: string | null;
      meeting_link: string | null;
      color_label: string | null;
      status: CalendarStatus;
      related_organization_id: string | null;
      related_pathway_report_id: string | null;
      related_action_item_id: string | null;
      related_meeting_id: string | null;
    }>) {
      const isMine = row.owner_user_id === userId;
      const teamish = row.visibility !== "private";
      events.push({
        id: `cal-${row.id}`,
        kind: teamish ? "team" : "personal",
        event_type: row.event_type,
        title: row.title,
        detail: row.detail ?? "",
        event_date: row.event_date.slice(0, 10),
        start_time: row.start_time,
        end_time: row.end_time,
        all_day: row.all_day,
        location: row.location,
        meeting_link: row.meeting_link,
        color_label: row.color_label,
        visibility: row.visibility,
        event_status: row.status,
        related_organization_id: row.related_organization_id,
        related_pathway_report_id: row.related_pathway_report_id,
        related_action_item_id: row.related_action_item_id,
        related_meeting_id: row.related_meeting_id,
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

const EVENT_TYPES = [
  "PPT / IEP Meeting",
  "Transition Meeting",
  "Family Check-In",
  "Student Task",
  "Educator Task",
  "School Team Meeting",
  "District Implementation Date",
  "Partner Opportunity Deadline",
  "Program Date",
  "Document Due Date",
  "Pathway Report Review",
  "Action Item Due",
  "Resource Follow-Up",
  "Partner Outreach Follow-Up",
  "Demo Request",
  "Contact Follow-Up",
  "Waitlist Follow-Up",
  "Training / Workshop",
  "System Reminder",
  "Other",
] as const;

const VISIBILITY_VALUES = [
  "private",
  "team",
  "student_team",
  "family_team",
  "school_team",
  "district_team",
  "partner_only",
  "platform_admin_only",
  "public_event",
] as const;

const STATUS_VALUES = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
  "needs_follow_up",
] as const;

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

const calendarEventInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    detail: z.string().max(2000).optional().nullable(),
    event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    visibility: z.enum(VISIBILITY_VALUES).default("private"),
    event_type: z.enum(EVENT_TYPES).default("Other"),
    status: z.enum(STATUS_VALUES).default("scheduled"),
    student_id: z.string().uuid().optional().nullable(),
    related_organization_id: z.string().uuid().optional().nullable(),
    related_pathway_report_id: z.string().uuid().optional().nullable(),
    related_action_item_id: z.string().uuid().optional().nullable(),
    related_meeting_id: z.string().uuid().optional().nullable(),
    start_time: z.string().regex(TIME_RE).optional().nullable(),
    end_time: z.string().regex(TIME_RE).optional().nullable(),
    all_day: z.boolean().default(true),
    timezone: z.string().max(64).optional().nullable(),
    location: z.string().max(300).optional().nullable(),
    meeting_link: z.string().url().max(500).optional().nullable(),
    color_label: z.string().max(40).optional().nullable(),
    reminder_settings: z.array(z.string().max(40)).max(8).optional(),
  })
  .refine(
    (v) =>
      v.visibility === "private" ||
      v.visibility === "platform_admin_only" ||
      v.visibility === "public_event" ||
      ((v.visibility === "team" ||
        v.visibility === "student_team" ||
        v.visibility === "family_team") &&
        !!v.student_id) ||
      ((v.visibility === "school_team" ||
        v.visibility === "district_team" ||
        v.visibility === "partner_only") &&
        !!v.related_organization_id),
    {
      message:
        "Pick a student for family/team events, or an organization for school/district/partner events.",
      path: ["visibility"],
    },
  );

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => calendarEventInput.parse(i))
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
        event_type: data.event_type,
        status: data.status,
        related_organization_id: data.related_organization_id ?? null,
        related_pathway_report_id: data.related_pathway_report_id ?? null,
        related_action_item_id: data.related_action_item_id ?? null,
        related_meeting_id: data.related_meeting_id ?? null,
        start_time: data.start_time ?? null,
        end_time: data.end_time ?? null,
        all_day: data.all_day,
        timezone: data.timezone ?? null,
        location: data.location ?? null,
        meeting_link: data.meeting_link ?? null,
        color_label: data.color_label ?? null,
        reminder_settings: data.reminder_settings ?? [],
        source_type: "manual",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const updateCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        detail: z.string().max(2000).optional().nullable(),
        event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        event_type: z.enum(EVENT_TYPES).optional(),
        status: z.enum(STATUS_VALUES).optional(),
        start_time: z.string().regex(TIME_RE).optional().nullable(),
        end_time: z.string().regex(TIME_RE).optional().nullable(),
        all_day: z.boolean().optional(),
        location: z.string().max(300).optional().nullable(),
        meeting_link: z.string().url().max(500).optional().nullable(),
        color_label: z.string().max(40).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("calendar_events").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyCalendarOrganizations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const data = await readCalendarPages((from, to) => supabase
      .from("organization_memberships")
      .select("id, organization_id, organizations:organization_id (id, name)", { count: "exact" })
      .eq("user_id", userId).eq("status", "active")
      .order("id", { ascending: true }).range(from, to));
    const orgs = ((data ?? []) as unknown as Array<{
      organizations: { id: string; name: string } | null;
    }>)
      .map((row) => row.organizations)
      .filter((o): o is { id: string; name: string } => !!o);
    const map = new Map<string, { id: string; name: string }>();
    for (const o of orgs) map.set(o.id, o);
    return { organizations: Array.from(map.values()) };
  });

export const deleteCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
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
