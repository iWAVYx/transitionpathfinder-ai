import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Global scroll behavior controller.
 *
 * - New page (pathname change, no hash): scroll to the very top instantly.
 * - Hash navigation: smoothly scroll the target element into view, accounting
 *   for the sticky site header (~72px) so the section heading isn't hidden.
 * - Back/forward (POP): leave the scroll position alone so TanStack Router's
 *   built-in scrollRestoration can restore it.
 *
 * Drives Lenis directly when present so smooth-scroll doesn't fight the
 * native window.scrollTo call.
 */
export function ScrollToTop() {
  const { location, resolvedLocation } = useRouterState({
    select: (s) => ({
      location: s.location,
      resolvedLocation: s.resolvedLocation,
    }),
  });

  const pathname = location.pathname;
  const hash = location.hash;
  const prevPathname = resolvedLocation?.pathname;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const lenis = window.__lenis;
    const headerOffset = 72;

    // Hash present → smooth scroll into the target (with header offset).
    if (hash) {
      const id = hash.replace(/^#/, "");
      // Defer so the new page has had a chance to paint.
      const rafId = requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) {
          if (lenis) lenis.scrollTo(0, { immediate: true });
          else window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          return;
        }
        if (lenis) {
          lenis.scrollTo(el, { offset: -headerOffset });
        } else {
          const top = el.getBoundingClientRect().top + window.scrollY - headerOffset;
          window.scrollTo({ top, behavior: "smooth" });
        }
      });
      return () => cancelAnimationFrame(rafId);
    }

    // No hash + path actually changed → reset to top of the new page.
    if (prevPathname && prevPathname !== pathname) {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      }
    }
  }, [pathname, hash, prevPathname]);

  return null;
}
