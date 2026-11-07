// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useReviewedGoalSave } from "@/hooks/use-reviewed-goal-save";
afterEach(cleanup);
function pending() { let resolve!: (value: any) => void; let reject!: (error: Error) => void; const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
it("confirms only the complete requested count", async () => {
 const view = renderHook(useReviewedGoalSave); const save = vi.fn().mockResolvedValue({ inserted: 2 });
 let outcome; await act(async () => { outcome = await view.result.current.run(save, 2); });
 expect(outcome).toBe("saved");expect(save).toHaveBeenCalledOnce();expect(view.result.current.saving).toBe(false);expect(view.result.current.unconfirmed).toBe(false);
});
it("blocks simultaneous confirmations before a rerender can occur", async () => {
 const view=renderHook(useReviewedGoalSave), request=pending(), save=vi.fn().mockReturnValue(request.promise);let first:Promise<unknown>;
 act(()=>{first=view.result.current.run(save,1);void view.result.current.run(save,1);});expect(save).toHaveBeenCalledOnce();expect(view.result.current.saving).toBe(true);
 await act(async()=>{request.resolve({inserted:1});await first;});expect(view.result.current.unconfirmed).toBe(false);
});
it.each([null, {}, {inserted:0}, {inserted:2}])("pauses an unconfirmed review without another write %j", async receipt=>{
 const view=renderHook(useReviewedGoalSave), save=vi.fn().mockResolvedValue(receipt);let outcome;
 await act(async()=>{outcome=await view.result.current.run(save,1);});expect(outcome).toBe("uncertain");expect(view.result.current.unconfirmed).toBe(true);
 await act(async()=>{expect(await view.result.current.run(save,1)).toBe("blocked");});expect(save).toHaveBeenCalledOnce();
});
it("pauses after a rejected request, since the write may have committed", async()=>{
 const view=renderHook(useReviewedGoalSave), save=vi.fn().mockRejectedValue(new Error("Private network detail"));
 await act(async()=>{expect(await view.result.current.run(save,1)).toBe("uncertain");expect(await view.result.current.run(save,1)).toBe("blocked");});expect(save).toHaveBeenCalledOnce();
});
it.each([0,21,NaN,1.5])("refuses invalid expected counts before calling the server %s",async count=>{
 const view=renderHook(useReviewedGoalSave),save=vi.fn();await act(async()=>{expect(await view.result.current.run(save,count)).toBe("blocked");});expect(save).not.toHaveBeenCalled();expect(view.result.current.unconfirmed).toBe(false);
});
it.each([false,true])("ignores departed outcomes and blocks old callbacks (failure %s)",async failure=>{
 const old=renderHook(useReviewedGoalSave),request=pending(),save=vi.fn().mockReturnValue(request.promise),run=old.result.current.run;let first!:Promise<unknown>;
 act(()=>{first=run(save,1);});old.unmount();const fresh=renderHook(useReviewedGoalSave);
 await act(async()=>{failure?request.reject(new Error("Private departed detail")):request.resolve({inserted:1});expect(await first).toBe("departed");expect(await run(save,1)).toBe("blocked");});
 expect(fresh.result.current.unconfirmed).toBe(false);expect(fresh.result.current.saving).toBe(false);expect(save).toHaveBeenCalledOnce();
});
