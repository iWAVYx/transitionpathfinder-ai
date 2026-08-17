import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lightweight server fns that turn a recommended resource or partner
 * into a tracked follow-up: action item, calendar event, or meeting prep
 * item on the next scheduled IEP/PPT/transition meeting.
 *
 * These keep the recommendation surface coherent with the rest of the
 * platform's "planning -> follow-through" loop without changing existing
 * server fns.
 */

const inputBase = z.object({
  student_id: z.string().uuid(),
  source_kind: z.enum(["resource", "partner"]),
  source_id: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  context_note: z.string().trim().max(2000).optional(),
  next_step: z.string().trim().max(500).optional(),
  related_goal_area: z.string().trim().max(80).optional(),
});

export const addRecommendationToActionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => inputBase.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const description = [
      data.source_kind === "resource" ? "From recommended resource." : "From recommended partner.",
      data.next_step ? `Suggested next step: ${data.next_step}` : null,
      data.context_note ?? null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase
      .from("action_items")
      .insert({
        student_id: data.student_id,
        title: data.source_kind === "resource" ? `Review: ${data.title}` : `Follow up with: ${data.title}`,
        description,
        category: "family",
        priority: "medium",
        related_goal_area: data.related_goal_area ?? null,
        created_by_user_id: userId,
        status: "not_started",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addRecommendationToCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    inputBase.extend({
      // Default: 14 days out as a follow-up nudge
      event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const eventDate =
      data.event_date ??
      new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const detail = [
      data.source_kind === "resource"
        ? "Follow-up reminder from a recommended resource."
        : "Follow-up reminder from a recommended partner.",
      data.next_step ? `Next step: ${data.next_step}` : null,
      data.context_note ?? null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const eventType =
      data.source_kind === "resource" ? "Resource Follow-Up" : "Partner Outreach Follow-Up";
    const { error } = await supabase.from("calendar_events").insert({
      owner_user_id: userId,
      student_id: data.student_id,
      title: data.source_kind === "resource" ? `Review: ${data.title}` : `Follow up: ${data.title}`,
      detail,
      event_date: eventDate,
      visibility: "private",
      event_type: eventType,
      status: "scheduled",
      all_day: true,
      source_type: "manual",
      reminder_settings: [],
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true, event_date: eventDate };
  });

export const addRecommendationToNextMeetingPrep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => inputBase.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Find the next upcoming meeting for this student
    const nowIso = new Date().toISOString();
    const { data: meetings, error: mErr } = await supabase
      .from("meetings")
      .select("id, scheduled_at, status")
      .eq("student_id", data.student_id)
      .gte("scheduled_at", nowIso)
      .neq("status", "completed")
      .order("scheduled_at", { ascending: true })
      .limit(1);
    if (mErr) throw new Error(mErr.message);

    const meeting = meetings?.[0];
    if (!meeting) {
      return {
        ok: false as const,
        reason: "no_upcoming_meeting" as const,
        message:
          "No upcoming meeting found. Schedule a PPT/IEP/transition meeting to queue this for discussion.",
      };
    }

    const content = [
      data.source_kind === "resource"
        ? `Discuss this recommended resource: ${data.title}`
        : `Discuss this potential partner: ${data.title}`,
      data.next_step ? `Suggested next step: ${data.next_step}` : null,
      data.context_note ?? null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error } = await supabase.from("meeting_prep_items").insert({
      meeting_id: meeting.id as string,
      student_id: data.student_id,
      category: data.source_kind === "resource" ? "resource" : "partner",
      content,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const, meeting_id: meeting.id as string };
  });
