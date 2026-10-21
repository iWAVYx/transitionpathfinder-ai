import type { ConsoleMessage, Page, TestInfo } from "@playwright/test";

const prefix = "TF_SCROLL_HANDOFF:";
const traces = new WeakMap<Page, { rows: unknown[]; listener: (message: ConsoleMessage) => void }>();

/** Observe DOM events only; never patch scroll/history methods or read session data. */
export async function startScrollHandoffTrace(page: Page) {
  if (process.env.STAGING_TEST_SCOPE !== "scroll-diagnosis") return;
  const rows: unknown[] = [];
  const listener = (message: ConsoleMessage) => {
    const text = message.text();
    if (!text.startsWith(prefix) || rows.length >= 200) return;
    try {
      const row = JSON.parse(text.slice(prefix.length));
      if (!/^(click|popstate)(:frame[1-4])?$|^(scroll|focusin|pageshow)$/.test(row.event)
        || typeof row.pathname !== "string" || !row.pathname.startsWith("/") || /[?#]/.test(row.pathname)
        || ![row.elapsedMs, row.y, row.maximum].every(Number.isFinite)) return;
      // Whitelist fields even if another script happens to use this prefix.
      rows.push({ event: row.event, elapsedMs: row.elapsedMs, pathname: row.pathname,
        y: row.y, maximum: row.maximum });
    } catch { /* Ignore unrelated output. */ }
  };
  traces.set(page, { rows, listener });
  page.on("console", listener);
  await page.addInitScript(({ prefix }) => {
    let count = 0;
    const sample = (event: string) => {
      if (++count > 200) return;
      console.debug(prefix + JSON.stringify({
        event,
        elapsedMs: Math.round(performance.now()),
        pathname: location.pathname,
        y: window.scrollY,
        maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
      }));
    };
    const frames = (event: string) => {
      sample(event);
      let frame = 0;
      const next = () => {
        sample(`${event}:frame${++frame}`);
        if (frame < 4) requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    };
    document.addEventListener("click", () => frames("click"), { capture: true, passive: true });
    document.addEventListener("scroll", () => sample("scroll"), { capture: true, passive: true });
    document.addEventListener("focusin", () => sample("focusin"), { capture: true, passive: true });
    window.addEventListener("popstate", () => frames("popstate"), { passive: true });
    window.addEventListener("pageshow", () => sample("pageshow"), { passive: true });
  }, { prefix });
}

export async function attachScrollHandoffTrace(page: Page, testInfo: TestInfo) {
  const trace = traces.get(page);
  if (!trace) return;
  page.off("console", trace.listener);
  traces.delete(page);
  await testInfo.attach("scroll-handoff", {
    contentType: "application/json",
    body: JSON.stringify(trace.rows, null, 2),
  });
}
