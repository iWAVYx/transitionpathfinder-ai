import { z } from "zod";

/** Shared service-side adapter. This does not authorize student access, pause
 * legacy handlers or prove provider completion. Callers must establish current
 * viewer/student/source authority before admitting a fixed operation kind and
 * return from work only after validating their own completion receipts. */
const identity = z.string().uuid();
const operationKind = z.enum(["register", "rescan", "apply", "summary"]);
export type DocumentOperationKind = z.infer<typeof operationKind>;
type RpcClient = {
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
};
const admitted = z.object({
  schema: z.literal("document-operation-admitted-v1"),
  operation_id: identity,
  receipt_id: identity,
  revision: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
}).strict();
const finished = z.object({
  schema: z.literal("document-operation-finished-v1"),
  operation_id: identity,
  state: z.enum(["completed", "needs_review"]),
}).strict();
const startMessage = "We couldn't confirm that document work can start. Check its status before trying again.";
const completionMessage = "We couldn't confirm that this document work finished. Check its status before trying again.";
export class DocumentOperationAdmissionError extends Error {
  readonly phase: "admission" | "work" | "completion";
  readonly reconciliationRequired = true;
  constructor(phase: DocumentOperationAdmissionError["phase"]) {
    super(phase === "admission" ? startMessage : completionMessage);
    this.name = "DocumentOperationAdmissionError";
    this.phase = phase;
  }
}

/** No retry, expiry, resume, raw-table mutation or privileged work client is
 * provided to the callback. The service client is used for admission RPCs only.
 * A lost/malformed begin reply can leave an active backend receipt: never run
 * work or try to clear an unknown receipt. A failed finish can already have
 * committed: never issue a second finish or return an unconfirmed success. */
export async function runAdmittedDocumentOperation<T>(
  input: { serviceClient: unknown; actorId: string; kind: DocumentOperationKind },
  work: () => Promise<T>,
): Promise<T> {
  const actor = identity.safeParse(input?.actorId);
  const kind = operationKind.safeParse(input?.kind);
  if (!actor.success || !kind.success || typeof work !== "function") {
    throw new DocumentOperationAdmissionError("admission");
  }
  let operationId: string;
  let lease: z.infer<typeof admitted>;
  const client = input.serviceClient as RpcClient;
  try {
    operationId = identity.parse(crypto.randomUUID());
    const result = await client.rpc("begin_document_operation", {
      _operation_id: operationId, _actor_id: actor.data, _operation_kind: kind.data,
    });
    const parsed = admitted.safeParse(result.data);
    if (result.error || !parsed.success || parsed.data.operation_id !== operationId) throw new Error();
    lease = parsed.data;
  } catch {
    // The start may have committed. No work, cleanup or automatic replay.
    throw new DocumentOperationAdmissionError("admission");
  }
  const finish = async (outcome: "completed" | "needs_review") => {
    const result = await client.rpc("finish_document_operation", {
      _operation_id: operationId, _actor_id: actor.data,
      _receipt_id: lease.receipt_id, _outcome: outcome,
    });
    const parsed = finished.safeParse(result.data);
    if (result.error || !parsed.success || parsed.data.operation_id !== operationId || parsed.data.state !== outcome) throw new Error();
  };
  let value: T;
  try {
    value = await work();
  } catch {
    // One best-effort uncertainty record; a failed write leaves active work
    // counted. Never replace the primary safe error with provider/private text.
    try { await finish("needs_review"); } catch { /* trusted reconciliation required */ }
    throw new DocumentOperationAdmissionError("work");
  }
  try {
    await finish("completed");
  } catch {
    throw new DocumentOperationAdmissionError("completion");
  }
  return value;
}
