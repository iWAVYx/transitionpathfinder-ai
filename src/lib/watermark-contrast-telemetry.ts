/**
 * Client-side telemetry for the CT map watermark contrast safeguards.
 *
 * The watermark (`.ct-watermark-img`) is automatically dimmed or hidden when
 * a user's OS / browser / app theme indicates that a decorative image would
 * reduce text contrast. The safeguards live in `src/styles.css` and react to:
 *
 *   - `prefers-contrast: more`          (OS-level "Increase contrast")
 *   - `prefers-reduced-transparency`    (OS-level "Reduce transparency")
 *   - `forced-colors: active`           (Windows High Contrast / similar)
 *   - `.high-contrast` class on <html>  (in-app high-contrast toggle)
 *
 * This module observes those signals on the client, logs a structured entry
 * to the console whenever a safeguard is active or changes state, and emits
 * an analytics event (`watermark_safeguard_active`) so we can review which
 * pages / themes / user environments are triggering the safeguards in
 * aggregate. Fire-and-forget: never throws, never blocks render.
 */

import { track } from "@/lib/analytics-events";

export type WatermarkSafeguardReason =
  | "prefers-contrast-more"
  | "prefers-reduced-transparency"
  | "forced-colors"
  | "high-contrast-class";

export interface WatermarkSafeguardSnapshot {
  active: boolean;
  reasons: WatermarkSafeguardReason[];
  /** Final computed opacity of the watermark image after CSS cascade. */
  effectiveOpacity: number | null;
  /** Final computed display value — "none" means the image is suppressed. */
  display: string | null;
  theme: "dark" | "light";
  page: string;
  viewport: { w: number; h: number; dpr: number };
  userAgent: string;
  timestamp: string;
}

function detectReasons(): WatermarkSafeguardReason[] {
  const reasons: WatermarkSafeguardReason[] = [];
  if (typeof window === "undefined") return reasons;
  const mm = window.matchMedia;
  if (mm("(prefers-contrast: more)").matches) reasons.push("prefers-contrast-more");
  if (mm("(prefers-reduced-transparency: reduce)").matches)
    reasons.push("prefers-reduced-transparency");
  if (mm("(forced-colors: active)").matches) reasons.push("forced-colors");
  if (document.documentElement.classList.contains("high-contrast"))
    reasons.push("high-contrast-class");
  return reasons;
}

function readComputed(el: HTMLElement | null) {
  if (!el || typeof window === "undefined") return { opacity: null, display: null };
  const cs = window.getComputedStyle(el);
  const opacity = Number.parseFloat(cs.opacity);
  return {
    opacity: Number.isFinite(opacity) ? opacity : null,
    display: cs.display ?? null,
  };
}

function snapshot(el: HTMLElement | null): WatermarkSafeguardSnapshot {
  const reasons = detectReasons();
  const { opacity, display } = readComputed(el);
  return {
    active: reasons.length > 0 || display === "none",
    reasons,
    effectiveOpacity: opacity,
    display,
    theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
    page: window.location.pathname + window.location.search,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  };
}

function fingerprint(s: WatermarkSafeguardSnapshot) {
  // Collapse repeated reports for the same state into one analytics event per
  // page+theme+reason-set so we don't flood the events table on resize/scroll.
  return [
    s.page,
    s.theme,
    s.display === "none" ? "hidden" : "dimmed",
    s.reasons.slice().sort().join("|"),
  ].join("::");
}

/**
 * Observe watermark safeguards on the given element. Returns a cleanup fn.
 *
 * Logs to the console whenever a safeguard becomes active (or its reason set
 * changes) and emits a single analytics event per unique state per session.
 */
export function observeWatermarkSafeguards(el: HTMLElement | null): () => void {
  if (typeof window === "undefined") return () => {};
  if (!el) return () => {};

  const seen = new Set<string>();
  let lastKey = "";

  const evaluate = (trigger: string) => {
    // Defer one frame so any class/style mutation has been committed.
    requestAnimationFrame(() => {
      const snap = snapshot(el);
      const key = fingerprint(snap);
      if (key === lastKey) return; // state unchanged
      lastKey = key;

      if (!snap.active) {
        // Transitioned back to "safe" state — useful to know but not noisy.
        // eslint-disable-next-line no-console
        console.info(
          `%c[watermark] safeguards cleared %c(${trigger})`,
          "color:#15803d;font-weight:bold",
          "color:inherit;font-weight:normal",
          snap,
        );
        return;
      }

      // eslint-disable-next-line no-console
      console.groupCollapsed(
        `%c[watermark] contrast safeguard active%c — ${snap.reasons.join(", ") || "(forced)"} on ${snap.page}`,
        "color:#b45309;font-weight:bold",
        "color:inherit;font-weight:normal",
      );
      // eslint-disable-next-line no-console
      console.warn("Trigger :", trigger);
      // eslint-disable-next-line no-console
      console.warn("Reasons :", snap.reasons);
      // eslint-disable-next-line no-console
      console.warn("Theme   :", snap.theme);
      // eslint-disable-next-line no-console
      console.warn("Opacity :", snap.effectiveOpacity, "display:", snap.display);
      // eslint-disable-next-line no-console
      console.warn("Viewport:", snap.viewport);
      // eslint-disable-next-line no-console
      console.warn("Snapshot:", snap);
      // eslint-disable-next-line no-console
      console.groupEnd();

      if (!seen.has(key)) {
        seen.add(key);
        track("watermark_safeguard_active", {
          reasons: snap.reasons,
          theme: snap.theme,
          page: snap.page,
          effective_opacity: snap.effectiveOpacity,
          display: snap.display,
          viewport: snap.viewport,
        });
      }
    });
  };

  // Initial evaluation after mount.
  evaluate("mount");

  // Listen to every media query that drives the safeguards.
  const queries: { mql: MediaQueryList; label: string }[] = [
    { mql: window.matchMedia("(prefers-contrast: more)"), label: "prefers-contrast" },
    {
      mql: window.matchMedia("(prefers-reduced-transparency: reduce)"),
      label: "prefers-reduced-transparency",
    },
    { mql: window.matchMedia("(forced-colors: active)"), label: "forced-colors" },
    { mql: window.matchMedia("(prefers-color-scheme: dark)"), label: "prefers-color-scheme" },
  ];
  const mqHandlers = queries.map(({ mql, label }) => {
    const h = () => evaluate(`mq:${label}`);
    mql.addEventListener?.("change", h);
    return () => mql.removeEventListener?.("change", h);
  });

  // Watch <html> class changes (dark mode + high-contrast toggle).
  const classObserver = new MutationObserver(() => evaluate("html-class"));
  classObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => {
    mqHandlers.forEach((off) => off());
    classObserver.disconnect();
  };
}
