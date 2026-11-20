import {readPlanningRecords,createPlanningRecord,mutatePlanningRecord,PLANNING_WRITE_UNCONFIRMED} from "./planning-records.server";
import {viewerIntentSchema} from "./viewer-intent";
import {isActionItemComplete,normalizeActionRecord} from "./action-item-values";
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
        student_id: z.string().uuid().optional(),
        expected_updated_at: z.string().datetime({offset:true}).optional(),
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
    const result=await mutatePlanningRecord(supabase,userId,'action_items',data,patch);
    // Side effects run only after the exact mutation receipt and an actual transition.
    // They are still separate requests; an uncertain result is not a completed transaction.
    if(result.changed&&isActionItemComplete(data.status)&&!isActionItemComplete(result.before.status as string)){
      try{
        const event=await supabase.from('feed_events').insert({student_id:result.row.student_id,actor_id:userId,kind:'action_item.completed',title:`Action completed: ${result.row.title}`,body:null,ref_table:'action_items',ref_id:result.row.id}).select('id,student_id,ref_id').single();
        if(event.error||!event.data?.id||event.data.student_id!==result.row.student_id||event.data.ref_id!==result.row.id)throw Error();
        if(result.row.pathway_report_id){const report=await supabase.from('pathway_reports').update({inputs_stale_at:new Date().toISOString()}).eq('id',String(result.row.pathway_report_id)).eq('student_id',result.row.student_id).select('id,student_id').single();if(report.error||report.data?.id!==result.row.pathway_report_id||report.data?.student_id!==result.row.student_id)throw Error();}
      }catch{throw Error(PLANNING_WRITE_UNCONFIRMED);}
    }
    return{ok:true as const,item:normalizeActionRecord(result.row as unknown as StudentActionItem)};
  });

export const deleteStudentActionItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid(),student_id:z.string().uuid().optional(),expected_updated_at:z.string().datetime({offset:true}).optional(),...viewerIntentSchema.shape }).parse(i))
  .handler(async ({ data, context }) => {
    await mutatePlanningRecord(context.supabase,context.userId,'action_items',data,null);return{ok:true as const};
  });
