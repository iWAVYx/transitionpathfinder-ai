// No provider/storage SDK dependency: the worker supplies narrowly scoped IO.
// Missing receipts or uncertain completion stop; this module never retries AI.
import { redactSensitiveText, type SensitiveTextContext } from "./sensitive-text-redaction.ts";
export const SUMMARY_REVIEW_MESSAGE = "This document summary needs review before another attempt.";
export const MAX_SUMMARY_BYTES = 1024 * 1024;
export const MAX_SUMMARY_TEXT = 200_000;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sha = /^[0-9a-f]{64}$/;
const keys = ["key_findings", "strengths_identified", "needs_identified", "goals_identified", "important_dates", "missing_information", "recommended_followups"];
type Receipt = { data: unknown; error: unknown };
export type SummaryClaim = { id: string; at: string; attempt: number };
export type SummarySource = {
  job_id: string; claim_at: string; claim_attempt: number;
  document_id: string; student_id: string; actor_id: string;
  storage_path: string; object_id: string; object_version: string;
  content_sha256: string; context: SensitiveTextContext;
};
export type SummaryIO = {
  readSource: () => Promise<Receipt>;
  info: (path: string) => Promise<Receipt>;
  download: (path: string) => Promise<Receipt>;
  generate: (text: string, source: SummarySource) => Promise<unknown>;
  commit: (source: SummarySource, payload: Record<string, unknown>) => Promise<Receipt>;
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(SUMMARY_REVIEW_MESSAGE);
  return value as Record<string, unknown>;
}
function data(receipt: Receipt) {
  if (!receipt || receipt.error !== null) throw new Error(SUMMARY_REVIEW_MESSAGE);
  return record(receipt.data);
}
function source(receipt: Receipt, claim: SummaryClaim): SummarySource {
  const row = data(receipt);
  if (row.schema !== "verified-document-summary-source-v1" || row.job_id !== claim.id ||
      row.claim_attempt !== claim.attempt || typeof row.claim_at !== "string" ||
      Date.parse(row.claim_at) !== Date.parse(claim.at)) throw new Error(SUMMARY_REVIEW_MESSAGE);
  for (const key of ["document_id", "student_id", "actor_id", "object_id"]) {
    if (typeof row[key] !== "string" || !uuid.test(row[key] as string)) throw new Error(SUMMARY_REVIEW_MESSAGE);
  }
  if (typeof row.content_sha256 !== "string" || !sha.test(row.content_sha256) ||
      typeof row.object_version !== "string" || !row.object_version.trim() || row.object_version.length > 1024 ||
      typeof row.storage_path !== "string" || row.storage_path.length > 500 ||
      !new RegExp(`^${row.student_id}/(?:[A-Za-z0-9._-]+-)?privacy-safe-document[.]txt$`).test(row.storage_path)) throw new Error(SUMMARY_REVIEW_MESSAGE);
  const rawContext = record(row.context);
  const context: SensitiveTextContext = {};
  for (const key of ["studentFirstName", "studentLastName", "schoolName", "dateOfBirth"] as const) {
    const value = rawContext[key];
    if (value !== null && (typeof value !== "string" || value.length > 300)) throw new Error(SUMMARY_REVIEW_MESSAGE);
    context[key] = value;
  }
  return {
    job_id: claim.id, claim_at: row.claim_at, claim_attempt: claim.attempt,
    document_id: row.document_id as string, student_id: row.student_id as string, actor_id: row.actor_id as string,
    object_id: row.object_id as string, object_version: row.object_version,
    storage_path: row.storage_path, content_sha256: row.content_sha256, context,
  };
}
function sameSource(a: SummarySource, b: SummarySource) {
  for (const key of ["document_id", "student_id", "actor_id", "object_id", "object_version", "storage_path", "content_sha256"] as const) {
    if (a[key] !== b[key]) throw new Error(SUMMARY_REVIEW_MESSAGE);
  }
  // A changed privacy context also requires a fresh reviewed run.
  if (JSON.stringify(a.context) !== JSON.stringify(b.context)) throw new Error(SUMMARY_REVIEW_MESSAGE);
}
function info(receipt: Receipt, expected: SummarySource): number {
  const row = data(receipt);
  if (row.id !== expected.object_id || row.version !== expected.object_version || row.name !== expected.storage_path ||
      row.bucket_id !== "student-documents" || !Number.isSafeInteger(row.size) || (row.size as number) < 1 ||
      (row.size as number) > MAX_SUMMARY_BYTES || (row.content_type !== undefined && row.content_type !== "text/plain")) throw new Error(SUMMARY_REVIEW_MESSAGE);
  return row.size as number;
}
function result(value: unknown, context: SensitiveTextContext): Record<string, unknown> {
  const row = record(value);
  if (Object.keys(row).length !== keys.length || Object.keys(row).some(key => !keys.includes(key))) throw new Error(SUMMARY_REVIEW_MESSAGE);
  const clean: Record<string, unknown> = {};
  for (const key of keys) {
    const items = row[key];
    if (!Array.isArray(items) || items.length > 12) throw new Error(SUMMARY_REVIEW_MESSAGE);
    clean[key] = items.map(item => {
      if (typeof item !== "string" || !item.trim() || item.length > 1500) throw new Error(SUMMARY_REVIEW_MESSAGE);
      return redactSensitiveText(item, context).text;
    });
  }
  if (JSON.stringify(clean).length > 30_000) throw new Error(SUMMARY_REVIEW_MESSAGE);
  return clean;
}
export async function processVerifiedDocumentSummary(claim: SummaryClaim, io: SummaryIO) {
  try {
    if (typeof claim.id !== "string" || !uuid.test(claim.id) || !Number.isSafeInteger(claim.attempt) || claim.attempt < 1 ||
        typeof claim.at !== "string" || !Number.isFinite(Date.parse(claim.at))) throw new Error(SUMMARY_REVIEW_MESSAGE);
    const current = source(await io.readSource(), claim);
    const size = info(await io.info(current.storage_path), current);
    const stored = await io.download(current.storage_path);
    if (stored.error !== null || !(stored.data instanceof Blob) || stored.data.size !== size) throw new Error(SUMMARY_REVIEW_MESSAGE);
    const bytes = await stored.data.arrayBuffer();
    if (bytes.byteLength !== size) throw new Error(SUMMARY_REVIEW_MESSAGE);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (fingerprint !== current.content_sha256) throw new Error(SUMMARY_REVIEW_MESSAGE);
    if (info(await io.info(current.storage_path), current) !== size) throw new Error(SUMMARY_REVIEW_MESSAGE);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (!text.trim() || text.length > MAX_SUMMARY_TEXT || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) throw new Error(SUMMARY_REVIEW_MESSAGE);
    const safeText = redactSensitiveText(text, current.context).text;
    sameSource(current, source(await io.readSource(), claim));
    const generated = result(await io.generate(safeText, current), current.context);
    if (info(await io.info(current.storage_path), current) !== size) throw new Error(SUMMARY_REVIEW_MESSAGE);
    const payload = {
      ...generated,
      _source: { document_id: current.document_id, object_id: current.object_id, object_version: current.object_version, content_sha256: current.content_sha256 },
      _disclaimer: "This draft summarizes reported information. Review it against the source and with the school team; it is not a legal, clinical or official IEP determination.",
      _prompt_version: "verified-document-summary-v1",
    };
    sameSource(current, source(await io.readSource(), claim));
    const committed = data(await io.commit(current, payload));
    if (committed.schema !== "verified-document-summary-commit-v1" || committed.job_id !== claim.id ||
        committed.status !== "completed" || committed.document_id !== current.document_id ||
        committed.actor_id !== current.actor_id || committed.student_id !== current.student_id ||
        committed.content_sha256 !== current.content_sha256) throw new Error(SUMMARY_REVIEW_MESSAGE);
    return { document_id: current.document_id, student_id: current.student_id, actor_id: current.actor_id, content_sha256: current.content_sha256 };
  } catch {
    // No private source/provider/database diagnostics and no automatic retry.
    throw new Error(SUMMARY_REVIEW_MESSAGE);
  }
}
