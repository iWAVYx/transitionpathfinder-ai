import {
  readCaseloadReadiness,
  readCaseloadNotes,
  readCaseloadActions,
} from "./caseload-records.server";
import { optionalViewerIntent } from "./viewer-intent";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ---------- READINESS GAPS ---------- */

export type CaseloadReadinessRow = {
  student_id: string;
  student_name: string;
  employment: number | null;
  education: number | null;
  independent_living: number | null;
  self_advocacy: number | null;
  overall: number | null;
  gap_pillar: string | null;
};

export const listCaseloadReadiness = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) =>
    readCaseloadReadiness(context.supabase, context.userId, data),
  );

/* ---------- CASELOAD NOTES ---------- */

export type CaseloadNoteRow = {
  id: string;
  student_id: string;
  student_name: string;
  content: string;
  note_type: string;
  visibility: string;
  created_at: string;
};

export const listCaseloadNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) => readCaseloadNotes(context.supabase, context.userId, data));

/* ---------- CASELOAD ACTION ITEMS ---------- */

export type CaseloadActionRow = {
  can_update: boolean;
  id: string;
  student_id: string;
  student_name: string;
  title: string;
  description: string | null;
  status: string;
  category: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export const listCaseloadActionItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(optionalViewerIntent)
  .handler(async ({ data, context }) =>
    readCaseloadActions(context.supabase, context.userId, data),
  );
