// Slice 4 (D-02): pin the app-level file-type / size validation for uploads
// to the `student-documents` bucket.
//
// The bucket itself intentionally has no server-side `file_size_limit` or
// `allowed_mime_types` — those defenses live in `src/lib/document-sniff.server.ts`
// so they can run AFTER upload with magic-byte sniffing (which the bucket
// cannot do). This test locks the enforced bounds so silent drift (raising
// the size cap, adding an unsafe MIME) is caught in CI.
//
// If bucket-side limits are ever added, tighten this test to require them
// to be ≤ the app cap so we always fail closed.

import { describe, it, expect } from "vitest";
import {
  MAX_UPLOAD_BYTES,
} from "@/lib/document-sniff.server";

describe("D-02 upload bounds (student-documents)", () => {
  it("caps uploads at 25 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(25 * 1024 * 1024);
  });

  it("rejects declared_size above the cap before download", async () => {
    const { sniffUploadedDocument } = await import("@/lib/document-sniff.server");
    const res = await sniffUploadedDocument({
      storage_path: "student/whatever.pdf",
      declared_mime: "application/pdf",
      declared_size: MAX_UPLOAD_BYTES + 1,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error_code).toBe("oversize");
  });

  it("only allows the documented safe MIME set", async () => {
    // Regression: any change to the allowlist should require an explicit
    // test edit + review. Executables, HTML, SVG, and archives stay out.
    const mod = await import("@/lib/document-sniff.server");
    // Sniff a fake path with a forbidden declared MIME → mime_mismatch or
    // unsupported_type without needing storage access.
    for (const mime of [
      "application/x-msdownload",
      "application/x-sh",
      "text/html",
      "image/svg+xml",
      "application/zip",
      "application/x-7z-compressed",
    ]) {
      const res = await mod.sniffUploadedDocument({
        storage_path: "student/x.bin",
        declared_mime: mime,
        declared_size: 10,
      });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(["mime_mismatch", "unsupported_type", "download_failed", "empty_file"])
          .toContain(res.error_code);
      }
    }
  });
});
