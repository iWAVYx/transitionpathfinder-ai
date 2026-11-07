import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({createServerFn:()=>{
  const builder = {middleware:()=>builder,validator:()=>builder,handler:(fn:any)=>fn}; return builder;
}}));
vi.mock("@/integrations/supabase/auth-middleware",()=>({requireSupabaseAuth:{}}));
import { listGoalStatuses } from "@/lib/goal-statuses.functions";
function input(rows: any[], options: {failAt?: number; missingCount?: boolean; changeCount?: boolean}={}) {
  const calls: any[]=[];
  const supabase={from:vi.fn((table:string)=>{
    const query:any={select:vi.fn(),eq:vi.fn(),order:vi.fn()};
    for(const method of ["select","eq","order"]) query[method].mockReturnValue(query);
    query.range=vi.fn(async(from:number,to:number)=>{
      if(options.failAt===from) return {data:null,error:{message:"Unavailable"},count:null};
      return {data:rows.slice(from,to+1),error:null,count:options.missingCount?null:rows.length+(options.changeCount&&from>0?1:0)};
    }); calls.push({table,query}); return query;
  })};
  return {args:{data:{reportId:"synthetic-report"},context:{supabase,userId:"synthetic-user"}},calls};
}
const rows=(count:number)=>Array.from({length:count},(_,index)=>({id:`row-${index}`,item_id:`step-${index}`,status:index%2?"met":"in-progress"}));
it("loads more than a database page, preserving earlier and current progress with both access filters on every page", async()=>{
  const entries=rows(1205); entries[0].item_id="life:0"; entries[1204].item_id="step-v1:current:0";
  const request=input(entries); const result=await (listGoalStatuses as any)(request.args);
  expect(Object.keys(result.statuses)).toHaveLength(1205);
  expect(result.statuses["life:0"]).toBe("in-progress"); expect(result.statuses["step-v1:current:0"]).toBe("in-progress");
  expect(request.calls).toHaveLength(3);
  for(const {table,query} of request.calls){
    expect(table).toBe("goal_statuses"); expect(query.eq).toHaveBeenCalledWith("user_id","synthetic-user");expect(query.eq).toHaveBeenCalledWith("report_id","synthetic-report");
    expect(query.select).toHaveBeenCalledWith("id, item_id, status",{count:"exact"}); expect(query.order).toHaveBeenCalledWith("id",{ascending:true});
  }
});
it("a successful empty read returns an empty status map",async()=>{
  expect(await (listGoalStatuses as any)(input([]).args)).toEqual({statuses:{}});
});
it.each([{failAt:500},{missingCount:true},{changeCount:true}])("a later/incomplete page rejects all progress rather than returning partial totals: %j",async options=>{
  await expect((listGoalStatuses as any)(input(rows(501),options).args)).rejects.toThrow("We couldn't load all your saved progress. Please reload it.");
});
it.each([
  [{id:"one",item_id:"life:0",status:"unknown"}],
  [{id:"one",item_id:"",status:"met"}],
  [{id:"one",item_id:"x".repeat(201),status:"met"}],
  [{id:"one",item_id:42,status:"met"}],
  [{id:"one",item_id:"life:0",status:"met"},{id:"two",item_id:"life:0",status:"in-progress"}],
])("malformed or duplicate stored entries are retryable failures",async entries=>{
  await expect((listGoalStatuses as any)(input(entries).args)).rejects.toThrow("We couldn't load all your saved progress.");
});
it("unknown valid keys remain preserved as own properties without changing the map prototype",async()=>{
  const request=input([{id:"one",item_id:"__proto__",status:"met"},{id:"two",item_id:"constructor",status:"in-progress"}]);
  const {statuses}=await (listGoalStatuses as any)(request.args);
  expect(Object.getPrototypeOf(statuses)).toBe(Object.prototype);
  expect(Object.hasOwn(statuses,"__proto__")).toBe(true); expect(statuses.__proto__).toBe("met"); expect(statuses.constructor).toBe("in-progress");
});
