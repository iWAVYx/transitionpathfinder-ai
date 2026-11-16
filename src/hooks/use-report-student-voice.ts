import {useStudentVoiceAnswers} from "./use-student-voice-answers";
export function useReportStudentVoiceState(studentId:string|undefined,demo:boolean){const result=useStudentVoiceAnswers(studentId,!demo);return{...result,responses:result.responses.filter(row=>row.response_text.trim())};}
/** Compatibility wrapper; report UI uses the status-aware reader above. */
export function useReportStudentVoice(studentId:string|undefined,demo:boolean){return useReportStudentVoiceState(studentId,demo).responses;}
