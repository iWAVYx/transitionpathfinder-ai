import { expect, it } from "vitest";
import { humanizeAction } from "@/lib/history-display";
import { createHistoryCsv } from "@/lib/history-export";
const context = {
  filter: "documents" as const,
  loadedCount: 603,
  olderAvailable: true,
  exportedAt: "2030-01-01T12:00:00Z",
};
it("CSV describes a limited loaded view and ignores unexpected private fields", () => {
  const csv = createHistoryCsv(
    {
      student: { first_name: "Synthetic", last_name: "Student" },
      workspace_scope: "school",
      entries: [
        {
          created_at: "2030-01-01T12:00:00.123456Z",
          action: "document.view",
          entity_type: "document",
          recorded_by: "team@example.invalid",
          metadata: { private: "secret" },
          id: "raw-id",
          entity_id: "raw-entity",
        },
      ],
    } as any,
    context,
  );
  expect(csv).toContain("Loaded Records,603");
  expect(csv).toContain("Exported Records,1");
  expect(csv).toContain("Selected Category,Documents");
  expect(csv).toContain("Older Activity Was Available When Loaded,Yes");
  expect(csv).toContain("not a complete lifetime activity record");
  expect(csv).toContain("2030-01-01T12:00:00.123456Z");
  expect(csv).toContain("team@example.invalid");
  for (const secret of ["secret", "raw-id", "raw-entity"]) expect(csv).not.toContain(secret);
});
it("CSV escapes formulas, quotes, commas and multiline Unicode text", () => {
  const csv = createHistoryCsv(
    {
      student: { first_name: '=HYPERLINK("unsafe")', last_name: "Sample" },
      workspace_scope: null,
      entries: [
        {
          created_at: "2030-01-01T00:00:00Z",
          action: 'update,"sample"\nRow',
          entity_type: "student",
          recorded_by: "  +unsafe\nÉquipe",
        },
      ],
    },
    context,
  );
  expect(csv.startsWith("\uFEFF")).toBe(true);
  expect(csv).toContain(`"'=HYPERLINK(""unsafe"") Sample"`);
  expect(csv).toContain(`"'  +unsafe\nÉquipe"`);
  expect(csv).toContain('"sample""');
});
it("all-category exports label uncategorized recorded events without inventing a category", () => {
  const csv = createHistoryCsv(
    {
      student: { first_name: "Synthetic", last_name: null },
      workspace_scope: "district",
      entries: [
        {
          created_at: "2030-01-01T00:00:00Z",
          action: "unknown",
          entity_type: "unknown",
          recorded_by: "System",
        },
      ],
    },
    { ...context, filter: "all", olderAvailable: false },
  );
  expect(csv).toContain("Selected Category,All Loaded Activity");
  expect(csv).toContain("Other Activity");
  expect(csv).toContain("Workspace Scope,District");
});

it.each([
  ["document.signed_url.mint", "Document Access Link Created"],
  ["document.signed_url.denied", "Document Access Link Denied"],
  ["document.upload", "Document Uploaded"],
  ["document.view", "Document Viewed"],
  ["document.download", "Document Downloaded"],
  ["document.permission.grant", "Document Sharing Granted"],
  ["document.permission.revoke", "Document Sharing Removed"],
  ["view_document", "Document Viewed"],
])("recorded %s uses the documented plain-language label %s", (action, label) => {
  expect(humanizeAction({ action, entity_type: "document" })).toBe(label);
});
