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
  const allStatuses: number[] = [];
  let started = 0;
  let finished = 0;
  let failedRequests = 0;
  return {
    started() { started = Math.min(started + 1, 16); },
    finished() { finished = Math.min(finished + 1, 16); },
    response(status: number) {
      if (Number.isInteger(status) && status >= 100 && status <= 599 && allStatuses.length < 16)
        allStatuses.push(status);
      if (Number.isInteger(status) && status >= 400 && status <= 599 && statuses.length < 16)
        statuses.push(status);
    },
    failed() { failedRequests = Math.min(failedRequests + 1, 16); },
    snapshot(error: unknown) {
      return { primaryFailureKind: creatorFailureKind(error), failedPostStatuses: [...statuses], failedPostRequests: failedRequests, postResponseStatuses: [...allStatuses], startedPostRequests: started, finishedPostRequests: finished, pendingPostRequests: Math.max(0, started - finished - failedRequests) };
    },
  };
}

/** Fixed categories only; never retain the path, query or report/student ID. */
export function creatorCompletionSurface(pathname: string, completionAlert: boolean) {
  return {
    page: pathname === "/pathway" ? "builder" : /^\/reports\/[0-9a-f-]{36}$/i.test(pathname) ? "report" : "other",
    completionAlert,
  };
}
