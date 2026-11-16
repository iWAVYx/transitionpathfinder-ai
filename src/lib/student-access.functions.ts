import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseStudentSummaryRequest, STUDENT_SUMMARY_MESSAGE } from "./student-summary-contract";
import { readStudentSummary } from "./student-summary.server";
export type { StudentFriendlySection, StudentFriendlySummary, StudentSummaryDocument } from "./student-summary-contract";

export const getStudentFriendlyDocumentSummary=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .validator((input:unknown)=>parseStudentSummaryRequest(input,"read"))
 .handler(async({data,context})=>{
  const result=await readStudentSummary(context.supabase,context.userId,data,"read");
  if(result.summary===undefined)throw new Error(STUDENT_SUMMARY_MESSAGE);
  return{summary:result.summary};
 });
export const listStudentFriendlyDocuments=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .validator((input:unknown)=>parseStudentSummaryRequest(input,"list"))
 .handler(async({data,context})=>{
  const result=await readStudentSummary(context.supabase,context.userId,data,"list");
  if(result.documents===undefined)throw new Error(STUDENT_SUMMARY_MESSAGE);
  return{documents:result.documents};
 });
