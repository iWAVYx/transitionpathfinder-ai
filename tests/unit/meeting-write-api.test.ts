import {beforeEach,it,expect,vi} from 'vitest';
const api=vi.hoisted(()=>({complete:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/meeting-writes.server',()=>({completeMeetingAtomically:api.complete,saveMeetingFields:api.save}));
vi.mock('@/integrations/supabase/auth-middleware',()=>({requireSupabaseAuth:{}}));
vi.mock('@tanstack/react-start',()=>({createServerFn:()=>{let parse=(v:any)=>v;const b:any={middleware:()=>b,validator:(p:any)=>{parse=p;return b;},handler:(fn:any)=>async({data,context}:any)=>fn({data:parse(data),context})};return b;}}));
import {completeMeeting,updateMeeting,getMeeting} from '../../src/lib/meetings.functions';
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,intent={id:id(2),student_id:id(3),expected_viewer_id:id(1),expected_updated_at:'2026-11-21T10:00:00.000001Z'},context={userId:id(1),supabase:{from:vi.fn()}};
beforeEach(()=>{vi.clearAllMocks();api.complete.mockResolvedValue({ok:true,promoted:0});api.save.mockResolvedValue({ok:true});});
for(const [fn,mock] of [[completeMeeting,api.complete],[updateMeeting,api.save]] as const){
 it(`${fn.name} passes exact loaded intent separately from editable fields`,async()=>{await(fn as any)({data:{...intent,summary:'Saved',created_by:id(9)},context});expect(mock).toHaveBeenCalledExactlyOnceWith(context.supabase,context.userId,intent,{summary:'Saved'});expect(context.supabase.from).not.toHaveBeenCalled();});
 for(const key of ['student_id','expected_updated_at'])it(`rejects missing ${key}`,async()=>{await expect((fn as any)({data:{...intent,[key]:undefined},context})).rejects.toThrow();expect(mock).not.toHaveBeenCalled();});
 it('does not retry an uncertain write',async()=>{mock.mockRejectedValue(Error('Unconfirmed'));await expect((fn as any)({data:intent,context})).rejects.toThrow('Unconfirmed');expect(mock).toHaveBeenCalledOnce();});
}
it('status-only update cannot bypass completion transaction',async()=>{await expect((updateMeeting as any)({data:{...intent,status:'completed'},context})).rejects.toThrow();expect(api.save).not.toHaveBeenCalled();});
it('meeting reads reject a departed viewer before any database access',async()=>{await expect((getMeeting as any)({data:{id:id(2),expected_viewer_id:id(8)},context})).rejects.toThrow('sign-in changed');expect(context.supabase.from).not.toHaveBeenCalled();});
