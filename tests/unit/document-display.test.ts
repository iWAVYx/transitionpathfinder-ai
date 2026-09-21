import { describe, expect, it } from "vitest";
import { formatDocumentTypeLabel, normalizeDocumentType } from "@/lib/document-display";

describe("legacy document display compatibility", () => {
  it.each([null, undefined, "", "   "])("normalizes %j to the safe fallback", (value) => {
    expect(normalizeDocumentType(value)).toBe("other");
    expect(formatDocumentTypeLabel(value)).toBe("other");
  });

  it("keeps known document types readable", () => {
    expect(normalizeDocumentType(" current-iep ")).toBe("current-iep");
    expect(formatDocumentTypeLabel("current-iep")).toBe("current iep");
    expect(formatDocumentTypeLabel("progress-report")).toBe("progress report");
  });
});
