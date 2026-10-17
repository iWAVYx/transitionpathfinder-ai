import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HistoryDocument } from "@/components/history/HistoryDocument";
import { historyTimestamp, createHistoryCsv } from "@/lib/history-export";
import { demoHistoryRecords } from "@/lib/demo/history-sample";
const context = {
  filter: "all" as const,
  loadedCount: 3,
  olderAvailable: false,
  exportedAt: "2026-10-13T15:00:00Z",
  sample: true,
};
it.each(["Sam Alvarez", "Riley Chen", "Jordan Rivera"])(
  "print and CSV use the selected fictional identity %s without hidden record fields",
  (displayName) => {
    const records = demoHistoryRecords(displayName);
    const html = renderToStaticMarkup(<HistoryDocument records={records} context={context} />);
    const csv = createHistoryCsv(records, context);
    expect(html).toContain(displayName);
    expect(csv).toContain(displayName);
    expect(html).toContain("Fictional Sample");
    expect(csv).toContain("Fictional Sample");
    expect(html).toContain("contains no real student records");
    expect(html).toContain("data-document-watermark");
    expect(html).toContain("About This Export");
    expect(html).toContain("Recorded Activity");
    expect(html).toContain("Sharing Updated");
  },
);
it("UTC timestamps preserve fractional precision and normalize valid offsets", () => {
  expect(historyTimestamp("2026-10-13T15:00:00.123456Z")).toBe(
    "Oct 13, 2026 at 03:00:00.123456 PM UTC",
  );
  expect(historyTimestamp("2026-10-13T11:00:00-04:00")).toBe("Oct 13, 2026 at 03:00:00 PM UTC");
  expect(historyTimestamp("bad")).toBe("Recorded Time Unavailable");
});
it("untrusted record text stays escaped and every supplied display row is retained", () => {
  const records = demoHistoryRecords("Fictional Student");
  records.entries = Array.from({ length: 203 }, (_, n) => ({
    created_at: "2026-10-13T15:00:00Z",
    action: `Recorded ${n}`,
    entity_type: "document",
    recorded_by: '<img src="bad" onerror="run()">',
  }));
  const html = renderToStaticMarkup(
    <HistoryDocument records={records} context={{ ...context, sample: false, loadedCount: 203 }} />,
  );
  expect(html).not.toContain('<img src="bad"');
  expect(html).toContain("&lt;img");
  for (let n = 0; n < 203; n++) expect(html).toContain(`Recorded ${n}`);
  expect(html).not.toContain("Fictional Sample");
});
