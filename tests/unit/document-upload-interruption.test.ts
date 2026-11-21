import { expect, it } from "vitest";
import { readUploadInterruption, rememberUploadInterruption, forgetCompletedUploadInterruption, confirmedInterruptedUploadOutcome } from "../../src/lib/document-upload-interruption";
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
function store() { const values=new Map<string,string>();return {values,getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}}; }
it("retains only an attempt UUID, scoped to viewer/student, across remount reads",()=>{
 const s=store();expect(readUploadInterruption(id(1),id(2),s)).toEqual({state:"clear"});
 expect(rememberUploadInterruption(id(1),id(2),id(3),s)).toBe(true);expect([...s.values.values()]).toEqual([id(3)]);
 expect(readUploadInterruption(id(1),id(2),s)).toEqual({state:"pending",attemptId:id(3)});
 expect(readUploadInterruption(id(4),id(2),s)).toEqual({state:"clear"});expect(readUploadInterruption(id(1),id(4),s)).toEqual({state:"clear"});
});
it("cannot overwrite an unresolved attempt or clear another attempt",()=>{
 const s=store();rememberUploadInterruption(id(1),id(2),id(3),s);
 expect(rememberUploadInterruption(id(1),id(2),id(4),s)).toBe(false);expect(forgetCompletedUploadInterruption(id(1),id(2),id(4),s)).toBe(false);
 expect(readUploadInterruption(id(1),id(2),s)).toEqual({state:"pending",attemptId:id(3)});
 expect(forgetCompletedUploadInterruption(id(1),id(2),id(3),s)).toBe(true);expect(readUploadInterruption(id(1),id(2),s)).toEqual({state:"clear"});
});
it.each(["read","write","silent-write","delete","silent-delete"])("fails closed on unavailable %s storage",mode=>{
 const s=store();const k=`tf.document-upload-interruption.v1:${id(1)}:${id(2)}`;
 if(mode==="read")s.getItem=()=>{throw Error("PRIVATE");};
 if(mode==="write")s.setItem=()=>{throw Error("PRIVATE");};
 if(mode==="silent-write")s.setItem=()=>{};
 if(mode.startsWith("delete")||mode==="silent-delete"){s.values.set(k,id(3));s.removeItem=()=>{if(mode==="delete")throw Error("PRIVATE");};expect(forgetCompletedUploadInterruption(id(1),id(2),id(3),s)).toBe(false);}
 else expect(rememberUploadInterruption(id(1),id(2),id(3),s)).toBe(false);
 if(mode==="read")expect(readUploadInterruption(id(1),id(2),s)).toEqual({state:"unavailable"});
});
it("keeps corrupt reminders blocked instead of deleting or expiring them",()=>{
 const s=store();s.values.set(`tf.document-upload-interruption.v1:${id(1)}:${id(2)}`,"corrupt");
 expect(readUploadInterruption(id(1),id(2),s)).toEqual({state:"unavailable"});expect(rememberUploadInterruption(id(1),id(2),id(3),s)).toBe(false);expect(s.values.size).toBe(1);
});
const receipt={schema:"document-upload-registration-v1",actor_id:id(1),student_id:id(2),attempt_id:id(3),document_id:id(4),id:id(4),storage_path:`${id(2)}/${id(3)}-privacy-safe-document.txt`,scan_status:"clean",review_status:"pending_review",archived_at:null,deleted_at:null};
it("accepts only a terminal result for the exact interrupted attempt",()=>{
 expect(confirmedInterruptedUploadOutcome(receipt,id(1),id(2),id(3))).toBe("saved");
 expect(confirmedInterruptedUploadOutcome({...receipt,scan_status:"infected",review_status:"rejected",archived_at:"2026-10-30"},id(1),id(2),id(3))).toBe("blocked");
});
it.each([null,{},...['actor_id','student_id','attempt_id','document_id','id','storage_path'].map(k=>({...receipt,[k]:id(8)})),{...receipt,scan_status:"pending"},{...receipt,scan_status:"unknown"}])("rejects foreign, incomplete or pending status %#",value=>{
 expect(confirmedInterruptedUploadOutcome(value,id(1),id(2),id(3))).toBe("uncertain");
});
