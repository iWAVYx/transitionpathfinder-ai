// OPSWAT MetaDefender Cloud anti-virus scan for uploaded documents.
//
// Runs server-side after the sniff stage but before the AI extract job is
// enqueued. Files are uploaded to MetaDefender Cloud with
// `samplesharing: 0` and `privateprocessing: 1` so bytes are never shared
// outside the private tenant. We poll for a final verdict with a bounded
// timeout and FAIL CLOSED — any timeout, API failure, or indeterminate
// result keeps the document quarantined and is treated as non-clean.
//
// This module is `.server.ts` so it is stripped from client bundles.
// Import lazily from server-function handlers:
//
//   const { scanUploadedDocument } = await import("./document-av-scan.server");

const METADEFENDER_BASE = "https://api.metadefender.com/v4";
const UPLOAD_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 90_000;

/** MetaDefender `scan_all_result_i` numeric verdict codes we care about. */
const META_CLEAN = 0;
const META_INFECTED = 1;
const META_SUSPICIOUS = 2;
const META_FAILED_TO_SCAN = 3;
// 4 = cleaned/rescan, 5 = unknown, 6 = quarantined, 7 = skipped, 8 = pwd-protected,
// 9 = not scanned, 10 = potentially vulnerable, 11 = potentially unwanted, 12 = timeout, ...

export type ScanCode =
  | "clean"
  | "infected"
  | "failed"
  | "indeterminate"
  | "timeout";

export interface ScanInput {
  storage_path: string;
  declared_mime?: string | null;
  declared_size?: number | null;
}

export interface ScanClean {
  ok: true;
  code: "clean";
  data_id: string;
  scan_all_result_i: number;
  scan_all_result_a: string;
  total_avs?: number;
  total_detected_avs?: number;
  threats: string[];
}

export interface ScanNotClean {
  ok: false;
  code: Exclude<ScanCode, "clean">;
  data_id: string | null;
  scan_all_result_i?: number;
  scan_all_result_a?: string;
  threats: string[];
  error_message: string;
}

export type ScanResult = ScanClean | ScanNotClean;

interface FileResponse {
  scan_results?: {
    scan_all_result_i?: number;
    scan_all_result_a?: string;
    progress_percentage?: number;
    total_avs?: number;
    total_detected_avs?: number;
    scan_details?: Record<string, { threat_found?: string; scan_result_i?: number }>;
  };
}

function threatsFrom(details: FileResponse["scan_results"]): string[] {
  const map = details?.scan_details ?? {};
  const out: string[] = [];
  for (const engine of Object.keys(map)) {
    const t = map[engine]?.threat_found;
    if (t && t.trim().length > 0) out.push(`${engine}: ${t}`);
  }
  return out;
}

function verdictCodeFor(scan_all_result_i: number | undefined): ScanCode {
  if (scan_all_result_i === META_CLEAN) return "clean";
  if (scan_all_result_i === META_INFECTED || scan_all_result_i === META_SUSPICIOUS) return "infected";
  if (scan_all_result_i === META_FAILED_TO_SCAN) return "failed";
  return "indeterminate";
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

async function submitFile(
  apiKey: string,
  bytes: Uint8Array,
  filename: string,
): Promise<string> {
  const res = await fetchWithTimeout(
    `${METADEFENDER_BASE}/file`,
    {
      method: "POST",
      headers: {
        apikey: apiKey,
        filename,
        // Private scanning — bytes are NOT added to community samples,
        // and processing is confined to the private tenant.
        samplesharing: "0",
        privateprocessing: "1",
        "content-type": "application/octet-stream",
      },
      body: bytes,
    },
    UPLOAD_TIMEOUT_MS,
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`MetaDefender submit ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data_id?: string };
  if (!json.data_id) throw new Error("MetaDefender submit returned no data_id");
  return json.data_id;
}

async function pollForVerdict(
  apiKey: string,
  dataId: string,
  deadline: number,
): Promise<FileResponse> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (Date.now() >= deadline) throw new Error("poll_timeout");
    const res = await fetchWithTimeout(
      `${METADEFENDER_BASE}/file/${encodeURIComponent(dataId)}`,
      { headers: { apikey: apiKey } },
      10_000,
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MetaDefender poll ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = (await res.json()) as FileResponse;
    const progress = body.scan_results?.progress_percentage ?? 0;
    const verdictI = body.scan_results?.scan_all_result_i;
    if (progress >= 100 && typeof verdictI === "number") return body;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

export async function scanUploadedDocument(input: ScanInput): Promise<ScanResult> {
  const apiKey = process.env.OPSWAT_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      code: "failed",
      data_id: null,
      threats: [],
      error_message: "OPSWAT_API_KEY not configured — failing closed.",
    };
  }

  let bytes: Uint8Array;
  let filename: string;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blob, error } = await supabaseAdmin.storage
      .from("student-documents")
      .download(input.storage_path);
    if (error || !blob) {
      return {
        ok: false,
        code: "failed",
        data_id: null,
        threats: [],
        error_message: error?.message ?? "Could not read uploaded object for AV scan.",
      };
    }
    bytes = new Uint8Array(await blob.arrayBuffer());
    // Use only the last path segment; MetaDefender only needs a filename hint.
    filename = input.storage_path.split("/").pop() ?? "upload.bin";
  } catch (err) {
    return {
      ok: false,
      code: "failed",
      data_id: null,
      threats: [],
      error_message: err instanceof Error ? err.message : String(err),
    };
  }

  let dataId: string;
  try {
    dataId = await submitFile(apiKey, bytes, filename);
  } catch (err) {
    return {
      ok: false,
      code: "failed",
      data_id: null,
      threats: [],
      error_message: err instanceof Error ? err.message : String(err),
    };
  }

  let body: FileResponse;
  try {
    body = await pollForVerdict(apiKey, dataId, Date.now() + POLL_TIMEOUT_MS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      code: msg === "poll_timeout" ? "timeout" : "failed",
      data_id: dataId,
      threats: [],
      error_message: msg,
    };
  }

  const sr = body.scan_results!;
  const code = verdictCodeFor(sr.scan_all_result_i);
  const threats = threatsFrom(sr);

  if (code === "clean") {
    return {
      ok: true,
      code: "clean",
      data_id: dataId,
      scan_all_result_i: sr.scan_all_result_i!,
      scan_all_result_a: sr.scan_all_result_a ?? "No Threat Detected",
      total_avs: sr.total_avs,
      total_detected_avs: sr.total_detected_avs,
      threats,
    };
  }

  return {
    ok: false,
    code,
    data_id: dataId,
    scan_all_result_i: sr.scan_all_result_i,
    scan_all_result_a: sr.scan_all_result_a,
    threats,
    error_message:
      code === "infected"
        ? `Threats detected: ${threats.slice(0, 3).join("; ") || sr.scan_all_result_a || "unknown"}`
        : code === "failed"
          ? `Scan failed: ${sr.scan_all_result_a ?? "engines could not complete"}`
          : `Indeterminate verdict (${sr.scan_all_result_i}: ${sr.scan_all_result_a ?? "unknown"})`,
  };
}

// Exported for unit testing only.
export const __test__ = { verdictCodeFor, threatsFrom };
