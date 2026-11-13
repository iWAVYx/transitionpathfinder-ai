import { beforeEach, expect, it, vi } from "vitest";
const wrapper = vi.hoisted(() => ({ context: null as any, registrations: [] as any[] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: (options: any) => { const reg: any = { options }; wrapper.registrations.push(reg); const chain: any = { middleware: (value: any) => { reg.middleware = value; return chain; }, validator: (value: any) => { reg.validator = value; return chain; }, handler: (fn: any) => async (args: any) => fn({ context: wrapper.context, data: reg.validator(args.data) }) }; return chain; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: "verified-supabase-auth" }));
import { loadOwnerTextWork as loadFn, inspectOwnerTextWork as inspectFn } from "@/lib/owner/text-work-review.functions";
import { loadOwnerTextWork, inspectOwnerTextWork } from "@/lib/owner/text-work-review.server";
import { textWorkQueue, textWorkDetail, TEXT_WORK_READ_MESSAGE } from "@/lib/owner/text-work-review-contract";
const viewer="00000000-0000-4000-8000-000000000007",op="00000000-0000-4000-8000-000000096001";
const queue=()=>({schema:"owner-text-work-queue-v1",namespace:"attached_text",control_revision:5,paused:true,items:[{operation_id:op,state:"needs_review"}],has_more:false,next_cursor:null,external_quiescence_verified:false,release_permitted:false});
const detail=()=>({schema:"owner-text-work-detail-v1",namespace:"attached_text",operation_id:op,control_revision:5,state:"needs_review",hold_reason:"provider_uncertain",remaining_shared_units:1,recorded_completion:false,external_quiescence_verified:false,release_permitted:false});
const rpc=vi.fn(),ctx=()=>({userId:viewer,claims:{sub:viewer,role:"authenticated"},supabase:{rpc}});
beforeEach(()=>vi.resetAllMocks());
it("loads one caller-authenticated metadata page without privileged clients",async()=>{rpc.mockResolvedValue({data:queue(),error:null});expect(await loadOwnerTextWork(ctx(),{expected_viewer_id:viewer})).toEqual(queue());expect(rpc).toHaveBeenCalledExactlyOnceWith("list_owner_text_work",{_after_operation_id:null});});
it("inspects one exact text namespace operation",async()=>{rpc.mockResolvedValue({data:detail(),error:null});expect(await inspectOwnerTextWork(ctx(),{expected_viewer_id:viewer,operation_id:op})).toEqual(detail());expect(rpc).toHaveBeenCalledExactlyOnceWith("inspect_owner_text_work",{_operation_id:op});});
it.each([{userId:op},{claims:{sub:op,role:"authenticated"}},{claims:{sub:viewer,role:"service_role"}},{claims:{}},{claims:null}])("refuses unverified or changed viewer before metadata RPC: %j",async patch=>{await expect(loadOwnerTextWork({...ctx(),...patch},{expected_viewer_id:viewer})).rejects.toThrow(TEXT_WORK_READ_MESSAGE);expect(rpc).not.toHaveBeenCalled();});
it.each(["operator_id","student_id","receipt_id","release","retry","text"])("refuses caller-controlled %s",async key=>{await expect(loadOwnerTextWork(ctx(),{expected_viewer_id:viewer,[key]:op})).rejects.toThrow();expect(rpc).not.toHaveBeenCalled();});
it.each(["student_id","document_id","receipt_id","text","sections","storage_path"])("rejects private %s in metadata output",async key=>{rpc.mockResolvedValue({data:{...detail(),[key]:"PRIVATE"},error:null});await expect(inspectOwnerTextWork(ctx(),{expected_viewer_id:viewer,operation_id:op})).rejects.toThrow(TEXT_WORK_READ_MESSAGE);});
it.each([{namespace:"document"},{state:"completed"},{remaining_shared_units:0},{recorded_completion:true},{hold_reason:null},{external_quiescence_verified:true},{release_permitted:true}])("rejects contradictory or authority-bearing text status: %j",async patch=>{rpc.mockResolvedValue({data:{...detail(),...patch},error:null});await expect(inspectOwnerTextWork(ctx(),{expected_viewer_id:viewer,operation_id:op})).rejects.toThrow(TEXT_WORK_READ_MESSAGE);});
it("accepts actual completed save metadata without inferring provider cessation",()=>{expect(textWorkDetail.parse({...detail(),state:"completed",hold_reason:null,remaining_shared_units:0,recorded_completion:true}).external_quiescence_verified).toBe(false);});
it("rejects another operation's response",async()=>{rpc.mockResolvedValue({data:{...detail(),operation_id:viewer},error:null});await expect(inspectOwnerTextWork(ctx(),{expected_viewer_id:viewer,operation_id:op})).rejects.toThrow(TEXT_WORK_READ_MESSAGE);});
it("sanitizes unknown transport failures and never retries",async()=>{rpc.mockRejectedValue(Error("PRIVATE provider data"));await expect(loadOwnerTextWork(ctx(),{expected_viewer_id:viewer})).rejects.toThrow(TEXT_WORK_READ_MESSAGE);expect(rpc).toHaveBeenCalledTimes(1);});
it("validates page size, duplicate keys and cursor semantics",()=>{expect(textWorkQueue.safeParse({...queue(),items:[...queue().items,...queue().items]}).success).toBe(false);expect(textWorkQueue.safeParse({...queue(),has_more:true,next_cursor:op}).success).toBe(false);const items=Array.from({length:25},(_,n)=>({operation_id:`00000000-0000-4000-8000-${String(96001+n).padStart(12,'0')}`,state:"active"}));expect(textWorkQueue.parse({...queue(),items,has_more:true,next_cursor:items.at(-1)!.operation_id}).items).toHaveLength(25);expect(textWorkQueue.safeParse({...queue(),items:[...items,items[0]]}).success).toBe(false);});

it("registers both metadata routes as authenticated POST server functions", async () => {
  expect(wrapper.registrations).toHaveLength(2);
  for (const reg of wrapper.registrations) { expect(reg.options).toEqual({ method: "POST" }); expect(reg.middleware).toEqual(["verified-supabase-auth"]); }
  wrapper.context=ctx(); rpc.mockResolvedValueOnce({ data: queue(), error:null }).mockResolvedValueOnce({ data:detail(),error:null });
  expect(await loadFn({data:{expected_viewer_id:viewer}})).toEqual(queue());
  expect(await inspectFn({data:{expected_viewer_id:viewer,operation_id:op}})).toEqual(detail());
});
