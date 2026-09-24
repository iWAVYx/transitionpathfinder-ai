import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildLiveDocumentReadiness } from "../../src/lib/document-readiness";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8").replace(/\r\n/g, "\n");

const DASHBOARD = read("src/routes/_authenticated/dashboard.tsx");
const LIVE_OVERVIEW = read("src/components/dashboard/LiveFamilyWorkspaceOverview.tsx");
const DOCUMENTS = read("src/routes/_authenticated/documents.tsx");
const DEMO_MODE = read("src/routes/_authenticated/demo-mode.tsx");
const FAMILY_UPLOAD = read("src/components/students/FamilyDocumentUpload.tsx");

describe("live family dashboard and document truthfulness alignment", () => {
  it("puts the demo-shaped overview at the top of the real family dashboard", () => {
    expect(DASHBOARD).toContain(
      "<LiveFamilyWorkspaceOverview firstName={friendly} snapshot={snap} />",
    );
    expect(LIVE_OVERVIEW).toContain('data-testid="live-family-dashboard-overview"');
    expect(LIVE_OVERVIEW).toContain('data-testid="live-family-workspace-grid"');

    for (const title of [
      "Connected Student",
      "Pathway Report — Family View",
      "IEP & Documents",
      "Meeting Prep",
      "Calendar",
      "Family Action Items",
      "Recommended Resources",
      "Sharing & Consent",
      "Invite Team Members",
      "Partner Network",
      "Transition Channel",
    ]) {
      expect(LIVE_OVERVIEW).toContain(`title: "${title}"`);
    }
  });

  it("keeps demo fixtures out of the signed-in overview", () => {
    expect(LIVE_OVERVIEW).toContain("import type { DashboardSnapshot }");
    expect(LIVE_OVERVIEW).not.toMatch(/useDemoStudent|DEMO_|@\/lib\/demo|Jordan Rivera/);
    expect(LIVE_OVERVIEW).toContain("snapshot.documents.length");
    expect(LIVE_OVERVIEW).toContain("snapshot.recommendedResources.length");
    expect(LIVE_OVERVIEW).toContain("snapshot.actionItems.filter");
  });

  it("derives the live readiness meter from real document categories", () => {
    const items = buildLiveDocumentReadiness([
      { doc_type: "current-iep" },
      { doc_type: "evaluation" },
      { doc_type: "progress_report" },
    ]);

    expect(items).toEqual([
      { key: "iep", label: "Current IEP", status: "complete" },
      { key: "evaluation", label: "Latest Evaluation", status: "complete" },
      { key: "transition-plan", label: "Transition Plan or SOP", status: "missing" },
      { key: "progress-report", label: "Progress Report", status: "complete" },
      { key: "meeting-notes", label: "Meeting Notes", status: "missing" },
    ]);
    expect(DOCUMENTS).toContain("buildLiveDocumentReadiness(rows ?? [])");
    expect(DOCUMENTS).toContain(
      "<DocumentReadinessMeter items={readinessItems} loading={rows === null} />",
    );
    expect(DOCUMENTS).not.toContain("DocumentSignalsCard");
  });

  it("keeps sample readiness explicit and confined to demo mode", () => {
    expect(DEMO_MODE).toContain("SAMPLE_DOCUMENT_READINESS");
    expect(DEMO_MODE).toContain("<DocumentReadinessMeter items={SAMPLE_DOCUMENT_READINESS} />");
    expect(DOCUMENTS).not.toContain("SAMPLE_DOCUMENT_READINESS");
  });

  it("plainly explains the local redaction and approval boundary", () => {
    expect(FAMILY_UPLOAD).toMatch(
      /TransitionForward redacts detected personal identifiers from\s+a\s+local text copy and shows the privacy-safe result for your approval/,
    );
    expect(FAMILY_UPLOAD).toMatch(
      /the\s+original\s+file\s+and\s+its\s+hidden\s+metadata\s+are\s+not\s+uploaded/,
    );
  });
});
