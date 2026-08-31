function newCspNonce() {
  return typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID().replace(/-/g, "")
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Keep the per-request server nonce stable during hydration.
 *
 * The server creates the nonce. On the browser's first render, React must use
 * that same value from the already-rendered document instead of minting a
 * second nonce and reporting a hydration mismatch.
 */
export function resolveCspNonce() {
  if (typeof document !== "undefined") {
    const serverNonce = document
      .querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')
      ?.getAttribute("content");
    if (serverNonce) return serverNonce;
  }

  return newCspNonce();
}
