import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {useServerFn} from "@tanstack/react-start";
import {useAuth} from "@/hooks/use-auth";
import {getStudentVoiceResponses,type StudentVoiceResponse} from "@/lib/student-voice.functions";
import {VOICE_LOAD_UNAVAILABLE} from "@/lib/student-voice-contract";
type State={scope:{key:string};revision:number;responses:StudentVoiceResponse[];canEdit:boolean;loading:boolean;error:string|null};
/** All readers share the same viewer/student fence, including A→B→A journeys. */
export function useStudentVoiceAnswers(studentId:string|undefined,enabled=true){
 const {user,loading:authLoading}=useAuth(),load=useServerFn(getStudentVoiceResponses),viewerId=user?.id;
 const key=enabled&&!authLoading&&viewerId&&studentId?`${viewerId}:${studentId}`:'';
 const scope=useMemo(()=>({key}),[key]),sequence=useRef(0);
 const [retry,setRetry]=useState(0),[state,setState]=useState<State|null>(null);
 const refresh=useCallback(()=>setRetry(value=>value+1),[]);
 useEffect(()=>{if(!key||!studentId||!viewerId)return;let cancelled=false;const request=++sequence.current;
  setState({scope,revision:request,responses:[],canEdit:false,loading:true,error:null});
  void load({data:{studentId,expected_viewer_id:viewerId}}).then(result=>{
   if(cancelled)return;
   if(!Array.isArray(result.responses)||typeof result.canEdit!=='boolean'||result.responses.some(row=>row.student_id!==studentId))throw Error();
   setState({scope,revision:request,responses:result.responses,canEdit:result.canEdit,loading:false,error:null});
  }).catch(()=>{if(!cancelled)setState({scope,revision:request,responses:[],canEdit:false,loading:false,error:VOICE_LOAD_UNAVAILABLE});});
  return()=>{cancelled=true;};
 },[scope,key,studentId,viewerId,load,retry]);
 const current=key&&state?.scope===scope?state:null;
 return {responses:current?.responses??[],canEdit:current?.canEdit??false,loading:enabled&&!!studentId&&(!!authLoading||!!key&&(!current||current.loading)),error:current?.error??null,revision:current?.revision??0,refresh};
}
