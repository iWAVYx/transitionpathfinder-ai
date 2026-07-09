/**
 * Guardrails for the shared Transition Workspace stage model.
 *
 * These tests keep the single-source-of-truth honest:
 *   - every stage has a route file that actually exists
 *   - stages are ordered 1..N with no gaps
 *   - every report section id appears on exactly one stage
 *   - every report section has a human label
 *   - stage labels stay single all-caps words (product style rule)
 *
 * If a slice adds/removes stages or routes, update stages.ts — do NOT
 * relax these assertions.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  WORKSPACE_STAGES,
  REPORT_SECTION_LABELS,
  reportSectionsInOrder,
  nextStage,
  previousStage,
  type PathwayReportSectionId,
} from "../../src/lib/workspace/stages";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = path.resolve(__dirname, "../../src/routes");

/**
 * Convert a URL path like "/demo/voice" or "/student-voice" into the
 * candidate TanStack Router file paths (flat-dot or nested). Returns
 * every plausible location; the test passes if ANY exists.
 */
function candidateRouteFiles(urlPath: string, authenticated: boolean): string[] {
  const trimmed = urlPath.replace(/^\//, "");
  const segments = trimmed.split("/");
  const base = authenticated
    ? path.join(ROUTES_DIR, "_authenticated")
    : ROUTES_DIR;

  const flatDot = segments.join(".");
  const flatUnderscore = segments.join("_.");
  const nested = path.join(...segments);

  const exts = [".tsx", ".ts"];
  const bases = [
    path.join(base, flatDot),
    path.join(base, flatUnderscore),
    path.join(base, nested),
    path.join(base, nested, "index"),
  ];

  return bases.flatMap((b) => exts.map((e) => b + e));
}

describe("WORKSPACE_STAGES", () => {
  it("has 9 stages ordered 1..9 with no gaps", () => {
    expect(WORKSPACE_STAGES).toHaveLength(9);
    WORKSPACE_STAGES.forEach((s, i) => {
      expect(s.order).toBe(i + 1);
    });
  });

  it("uses single all-caps word labels", () => {
    for (const s of WORKSPACE_STAGES) {
      expect(s.label, `stage ${s.id}`).toMatch(/^[A-Z]+$/);
    }
  });

  it("every signed-in route resolves to a route file", () => {
    for (const s of WORKSPACE_STAGES) {
      const candidates = candidateRouteFiles(s.signedInRoute, true);
      const exists = candidates.some((p) => existsSync(p));
      expect(
        exists,
        `no route file for signed-in ${s.id} → ${s.signedInRoute}\ntried:\n${candidates.join("\n")}`,
      ).toBe(true);
    }
  });

  it("every demo route resolves to a route file", () => {
    for (const s of WORKSPACE_STAGES) {
      const candidates = candidateRouteFiles(s.demoRoute, false);
      const exists = candidates.some((p) => existsSync(p));
      expect(
        exists,
        `no route file for demo ${s.id} → ${s.demoRoute}\ntried:\n${candidates.join("\n")}`,
      ).toBe(true);
    }
  });

  it("every report section id is unique across stages", () => {
    const seen = new Map<PathwayReportSectionId, string>();
    for (const s of WORKSPACE_STAGES) {
      for (const section of s.reportSections) {
        const prior = seen.get(section);
        expect(
          prior,
          `section ${section} appears on stage ${s.id} and stage ${prior}`,
        ).toBeUndefined();
        seen.set(section, s.id);
      }
    }
  });

  it("every report section has a human label", () => {
    for (const { section } of reportSectionsInOrder()) {
      expect(REPORT_SECTION_LABELS[section], section).toBeTruthy();
    }
  });

  it("every label key in REPORT_SECTION_LABELS is used by a stage", () => {
    const usedIds = new Set(
      WORKSPACE_STAGES.flatMap((s) => s.reportSections),
    );
    for (const key of Object.keys(REPORT_SECTION_LABELS) as PathwayReportSectionId[]) {
      expect(usedIds.has(key), `orphan report label: ${key}`).toBe(true);
    }
  });

  it("nextStage / previousStage form a valid linked list", () => {
    expect(previousStage("start")).toBeNull();
    expect(nextStage("connect")).toBeNull();
    for (let i = 0; i < WORKSPACE_STAGES.length - 1; i++) {
      expect(nextStage(WORKSPACE_STAGES[i].id)?.id).toBe(WORKSPACE_STAGES[i + 1].id);
      expect(previousStage(WORKSPACE_STAGES[i + 1].id)?.id).toBe(WORKSPACE_STAGES[i].id);
    }
  });

  it("partners only appear on stages that expose non-private data", () => {
    // Partners must never see student planning surfaces. Only CONNECT
    // (opportunities catalog) may include partner in audiences.
    for (const s of WORKSPACE_STAGES) {
      if (s.id === "connect") continue;
      expect(
        s.audiences.includes("partner"),
        `stage ${s.id} must not include partner audience`,
      ).toBe(false);
    }
  });
});
