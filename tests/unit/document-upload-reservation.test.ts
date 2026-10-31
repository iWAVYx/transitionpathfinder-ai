import { beforeEach, expect, it, vi } from "vitest";
import {
  documentUploadReviewHash,
  confirmDocumentUploadReservation,
} from "../../src/lib/document-upload-intent";
import {
  reserveDocumentUploadIntent,
  recoverDocumentUploadIntent,
} from "../../src/lib/document-upload-reservation.server";
const student = "11111111-1111-4111-8111-111111111111",
  attempt = "22222222-2222-4222-8222-222222222222",
  actor = "33333333-3333-4333-8333-333333333333",
  doc = "44444444-4444-4444-8444-444444444444";
const input = {
  student_id: student,
  attempt_id: attempt,
  title: "Fictional plan",
  mime_type: "text/plain",
  size_bytes: 19,
  consent_acknowledged: true,
  content_hash: "a".repeat(64),
};
const path = `${student}/${attempt}-privacy-safe-document.txt`;
const reservation = () => ({
  schema: "document-upload-reservation-v1",
  attempt_id: attempt,
  student_id: student,
  actor_id: actor,
  storage_path: path,
  state: "reserved",
});
const registration = () => ({
  schema: "document-upload-registration-v1",
  attempt_id: attempt,
  document_id: doc,
  student_id: student,
  actor_id: actor,
  storage_path: path,
  scan_status: "pending",
  review_status: "pending_review",
  archived_at: null,
  deleted_at: null,
});
let rpc: ReturnType<typeof vi.fn>;
beforeEach(() => {
  rpc = vi.fn(async (name) => ({
    data: name === "reserve_document_upload" ? reservation() : registration(),
    error: null,
  }));
});
it("normalizes defaults/field order and ignores transport/extra fields in the review digest", async () => {
  const hash = await documentUploadReviewHash(actor, input);
  expect(hash).toMatch(/^[a-f0-9]{64}$/);
  expect(
    await documentUploadReviewHash(actor, {
      content_hash: "A".repeat(64),
      title: " Fictional plan ",
      student_id: student,
      mime_type: "text/plain",
      size_bytes: 19,
      consent_acknowledged: true,
      visibility: "team",
      doc_type: "current-iep",
      ignored: "Extra",
    }),
  ).toBe(hash);
});
it.each([
  { title: "Different title" },
  { content_hash: "b".repeat(64) },
  { mime_type: "application/pdf" },
  { size_bytes: 20 },
  { visibility: "private" },
  { consent_acknowledged: false },
  { notes: "Changed notes" },
  { meeting_date: "2026-10-28" },
  { student_id: doc },
])("review digest changes for different approved content/metadata %j", async (patch) => {
  expect(await documentUploadReviewHash(actor, { ...input, ...patch })).not.toBe(
    await documentUploadReviewHash(actor, input),
  );
});
it("binds the digest to the authenticated actor", async () => {
  expect(await documentUploadReviewHash(doc, input)).not.toBe(
    await documentUploadReviewHash(actor, input),
  );
});
it("reserves once using the authenticated RPC and returns the canonical receipt", async () => {
  const result = await reserveDocumentUploadIntent({ rpc }, actor, input);
  expect(result).toMatchObject(reservation());
  expect(result.review_context_sha256).toBe(await documentUploadReviewHash(actor, input));
  expect(rpc).toHaveBeenCalledExactlyOnceWith("reserve_document_upload", {
    _attempt_id: attempt,
    _student_id: student,
    _claimed_content_sha256: input.content_hash,
    _review_context_sha256: result.review_context_sha256,
  });
});
it.each([
  null,
  {},
  { ...reservation(), actor_id: doc },
  { ...reservation(), student_id: doc },
  { ...reservation(), attempt_id: doc },
  { ...reservation(), storage_path: "different" },
  { ...reservation(), state: "registered" },
])("does not accept an uncertain/foreign reservation receipt %j", async (data) => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(reserveDocumentUploadIntent({ rpc }, actor, input)).rejects.toThrow(
    "couldn't confirm",
  );
  expect(rpc).toHaveBeenCalledOnce();
});
it.each(["reserve", "recover"])("does not retry or expose an errored %s RPC", async (stage) => {
  rpc.mockRejectedValue(new Error("PRIVATE function/database/body"));
  const hash = await documentUploadReviewHash(actor, input);
  await expect(
    stage === "reserve"
      ? reserveDocumentUploadIntent({ rpc }, actor, input)
      : recoverDocumentUploadIntent({ rpc }, actor, { ...input, review_context_sha256: hash }),
  ).rejects.toThrow("couldn't confirm");
  expect(rpc).toHaveBeenCalledOnce();
});
it("requires unchanged review intent before reconfirming registration", async () => {
  await expect(
    reserveDocumentUploadIntent(
      { rpc },
      actor,
      { ...input, title: "Changed" },
      await documentUploadReviewHash(actor, input),
    ),
  ).rejects.toThrow("couldn't confirm");
  expect(rpc).not.toHaveBeenCalled();
});
it("requires consent for sensitive reservations before RPC", async () => {
  await expect(
    reserveDocumentUploadIntent({ rpc }, actor, { ...input, consent_acknowledged: false }),
  ).rejects.toThrow("couldn't confirm");
  expect(rpc).not.toHaveBeenCalled();
});
it("recovers only the original matching registration through one read-only RPC", async () => {
  const hash = await documentUploadReviewHash(actor, input);
  const result = await recoverDocumentUploadIntent({ rpc }, actor, {
    ...input,
    review_context_sha256: hash,
  });
  expect(result.id).toBe(doc);
  expect(result.scan_status).toBe("pending");
  expect(rpc).toHaveBeenCalledExactlyOnceWith("read_document_upload_registration", {
    _attempt_id: attempt,
    _review_context_sha256: hash,
  });
});
it.each([
  null,
  {},
  { ...registration(), schema: "old" },
  { ...registration(), document_id: "bad" },
  { ...registration(), actor_id: doc },
  { ...registration(), student_id: doc },
  { ...registration(), storage_path: "different" },
  { ...registration(), attempt_id: doc },
  { ...registration(), scan_status: "unknown" },
  { ...registration(), archived_at: undefined },
])("refuses a missing/foreign/incomplete recovery receipt %j", async (data) => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(
    recoverDocumentUploadIntent({ rpc }, actor, {
      ...input,
      review_context_sha256: await documentUploadReviewHash(actor, input),
    }),
  ).rejects.toThrow("couldn't confirm");
  expect(rpc).toHaveBeenCalledOnce();
});
it("does not read a receipt after review metadata changes", async () => {
  await expect(
    recoverDocumentUploadIntent({ rpc }, actor, {
      ...input,
      title: "Changed",
      review_context_sha256: await documentUploadReviewHash(actor, input),
    }),
  ).rejects.toThrow("couldn't confirm");
  expect(rpc).not.toHaveBeenCalled();
});
it("browser confirmation rejects a plausible receipt for a different attempt", () => {
  expect(() =>
    confirmDocumentUploadReservation(
      { ...reservation(), review_context_sha256: "b".repeat(64) },
      actor,
      student,
      doc,
    ),
  ).toThrow();
});
