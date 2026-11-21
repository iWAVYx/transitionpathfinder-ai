import {z} from "zod";
import {STUDENT_VOICE_PROMPTS,MIDDLE_SCHOOL_VOICE_PROMPTS} from "./student-voice-prompts";
export const VOICE_LOAD_UNAVAILABLE="We couldn't load the saved answers. Refresh to check your access and current information.";
export const VOICE_SAVE_UNCONFIRMED="We couldn't confirm this answer. Refresh saved answers before trying again.";
const revision=z.string().datetime({offset:true}).refine(value=>(value.match(/T\d{2}:\d{2}:\d{2}\.(\d+)/)?.[1].length??0)<=6);
export const voiceScope=z.object({studentId:z.string().uuid(),expected_viewer_id:z.string().uuid()}).strict();
export const voiceRow=z.object({id:z.string().uuid(),student_id:z.string().uuid(),prompt_key:z.string(),response_text:z.string(),age_band:z.string().nullable(),updated_at:revision}).strict();
export type StudentVoiceResponse=z.infer<typeof voiceRow>;
export const voiceSave=voiceScope.extend({promptKey:z.string(),responseText:z.string().trim().max(4000),ageBand:z.enum(["middle","early-high","late-high","post-secondary"]),expected:z.object({id:z.string().uuid(),updated_at:revision}).strict().nullable()}).strict().superRefine((data,ctx)=>{const allowed=STUDENT_VOICE_PROMPTS.some(prompt=>prompt.key===data.promptKey&&prompt.ageBands.includes(data.ageBand))||(data.ageBand==='middle'&&MIDDLE_SCHOOL_VOICE_PROMPTS.some(prompt=>prompt.key===data.promptKey));if(!allowed)ctx.addIssue({code:'custom',message:VOICE_SAVE_UNCONFIRMED});});
export const voiceReadReceipt=z.object({schema:z.literal('student-voice-read-v1'),actor_id:z.string().uuid(),student_id:z.string().uuid(),can_edit:z.boolean(),total:z.number().int().nonnegative().safe(),responses:z.array(voiceRow)}).strict();
export const voiceSaveReceipt=z.object({schema:z.literal('student-voice-save-v1'),actor_id:z.string().uuid(),student_id:z.string().uuid(),row:voiceRow}).strict();
export function parseVoiceRead(input:unknown){try{return voiceScope.parse(input);}catch{throw Error(VOICE_LOAD_UNAVAILABLE);}}
export function parseVoiceSave(input:unknown){try{return voiceSave.parse(input);}catch{throw Error(VOICE_SAVE_UNCONFIRMED);}}
