/** Diagnostics permit only same-origin public JS paths, never query credentials. */
export function publicModulePath(rawUrl: string, expectedOrigin: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    if (url.origin !== expectedOrigin || !url.pathname.startsWith("/assets/") || !url.pathname.endsWith(".js")) return;
    return url.pathname;
  } catch {
    return;
  }
}
