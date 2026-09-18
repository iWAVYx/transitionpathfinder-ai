export const PUBLIC_CMS_UNAVAILABLE_MESSAGE =
  "This content is temporarily unavailable. Please try again.";

export type PublicCmsReadOperation = "page-section" | "faqs" | "blog-posts" | "blog-post";

type PublicCmsQueryError = {
  code?: unknown;
};

function safeErrorCode(error: PublicCmsQueryError): string {
  const code = error.code;
  if (typeof code !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(code)) {
    return "unknown";
  }
  return code;
}

/**
 * Public CMS failures must be observable without exposing database details to
 * visitors. Log only the operation and a constrained provider error code, then
 * return a stable, non-sensitive message to the route.
 */
export function throwIfPublicCmsReadFailed(
  error: PublicCmsQueryError | null | undefined,
  operation: PublicCmsReadOperation,
): void {
  if (!error) return;

  console.error("[public-cms] read failed", {
    operation,
    code: safeErrorCode(error),
  });
  throw new Error(PUBLIC_CMS_UNAVAILABLE_MESSAGE);
}
