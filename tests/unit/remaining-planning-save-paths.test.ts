import { it, expect, vi, beforeEach } from "vitest";
const api = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/planning-record-write.server", () => ({
  createPlanningRecordAtomically: api.create,
}));
vi.mock("@/lib/atomic-action-update.server", () => ({ updateActionAtomically: api.update }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let parse = (v: any) => v;
    const b: any = {
      middleware: () => b,
      validator: (p: any) => {
        parse = p;
        return b;
      },
      handler:
        (fn: any) =>
        async ({ data, context }: any) =>
          fn({ data: parse(data), context }),
    };
    return b;
  },
}));
import { addRecommendationToActionItems } from "../../src/lib/recommendation-actions.functions";
import { setActionItemStatus } from "../../src/lib/golden-path.functions";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const context = { userId: id(1), supabase: { from: vi.fn() } },
  data = {
    student_id: id(2),
    request_id: id(3),
    expected_viewer_id: id(1),
    source_kind: "resource",
    source_id: "reference",
    title: "  A useful resource  ",
  };
beforeEach(() => {
  vi.clearAllMocks();
  api.create.mockResolvedValue({ id: id(3) });
  api.update.mockResolvedValue({ id: id(3) });
});
for (const source_kind of ["resource", "partner"])
  it(`routes ${source_kind} recommendation through receipt-checked transaction`, async () => {
    expect(
      await (addRecommendationToActionItems as any)({
        data: { ...data, source_kind, created_by_user_id: id(9) },
        context,
      }),
    ).toEqual({ ok: true, item: { id: id(3) } });
    expect(api.create).toHaveBeenCalledExactlyOnceWith(
      context.supabase,
      context.userId,
      "action_items",
      expect.objectContaining({
        student_id: id(2),
        request_id: id(3),
        expected_viewer_id: id(1),
        title: `${source_kind === "resource" ? "Review:" : "Follow up with:"} A useful resource`,
        status: "not_started",
        category: "family",
      }),
    );
    expect(api.create.mock.calls[0][3]).not.toHaveProperty("created_by_user_id");
    expect(context.supabase.from).not.toHaveBeenCalled();
  });
it("rejects departed account before recommendation write", async () => {
  await expect(
    (addRecommendationToActionItems as any)({
      data: { ...data, expected_viewer_id: id(8) },
      context,
    }),
  ).rejects.toThrow("sign-in changed");
  expect(api.create).not.toHaveBeenCalled();
});
it("does not retry uncertain recommendation save", async () => {
  api.create.mockRejectedValue(Error("Unconfirmed"));
  await expect((addRecommendationToActionItems as any)({ data, context })).rejects.toThrow(
    "Unconfirmed",
  );
  expect(api.create).toHaveBeenCalledOnce();
});
const intent = {
  id: id(3),
  student_id: id(2),
  expected_updated_at: "2026-11-21T10:00:00.123456Z",
  expected_viewer_id: id(1),
  status: "complete",
};
it("legacy status path preserves completion effects and exact student/version", async () => {
  await (setActionItemStatus as any)({ data: intent, context });
  expect(api.update).toHaveBeenCalledExactlyOnceWith(context.supabase, context.userId, intent, {
    status: "completed",
  });
  expect(context.supabase.from).not.toHaveBeenCalled();
});
for (const field of ["student_id", "expected_updated_at"])
  it(`rejects missing ${field} on legacy status`, async () => {
    await expect(
      (setActionItemStatus as any)({ data: { ...intent, [field]: undefined }, context }),
    ).rejects.toThrow();
    expect(api.update).not.toHaveBeenCalled();
  });
it("does not retry uncertain status change", async () => {
  api.update.mockRejectedValue(Error("Unconfirmed"));
  await expect((setActionItemStatus as any)({ data: intent, context })).rejects.toThrow(
    "Unconfirmed",
  );
  expect(api.update).toHaveBeenCalledOnce();
});

import {addRecommendationToCalendar,addRecommendationToNextMeetingPrep} from '../../src/lib/recommendation-actions.functions';
function recommendationDb(){
 const meetings:any={data:[{id:id(4),student_id:id(2),scheduled_at:'2100-01-01T12:00:00Z',status:'upcoming'}],error:null};
 const inserts:any[]=[];let alter=(row:any)=>({data:row,error:null} as any);const filters:any[]=[];
 const db={from:vi.fn((table:string)=>{let fields:any;const q:any={select:()=>q,eq:(...args:any[])=>{filters.push(args);return q;},gte:()=>q,order:()=>q,limit:async()=>meetings,insert:(value:any)=>{fields=value;inserts.push({table,fields});return q;},single:async()=>alter({...fields})};return q;})};
 return{db,meetings,inserts,filters,setResult:(fn:typeof alter)=>{alter=fn;}};
}
for(const [name,fn] of [['calendar',addRecommendationToCalendar],['meeting prep',addRecommendationToNextMeetingPrep]] as const){
 it(`${name} confirms exact saved identity and content`,async()=>{const s=recommendationDb();const result=await(fn as any)({data,context:{...context,supabase:s.db}});expect(result.ok).toBe(true);expect(s.inserts).toHaveLength(1);expect(s.inserts[0].fields).toMatchObject({id:id(3),student_id:id(2)});if(name==='calendar')expect(s.inserts[0].fields.owner_user_id).toBe(id(1));else{expect(s.inserts[0].fields.category).toBe('follow_up');expect(s.filters).toContainEqual(['status','upcoming']);expect(result.prep_item_id).toBe(id(3));}});
 for(const defect of ['empty','error','wrong-id','wrong-student','wrong-content'])it(`${name} rejects ${defect} without retry`,async()=>{const s=recommendationDb();s.setResult(row=>defect==='empty'?{data:null,error:null}:defect==='error'?{data:row,error:{}}:{data:{...row,[defect==='wrong-id'?'id':defect==='wrong-student'?'student_id':name==='calendar'?'title':'content']:'other'},error:null});await expect((fn as any)({data,context:{...context,supabase:s.db}})).rejects.toThrow("couldn't confirm");expect(s.inserts).toHaveLength(1);});
 it(`${name} rejects departed account before reads or writes`,async()=>{const s=recommendationDb();await expect((fn as any)({data:{...data,expected_viewer_id:id(8)},context:{...context,supabase:s.db}})).rejects.toThrow('sign-in changed');expect(s.db.from).not.toHaveBeenCalled();});
}
for(const defect of ['cancelled','foreign-student','past-date','bad-id'])it(`does not add preparation to ${defect} meeting`,async()=>{const s=recommendationDb(),m=s.meetings.data[0];if(defect==='cancelled')m.status='cancelled';else if(defect==='foreign-student')m.student_id=id(8);else if(defect==='past-date')m.scheduled_at='2000-01-01T12:00:00Z';else m.id='bad';await expect((addRecommendationToNextMeetingPrep as any)({data,context:{...context,supabase:s.db}})).rejects.toThrow();expect(s.inserts).toHaveLength(0);});
it('distinguishes no upcoming meeting from an unavailable read',async()=>{const s=recommendationDb();s.meetings.data=[];expect((await(addRecommendationToNextMeetingPrep as any)({data,context:{...context,supabase:s.db}})).reason).toBe('no_upcoming_meeting');s.meetings.data=null;await expect((addRecommendationToNextMeetingPrep as any)({data,context:{...context,supabase:s.db}})).rejects.toThrow('check your upcoming meetings');expect(s.inserts).toHaveLength(0);});
