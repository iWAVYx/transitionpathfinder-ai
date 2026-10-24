import { expect, type Page } from "@playwright/test";

export function readScrollPosition(page: Page) {
  return page.evaluate(() => ({
    y: window.scrollY,
    maximum: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));
}

/** Measure a painted, settled source instead of racing automatic link scrolling. */
export async function captureSettledScrollPosition(page: Page) {
  let previous = await readScrollPosition(page);
  let stable = 0;
  await expect.poll(async () => {
    const current = await readScrollPosition(page);
    stable = Math.abs(current.y - previous.y) <= 1 && Math.abs(current.maximum - previous.maximum) <= 1 ? stable + 1 : 0;
    previous = current;
    return stable;
  }, { timeout: 10_000, intervals: [250], message: "Departure scroll and page height must settle before clicking" }).toBeGreaterThanOrEqual(3);
  return previous;
}
