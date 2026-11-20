import {createServerFn} from "@tanstack/react-start";
import {requireSupabaseAuth} from "@/integrations/supabase/auth-middleware";
import {parseVoiceRead,parseVoiceSave} from "./student-voice-contract";
import {readStudentVoice,saveStudentVoice} from "./student-voice.server";
export type {StudentVoiceResponse} from "./student-voice-contract";
export const getStudentVoiceResponses=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(parseVoiceRead).handler(({data,context})=>readStudentVoice(context.supabase,context.userId,data));
export const upsertStudentVoiceResponse=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(parseVoiceSave).handler(({data,context})=>saveStudentVoice(context.supabase,context.userId,data));
