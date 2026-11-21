import { describe, it, expect, vi } from "vitest";
import { archiveDocumentMetadata, archiveDocumentRequest, DOCUMENT_ARCHIVE_UNCONFIRMED } from "../../src/lib/document-archive.server";
const actor = "00000000-0000-4000-8000-000000000001";
const id = "00000000-0000-4000-8000-000000000002";
const student = "00000000-0000-4000-8000-000000000003";
const other = "00000000-0000-4000-8000-000000000004";
const stamp = "2026-11-13T12:00:00.000Z";
function fixture(restore = false) {
  const input = { id, student_id: student, expected_viewer_id: actor, expected_updated_at: stamp, restore };
  const row = { id, student_id: student, updated_at: stamp, archived_at: restore ? stamp : null, archived_by: restore ? actor : null, archive_reason: null };
  const state = { read: { data: row, error: null } as { data: unknown; error: unknown }, reply: undefined as undefined | { data: unknown; error: unknown }, patch: {} as Record<string, unknown>, predicates: [] as unknown[], lost: false, auditError: false };
  const authorize = vi.fn(async (_studentId: string) => {});
  const audit = vi.fn(async () => ({ error: state.auditError ? {} : null }));
  const write = vi.fn((patch) => { state.patch = patch; return query(true); });
  function query(writing: boolean): any {
    const q = { eq: (key: string, value: unknown) => { if (writing) state.predicates.push([key,value]); return q; }, is: (key: string, value: unknown) => { state.predicates.push([key,value]); return q; }, select: () => q, maybeSingle: async () => {
      if (!writing) return state.read;
      if (state.lost) throw new Error("lost reply");
      return state.reply ?? { data: { ...row, ...state.patch, updated_at: "2026-11-13T12:01:00.000Z" }, error: null };
    } }; return q;
  }
  const client = { from: (table: string) => table === "documents" ? { select: () => query(false), update: write } : { insert: audit } };
  const run = (value: unknown = input, user = actor) => archiveDocumentMetadata(client, user, value, authorize);
  return { input, row, state, authorize, audit, write, run };
}
describe("conditional document archive metadata", () => {
  it.each([false,true])("confirms archive/restore only after an exact returned row (%s)", async restore => {
    const f = fixture(restore); expect(await f.run()).toEqual({ ok: true });
    expect(f.authorize).toHaveBeenCalledWith(student);
    expect(f.state.predicates).toEqual([["id",id],["student_id",student],["updated_at",stamp],["archived_at",restore ? stamp : null]]);
    expect(f.audit).toHaveBeenCalledOnce(); expect(f.write).toHaveBeenCalledOnce();
  });
  it.each(["id","student_id","expected_viewer_id","expected_updated_at"])("rejects cached/missing %s before any read or write", async key => {
    const f = fixture(); const input: any = { ...f.input }; delete input[key];
    expect(archiveDocumentRequest.safeParse(input).success).toBe(false);
    await expect(f.run(input)).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED);
    expect(f.authorize).not.toHaveBeenCalled(); expect(f.write).not.toHaveBeenCalled();
  });
  it("rejects a changed viewer before authorization or mutation", async () => {
    const f = fixture(); await expect(f.run(f.input,other)).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED);
    expect(f.authorize).not.toHaveBeenCalled(); expect(f.write).not.toHaveBeenCalled();
  });
  it.each(["id","student_id","updated_at","archived_at"])("rejects stale or mismatched loaded %s", async key => {
    const f = fixture(); f.state.read.data = { ...f.row, [key]: key === "updated_at" || key === "archived_at" ? "2026-11-13T13:00:00.000Z" : other };
    await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED); expect(f.write).not.toHaveBeenCalled();
  });
  it("preserves permission denial without mutation", async () => {
    const f = fixture(); f.authorize.mockRejectedValue(new Error("denied"));
    await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED); expect(f.write).not.toHaveBeenCalled(); expect(f.audit).not.toHaveBeenCalled();
  });
  it.each([null, {}, { id:other }, { id,student_id:student,updated_at:stamp,archived_at:null,archived_by:null,archive_reason:null }])("does not report success or audit an absent/malformed/wrong outcome", async data => {
    const f=fixture(); f.state.reply={ data,error:null };
    await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED); expect(f.audit).not.toHaveBeenCalled(); expect(f.write).toHaveBeenCalledOnce();
  });
  it.each(["id","student_id","archived_by","archive_reason","archived_at"])("rejects a complete receipt with the wrong %s", async key => {
    const f=fixture(); const value=key==="archived_at" ? stamp : key==="archive_reason" ? "unrequested reason" : other;
    f.state.reply={data:{...f.row,archived_at:"2026-11-13T12:01:00.000Z",archived_by:actor,[key]:value},error:null};
    await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED);expect(f.audit).not.toHaveBeenCalled();expect(f.write).toHaveBeenCalledOnce();
  });
  it("does not retry a lost write response or fabricate a success audit", async () => {
    const f=fixture(); f.state.lost=true; await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED);
    expect(f.write).toHaveBeenCalledOnce(); expect(f.audit).not.toHaveBeenCalled();
  });
  it("does not replay a confirmed metadata update after audit failure", async () => {
    const f=fixture(); f.state.auditError=true; await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED);
    expect(f.write).toHaveBeenCalledOnce(); expect(f.audit).toHaveBeenCalledOnce();
  });
  it("refuses an already restored document", async () => {
    const f=fixture(true); f.state.read.data={...f.row,archived_at:null}; await expect(f.run()).rejects.toThrow(DOCUMENT_ARCHIVE_UNCONFIRMED); expect(f.write).not.toHaveBeenCalled();
  });
});
