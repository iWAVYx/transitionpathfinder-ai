import {
  readCaseloadOverview,
  readStudentPlanningNotes,
  studentCapability,
} from "./caseload-records.server";
import { optionalViewerIntent, viewerIntentSchema, assertExpectedViewer } from "./viewer-intent";
import { createPlanningRecordAtomically } from "./planning-record-write.server";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CaseloadStudent = {
  id: string;
  first_name: string;
  last_name: string | null;
  grade_band: string | null;
  school: string | null;
  photo_url: string | null;
  relationship: "owner" | "editor" | "viewer";
  open_action_items: number;
  goal_count: number;
  last_note_at: string | null;
  latest_report_id: string | null;
  next_meeting_at: string | null;
  next_meeting_id: string | null;
  next_meeting_title: string | null;
};

export const getCaseload = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) =>
    readCaseloadOverview(context.supabase, context.userId, data),
  );

export const addCaseManagerNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        ...viewerIntentSchema.shape,
        request_id: z.string().uuid().optional(),
        content: z.string().trim().min(1).max(4000),
        visibility: z.enum(["team", "family", "private"]).default("team"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    assertExpectedViewer(data, userId);
    if (!(await studentCapability(supabase, userId, data.student_id)))
      throw Error("Editing access is required to add a note.");
    const requestId = data.request_id ?? crypto.randomUUID();
    const note_type = data.visibility === "private" ? "private_note" : "teacher_note";
    const { data: row, error } = await supabase
      .from("collaboration_notes")
      .insert({
        id: requestId,
        student_id: data.student_id,
        created_by_user_id: userId,
        note_type,
        visibility: data.visibility,
        content: data.content,
      })
      .select("*")
      .single();
    if (
      error ||
      !row ||
      row.id !== requestId ||
      row.student_id !== data.student_id ||
      row.created_by_user_id !== userId ||
      row.content !== data.content ||
      row.visibility !== data.visibility ||
      row.note_type !== note_type
    ) {
      console.error("addCaseManagerNote failed", error);
      throw new Error("Could not save note.");
    }
    return row;
  });

export const listStudentNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid(), ...viewerIntentSchema.shape }).parse(i),
  )
  .handler(async ({ data, context }) =>
    readStudentPlanningNotes(context.supabase, context.userId, data),
  );

export const quickAssignActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        ...viewerIntentSchema.shape,
        request_id: z.string().uuid().optional(),
        title: z.string().trim().min(1).max(200),
        category: z
          .enum(["family", "student", "teacher", "educator", "school", "team"])
          .default("educator"),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        due_date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) =>
    createPlanningRecordAtomically(context.supabase, context.userId, "action_items", {
      ...data,
      category: data.category === "teacher" ? "educator" : data.category,
      status: "not_started",
      due_date: data.due_date ?? null,
    }),
  );
