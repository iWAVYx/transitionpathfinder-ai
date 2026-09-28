// /admin remains a protected compatibility address for the same Owner Hub
// dashboard rendered at /owner. Neither address is a deeper tool page.
export function isOwnerHubHomePath(pathname: string): boolean {
  return /^\/(?:owner|admin)\/?$/.test(pathname);
}
