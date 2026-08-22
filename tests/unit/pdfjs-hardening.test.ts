import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const browserLibraries = readFileSync(resolve(root, "src/lib/browser-only-libs.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

describe("PDF.js hardening", () => {
  it("keeps untrusted uploads on the text-only API without a scripting viewer", () => {
    expect(browserLibraries).toContain("getTextContent");
    expect(browserLibraries).not.toMatch(/AnnotationLayer|PDFViewer|pdf\.sandbox/);
  });

  it("bundles the worker from the reviewed package instead of a runtime CDN", () => {
    expect(browserLibraries).toContain("pdfjs-dist/legacy/build/pdf.worker.mjs?url");
    expect(browserLibraries).not.toContain("cdn.jsdelivr.net");
  });

  it("requires the patched PDF.js release", () => {
    expect(packageJson.dependencies["pdfjs-dist"]).toBe("^6.2.108");
  });
});
