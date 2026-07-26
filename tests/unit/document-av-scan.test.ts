import { describe, it, expect } from "vitest";
import { __test__ } from "@/lib/document-av-scan.server";

const { verdictCodeFor, threatsFrom } = __test__;

describe("document-av-scan verdict mapping (fail-closed)", () => {
  it("maps clean (0) to 'clean'", () => {
    expect(verdictCodeFor(0)).toBe("clean");
  });

  it("maps infected (1) and suspicious (2) to 'infected'", () => {
    expect(verdictCodeFor(1)).toBe("infected");
    expect(verdictCodeFor(2)).toBe("infected");
  });

  it("maps failed-to-scan (3) to 'failed'", () => {
    expect(verdictCodeFor(3)).toBe("failed");
  });

  it("maps unknown / anything else to 'indeterminate' (fail-closed default)", () => {
    // 4 cleaned/rescan, 5 unknown, 6 quarantined, 7 skipped, 8 pw-protected,
    // 9 not scanned, 10 potentially vulnerable, 11 pua, 12 timeout, undefined
    for (const code of [4, 5, 6, 7, 8, 9, 10, 11, 12, 99, undefined]) {
      expect(verdictCodeFor(code)).toBe("indeterminate");
    }
  });
});

describe("document-av-scan threat extraction", () => {
  it("returns an empty list when no engines reported a hit", () => {
    expect(
      threatsFrom({
        scan_all_result_i: 0,
        scan_details: {
          Windows_Defender: { threat_found: "", scan_result_i: 0 },
          ClamAV: { threat_found: "", scan_result_i: 0 },
        },
      }),
    ).toEqual([]);
  });

  it("collects one threat entry per engine with a non-empty name", () => {
    const threats = threatsFrom({
      scan_all_result_i: 1,
      scan_details: {
        Windows_Defender: { threat_found: "EICAR_Test", scan_result_i: 1 },
        ClamAV: { threat_found: "Eicar-Signature", scan_result_i: 1 },
        Sophos: { threat_found: "", scan_result_i: 0 },
      },
    });
    expect(threats).toHaveLength(2);
    expect(threats).toContain("Windows_Defender: EICAR_Test");
    expect(threats).toContain("ClamAV: Eicar-Signature");
  });

  it("tolerates missing scan_details gracefully", () => {
    expect(threatsFrom(undefined)).toEqual([]);
    expect(threatsFrom({ scan_all_result_i: 0 })).toEqual([]);
  });
});
