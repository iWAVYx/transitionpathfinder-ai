import { beforeEach, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const builder = { middleware: () => builder, validator: (fn: typeof validate) => { validate = fn; return builder; },
    handler: (fn: (input: unknown) => unknown) => async (input: { data: unknown; context: unknown }) => fn({ ...input, data: validate(input.data) }) };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { RIGHTS_STATUS_VALUES, getRightsStatus, setRightsStatus } from "../../src/lib/rights.functions";
import { readCurrentRightsStatus, saveCurrentRightsStatus } from "../../src/lib/rights-status.server";
import { RIGHTS_READ_UNAVAILABLE, RIGHTS_SAVE_UNCONFIRMED } from "../../src/lib/rights-status-contract";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const actor=id(1), student=id(2), revision=id(3), request=id(4), next=id(5), history=id(6), stamp="2026-11-16T12:00:00Z";
const input = () => ({ student_id:student,expected_viewer_id:actor,expected_revision:revision,request_id:request,current_status:"rights_transferred_to_student" });
const row = (changes: any={}) => ({ id:history,student_id:student,current_status:"rights_transferred_to_student",transfer_notice_date:null,student_authorized_parent_access:false,decision_making_notes:null,legal_representative_notes:null,reviewed_by_user_id:actor,created_at:stamp,updated_at:stamp,...changes });
const saved = (changes: any={}) => ({ schema:"rights-status-save-v1",request_id:request,actor_id:actor,student_id:student,expected_revision:revision,revision:next,row:row(),replayed:false,...changes });
const loaded = (changes: any={}) => ({schema:"rights-status-read-v1",actor_id:actor,student:{id:student,rights_status:"unknown_needs_review",rights_status_revision:revision,transfer_notice_acknowledged_at:null,date_of_birth:null,age:17},history:[],latest:null,can_edit:true,needs_review:false,...changes});
let rpc: ReturnType<typeof vi.fn>, from:ReturnType<typeof vi.fn>;
const client = () => ({ rpc, from });
beforeEach(() => {rpc=vi.fn().mockResolvedValue({ data:saved(),error:null });from=vi.fn(()=>{throw Error("Unexpected non-atomic table access");});});
for(const status of RIGHTS_STATUS_VALUES)it("recording "+status+" uses one atomic call and never a sharing/consent writer",async()=>{
 rpc.mockResolvedValue({data:saved({row:row({current_status:status})}),error:null});
 const result=await(setRightsStatus as any)({data:{...input(),current_status:status},context:{userId:actor,supabase:client()}});
 expect(result.row.current_status).toBe(status);expect(rpc).toHaveBeenCalledOnce();expect(rpc).toHaveBeenCalledWith("save_student_rights_review",{_request_id:request,_expected_viewer_id:actor,_student_id:student,_expected_revision:revision,_changes:{current_status:status,transfer_notice_date:null,student_authorized_parent_access:false,decision_making_notes:null,legal_representative_notes:null}});expect(from).not.toHaveBeenCalled();
});
it("continued-parent authorization remains a planning field without granting consent/sharing",async()=>{rpc.mockResolvedValue({data:saved({row:row({current_status:"parent_guardian_authorized_by_student",student_authorized_parent_access:true})}),error:null});await saveCurrentRightsStatus(client(),actor,{...input(),current_status:"parent_guardian_authorized_by_student",student_authorized_parent_access:true});expect(rpc.mock.calls[0][1]._changes.student_authorized_parent_access).toBe(true);expect(from).not.toHaveBeenCalled();});
it.each(["history","mirror","audit"])("a reported atomic %s failure is private, unconfirmed and never retried",async stage=>{rpc.mockResolvedValue({data:saved(),error:{message:"PRIVATE "+stage}});await expect(saveCurrentRightsStatus(client(),actor,input())).rejects.toThrow(RIGHTS_SAVE_UNCONFIRMED);expect(rpc).toHaveBeenCalledOnce();expect(from).not.toHaveBeenCalled();});
it("rejected/lost replies have no fallback or retry",async()=>{rpc.mockRejectedValue(Error("PRIVATE transport detail"));await expect(saveCurrentRightsStatus(client(),actor,input())).rejects.toThrow(RIGHTS_SAVE_UNCONFIRMED);expect(rpc).toHaveBeenCalledOnce();expect(from).not.toHaveBeenCalled();});
it.each([{}, {expected_viewer_id:id(9)}, {expected_revision:null}, {request_id:null}, {current_status:"coded_invalid"}, {decision_making_notes:"x".repeat(2001)}, {transfer_notice_date:"2026-02-30"}, {student_authorized_parent_access:"true"}, {unreviewed_field:true}])("invalid or mismatched save intent stops before IO: %j",async patch=>{const value=Object.keys(patch).length?{...input(),...patch}:{};await expect(saveCurrentRightsStatus(client(),actor,value)).rejects.toThrow(RIGHTS_SAVE_UNCONFIRMED);expect(rpc).not.toHaveBeenCalled();});
it.each([
 {actor_id:id(9)},{student_id:id(9)},{request_id:id(9)},{expected_revision:id(9)},{revision}, {schema:"other"}, {replayed:"yes"},{extra_private_field:"PRIVATE"},
 {row:row({student_id:id(9)})},{row:row({reviewed_by_user_id:id(9)})},{row:row({current_status:"unknown_needs_review"})},{row:row({decision_making_notes:"Unexpected"})},{row:row({transfer_notice_date:"2026-11-15"})},{row:row({student_authorized_parent_access:true})},
])("mismatched/malformed save receipt cannot report success: %j",async patch=>{rpc.mockResolvedValue({data:saved(patch),error:null});await expect(saveCurrentRightsStatus(client(),actor,input())).rejects.toThrow(RIGHTS_SAVE_UNCONFIRMED);expect(rpc).toHaveBeenCalledOnce();});
it("a confirmed exact replay is accepted without a second RPC",async()=>{rpc.mockResolvedValue({data:saved({replayed:true}),error:null});expect((await saveCurrentRightsStatus(client(),actor,input())).replayed).toBe(true);expect(rpc).toHaveBeenCalledOnce();});
it("reader uses one caller RPC with the loaded viewer/student",async()=>{rpc.mockResolvedValue({data:loaded(),error:null});await(getRightsStatus as any)({data:{student_id:student,expected_viewer_id:actor},context:{userId:actor,supabase:client()}});expect(rpc).toHaveBeenCalledExactlyOnceWith("read_student_rights_review",{_student_id:student,_expected_viewer_id:actor});expect(from).not.toHaveBeenCalled();});
it.each([{actor_id:id(9)},{student:{...loaded().student,id:id(9)}},{history:[row({student_id:id(9)})]}, {history:[row(),row()]},{latest:row()},{student:{...loaded().student,rights_status:"rights_transferred_to_student"}},{can_edit:"true"},{needs_review:"false"},{extra:"PRIVATE"}])("reader refuses an unbound/incoherent response: %j",async patch=>{rpc.mockResolvedValue({data:loaded(patch),error:null});await expect(readCurrentRightsStatus(client(),actor,{student_id:student,expected_viewer_id:actor})).rejects.toThrow(RIGHTS_READ_UNAVAILABLE);});
it("reader accepts explicitly identified legacy mismatch without inventing a matching latest review",async()=>{rpc.mockResolvedValue({data:loaded({history:[row()],needs_review:true,latest:null}),error:null});const result=await readCurrentRightsStatus(client(),actor,{student_id:student,expected_viewer_id:actor});expect(result.needs_review).toBe(true);expect(result.latest).toBeNull();});
it("reader blocks viewer mismatch before RPC",async()=>{await expect(readCurrentRightsStatus(client(),actor,{student_id:student,expected_viewer_id:id(9)})).rejects.toThrow(RIGHTS_READ_UNAVAILABLE);expect(rpc).not.toHaveBeenCalled();});
