import { useEffect } from "react";
import { useElementScrollRestoration, useRouterState } from "@tanstack/react-router";

/** Complete router restoration after async tools have grown to their saved height. */
export function ScrollToTop() {
  const location = useRouterState({ select: (s) => s.location });
  const position = useElementScrollRestoration({
    getElement: () => (typeof window === "undefined" ? undefined : window),
    getKey: (location) => location.href,
  });

  useEffect(() => {
    const targetY = position?.scrollY;
    const targetX = position?.scrollX ?? 0;
    if (targetY === undefined && !location.hash) return;
    let stopped = false;
    let frame = 0;
    const stop = () => {
      stopped = true;
      observer.disconnect();
      mutations.disconnect();
      cancelAnimationFrame(frame);
    };
    const restore = () => {
      if (stopped) return;
      let hashId = location.hash.replace(/^#/, "");
      try {
        hashId = decodeURIComponent(hashId);
      } catch {
        /* Keep malformed fragments literal. */
      }
      const hashTarget = hashId ? document.getElementById(hashId) : null;
      const y =
        targetY ??
        (hashTarget ? hashTarget.getBoundingClientRect().top + window.scrollY - 112 : undefined);
      if (y === undefined) return;
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      // Saved positions may need async content to grow. Anchors already in the
      // DOM should instead reach the nearest possible position, including the footer.
      if (targetY !== undefined && y > maxY) return;
      const destination = Math.max(0, Math.min(y, maxY));
      if (window.__lenis) window.__lenis.scrollTo(destination, { immediate: true, force: true });
      else window.scrollTo({ top: destination, left: targetX, behavior: "instant" });
      stop();
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(restore);
    };
    const observer = new ResizeObserver(schedule);
    const mutations = new MutationObserver(schedule);
    observer.observe(document.body);
    mutations.observe(document.body, { childList: true, subtree: true });
    schedule();
    // User intent takes precedence over a late response or changing page height.
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);
    const timeout = window.setTimeout(stop, 10000);
    return () => {
      stop();
      clearTimeout(timeout);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [location.href, location.hash, position?.scrollY, position?.scrollX]);
  return null;
}
