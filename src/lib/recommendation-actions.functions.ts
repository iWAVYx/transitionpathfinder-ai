import {createPlanningRecordAtomically} from "./planning-record-write.server";
import {assertExpectedViewer,viewerIntentSchema} from "./viewer-intent";
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
  ...viewerIntentSchema.shape,
  request_id: z.string().uuid().optional(),
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
    assertExpectedViewer(data,context.userId);
    const { supabase, userId } = context;
    const description = [
      data.source_kind === "resource" ? "From recommended resource." : "From recommended partner.",
      data.next_step ? `Suggested next step: ${data.next_step}` : null,
      data.context_note ?? null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const item = await createPlanningRecordAtomically(supabase,userId,"action_items",{
      student_id:data.student_id,expected_viewer_id:data.expected_viewer_id,request_id:data.request_id,
      title:data.source_kind === "resource" ? `Review: ${data.title}` : `Follow up with: ${data.title}`,
      description,category:"family",priority:"medium",related_goal_area:data.related_goal_area??null,status:"not_started",
    });
    return {ok:true as const,item};
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
    assertExpectedViewer(data,context.userId);
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
    const expected = {
      id:data.request_id??crypto.randomUUID(),
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
    };
    const {data:saved,error}=await supabase.from("calendar_events").insert(expected as never).select("*").single();
    if(error||!saved||Object.entries(expected).some(([key,value])=>JSON.stringify((saved as Record<string,unknown>)[key])!==JSON.stringify(value)))throw Error("We couldn't confirm this reminder was saved. Check your calendar before trying again.");
    return {ok:true as const,event_date:eventDate,event_id:expected.id};
  });

export const addRecommendationToNextMeetingPrep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => inputBase.parse(i))
  .handler(async ({ data, context }) => {
    assertExpectedViewer(data,context.userId);
    const { supabase } = context;

    // Find the next upcoming meeting for this student
    const nowIso = new Date().toISOString();
    const { data: meetings, error: mErr } = await supabase
      .from("meetings")
      .select("id, student_id, scheduled_at, status")
      .eq("student_id", data.student_id)
      .gte("scheduled_at", nowIso)
      .eq("status", "upcoming")
      .order("scheduled_at", { ascending: true })
      .limit(1);
    if (mErr || !Array.isArray(meetings) || meetings.length>1) throw new Error("We couldn't check your upcoming meetings. Refresh before trying again.");

    const meeting = meetings?.[0];
    if (!meeting) {
      return {
        ok: false as const,
        reason: "no_upcoming_meeting" as const,
        message:
          "No upcoming meeting found. Schedule a PPT/IEP/transition meeting to queue this for discussion.",
      };
    }

    if(!z.string().uuid().safeParse(meeting.id).success||meeting.student_id!==data.student_id||meeting.status!=="upcoming"||typeof meeting.scheduled_at!=="string"||!Number.isFinite(Date.parse(meeting.scheduled_at))||Date.parse(meeting.scheduled_at)<Date.parse(nowIso))throw Error("We couldn't confirm the upcoming meeting. Refresh before trying again.");

    const content = [
      data.source_kind === "resource"
        ? `Discuss this recommended resource: ${data.title}`
        : `Discuss this potential partner: ${data.title}`,
      data.next_step ? `Suggested next step: ${data.next_step}` : null,
      data.context_note ?? null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const expected = {
      id:data.request_id??crypto.randomUUID(),
      meeting_id: meeting.id as string,
      student_id: data.student_id,
      category: "follow_up",
      content,
    };
    const {data:saved,error}=await supabase.from("meeting_prep_items").insert(expected).select("*").single();
    if(error||!saved||Object.entries(expected).some(([key,value])=>(saved as Record<string,unknown>)[key]!==value))throw Error("We couldn't confirm this discussion item was saved. Check your meeting preparation before trying again.");
    return {ok:true as const,meeting_id:meeting.id as string,prep_item_id:expected.id};
  });
