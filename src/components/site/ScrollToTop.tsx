import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * Global scroll behavior controller.
 *
 * - New page (pathname change, no hash): scroll to the very top instantly.
 * - Hash navigation: smoothly scroll the target element into view, accounting
 *   for the sticky site header (~64px) so the section heading isn't hidden.
 * - Back/forward (POP): leave the scroll position alone so TanStack Router's
 *   built-in scrollRestoration can restore it.
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

    // Hash present → smooth scroll into the target (with header offset).
    if (hash) {
      const id = hash.replace(/^#/, "");
      // Defer so the new page has had a chance to paint.
      const id1 = requestAnimationFrame(() => {
        const el = document.getElementById(id);
        if (!el) {
          // Fallback: nothing matches, just go to top.
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
          return;
        }
        const headerOffset = 72; // sticky header height + small breathing room
        const top =
          el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top, behavior: "smooth" });
      });
      return () => cancelAnimationFrame(id1);
    }

    // No hash + path actually changed → reset to top of the new page.
    if (prevPathname && prevPathname !== pathname) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname, hash, prevPathname]);

  return null;
}
