import { createHash } from "node:crypto";
import { beforeEach, expect, it, vi } from "vitest";
import { authorizeDocumentRescanSource, prepareDocumentRescanCopy, RESCAN_SOURCE_MESSAGE } from "../../src/lib/document-rescan-source.server";
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const text = "Fictional reviewed source";
const row = { id: id(1), student_id: id(2), storage_path: `${id(2)}/privacy-safe-document.txt`, storage_object_id: id(3), storage_object_version: "version-one", content_hash: createHash("sha256").update(text).digest("hex"), mime_type: "text/plain", size_bytes: Buffer.byteLength(text), title: "Fictional text", doc_type: "other", updated_at: "2026-10-30T12:00:00.123456+00:00", scan_status: "failed", deleted_at: null };
const info = { id: id(3), version: "version-one", name: row.storage_path, bucketId: "student-documents", size: row.size_bytes, contentType: "text/plain;charset=UTF-8" };
let rpc: any, read: any, object: any, download: any, client: any, copy: Blob;
beforeEach(() => {
  copy = new Blob([text]); rpc = vi.fn(async (name: string) => ({ data: name !== "is_partner_only", error: null }));
  read = vi.fn(async () => ({ data: { ...row }, error: null })); object = vi.fn(async () => ({ data: { ...info }, error: null })); download = vi.fn(async () => ({ data: copy, error: null }));
  client = { rpc, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }), storage: { from: () => ({ info: object, download }) } };
});
it("hashes one caller-readable immutable copy between exact object/current-source checks", async () => {
  const prepared = await prepareDocumentRescanCopy(client, id(4), row);
  expect(prepared.copy).toBe(copy); expect(prepared.contentHash).toBe(row.content_hash); expect(download).toHaveBeenCalledExactlyOnceWith(row.storage_path);
  expect(object).toHaveBeenCalledTimes(2); expect(rpc).toHaveBeenCalledTimes(9);
  read.mockResolvedValue({ data: { ...row, scan_status: "pending", updated_at: "2026-10-30T12:01:00Z" }, error: null });
  await prepared.confirmPending("2026-10-30T12:01:00Z"); expect(object).toHaveBeenCalledTimes(3);
});
it.each(["edit", "partner", "view", "error", "lost", "truthy"])("rejects unconfirmed caller authority before any storage read (%s)", async mode => {
  rpc.mockImplementation(async (name: string) => {
    if (mode === "lost") throw new Error("PRIVATE detail");
    return { data: mode === "truthy" ? "true" : name === "is_partner_only" ? mode === "partner" : name === "can_edit_student" ? mode !== "edit" : mode !== "view", error: mode === "error" ? { message: "PRIVATE detail" } : null };
  });
  await expect(prepareDocumentRescanCopy(client, id(4), row)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(object).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
});
it.each(["id", "version", "name", "bucketId", "size", "contentType", "archivedAt", "isDeleteMarker", "error", "missing"])("rejects unsafe or foreign object metadata (%s)", async field => {
  object.mockResolvedValue({ data: field === "missing" ? null : { ...info, ...(field === "error" ? {} : { [field]: field === "size" ? 1 : field === "isDeleteMarker" ? true : "different" }) }, error: field === "error" ? { message: "PRIVATE" } : null });
  await expect(prepareDocumentRescanCopy(client, id(4), row)).rejects.toThrow(RESCAN_SOURCE_MESSAGE); expect(download).not.toHaveBeenCalled();
});
it.each(["error", "lost", "not-blob", "size", "hash"])("does not accept unconfirmed downloaded bytes (%s)", async mode => {
  if (mode === "lost") download.mockRejectedValue(new Error("PRIVATE detail"));
  else download.mockResolvedValue({ data: mode === "not-blob" ? text : mode === "size" ? new Blob(["short"]) : mode === "hash" ? new Blob(["X" + text.slice(1)]) : copy, error: mode === "error" ? { message: "PRIVATE" } : null });
  await expect(prepareDocumentRescanCopy(client, id(4), row)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(download).toHaveBeenCalledOnce(); expect(read).not.toHaveBeenCalled();
});
it.each(["updated_at", "student_id", "storage_object_version", "content_hash", "title", "deleted_at", "scan_status", "error"])("stops on source changes after download (%s)", async field => {
  read.mockResolvedValue({ data: { ...row, ...(field === "error" ? {} : { [field]: "changed" }) }, error: field === "error" ? { message: "PRIVATE" } : null });
  await expect(prepareDocumentRescanCopy(client, id(4), row)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
});
it("refuses a changed storage version after download without reading different bytes", async () => {
  object.mockResolvedValueOnce({ data: info, error: null }).mockResolvedValueOnce({ data: { ...info, version: "replacement" }, error: null });
  await expect(prepareDocumentRescanCopy(client, id(4), row)).rejects.toThrow(RESCAN_SOURCE_MESSAGE); expect(download).toHaveBeenCalledOnce();
});
it("rechecks revoked authority before using a pending scan result", async () => {
  const prepared = await prepareDocumentRescanCopy(client, id(4), row); rpc.mockResolvedValue({ data: false, error: null });
  await expect(prepared.confirmPending("2026-10-30T12:01:00Z")).rejects.toThrow(RESCAN_SOURCE_MESSAGE); expect(download).toHaveBeenCalledOnce();
});
it.each(["storage_object_id", "storage_object_version", "content_hash", "mime_type"])("legacy or unsupported source without %s stops before IO", async field => {
  await expect(prepareDocumentRescanCopy(client, id(4), { ...row, [field]: null })).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(rpc).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
});

it("preflight authority does not read file metadata or bytes before admission", async () => {
  const preflight = await authorizeDocumentRescanSource(client, id(4), row);
  expect(rpc).toHaveBeenCalledTimes(3); expect(object).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
  await preflight.prepareCopy(); expect(download).toHaveBeenCalledOnce();
});
it("rechecks revoked access after preflight and before the admitted file read", async () => {
  const preflight = await authorizeDocumentRescanSource(client, id(4), row); rpc.mockResolvedValue({ data: false, error: null });
  await expect(preflight.prepareCopy()).rejects.toThrow(RESCAN_SOURCE_MESSAGE); expect(object).not.toHaveBeenCalled(); expect(download).not.toHaveBeenCalled();
});

const pendingRevision = "2026-10-30T12:01:00Z";
function savedPending(revision = pendingRevision) {
  read.mockResolvedValue({ data: { ...row, scan_status: "pending", updated_at: revision }, error: null });
}
it("spends one preparation before concurrent or later calls can download again", async () => {
  const source = await authorizeDocumentRescanSource(client, id(4), row);
  const first = source.prepareCopy();
  await expect(source.prepareCopy()).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  await first;
  const calls = [rpc.mock.calls.length, object.mock.calls.length, read.mock.calls.length];
  await expect(source.prepareCopy()).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(download).toHaveBeenCalledOnce();
  expect([rpc.mock.calls.length, object.mock.calls.length, read.mock.calls.length]).toEqual(calls);
});
it("does not retry a lost download through the original preparation", async () => {
  const source = await authorizeDocumentRescanSource(client, id(4), row);
  download.mockRejectedValueOnce(new Error("PRIVATE provider detail"));
  await expect(source.prepareCopy()).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  download.mockResolvedValue({ data: copy, error: null });
  await expect(source.prepareCopy()).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(download).toHaveBeenCalledOnce();
});
it("can recheck the same pending revision around provider work", async () => {
  const source = await prepareDocumentRescanCopy(client, id(4), row); savedPending();
  await source.confirmPending(pendingRevision); await source.confirmPending(pendingRevision);
  expect(read).toHaveBeenCalledTimes(3); expect(download).toHaveBeenCalledOnce();
});
it("never reattaches to a newer pending revision even when that row is readable", async () => {
  const source = await prepareDocumentRescanCopy(client, id(4), row); savedPending();
  await source.confirmPending(pendingRevision);
  const calls = rpc.mock.calls.length; savedPending("2026-10-30T12:02:00Z");
  await expect(source.confirmPending("2026-10-30T12:02:00Z")).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(rpc).toHaveBeenCalledTimes(calls);
  savedPending(); await expect(source.confirmPending(pendingRevision)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
});
it.each(["authority", "source", "object", "lost"])("a failed pending check cannot resume after recovery (%s)", async fault => {
  const source = await prepareDocumentRescanCopy(client, id(4), row); savedPending();
  if (fault === "authority") rpc.mockResolvedValueOnce({ data: false, error: null });
  if (fault === "source") read.mockResolvedValueOnce({ data: { ...row, scan_status: "failed" }, error: null });
  if (fault === "object") object.mockResolvedValueOnce({ data: { ...info, version: "changed" }, error: null });
  if (fault === "lost") object.mockRejectedValueOnce(new Error("PRIVATE detail"));
  await expect(source.confirmPending(pendingRevision)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  const calls = [rpc.mock.calls.length, object.mock.calls.length, read.mock.calls.length];
  await expect(source.confirmPending(pendingRevision)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect([rpc.mock.calls.length, object.mock.calls.length, read.mock.calls.length]).toEqual(calls);
});
it.each(["", "not-a-revision", null, 42])("invalid pending revision stops without IO and cannot be repaired in place (%s)", async revision => {
  const source = await prepareDocumentRescanCopy(client, id(4), row); savedPending();
  const calls = rpc.mock.calls.length;
  await expect(source.confirmPending(revision as string)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  await expect(source.confirmPending(pendingRevision)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  expect(rpc).toHaveBeenCalledTimes(calls);
});
it("overlapping pending checks stop the continuation instead of allowing a racing success", async () => {
  const source = await prepareDocumentRescanCopy(client, id(4), row); savedPending();
  let resolve!: (value: unknown) => void;
  read.mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  const first = source.confirmPending(pendingRevision);
  await vi.waitFor(() => expect(resolve).toBeTypeOf("function"));
  await expect(source.confirmPending(pendingRevision)).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
  resolve({ data: { ...row, scan_status: "pending", updated_at: pendingRevision }, error: null });
  await expect(first).rejects.toThrow(RESCAN_SOURCE_MESSAGE);
});
