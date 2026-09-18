// Cloudmersive advanced anti-virus scan for uploaded documents.
//
// Files remain quarantined until this server-only module receives an explicit
// clean verdict. Missing credentials, size-limit violations, request failures,
// timeouts, malformed responses, contradictory responses, and policy blocks
// all FAIL CLOSED. Only a response with CleanResult === true and no reported
// viruses releases a file.
//
// This module is `.server.ts` so it is stripped from client bundles. Import it
// lazily from server-function handlers:
//
//   const { scanUploadedDocument } = await import("./document-av-scan.server");

const CLOUDMERSIVE_SCAN_URL = "https://api.cloudmersive.com/virus/scan/file/advanced";
const SCAN_TIMEOUT_MS = 60_000;
const FREE_TIER_MAX_SCAN_BYTES = 3_500_000;
const ABSOLUTE_MAX_SCAN_BYTES = 25 * 1024 * 1024;

export const MALWARE_SCAN_PROVIDER = "cloudmersive" as const;

export type ScanCode =
  | "clean"
  | "infected"
  | "failed"
  | "indeterminate"
  | "timeout";

export type ScanStorageBucket = "student-documents" | "channel-attachments";

export interface ScanInput {
  bucket?: ScanStorageBucket;
  storage_path: string;
  declared_mime?: string | null;
  declared_size?: number | null;
}

interface CloudmersiveVirus {
  FileName?: unknown;
  VirusName?: unknown;
}

interface CloudmersiveResponse {
  CleanResult?: unknown;
  FoundViruses?: unknown;
  ContainsExecutable?: unknown;
  ContainsInvalidFile?: unknown;
  ContainsScript?: unknown;
  ContainsPasswordProtectedFile?: unknown;
  ContainsRestrictedFileFormat?: unknown;
  ContainsMacros?: unknown;
  ContainsXmlExternalEntities?: unknown;
  ContainsInsecureDeserialization?: unknown;
  ContainsHtml?: unknown;
  ContainsUnsafeArchive?: unknown;
  ContainsOleEmbeddedObject?: unknown;
  ContainsUnwantedAction?: unknown;
}

interface ScanBase {
  provider: typeof MALWARE_SCAN_PROVIDER;
  scan_id: string | null;
  clean_result: boolean | null;
  threats: string[];
  blocked_reasons: string[];
}

export interface ScanClean extends ScanBase {
  ok: true;
  code: "clean";
  scan_id: string;
  clean_result: true;
}

export interface ScanNotClean extends ScanBase {
  ok: false;
  code: Exclude<ScanCode, "clean">;
  error_message: string;
}

export type ScanResult = ScanClean | ScanNotClean;

const POLICY_SIGNAL_NAMES = [
  "ContainsExecutable",
  "ContainsInvalidFile",
  "ContainsScript",
  "ContainsPasswordProtectedFile",
  "ContainsRestrictedFileFormat",
  "ContainsMacros",
  "ContainsXmlExternalEntities",
  "ContainsInsecureDeserialization",
  "ContainsHtml",
  "ContainsUnsafeArchive",
  "ContainsOleEmbeddedObject",
  "ContainsUnwantedAction",
] as const satisfies readonly (keyof CloudmersiveResponse)[];

function threatsFrom(body: CloudmersiveResponse | undefined): string[] {
  if (!Array.isArray(body?.FoundViruses)) return [];

  const names = body.FoundViruses.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const name = (entry as CloudmersiveVirus).VirusName;
    if (typeof name !== "string" || name.trim().length === 0) return [];
    // Do not copy provider-returned filenames into logs or audit records.
    return [name.trim().slice(0, 200)];
  });
  return [...new Set(names)];
}

function blockedReasonsFrom(body: CloudmersiveResponse | undefined): string[] {
  if (!body) return [];
  return POLICY_SIGNAL_NAMES.filter((name) => body[name] === true);
}

function verdictCodeFor(body: CloudmersiveResponse | undefined): ScanCode {
  const threats = threatsFrom(body);
  if (body?.CleanResult === true && threats.length === 0) return "clean";
  if (body?.CleanResult === false && threats.length > 0) return "infected";
  return "indeterminate";
}

function maxScanBytesFromEnvironment(raw = process.env.CLOUDMERSIVE_MAX_SCAN_BYTES): number {
  if (!raw) return FREE_TIER_MAX_SCAN_BYTES;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0 || parsed > ABSOLUTE_MAX_SCAN_BYTES) {
    return FREE_TIER_MAX_SCAN_BYTES;
  }
  return parsed;
}

function safeFilename(storagePath: string): string {
  const lastSegment = storagePath.split("/").pop() ?? "upload.bin";
  const extensionMatch = lastSegment.match(/\.([a-zA-Z0-9]{1,12})$/);
  const extension = extensionMatch?.[1]?.toLowerCase();
  // Preserve only a short file extension for format verification. Never send
  // a student's original filename or storage path to the external provider.
  return extension ? `upload.${extension}` : "upload.bin";
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("scan_timeout");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function submitFile(
  apiKey: string,
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Promise<CloudmersiveResponse> {
  const form = new FormData();
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  form.append("inputFile", new Blob([arrayBuffer], { type: mimeType }), filename);

  const response = await fetchWithTimeout(
    CLOUDMERSIVE_SCAN_URL,
    {
      method: "POST",
      headers: {
        Apikey: apiKey,
        fileName: filename,
        allowExecutables: "false",
        allowInvalidFiles: "false",
        allowScripts: "false",
        allowPasswordProtectedFiles: "false",
        allowMacros: "false",
        allowXmlExternalEntities: "false",
        allowInsecureDeserialization: "false",
        allowHtml: "false",
        allowUnsafeArchives: "false",
        allowOleEmbeddedObject: "false",
        allowUnwantedAction: "false",
      },
      body: form,
    },
    SCAN_TIMEOUT_MS,
  );

  if (!response.ok) {
    // Avoid copying provider response bodies into logs; they can contain
    // request diagnostics and must not become a student-data side channel.
    throw new Error(`Cloudmersive scan returned HTTP ${response.status}.`);
  }

  return (await response.json()) as CloudmersiveResponse;
}

function failedResult(
  errorMessage: string,
  scanId: string | null = null,
  code: ScanNotClean["code"] = "failed",
): ScanNotClean {
  return {
    ok: false,
    code,
    provider: MALWARE_SCAN_PROVIDER,
    scan_id: scanId,
    clean_result: null,
    threats: [],
    blocked_reasons: [],
    error_message: errorMessage,
  };
}

export async function scanUploadedDocument(input: ScanInput): Promise<ScanResult> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY?.trim();
  if (!apiKey) {
    return failedResult("CLOUDMERSIVE_API_KEY not configured — failing closed.");
  }

  let bytes: Uint8Array;
  let filename: string;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bucket = input.bucket ?? "student-documents";
    const { data: blob, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(input.storage_path);
    if (error || !blob) {
      return failedResult(error?.message ?? "Could not read uploaded object for AV scan.");
    }
    bytes = new Uint8Array(await blob.arrayBuffer());
    const maxScanBytes = maxScanBytesFromEnvironment();
    if (bytes.byteLength > maxScanBytes) {
      return failedResult(`File exceeds the configured ${maxScanBytes}-byte malware scan limit.`);
    }
    filename = safeFilename(input.storage_path);
  } catch (error) {
    return failedResult(error instanceof Error ? error.message : String(error));
  }

  const scanId = crypto.randomUUID();
  let body: CloudmersiveResponse;
  try {
    body = await submitFile(
      apiKey,
      bytes,
      filename,
      input.declared_mime?.trim() || "application/octet-stream",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failedResult(message, scanId, message === "scan_timeout" ? "timeout" : "failed");
  }

  const code = verdictCodeFor(body);
  const threats = threatsFrom(body);
  const blockedReasons = blockedReasonsFrom(body);

  if (code === "clean") {
    return {
      ok: true,
      code: "clean",
      provider: MALWARE_SCAN_PROVIDER,
      scan_id: scanId,
      clean_result: true,
      threats,
      blocked_reasons: blockedReasons,
    };
  }

  return {
    ok: false,
    code,
    provider: MALWARE_SCAN_PROVIDER,
    scan_id: scanId,
    clean_result: body.CleanResult === false ? false : null,
    threats,
    blocked_reasons: blockedReasons,
    error_message:
      code === "infected"
        ? `Threats detected: ${threats.slice(0, 3).join("; ") || "provider-reported malware"}`
        : blockedReasons.length > 0
          ? `Cloudmersive blocked the file: ${blockedReasons.slice(0, 4).join(", ")}`
          : "Cloudmersive returned an indeterminate or contradictory verdict.",
  };
}

// Exported for credential-free unit testing only.
export const __test__ = {
  blockedReasonsFrom,
  maxScanBytesFromEnvironment,
  safeFilename,
  threatsFrom,
  verdictCodeFor,
};
