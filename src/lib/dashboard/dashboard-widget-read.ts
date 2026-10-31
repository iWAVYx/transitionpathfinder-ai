/** Bound read-only dashboard summaries so a stalled request can be retried. */
export const DASHBOARD_WIDGET_READ_TIMEOUT_MS = 20_000;

export async function readDashboardWidget<T>(
  querySignal: AbortSignal,
  read: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  const interrupted = new Promise<never>((_resolve, reject) => {
    cancel = () => {
      reject(new Error("Dashboard request cancelled."));
      controller.abort();
    };
    querySignal.addEventListener("abort", cancel, { once: true });
    if (querySignal.aborted) {
      cancel();
      return;
    }
    timer = setTimeout(() => {
      reject(new Error("This dashboard summary is taking too long. Please try again."));
      controller.abort();
    }, DASHBOARD_WIDGET_READ_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      interrupted,
      Promise.resolve().then(() => {
        if (controller.signal.aborted) throw new Error("Dashboard request cancelled.");
        return read(controller.signal);
      }),
    ]);
  } finally {
    clearTimeout(timer);
    querySignal.removeEventListener("abort", cancel);
  }
}
