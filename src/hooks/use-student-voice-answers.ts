import {useCallback,useEffect,useRef,useState} from "react";
import {useServerFn} from "@tanstack/react-start";
import {useAuth} from "@/hooks/use-auth";
import {getStudentVoiceResponses,type StudentVoiceResponse} from "@/lib/student-voice.functions";
import {VOICE_LOAD_UNAVAILABLE} from "@/lib/student-voice-contract";
type State={key:string;epoch:number;revision:number;responses:StudentVoiceResponse[];canEdit:boolean;loading:boolean;error:string|null};
/** All readers share the same viewer/student fence, including A→B→A journeys. */
export function useStudentVoiceAnswers(studentId:string|undefined,enabled=true){
 const {user,loading:authLoading}=useAuth(),load=useServerFn(getStudentVoiceResponses),viewerId=user?.id;
 const key=enabled&&!authLoading&&viewerId&&studentId?`${viewerId}:${studentId}`:'';
 const lifetime=useRef({key,epoch:0,request:0});if(lifetime.current.key!==key)lifetime.current={key,epoch:lifetime.current.epoch+1,request:lifetime.current.request};
 const epoch=lifetime.current.epoch,[retry,setRetry]=useState(0),[state,setState]=useState<State|null>(null);
 const refresh=useCallback(()=>setRetry(value=>value+1),[]);
 useEffect(()=>{if(!key||!studentId||!viewerId)return;let cancelled=false;const request=++lifetime.current.request;
  setState({key,epoch,revision:request,responses:[],canEdit:false,loading:true,error:null});
  void load({data:{studentId,expected_viewer_id:viewerId}}).then(result=>{
   if(cancelled||lifetime.current.key!==key||lifetime.current.epoch!==epoch)return;
   if(!Array.isArray(result.responses)||typeof result.canEdit!=='boolean'||result.responses.some(row=>row.student_id!==studentId))throw Error();
   setState({key,epoch,revision:request,responses:result.responses,canEdit:result.canEdit,loading:false,error:null});
  }).catch(()=>{if(!cancelled&&lifetime.current.key===key&&lifetime.current.epoch===epoch)setState({key,epoch,revision:request,responses:[],canEdit:false,loading:false,error:VOICE_LOAD_UNAVAILABLE});});
  return()=>{cancelled=true;};
 },[key,epoch,studentId,viewerId,load,retry]);
 const current=key&&state?.key===key&&state.epoch===epoch?state:null;
 return {responses:current?.responses??[],canEdit:current?.canEdit??false,loading:enabled&&!!studentId&&(!!authLoading||!!key&&(!current||current.loading)),error:current?.error??null,revision:current?.revision??0,refresh};
}
