export const ADMIN_ROUTE_ACCESS_TIMEOUT_MS = 5_000;

export type AdminRoleLookup = () => Promise<
  { isPlatformAdmin?: boolean | null } | null | undefined
>;

/**
 * Resolve a platform-admin route decision within a bounded amount of time.
 *
 * Admin routes must fail closed: a denied role, lookup error, or stalled
 * request all return false so the route can redirect before rendering owner
 * content. The underlying lookup may not support cancellation, so attach the
 * rejection handler before racing it against the timeout.
 */
export async function hasPlatformAdminRouteAccess(
  lookup: AdminRoleLookup,
  timeoutMs = ADMIN_ROUTE_ACCESS_TIMEOUT_MS,
): Promise<boolean> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return false;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const decision = Promise.resolve()
    .then(lookup)
    .then((result) => result?.isPlatformAdmin === true)
    .catch(() => false);
  const timedOut = new Promise<false>((resolve) => {
    timeout = setTimeout(() => resolve(false), timeoutMs);
  });

  try {
    return await Promise.race([decision, timedOut]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
