import{deletePlanningRecordAtomically}from"./planning-record-delete.server";
import{updateActionAtomically}from"./atomic-action-update.server";
import {readPlanningRecords,createPlanningRecord} from "./planning-records.server";
import {viewerIntentSchema} from "./viewer-intent";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type StudentActionItem = {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to_user_id: string | null;
  created_by_user_id: string;
  related_goal_area: string | null;
  pathway_report_id: string | null;
  created_at: string;
  updated_at: string;
};

const CATEGORIES = ["family", "educator", "student", "school", "team"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;
const STATUSES = ["not_started", "in_progress", "completed", "blocked"] as const;

export const listStudentActionItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ student_id: z.string().uuid(),...viewerIntentSchema.shape }).parse(i))
  .handler(async ({ data, context }) => {
    const result=await readPlanningRecords(context.supabase,context.userId,'action_items',data);return{items:result.records as unknown as StudentActionItem[],canEdit:result.canEdit};
  });

export const createStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        request_id: z.string().uuid().optional(),
        ...viewerIntentSchema.shape,
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        category: z.enum(CATEGORIES).default("family"),
        priority: z.enum(PRIORITIES).default("medium"),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        related_goal_area: z.string().trim().max(80).optional(),
        pathway_report_id: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const item=await createPlanningRecord(context.supabase,context.userId,'action_items',{...data,description:data.description??null,due_date:data.due_date??null,related_goal_area:data.related_goal_area??null,pathway_report_id:data.pathway_report_id??null,status:'not_started'});
    return{item:item as unknown as StudentActionItem};
  });

export const updateStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        student_id: z.string().uuid(),
        expected_updated_at: z.string().datetime({offset:true}),
        ...viewerIntentSchema.shape,
        status: z.enum(STATUSES).optional(),
        priority: z.enum(PRIORITIES).optional(),
        due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        title: z.string().trim().min(1).max(200).optional(),
        description: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: {
      status?: string;
      priority?: string;
      due_date?: string | null;
      title?: string;
      description?: string | null;
    } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.priority !== undefined) patch.priority = data.priority;
    if (data.due_date !== undefined) patch.due_date = data.due_date;
    if (data.title !== undefined) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    const item=await updateActionAtomically(supabase,userId,data,patch);
    return{ok:true as const,item};
  });

export const deleteStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid(),student_id:z.string().uuid(),expected_updated_at:z.string().datetime({offset:true}),...viewerIntentSchema.shape }).parse(i))
  .handler(async ({ data, context }) => {
    return deletePlanningRecordAtomically(context.supabase,context.userId,'action_items',data);
  });
