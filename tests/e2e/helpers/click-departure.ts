import type { Locator } from "@playwright/test";

/** Capture after native focus/auto-scroll, before the clicked route handler runs. */
export async function clickWithDeparturePosition(link: Locator) {
  const [departure] = await Promise.all([
    link.evaluate(element => new Promise<{ sourceHref: string; y: number; maximum: number }>(resolve => {
      element.addEventListener("click", () => resolve({
        sourceHref: window.location.href,
        y: window.scrollY,
        maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      }), { capture: true, once: true });
    })),
    link.click(),
  ]);
  return departure;
}
