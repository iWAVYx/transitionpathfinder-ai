/** Bounded metadata only. Never retain URLs, bodies, headers, messages or stacks. */
export function creatorFailureKind(error: unknown): "timeout" | "assertion" | "error" | "unknown" {
  if (!error || typeof error !== "object") return "unknown";
  const name = (error as { name?: unknown }).name;
  if (name === "TimeoutError") return "timeout";
  if (name === "AssertionError" || name === "ExpectError") return "assertion";
  if (error instanceof Error) return "error";
  return "unknown";
}

export function creatorTransportDiagnostics() {
  const statuses: number[] = [];
  let failedRequests = 0;
  return {
    response(status: number) {
      if (Number.isInteger(status) && status >= 400 && status <= 599 && statuses.length < 16)
        statuses.push(status);
    },
    failed() { failedRequests = Math.min(failedRequests + 1, 16); },
    snapshot(error: unknown) {
      return { primaryFailureKind: creatorFailureKind(error), failedPostStatuses: [...statuses], failedPostRequests: failedRequests };
    },
  };
}
