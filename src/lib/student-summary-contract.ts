import { z } from "zod";
export const STUDENT_SUMMARY_MESSAGE = "We couldn't confirm this summary. Refresh to check your sign-in, access and the latest reviewed information.";
export const STUDENT_SUMMARY_SECTIONS = [
  {key:"strengths",label:"What You're Good At"}, {key:"interests",label:"Your Interests"},
  {key:"needs",label:"Areas Where You May Want Help"}, {key:"supports",label:"Supports and Accommodations"},
  {key:"current_goals",label:"Your Transition Goals"}, {key:"transportation",label:"Getting Around"},
  {key:"communication",label:"How You Communicate"}, {key:"student_voice",label:"In Your Own Words"},
] as const;
const sectionKeys=["strengths","interests","needs","supports","current_goals","transportation","communication","student_voice"] as const;
const revision=z.string().datetime({offset:true});
export const studentSummaryListRequest=z.object({student_id:z.string().uuid(),expected_viewer_id:z.string().uuid()}).strict();
export const studentSummaryReadRequest=studentSummaryListRequest.extend({document_id:z.string().uuid(),expected_document_updated_at:revision,expected_extraction_updated_at:revision.nullable()}).strict();
export function parseStudentSummaryRequest(input:unknown,kind:"list"|"read"){
  try{return(kind==="list"?studentSummaryListRequest:studentSummaryReadRequest).parse(input);}catch{throw new Error(STUDENT_SUMMARY_MESSAGE);}
}
export const reviewedSummaryRow=z.object({document_id:z.string().uuid(),student_id:z.string().uuid(),document_title:z.string().max(300),doc_type:z.enum(["iep","current-iep","previous-iep","transition-plan"]),created_at:revision,document_updated_at:revision,extraction_updated_at:revision.nullable(),summary_ready:z.boolean(),sections:z.array(z.object({key:z.enum(sectionKeys),value:z.string().trim().min(1).max(16000)}).strict()).max(8)}).strict();
export type StudentFriendlySection={key:(typeof sectionKeys)[number];label:string;value:string;accepted:true};
export type StudentFriendlySummary={document_id:string;document_title:string|null;doc_type:string;status:"ready"|"pending";ready:boolean;sections:StudentFriendlySection[]};
export type StudentSummaryDocument={id:string;title:string;doc_type:string;created_at:string;document_updated_at:string;extraction_updated_at:string|null;summary_ready:boolean};
