import { extractPdfText } from "@/lib/browser-only-libs";
import {
  redactSensitiveText,
  type SensitiveTextContext,
  type SensitiveTextRedactionReport,
} from "@/lib/sensitive-text-redaction";

const MAX_REVIEW_BYTES = 25 * 1024 * 1024;
const MIN_EXTRACTED_PDF_CHARACTERS = 20;

export type SensitiveFileReviewSource =
  | { kind: "file"; file: File }
  | { kind: "text"; name: string; text: string };

export type PreparedSensitiveFileReview = {
  redactedText: string;
  report: SensitiveTextRedactionReport;
  sourceLabel: string;
};

function isPdf(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isPlainText(file: File) {
  return file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
}

export async function prepareSensitiveFileReview(
  source: SensitiveFileReviewSource,
  context: SensitiveTextContext = {},
): Promise<PreparedSensitiveFileReview> {
  let sourceLabel: string;
  let extractedText: string;

  if (source.kind === "text") {
    sourceLabel = source.name;
    extractedText = source.text;
  } else {
    sourceLabel = source.file.name;
    if (source.file.size > MAX_REVIEW_BYTES) {
      throw new Error("That file is over 25 MB. Use a smaller text-based PDF or plain-text file.");
    }
    if (isPdf(source.file)) {
      extractedText = await extractPdfText(source.file);
      if (extractedText.trim().length < MIN_EXTRACTED_PDF_CHARACTERS) {
        throw new Error(
          "No reliable text was found. Scanned or image-only PDFs are blocked because we cannot safely redact them yet.",
        );
      }
    } else if (isPlainText(source.file)) {
      extractedText = await source.file.text();
    } else {
      throw new Error(
        "For privacy, automatic review currently accepts only text-based PDFs and plain-text files. Convert Word or image files to text after manually removing private details.",
      );
    }
  }

  if (!extractedText.trim()) {
    throw new Error("No readable text was found, so the original file was not accepted.");
  }

  const result = redactSensitiveText(extractedText, context);
  return {
    redactedText: result.text,
    report: result.report,
    sourceLabel,
  };
}
