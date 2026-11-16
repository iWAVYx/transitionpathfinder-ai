import {useEffect,useRef,useState} from "react";
import {useServerFn} from "@tanstack/react-start";
import {toast} from "sonner";
import {useAuth} from "@/hooks/use-auth";
import {useStudentVoiceAnswers} from "@/hooks/use-student-voice-answers";
import {listStudents,type Student} from "@/lib/students.functions";
import {upsertStudentVoiceResponse,type StudentVoiceResponse} from "@/lib/student-voice.functions";
import {STUDENT_VOICE_PROMPTS,MIDDLE_SCHOOL_VOICE_PROMPTS} from "@/lib/student-voice-prompts";
import {VOICE_SAVE_UNCONFIRMED} from "@/lib/student-voice-contract";
import {Button} from "@/components/ui/button";
import {Textarea} from "@/components/ui/textarea";
type AgeBand="middle"|"early-high"|"late-high"|"post-secondary";
const bands:[AgeBand,string][]=[["middle","Middle School"],["early-high","Grades 9–10"],["late-high","Grades 11–12"],["post-secondary","After High School"]];
export function StudentVoiceWorkspace({middleSchool=false,initialStudentId}:{middleSchool?:boolean;initialStudentId?:string}){
 const {user,loading}=useAuth();if(loading)return <p className="mt-6 text-sm">Loading Student Voice…</p>;if(!user)return <p className="mt-6 text-sm">Sign in to view saved answers.</p>;
 return <WorkspaceSession key={user.id} viewerId={user.id} middleSchool={middleSchool} initialStudentId={initialStudentId}/>;
}
function WorkspaceSession({viewerId,middleSchool,initialStudentId}:{viewerId:string;middleSchool:boolean;initialStudentId?:string}){
 const load=useServerFn(listStudents),[students,setStudents]=useState<Student[]>([]),[studentId,setStudentId]=useState(''),[ageBand,setAgeBand]=useState<AgeBand>(middleSchool?'middle':'early-high');
 const [loading,setLoading]=useState(true),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let cancelled=false;setLoading(true);setError(false);void load({data:{expected_viewer_id:viewerId}}).then(result=>{if(cancelled)return;if(result.loadFailed||!Array.isArray(result.students))throw Error();setStudents(result.students);setStudentId(previous=>result.students.some(student=>student.id===previous)?previous:result.students.find(student=>student.id===initialStudentId)?.id??result.students[0]?.id??'');}).catch(()=>{if(!cancelled){setError(true);setStudents([]);setStudentId('');}}).finally(()=>{if(!cancelled)setLoading(false);});return()=>{cancelled=true;};},[load,viewerId,initialStudentId,retry]);
 if(loading)return <p className="mt-6 text-sm">Loading students…</p>;
 if(error)return <div role="alert" className="mt-6 text-sm">We couldn't load your students. <Button variant="outline" size="sm" onClick={()=>setRetry(value=>value+1)}>Refresh Students</Button></div>;
 if(!students.length)return <p className="mt-6 text-sm text-muted-foreground">Add a student to your plan first, then return here to capture their voice.</p>;
 return <>
  <div className="mt-6 grid gap-4 sm:grid-cols-2">
   <div><label htmlFor="voice-student" className="text-sm font-medium">Student</label><select id="voice-student" className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" value={studentId} onChange={event=>setStudentId(event.target.value)}>{students.map(student=><option key={student.id} value={student.id}>{student.first_name} {student.last_name??''}</option>)}</select></div>
   {!middleSchool&&<div><label htmlFor="voice-reading-level" className="text-sm font-medium">Reading Level</label><select id="voice-reading-level" className="mt-1 block w-full rounded-md border bg-background p-2 text-sm" value={ageBand} onChange={event=>setAgeBand(event.target.value as AgeBand)}>{bands.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>}
  </div>
  <StudentVoiceAnswersEditor key={`${viewerId}:${studentId}`} studentId={studentId} viewerId={viewerId} middleSchool={middleSchool} ageBand={ageBand}/>
 </>;
}
export function StudentVoiceAnswersEditor({studentId,viewerId,middleSchool=false,ageBand}:{studentId:string;viewerId:string;middleSchool?:boolean;ageBand:AgeBand}){
 const saved=useStudentVoiceAnswers(studentId),save=useServerFn(upsertStudentVoiceResponse);
 const [rows,setRows]=useState<StudentVoiceResponse[]>([]),[drafts,setDrafts]=useState<Record<string,string>>({}),[saving,setSaving]=useState<string|null>(null),[needsRefresh,setNeedsRefresh]=useState(false);
 const session=useRef({alive:true,saving:false});useEffect(()=>{const current=session.current;current.alive=true;return()=>{current.alive=false;};},[]);
 useEffect(()=>{if(saved.loading||saved.error||!saved.revision)return;setRows(saved.responses);setDrafts(Object.fromEntries(saved.responses.map(row=>[row.prompt_key,row.response_text])));setNeedsRefresh(false);},[saved.revision,saved.loading,saved.error]);
 const prompts=middleSchool?MIDDLE_SCHOOL_VOICE_PROMPTS:STUDENT_VOICE_PROMPTS.filter(prompt=>prompt.ageBands.includes(ageBand));
 async function persist(key:string){const current=session.current;if(current.saving||saved.loading||saved.error||!saved.canEdit||needsRefresh)return;current.saving=true;setSaving(key);const existing=rows.find(row=>row.prompt_key===key),submitted=drafts[key]??'';
  try{const result=await save({data:{studentId,expected_viewer_id:viewerId,promptKey:key,responseText:submitted,ageBand,expected:existing?{id:existing.id,updated_at:existing.updated_at}:null}});if(!current.alive)return;setRows(previous=>[...previous.filter(row=>row.prompt_key!==key),result.row]);setDrafts(previous=>previous[key]===submitted?{...previous,[key]:result.row.response_text}:previous);toast.success('Answer saved.');}
  catch{if(current.alive){setNeedsRefresh(true);toast.error(VOICE_SAVE_UNCONFIRMED);}}
  finally{if(current.alive){current.saving=false;setSaving(null);}}
 }
 if(saved.loading)return <p className="mt-6 text-sm">Loading saved answers…</p>;
 if(saved.error)return <div role="alert" className="mt-6 text-sm">{saved.error} <Button size="sm" variant="outline" onClick={saved.refresh}>Refresh Saved Answers</Button></div>;
 const disabled=!!saving||needsRefresh||!saved.canEdit;
 return <div className="mt-6 space-y-4">
  {!saved.canEdit&&<p className="text-sm text-muted-foreground">You can view these answers. Editing requires student-team permission.</p>}
  {needsRefresh&&<div role="status" className="text-sm">{VOICE_SAVE_UNCONFIRMED} <Button size="sm" variant="outline" disabled={!!saving} onClick={saved.refresh}>Refresh Saved Answers</Button></div>}
  {prompts.map(prompt=>{const row=rows.find(value=>value.prompt_key===prompt.key),value=drafts[prompt.key]??'',unchanged=value.trim()===(row?.response_text??'');return <section key={prompt.key} className="rounded-2xl border bg-card p-5 shadow-soft">
   <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-medium">{prompt.question}</h2>{'helper'in prompt&&<p className="mt-1 text-xs text-muted-foreground">{prompt.helper}</p>}</div>{row&&unchanged&&!needsRefresh&&<span className="text-xs text-primary">Saved</span>}</div>
   <Textarea aria-label={prompt.question} className="mt-3 min-h-[88px]" value={value} maxLength={4000} readOnly={!saved.canEdit} disabled={needsRefresh} placeholder="Type here — or leave blank if it doesn't fit." onChange={event=>setDrafts(previous=>({...previous,[prompt.key]:event.target.value}))}/>
   {saved.canEdit&&<div className="mt-3 flex justify-end"><Button size="sm" disabled={disabled||unchanged} onClick={()=>void persist(prompt.key)}>{saving===prompt.key?'Saving…':'Save'}</Button></div>}
  </section>;})}
 </div>;
}
