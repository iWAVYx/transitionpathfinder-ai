import { describe, expect, it } from "vitest";
import { __test__ } from "@/lib/document-av-scan.server";

const {
  blockedReasonsFrom,
  maxScanBytesFromEnvironment,
  safeFilename,
  threatsFrom,
  verdictCodeFor,
} = __test__;

describe("Cloudmersive verdict mapping (fail-closed)", () => {
  it("releases only an explicit clean response with no reported viruses", () => {
    expect(verdictCodeFor({ CleanResult: true, FoundViruses: [] })).toBe("clean");
  });

  it("maps a non-clean response with a named virus to infected", () => {
    expect(
      verdictCodeFor({
        CleanResult: false,
        FoundViruses: [{ FileName: "private-name.pdf", VirusName: "EICAR-Test-File" }],
      }),
    ).toBe("infected");
  });

  it("keeps policy blocks, malformed responses, and contradictions quarantined", () => {
    expect(verdictCodeFor({ CleanResult: false, FoundViruses: [] })).toBe("indeterminate");
    expect(verdictCodeFor({ ContainsMacros: true })).toBe("indeterminate");
    expect(
      verdictCodeFor({ CleanResult: true, FoundViruses: [], ContainsMacros: true }),
    ).toBe("indeterminate");
    expect(
      verdictCodeFor({ CleanResult: true, FoundViruses: [{ VirusName: "contradiction" }] }),
    ).toBe("indeterminate");
    expect(verdictCodeFor(undefined)).toBe("indeterminate");
  });
});

describe("Cloudmersive response sanitization", () => {
  it("records unique threat names without provider-returned filenames", () => {
    const threats = threatsFrom({
      CleanResult: false,
      FoundViruses: [
        { FileName: "student-first-last-iep.pdf", VirusName: "EICAR-Test-File" },
        { FileName: "nested/private.docx", VirusName: "EICAR-Test-File" },
        { VirusName: "Macro.Downloader" },
        { VirusName: " " },
      ],
    });

    expect(threats).toEqual(["EICAR-Test-File", "Macro.Downloader"]);
    expect(JSON.stringify(threats)).not.toContain("student-first-last");
    expect(JSON.stringify(threats)).not.toContain("nested/private");
  });

  it("preserves strict advanced-scan policy signals", () => {
    expect(
      blockedReasonsFrom({
        CleanResult: false,
        ContainsMacros: true,
        ContainsPasswordProtectedFile: true,
        ContainsUnsafeArchive: false,
      }),
    ).toEqual(["ContainsPasswordProtectedFile", "ContainsMacros"]);
  });
});

describe("Cloudmersive free-tier and filename guards", () => {
  it("defaults to the documented 3.5 MB free-tier limit", () => {
    expect(maxScanBytesFromEnvironment(undefined)).toBe(3_500_000);
    expect(maxScanBytesFromEnvironment("not-a-number")).toBe(3_500_000);
    expect(maxScanBytesFromEnvironment("0")).toBe(3_500_000);
    expect(maxScanBytesFromEnvironment(String(25 * 1024 * 1024 + 1))).toBe(3_500_000);
  });

  it("allows an explicitly configured paid-plan limit up to the app's 25 MB cap", () => {
    expect(maxScanBytesFromEnvironment("26214400")).toBe(25 * 1024 * 1024);
  });

  it("replaces the private filename while preserving only a safe extension", () => {
    expect(safeFilename("district/student/Jane-Doe-IEP.PDF")).toBe("upload.pdf");
    expect(safeFilename("district/student/no-extension")).toBe("upload.bin");
    expect(safeFilename("district/student/report.verylongextension")).toBe("upload.bin");
    expect(safeFilename("district/student/report.pd$f")).toBe("upload.bin");
  });
});
