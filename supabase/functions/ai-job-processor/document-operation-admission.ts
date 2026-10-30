// Worker-local, SDK-free protocol helpers. No app-source imports, provider
// retries, hold expiry or cleanup capability. Queued document summaries use
// the atomic claim and continuation helpers; the fresh-call adapter remains
// available for isolated protocol parity, not summary dispatch.
const uuid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
type RpcClient = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
export class SummaryAdmissionError extends Error {
  readonly reconciliationRequired = true;
  constructor(readonly phase: "admission" | "work" | "completion") {
    super("This document summary needs review before another attempt.");
    this.name = "SummaryAdmissionError";
  }
}
function exact(value: unknown, fields: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).length !== fields.length || Object.keys(value).some(key => !fields.includes(key))) throw new Error();
  return value as Record<string, unknown>;
}
function identity(value: unknown): string {
  if (typeof value !== "string" || !uuid.test(value)) throw new Error();
  return value;
}
/** The metadata service capability and receipt never enter the work callback.
 * Lost begin means no work/finish. Work errors get one needs_review finish;
 * uncertain finish never retries or reports success, even after a real commit. */
export async function runAdmittedSummaryOperation<T>(serviceClient: unknown, actorId: string, work: () => Promise<T>): Promise<T> {
  let operation: string, actor: string, receipt: string;
  const client = serviceClient as RpcClient;
  try {
    actor = identity(actorId);
    if (typeof work !== "function") throw new Error();
    operation = identity(crypto.randomUUID());
    const result = await client.rpc("begin_document_operation", {
      _operation_id: operation, _actor_id: actor, _operation_kind: "summary",
    });
    const row = exact(result.data, ["schema", "operation_id", "receipt_id", "revision"]);
    if (result.error || row.schema !== "document-operation-admitted-v1" || identity(row.operation_id) !== operation ||
        !Number.isSafeInteger(row.revision) || (row.revision as number) < 1) throw new Error();
    receipt = identity(row.receipt_id);
  } catch { throw new SummaryAdmissionError("admission"); }
  const finish = async (outcome: "completed" | "needs_review") => {
    const result = await client.rpc("finish_document_operation", {
      _operation_id: operation, _actor_id: actor, _receipt_id: receipt, _outcome: outcome,
    });
    const row = exact(result.data, ["schema", "operation_id", "state"]);
    if (result.error || row.schema !== "document-operation-finished-v1" || identity(row.operation_id) !== operation || row.state !== outcome) throw new Error();
  };
  let value: T;
  try { value = await work(); }
  catch {
    try { await finish("needs_review"); } catch { /* Retain active work for trusted reconciliation. */ }
    throw new SummaryAdmissionError("work");
  }
  try { await finish("completed"); } catch { throw new SummaryAdmissionError("completion"); }
  return value;
}

export type SummaryOperationClaim = Readonly<{
  schema: "document-summary-operation-claim-v1";
  job_id: string; claim_at: string; claim_attempt: number;
  actor_id: string; student_id: string; document_id: string;
  object_id: string; object_version: string; storage_path: string; content_sha256: string;
  operation_id: string; receipt_id: string; revision: number;
}>;
/** Strict service receipt parser. No partial/foreign capability may dispatch
 * work or be used to finish an uncertain claim. */
export function confirmSummaryOperationClaim(value: unknown, expected: {
  jobId: string; attempt: number; at?: string; actorId?: string; studentId?: string;
}): SummaryOperationClaim {
  try {
    identity(expected.jobId);
    if (!Number.isSafeInteger(expected.attempt) || expected.attempt < 1) throw new Error();
    const row = exact(value, ["schema", "job_id", "claim_at", "claim_attempt", "actor_id", "student_id", "document_id",
      "object_id", "object_version", "storage_path", "content_sha256", "operation_id", "receipt_id", "revision"]);
    if (row.schema !== "document-summary-operation-claim-v1" || identity(row.job_id) !== expected.jobId ||
        row.claim_attempt !== expected.attempt || typeof row.claim_at !== "string" ||
        !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(row.claim_at) || !Number.isFinite(Date.parse(row.claim_at)) ||
        (expected.at !== undefined && row.claim_at !== expected.at)) throw new Error();
    for (const key of ["actor_id", "student_id", "document_id", "object_id", "operation_id", "receipt_id"]) identity(row[key]);
    if ((expected.actorId !== undefined && row.actor_id !== identity(expected.actorId)) ||
        (expected.studentId !== undefined && row.student_id !== identity(expected.studentId)) ||
        !Number.isSafeInteger(row.revision) || (row.revision as number) < 1 ||
        typeof row.object_version !== "string" || !row.object_version.trim() || row.object_version.length > 1024 ||
        typeof row.content_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.content_sha256) ||
        typeof row.storage_path !== "string" || row.storage_path.length > 500 ||
        !new RegExp(`^${row.student_id}/(?:[A-Za-z0-9._-]+-)?privacy-safe-document[.]txt$`).test(row.storage_path)) throw new Error();
    // Clone/freeze so later mutation of a transport object cannot change the
    // private finish identity after validation.
    return Object.freeze({ ...row }) as SummaryOperationClaim;
  } catch { throw new SummaryAdmissionError("admission"); }
}

/** One atomic claim RPC; no legacy PATCH/begin fallback, automatic retry,
 * capability recovery, source read or finish after a lost/invalid response. */
export async function claimAdmittedSummaryOperation(serviceClient: unknown, job: {
  id: string; student_id: string | null; triggered_by_user_id: string; attempts: number;
}): Promise<SummaryOperationClaim> {
  try {
    const jobId = identity(job.id), actorId = identity(job.triggered_by_user_id), studentId = identity(job.student_id);
    if (!Number.isSafeInteger(job.attempts) || job.attempts < 0 || job.attempts >= 2147483647) throw new Error();
    const result = await (serviceClient as RpcClient).rpc("claim_admitted_document_summary", {
      _job_id: jobId, _expected_attempt: job.attempts,
    });
    if (result.error !== null) throw new Error();
    return confirmSummaryOperationClaim(result.data, { jobId, actorId, studentId, attempt: job.attempts + 1 });
  } catch { throw new SummaryAdmissionError("admission"); }
}

/** Continue the operation admitted by the atomic SQL claim. The callback gets
 * no service client/capability. Its domain commit must be independently verified
 * before resolving. A failed finish can already be committed: never repeat it. */
export async function runClaimedSummaryOperation<T>(serviceClient: unknown, value: SummaryOperationClaim, work: () => Promise<T>): Promise<T> {
  const claim = confirmSummaryOperationClaim(value, { jobId: value?.job_id, at: value?.claim_at, attempt: value?.claim_attempt });
  if (typeof work !== "function") throw new SummaryAdmissionError("admission");
  const client = serviceClient as RpcClient;
  const finish = async (outcome: "completed" | "needs_review") => {
    const result = await client.rpc("finish_document_operation", {
      _operation_id: claim.operation_id, _actor_id: claim.actor_id, _receipt_id: claim.receipt_id, _outcome: outcome,
    });
    if (result.error !== null) throw new Error();
    const row = exact(result.data, ["schema", "operation_id", "state"]);
    if (row.schema !== "document-operation-finished-v1" || identity(row.operation_id) !== claim.operation_id || row.state !== outcome) throw new Error();
  };
  let result: T;
  try { result = await work(); }
  catch {
    try { await finish("needs_review"); } catch { /* retain active work for reconciliation */ }
    throw new SummaryAdmissionError("work");
  }
  try { await finish("completed"); } catch { throw new SummaryAdmissionError("completion"); }
  return result;
}
