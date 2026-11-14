import { expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (value: any) => value;
  const chain: any = { middleware: () => chain, validator: (fn: any) => { validate = fn; return chain; },
    handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }) };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { revokeShareToken as students } from "@/lib/students.functions";
import { revokeShareToken as trust } from "@/lib/trust.functions";
const id = "10000000-0000-4000-8000-000000000001";
const failure = "We couldn't confirm that the link was revoked. Refresh and try again.";
function fixture(result: any, throws = false) {
  const calls: any[] = [];
  const chain: any = {
    update: (value: any) => { calls.push(["update", value]); return chain; },
    eq: (...value: any[]) => { calls.push(["eq", ...value]); return chain; },
    select: (value: any) => { calls.push(["select", value]); return chain; },
    maybeSingle: async () => { if (throws) throw new Error("Private transport detail"); return result; },
  };
  return { calls, supabase: { from: (table: string) => { calls.push(["from", table]); return chain; } } };
}
for (const [name, handler] of [["Students", students], ["Trust", trust]] as const) {
  const call = (db: ReturnType<typeof fixture>, tokenId = id) => handler({ data: { id: tokenId }, context: { supabase: db.supabase, userId: "caller" } } as any);
  it(`${name}: confirms caller-owned revocation, including an already-revoked row`, async () => {
    const db = fixture({ data: { id, revoked: true }, error: null });
    expect(await call(db)).toEqual({ ok: true });
    expect(db.calls).toEqual([["from", "share_tokens"], ["update", { revoked: true }], ["eq", "id", id], ["eq", "created_by", "caller"], ["select", "id, revoked"]]);
  });
  it.each([
    { data: null, error: null },
    { data: { id, revoked: false }, error: null },
    { data: { id: "foreign", revoked: true }, error: null },
    { data: null, error: { message: "Private database detail" } },
  ])(`${name}: never confirms a missing, filtered, mismatched or failed mutation`, async result => {
    await expect(call(fixture(result))).rejects.toThrow(failure);
  });
  it(`${name}: sanitizes transport errors`, async () => {
    await expect(call(fixture(null, true))).rejects.toThrow(failure);
  });
  it(`${name}: rejects malformed identifiers before database work`, async () => {
    const db = fixture(null); await expect(call(db, "invalid")).rejects.toThrow(); expect(db.calls).toEqual([]);
  });
}
