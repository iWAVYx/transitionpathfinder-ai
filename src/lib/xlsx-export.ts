export type XlsxCell = string | number | null | undefined;

export type XlsxSheet = {
  name: string;
  rows: XlsxCell[][];
  columnWidths?: number[];
};

export type XlsxArchiveTools = {
  encode: (value: string) => Uint8Array;
  zip: (
    files: Record<string, Uint8Array>,
    options?: { level?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 },
  ) => Uint8Array;
};

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number): string {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function normalizeSheetName(name: string, used: Set<string>): string {
  const base =
    name
      .replace(/[\\/?*:[\]]/g, " ")
      .trim()
      .slice(0, 31) || "Sheet";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate.toLowerCase())) {
    const label = ` (${suffix++})`;
    candidate = base.slice(0, 31 - label.length) + label;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function worksheetXml(sheet: XlsxSheet): string {
  const columns = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths
        .map((width, index) => {
          const safeWidth = Number.isFinite(width) ? Math.min(255, Math.max(1, width)) : 10;
          return `<col min="${index + 1}" max="${index + 1}" width="${safeWidth}" customWidth="1"/>`;
        })
        .join("")}</cols>`
    : "";

  const rows = sheet.rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, columnIndex) => {
          const reference = `${columnName(columnIndex)}${rowIndex + 1}`;
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${reference}"><v>${cell}</v></c>`;
          }
          const text = cell == null ? "" : String(cell);
          return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `${XML_HEADER}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${columns}<sheetData>${rows}</sheetData></worksheet>`;
}

export function buildXlsxArchive(sheets: XlsxSheet[], tools: XlsxArchiveTools): Uint8Array {
  if (sheets.length === 0) throw new Error("An XLSX workbook requires at least one sheet.");

  const usedNames = new Set<string>();
  const normalized = sheets.map((sheet) => ({
    ...sheet,
    name: normalizeSheetName(sheet.name, usedNames),
  }));

  const workbookSheets = normalized
    .map(
      (sheet, index) =>
        `<sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
    )
    .join("");
  const workbookRels = normalized
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join("");
  const sheetContentTypes = normalized
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("");

  const textFiles: Record<string, string> = {
    "[Content_Types].xml": `${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheetContentTypes}</Types>`,
    "_rels/.rels": `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    "xl/workbook.xml": `${XML_HEADER}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${workbookSheets}</sheets></workbook>`,
    "xl/_rels/workbook.xml.rels": `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${normalized.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    "xl/styles.xml": `${XML_HEADER}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  };

  normalized.forEach((sheet, index) => {
    textFiles[`xl/worksheets/sheet${index + 1}.xml`] = worksheetXml(sheet);
  });

  return tools.zip(
    Object.fromEntries(
      Object.entries(textFiles).map(([path, value]) => [path, tools.encode(value)]),
    ),
    { level: 6 },
  );
}
