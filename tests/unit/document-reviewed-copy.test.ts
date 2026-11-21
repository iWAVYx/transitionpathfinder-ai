import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ download: vi.fn(), from: vi.fn(), fetch: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { storage: { from: api.from } } }));
import { sniffUploadedDocument, MAX_UPLOAD_BYTES } from "@/lib/document-sniff.server";
import { scanUploadedDocument } from "@/lib/document-av-scan.server";
import { documentUploadFingerprint } from "@/lib/document-upload-fingerprint";
const input = { storage_path: "fictional-student/private-source.txt", declared_mime: "text/plain", declared_size: 23 };
const original = "Fictional reviewed text";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CLOUDMERSIVE_API_KEY", "fictional-test-token");
  vi.stubEnv("CLOUDMERSIVE_MAX_SCAN_BYTES", "1000");
  vi.stubGlobal("fetch", api.fetch);
  api.from.mockReturnValue({ download: api.download });
  api.download.mockResolvedValue({ data: new Blob(["REPLACED storage bytes"]), error: null });
  api.fetch.mockImplementation(async () => new Response(JSON.stringify({ CleanResult: true, FoundViruses: [] }), { status: 200 }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("hashes, checks and submits one immutable copy even if storage would return different bytes", async () => {
  const source = new Uint8Array(new TextEncoder().encode(original));
  const copy = new Blob([source]); source.fill(0); // Blob owns immutable bytes.
  const before = await documentUploadFingerprint(copy);
  expect(await sniffUploadedDocument(input, copy)).toMatchObject({ ok: true, detected_kind: "text" });
  expect(await scanUploadedDocument(input, copy)).toMatchObject({ ok: true, code: "clean" });
  expect(api.from).not.toHaveBeenCalled(); expect(api.download).not.toHaveBeenCalled();
  expect(api.fetch).toHaveBeenCalledOnce();
  const form = api.fetch.mock.calls[0][1].body as FormData;
  const submitted = form.get("inputFile") as Blob;
  expect(await submitted.text()).toBe(original);
  expect(await documentUploadFingerprint(submitted)).toBe(before);
  expect((submitted as File).name).toBe("upload.txt");
});
it("file type checking inspects the held copy rather than replacement storage content", async () => {
  api.download.mockResolvedValue({ data: new Blob(["%PDF-1.7"]), error: null });
  expect(await sniffUploadedDocument({ ...input, declared_mime: "application/pdf" }, new Blob([original])))
    .toMatchObject({ ok: false, error_code: "mime_mismatch", detected_kind: "text" });
  expect(api.download).not.toHaveBeenCalled(); expect(api.fetch).not.toHaveBeenCalled();
});
it.each([null, {}, new Uint8Array([1])])("does not fall back to storage on an invalid internal copy (%j)", async copy => {
  expect(await sniffUploadedDocument(input, copy as Blob)).toMatchObject({ ok: false, error_code: "download_failed" });
  expect(await scanUploadedDocument(input, copy as Blob)).toMatchObject({ ok: false, code: "failed" });
  expect(api.from).not.toHaveBeenCalled(); expect(api.fetch).not.toHaveBeenCalled();
});
it("keeps the declared-size gate before file type processing", async () => {
  expect(await sniffUploadedDocument({ ...input, declared_size: MAX_UPLOAD_BYTES + 1 }, new Blob([original])))
    .toMatchObject({ ok: false, error_code: "oversize" });
  expect(api.from).not.toHaveBeenCalled();
});
it.each([new Blob([]), new Blob(["x".repeat(1001)])])("blocks empty/oversize held copies without sending them to the provider", async copy => {
  expect(await scanUploadedDocument(input, copy)).toMatchObject({ ok: false, code: "failed" });
  expect(api.from).not.toHaveBeenCalled(); expect(api.fetch).not.toHaveBeenCalled();
});
it("retains fail-closed behavior when provider credentials are missing", async () => {
  vi.stubEnv("CLOUDMERSIVE_API_KEY", "");
  expect(await scanUploadedDocument(input, new Blob([original]))).toMatchObject({ ok: false, code: "failed" });
  expect(api.from).not.toHaveBeenCalled(); expect(api.fetch).not.toHaveBeenCalled();
});
it.each([
  { CleanResult: false, FoundViruses: [{ VirusName: "Fictional-test-threat" }] },
  { CleanResult: true, FoundViruses: [], ContainsMacros: true },
  {},
])("does not release a held copy on a blocked or uncertain provider response (%j)", async body => {
  api.fetch.mockImplementation(async () => new Response(JSON.stringify(body), { status: 200 }));
  expect((await scanUploadedDocument(input, new Blob([original]))).ok).toBe(false);
  expect(api.fetch).toHaveBeenCalledOnce(); expect(api.download).not.toHaveBeenCalled();
});
it("legacy channel callers still download from their requested bucket", async () => {
  expect(await scanUploadedDocument({ ...input, bucket: "channel-attachments" })).toMatchObject({ ok: true });
  expect(api.from).toHaveBeenCalledExactlyOnceWith("channel-attachments");
  expect(api.download).toHaveBeenCalledExactlyOnceWith(input.storage_path);
});
it("legacy sniff callers retain the student-document download path", async () => {
  expect(await sniffUploadedDocument(input)).toMatchObject({ ok: true });
  expect(api.from).toHaveBeenCalledExactlyOnceWith("student-documents"); expect(api.download).toHaveBeenCalledOnce();
});
it("holds no provider retry when a scan request fails", async () => {
  api.fetch.mockRejectedValue(new Error("Fictional provider failure"));
  expect(await scanUploadedDocument(input, new Blob([original]))).toMatchObject({ ok: false, code: "failed" });
  expect(api.fetch).toHaveBeenCalledOnce(); expect(api.download).not.toHaveBeenCalled();
});
