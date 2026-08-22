import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { buildXlsxArchive } from "../../src/lib/xlsx-export";

const tools = { encode: strToU8, zip: zipSync };

describe("XLSX export", () => {
  it("creates a valid minimal OpenXML workbook with multiple sheets", () => {
    const archive = buildXlsxArchive(
      [
        {
          name: "Daily",
          rows: [
            ["Date", "Views"],
            ["2026-08-21", 12],
          ],
          columnWidths: [14, 10],
        },
        { name: "Filters", rows: [["Role", "all"]] },
      ],
      tools,
    );
    const files = unzipSync(archive);

    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "_rels/.rels",
        "xl/workbook.xml",
        "xl/styles.xml",
        "xl/worksheets/sheet1.xml",
        "xl/worksheets/sheet2.xml",
      ]),
    );
    expect(strFromU8(files["xl/workbook.xml"])).toContain('sheet name="Daily"');
    expect(strFromU8(files["xl/worksheets/sheet1.xml"])).toContain('<c r="B2"><v>12</v></c>');
  });

  it("stores strings as escaped inline text instead of executable formulas", () => {
    const archive = buildXlsxArchive(
      [{ name: "Unsafe/Name", rows: [['=HYPERLINK("https://example.test")', "A&B <C>"]] }],
      tools,
    );
    const files = unzipSync(archive);
    const workbook = strFromU8(files["xl/workbook.xml"]);
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);

    expect(workbook).toContain('sheet name="Unsafe Name"');
    expect(sheet).toContain('t="inlineStr"');
    expect(sheet).toContain("=HYPERLINK(&quot;https://example.test&quot;)");
    expect(sheet).toContain("A&amp;B &lt;C&gt;");
    expect(sheet).not.toContain("<f>");
  });
});
