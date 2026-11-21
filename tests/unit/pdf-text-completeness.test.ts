import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ getDocument: vi.fn() }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument: api.getDocument }));
vi.mock("pdfjs-dist/legacy/build/pdf.worker.mjs?url", () => ({ default: "mock-worker" }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv("SSR", false); });
afterEach(() => vi.unstubAllEnvs());
function source(pages: number) {
  const cleanup = vi.fn(), destroy = vi.fn();
  const getPage = vi.fn(async (page: number) => ({ getTextContent: async () => ({ items: [{ str: `Evidence from page ${page}` }] }), cleanup }));
  api.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: pages, getPage }), destroy });
  return { getPage, destroy, cleanup };
}
const file = { arrayBuffer: async () => new ArrayBuffer(0) } as File;
it("reads every page up to the supported boundary and releases page/task resources", async () => {
  const mocks = source(40); const { extractPdfText } = await import("../../src/lib/browser-only-libs");
  const text = await extractPdfText(file);
  expect(text).toContain("Evidence from page 40"); expect(mocks.getPage).toHaveBeenCalledTimes(40);
  expect(mocks.cleanup).toHaveBeenCalledTimes(40); expect(mocks.destroy).toHaveBeenCalledTimes(1);
});
it("rejects an over-limit PDF before reading partial evidence and still destroys the task", async () => {
  const mocks = source(41); const { extractPdfText } = await import("../../src/lib/browser-only-libs");
  await expect(extractPdfText(file)).rejects.toThrow("Please use a shorter document or paste the relevant pages");
  expect(mocks.getPage).not.toHaveBeenCalled(); expect(mocks.destroy).toHaveBeenCalledTimes(1);
});
it("does not silently truncate with a caller-specific page limit", async () => {
  const mocks = source(3); const { extractPdfText } = await import("../../src/lib/browser-only-libs");
  await expect(extractPdfText(file, 2)).rejects.toThrow("too long"); expect(mocks.getPage).not.toHaveBeenCalled();
});
