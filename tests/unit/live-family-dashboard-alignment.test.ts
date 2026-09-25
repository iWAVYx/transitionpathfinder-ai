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
const TOOL_CARD = read("src/components/dashboard/ToolPreviewCard.tsx");
const LIVE_DRAWER = read("src/components/dashboard/LiveToolPreviewDrawer.tsx");

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

  it("supports preview-first navigation with real signed-in data", () => {
    expect(TOOL_CARD).toContain("onPreview?: () => void");
    expect(TOOL_CARD).toContain("aria-label={`Preview ${title}`}");
    expect(LIVE_OVERVIEW).toContain("<LiveToolPreviewDrawer");
    expect(LIVE_OVERVIEW).toContain("onPreview={() =>");
    expect(LIVE_DRAWER).toContain('data-testid="live-tool-preview-drawer"');
    expect(LIVE_DRAWER).toContain("Signed-In Preview");
    expect(LIVE_DRAWER).toContain("Privacy boundary");
    expect(LIVE_DRAWER).not.toMatch(/useDemo|DEMO_|@\/lib\/demo|Jordan Rivera/);
  });

  it("keeps sensitive document and message contents out of previews", () => {
    expect(LIVE_OVERVIEW).toContain(
      "Only document counts and workflow status appear here; file contents stay hidden.",
    );
    expect(LIVE_OVERVIEW).toContain("Message contents remain inside the full team-scoped channel.");
    expect(LIVE_OVERVIEW).toContain("Private documents are never shared with partner listings.");
  });

  it("opens each family card's dedicated full tool", () => {
    for (const route of [
      "/family/action-items",
      "/family/resources/recommended",
      "/family/consent",
      "/family/invites",
      "/partner-network",
      "/transition-channel",
    ]) {
      expect(LIVE_OVERVIEW).toContain(`to: "${route}"`);
    }
  });

  it("keeps shared tool navigation in the preview-first overview without legacy duplicates", () => {
    for (const route of [
      'to: "/students/$studentId"',
      'to: "/pathway"',
      'to: "/documents"',
      'to: "/meetings"',
    ]) {
      expect(LIVE_OVERVIEW).toContain(route);
    }

    for (const legacyLink of [
      'to="/students/$studentId"',
      'to="/pathway"',
      'to="/reports/$reportId"',
      'actionHref="/documents"',
      'actionHref="/meetings"',
    ]) {
      expect(DASHBOARD).not.toContain(legacyLink);
    }

    // Removing duplicate navigation must not remove the useful live detail
    // sections or non-navigation report actions below the preview grid.
    for (const retainedDetail of [
      "<ProfileField",
      "<ReportSections",
      "handleDownloadPdf",
      "handleCopyShare",
      'title="Document Hub"',
      "<DashboardCalendar",
      'title={snap.upcomingMeeting ? "Next Meeting" : "Meeting Prep"}',
    ]) {
      expect(DASHBOARD).toContain(retainedDetail);
    }
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
