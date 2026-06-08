/**
 * Client-side diagnostics for HMR / Vite dep-reoptimization failures.
 *
 * Symptom this targets:
 *   "Failed to fetch dynamically imported module: .../@id/virtual:tanstack-start-client-entry"
 *   "Importing a module script failed."
 *   "error loading dynamically imported module"
 *
 * These almost always mean Vite re-optimized deps (or a file was edited) and
 * the previously-loaded page is now pointing at a chunk URL that no longer
 * exists. The fix is a full reload — but the default browser log is opaque,
 * so we enrich it with the failing URL, current route, build/session id, and
 * Vite HMR state, then offer an automatic one-time reload in dev.
 */

const STALE_IMPORT_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

const RELOAD_FLAG = "__hmr_stale_reload_at__";
const RELOAD_COOLDOWN_MS = 10_000;

function isStaleImportError(reason: unknown): { matched: boolean; message: string; url?: string } {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : (() => {
            try {
              return JSON.stringify(reason);
            } catch {
              return String(reason);
            }
          })();

  const matched = STALE_IMPORT_PATTERNS.some((rx) => rx.test(message));
  const urlMatch = message.match(/https?:\/\/[^\s"']+/);
  return { matched, message, url: urlMatch?.[0] };
}

function snapshot() {
  return {
    route: typeof window !== "undefined" ? window.location.pathname + window.location.search : "n/a",
    href: typeof window !== "undefined" ? window.location.href : "n/a",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    timestamp: new Date().toISOString(),
    // Vite injects this on the client during dev.
    viteHotAvailable: typeof (import.meta as { hot?: unknown }).hot !== "undefined",
    isDev: import.meta.env.DEV,
  };
}

function logStaleImport(label: string, message: string, url: string | undefined, reason: unknown) {
  const ctx = snapshot();
  // Use a collapsed group so the noise doesn't drown the real signal.
  // eslint-disable-next-line no-console
  console.groupCollapsed(
    `%c[HMR] ${label}: stale dynamic import%c — ${url ?? "(no url in message)"}`,
    "color:#b45309;font-weight:bold",
    "color:inherit;font-weight:normal",
  );
  // eslint-disable-next-line no-console
  console.warn("Message :", message);
  // eslint-disable-next-line no-console
  console.warn("Failing :", url ?? "(unparsed)");
  // eslint-disable-next-line no-console
  console.warn("Context :", ctx);
  // eslint-disable-next-line no-console
  console.warn(
    "Why     : Vite likely re-optimized dependencies or you edited a file " +
      "while this tab was open. The chunk URL the page is holding no longer exists.",
  );
  // eslint-disable-next-line no-console
  console.warn("Fix     : Hard refresh (Cmd/Ctrl+Shift+R). In dev we auto-reload once.");
  if (reason instanceof Error && reason.stack) {
    // eslint-disable-next-line no-console
    console.warn("Stack   :", reason.stack);
  }
  // eslint-disable-next-line no-console
  console.groupEnd();
}

function maybeAutoReload() {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  try {
    const last = Number(sessionStorage.getItem(RELOAD_FLAG) ?? 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) {
      // eslint-disable-next-line no-console
      console.warn("[HMR] Skipping auto-reload (cooldown active). Refresh manually.");
      return;
    }
    sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
    // eslint-disable-next-line no-console
    console.warn("[HMR] Auto-reloading in 250ms to recover from stale import…");
    setTimeout(() => window.location.reload(), 250);
  } catch {
    // sessionStorage can throw in private mode; fall through silently.
  }
}

let installed = false;

export function installHmrDiagnostics() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    const { matched, message, url } = isStaleImportError(event.error ?? event.message);
    if (!matched) return;
    logStaleImport("window.onerror", message, url, event.error);
    maybeAutoReload();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const { matched, message, url } = isStaleImportError(event.reason);
    if (!matched) return;
    logStaleImport("unhandledrejection", message, url, event.reason);
    maybeAutoReload();
  });

  // Vite-specific HMR signals. These are dev-only and best-effort.
  const hot = (import.meta as { hot?: { on?: (event: string, cb: (payload: unknown) => void) => void } }).hot;
  if (hot?.on) {
    hot.on("vite:error", (payload) => {
      // eslint-disable-next-line no-console
      console.warn("[HMR] vite:error", payload, snapshot());
    });
    hot.on("vite:beforeFullReload", (payload) => {
      // eslint-disable-next-line no-console
      console.info("[HMR] vite:beforeFullReload — Vite is doing a full reload.", payload);
    });
    hot.on("vite:invalidate", (payload) => {
      // eslint-disable-next-line no-console
      console.info("[HMR] vite:invalidate", payload);
    });
  }
}
