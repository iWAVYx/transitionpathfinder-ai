import type { ConsoleMessage, Page, TestInfo } from "@playwright/test";

const prefix = "TF_SCROLL_HANDOFF:";
const traces = new WeakMap<Page, { rows: unknown[]; listener: (message: ConsoleMessage) => void }>();

/** Observe DOM/lifecycle events; never patch navigation methods or read session data. */
export async function startScrollHandoffTrace(page: Page) {
  if (!["scroll-diagnosis", "remaining-role-scroll", "deep-role-history-return"].includes(process.env.STAGING_TEST_SCOPE ?? "")) return;
  const rows: unknown[] = [];
  const listener = (message: ConsoleMessage) => {
    const text = message.text();
    if (!text.startsWith(prefix) || rows.length >= 200) return;
    try {
      const row = JSON.parse(text.slice(prefix.length));
      if (!/^(click|popstate)(:frame[1-4])?$|^(scroll|focusin|pageshow|router:before-load|router:rendered|router:resolved)$/.test(row.event)
        || typeof row.pathname !== "string" || !row.pathname.startsWith("/") || /[?#]/.test(row.pathname)
        || ![row.elapsedMs, row.y, row.maximum].every(Number.isFinite)) return;
      // Whitelist fields even if another script happens to use this prefix.
      rows.push({ event: row.event, elapsedMs: row.elapsedMs, pathname: row.pathname,
        y: row.y, maximum: row.maximum,
        ...(typeof row.fromPathname === "string" && /^\/(?!\/)/.test(row.fromPathname) && !/[?#]/.test(row.fromPathname)
          ? { fromPathname: row.fromPathname } : {}),
      });
    } catch { /* Ignore unrelated output. */ }
  };
  traces.set(page, { rows, listener });
  page.on("console", listener);
  await page.addInitScript(({ prefix, lifecycle }) => {
    let count = 0;
    const sample = (event: string, fromPathname?: string) => {
      if (++count > 200) return;
      console.debug(prefix + JSON.stringify({
        event,
        ...(fromPathname ? { fromPathname } : {}),
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
    if (lifecycle) {
      // Subscribe to lifecycle notifications only. Do not replace router/history
      // methods, read loader/session data, or change scroll/cache state.
      type ObservableRouter = { subscribe: (event: string, callback: (event: { fromLocation?: { pathname: string } }) => void) => () => void };
      const deadline = performance.now() + 10000;
      const observe = () => {
        const router = (window as unknown as { __TSR_ROUTER__?: ObservableRouter }).__TSR_ROUTER__;
        if (!router) {
          if (performance.now() < deadline) requestAnimationFrame(observe);
          return;
        }
        for (const [event, name] of [["onBeforeLoad", "router:before-load"], ["onRendered", "router:rendered"], ["onResolved", "router:resolved"]]) {
          router.subscribe(event, event => sample(name, event.fromLocation?.pathname));
        }
      };
      observe();
    }
  }, { prefix, lifecycle: ["remaining-role-scroll", "deep-role-history-return"].includes(process.env.STAGING_TEST_SCOPE ?? "") });
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
