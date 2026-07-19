// Workstream C, Slice C6 — Upload magic-byte sniff + size/type allowlist.
//
// Runs server-side after an object is uploaded to the `student-documents`
// storage bucket but before the AI extract job is enqueued. Downloads a
// small prefix of the freshly-uploaded object via the service-role client,
// inspects magic bytes, and confirms the file matches its declared MIME
// against a strict allowlist. On rejection the caller quarantines the row
// and skips extract; on acceptance the caller emits a `sniff` breadcrumb
// and proceeds to enqueue.
//
// This module is `.server.ts` so it is stripped from client bundles.
// Import it lazily from server-function handlers:
//
//   const { sniffUploadedDocument } = await import("./document-sniff.server");

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB
const SNIFF_PREFIX_BYTES = 32;

export type DetectedKind =
  | "pdf"
  | "png"
  | "jpeg"
  | "zip_office" // docx/xlsx/pptx (ZIP container)
  | "cfbf_office" // legacy doc/xls/ppt
  | "text"
  | "unknown";

export type SniffErrorCode =
  | "oversize"
  | "empty_file"
  | "download_failed"
  | "unsupported_type"
  | "mime_mismatch";

export interface SniffInput {
  storage_path: string;
  declared_mime: string | null;
  declared_size: number | null;
}

export type SniffResult =
  | { ok: true; detected_kind: DetectedKind }
  | {
      ok: false;
      detected_kind: DetectedKind;
      error_code: SniffErrorCode;
      error_message: string;
    };

// Allowlist: declared MIME → acceptable detected kinds.
const ALLOWLIST: Record<string, DetectedKind[]> = {
  "application/pdf": ["pdf"],
  "image/png": ["png"],
  "image/jpeg": ["jpeg"],
  "image/jpg": ["jpeg"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["zip_office"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["zip_office"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["zip_office"],
  "application/msword": ["cfbf_office"],
  "application/vnd.ms-excel": ["cfbf_office"],
  "application/vnd.ms-powerpoint": ["cfbf_office"],
  "text/plain": ["text"],
  "text/csv": ["text"],
  "text/markdown": ["text"],
};

function detectKind(bytes: Uint8Array): DetectedKind {
  if (bytes.length === 0) return "unknown";
  // PDF: "%PDF-"
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return "pdf";
  }
  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  // ZIP / Office 2007+ (docx/xlsx/pptx): PK\x03\x04
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "zip_office";
  }
  // Legacy Office CFBF: D0 CF 11 E0 A1 B1 1A E1
  if (
    bytes.length >= 8 &&
    bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 &&
    bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1
  ) {
    return "cfbf_office";
  }
  // Text heuristic: all bytes printable ASCII / common whitespace.
  const looksTextual = bytes.every(
    (b) => b === 0x09 || b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e) || b >= 0x80,
  );
  if (looksTextual) return "text";
  return "unknown";
}

export async function sniffUploadedDocument(input: SniffInput): Promise<SniffResult> {
  // Size gate first — reject oversize before spending a download.
  if (input.declared_size !== null && input.declared_size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      detected_kind: "unknown",
      error_code: "oversize",
      error_message: `File exceeds ${MAX_UPLOAD_BYTES} bytes (declared ${input.declared_size}).`,
    };
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob, error } = await supabaseAdmin.storage
      .from("student-documents")
      .download(input.storage_path);
    if (error || !blob) {
      return {
        ok: false,
        detected_kind: "unknown",
        error_code: "download_failed",
        error_message: error?.message ?? "Could not read uploaded object for sniff.",
      };
    }

    // Enforce true size from storage as well (declared size can lie).
    if (blob.size === 0) {
      return { ok: false, detected_kind: "unknown", error_code: "empty_file", error_message: "Uploaded file is empty." };
    }
    if (blob.size > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        detected_kind: "unknown",
        error_code: "oversize",
        error_message: `Stored file exceeds ${MAX_UPLOAD_BYTES} bytes (${blob.size}).`,
      };
    }

    const prefixBlob = blob.slice(0, SNIFF_PREFIX_BYTES);
    const bytes = new Uint8Array(await prefixBlob.arrayBuffer());
    const detected = detectKind(bytes);

    const declared = (input.declared_mime ?? "").toLowerCase().trim();
    const allowed = declared ? ALLOWLIST[declared] : undefined;

    if (!allowed) {
      return {
        ok: false,
        detected_kind: detected,
        error_code: "unsupported_type",
        error_message: `Declared MIME "${declared || "(none)"}" is not in the upload allowlist.`,
      };
    }
    if (!allowed.includes(detected)) {
      return {
        ok: false,
        detected_kind: detected,
        error_code: "mime_mismatch",
        error_message: `Declared "${declared}" but magic bytes look like "${detected}".`,
      };
    }
    return { ok: true, detected_kind: detected };
  } catch (err) {
    return {
      ok: false,
      detected_kind: "unknown",
      error_code: "download_failed",
      error_message: err instanceof Error ? err.message : String(err),
    };
  }
}
