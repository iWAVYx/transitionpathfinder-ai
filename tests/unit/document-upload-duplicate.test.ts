import { beforeEach, expect, it, vi } from "vitest";
const access = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("../../src/lib/authz", () => ({ isAuthorized: access.authorize }));
import { createHash } from "node:crypto";
import { documentUploadFingerprint, MAX_PRIVACY_SAFE_DOCUMENT_BYTES } from "../../src/lib/document-upload-fingerprint";
import { hasVerifiedDocumentDuplicate, assertDocumentUploadPathAvailable } from "../../src/lib/document-upload-duplicate.server";
const student = "11111111-1111-4111-8111-111111111111";
const text = "Fictional routine: two steps. تجربة خيالية.\nWritten directions.";
const digest = createHash("sha256").update(text).digest("hex");
const row = { id: "22222222-2222-4222-8222-222222222222", student_id: student, storage_path: `${student}/prior-privacy-safe-document.txt`, mime_type: "text/plain", scan_status: "clean", review_status: "pending_review", archived_at: null, deleted_at: null };
let query: any, download: any, db: any;
beforeEach(() => {
  access.authorize.mockReset().mockResolvedValue(true);
  const result = vi.fn().mockResolvedValue({ data: row, error: null });
  query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), order: vi.fn(), limit: vi.fn(), maybeSingle: result };
  for (const method of ["select", "eq", "is", "order", "limit"]) query[method].mockReturnValue(query);
  download = vi.fn().mockResolvedValue({ data: new Blob([text]), error: null });
  db = { from: vi.fn().mockReturnValue(query), storage: { from: vi.fn().mockReturnValue({ download }) } };
});
it("fingerprints the exact UTF-8 bytes, including line breaks and non-English text", async () => {
  expect(await documentUploadFingerprint(new Blob([text]))).toBe(digest);
  expect(await documentUploadFingerprint(new Blob([text + "\n"]))).not.toBe(digest);
});
it.each([0, MAX_PRIVACY_SAFE_DOCUMENT_BYTES + 1])("rejects invalid declared byte size without reading content (%s)", async size => {
  const arrayBuffer = vi.fn(); await expect(documentUploadFingerprint({ size, arrayBuffer } as any)).rejects.toThrow("Invalid upload size"); expect(arrayBuffer).not.toHaveBeenCalled();
});
it("rejects an empty actual buffer even when the declared size is nonzero", async () => {
  await expect(documentUploadFingerprint({ size: 10, arrayBuffer: async () => new ArrayBuffer(0) } as any)).rejects.toThrow("Invalid upload size");
});
it("verifies actual caller-readable bytes before confirming an accessible match", async () => {
  expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest.toUpperCase())).toBe(true);
  expect(query.eq).toHaveBeenCalledWith("student_id", student); expect(query.eq).toHaveBeenCalledWith("content_hash", digest);
  expect(query.is).toHaveBeenCalledWith("deleted_at", null); expect(download).toHaveBeenCalledExactlyOnceWith(row.storage_path);
  expect(db.storage.from).toHaveBeenCalledExactlyOnceWith("student-documents");
});
it("does not trust a stored hash hint that differs from the actual bytes", async () => {
  download.mockResolvedValue({ data: new Blob(["Different fictional file"]), error: null });
  expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).toBe(false);
});
it("does not read storage when no candidate is accessible", async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null }); expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).toBe(false); expect(download).not.toHaveBeenCalled();
});
it.each([
  { student_id: "33333333-3333-4333-8333-333333333333" }, { storage_path: "another-student/file" },
  { storage_path: `${student}/nested/prior-privacy-safe-document.txt` }, { id: "invalid-id" }, { scan_status: "unknown" },
])("rejects malformed/mismatched candidate receipts before reading bytes (%j)", async patch => {
  query.maybeSingle.mockResolvedValue({ data: { ...row, ...patch }, error: null });
  await expect(hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).rejects.toThrow("couldn't check whether this file is already saved"); expect(download).not.toHaveBeenCalled();
});
it("does not treat legacy original PDFs as reviewed-text duplicates", async () => {
  query.maybeSingle.mockResolvedValue({ data: { ...row, storage_path: `${student}/original.pdf`, mime_type: "application/pdf" }, error: null });
  expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).toBe(false); expect(download).not.toHaveBeenCalled();
});
it.each(["query", "download", "rejection", "missing-bytes"])("stops on an unconfirmed %s and exposes no private error", async stage => {
  if (stage === "query") query.maybeSingle.mockResolvedValue({ data: null, error: { message: "PRIVATE query" } });
  if (stage === "download") download.mockResolvedValue({ data: null, error: { message: "PRIVATE filename" } });
  if (stage === "rejection") download.mockRejectedValue(new Error("PRIVATE file content"));
  if (stage === "missing-bytes") download.mockResolvedValue({ data: null, error: null });
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).rejects.toThrow("couldn't check whether this file is already saved"); expect(log).not.toHaveBeenCalled(); log.mockRestore();
});
it("identifies identical blocked bytes without changing their review or sharing state", async () => {
  const blocked = { ...row, scan_status: "failed", review_status: "rejected", archived_at: "2026-10-27" };
  query.maybeSingle.mockResolvedValue({ data: blocked, error: null });
  expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).toBe(true); expect(blocked).toMatchObject({ scan_status: "failed", review_status: "rejected" });
});

it("checks the authenticated actor's document permission before reading its bytes", async () => {
  expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).toBe(true);
  expect(access.authorize).toHaveBeenCalledExactlyOnceWith({ supabase: db, userId: "current-viewer", action: "view", resourceType: "document", resourceId: row.id });
  expect(access.authorize.mock.invocationCallOrder[0]).toBeLessThan(download.mock.invocationCallOrder[0]);
});
it("does not read or disclose an existing file when document viewing permission is denied", async () => {
  access.authorize.mockResolvedValue(false);
  expect(await hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).toBe(false); expect(download).not.toHaveBeenCalled();
});

it("probes the exact path across RLS before registration without exposing a document ID", async () => {
  await expect(assertDocumentUploadPathAvailable(db, row.storage_path)).rejects.toThrow("already in use or could not be confirmed");
  expect(query.select).toHaveBeenCalledExactlyOnceWith("id"); expect(query.eq).toHaveBeenCalledExactlyOnceWith("storage_path", row.storage_path);
  expect(download).not.toHaveBeenCalled(); expect(access.authorize).not.toHaveBeenCalled();
});
it("allows an exact path with no document reference without reading or deleting bytes", async () => {
  query.maybeSingle.mockResolvedValue({ data: null, error: null });
  await expect(assertDocumentUploadPathAvailable(db, row.storage_path)).resolves.toBeUndefined(); expect(download).not.toHaveBeenCalled();
});
it.each(["response", "rejection"])("fails closed on an uncertain path probe (%s)", async mode => {
  if (mode === "response") query.maybeSingle.mockResolvedValue({ data: null, error: { message: "PRIVATE document ID" } });
  else query.maybeSingle.mockRejectedValue(new Error("PRIVATE document ID"));
  await expect(assertDocumentUploadPathAvailable(db, row.storage_path)).rejects.toThrow("already in use or could not be confirmed"); expect(download).not.toHaveBeenCalled();
});

it("does not interpret a missing duplicate-query receipt as no match", async () => {
  query.maybeSingle.mockResolvedValue({ error: null });
  await expect(hasVerifiedDocumentDuplicate(db, "current-viewer", student, digest)).rejects.toThrow("couldn't check whether this file is already saved"); expect(download).not.toHaveBeenCalled();
});
it("does not interpret a missing path-probe receipt as an available path", async () => {
  query.maybeSingle.mockResolvedValue({ error: null });
  await expect(assertDocumentUploadPathAvailable(db, row.storage_path)).rejects.toThrow("already in use or could not be confirmed"); expect(download).not.toHaveBeenCalled();
});
