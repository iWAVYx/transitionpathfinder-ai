/**
 * Observability redaction — server-only.
 *
 * `obs_events` rows are read by operators via the Health tab and by
 * automated alert queries. The pipeline MUST NOT persist raw PII from
 * arbitrary Error messages, stack frames, or free-form attribute values.
 *
 * This helper strips the same leakable patterns handled by
 * `channel-preview-redact` (emails, phones, SSNs, DOBs, URLs, long
 * numeric IDs) and clamps oversized strings so a rogue error string
 * cannot bloat a row or reveal identifiers.
 *
 * Requirement: L-03 (Beta Readiness ledger).
 */

const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const PHONE_RE = /(?:\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const LONG_DIGITS_RE = /\b\d{7,}\b/g;
const DATE_RE = /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
const URL_RE = /https?:\/\/\S+/gi;

const MAX_STRING_LEN = 500;

export function redactObsString(input: string | null | undefined): string | null | undefined {
  if (input == null) return input;
  let s = String(input);
  s = s
    .replace(URL_RE, "[link]")
    .replace(EMAIL_RE, "[email]")
    .replace(SSN_RE, "[redacted]")
    .replace(PHONE_RE, "[phone]")
    .replace(DATE_RE, "[date]")
    .replace(LONG_DIGITS_RE, "[redacted]");
  if (s.length > MAX_STRING_LEN) s = s.slice(0, MAX_STRING_LEN - 1) + "…";
  return s;
}

export function redactObsAttributes(
  attrs: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!attrs) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === "string") out[k] = redactObsString(v);
    else if (v == null || typeof v === "number" || typeof v === "boolean") out[k] = v;
    else {
      // Serialize nested objects/arrays through JSON, then redact the
      // rendered string. Bounds are enforced by MAX_STRING_LEN.
      try {
        out[k] = redactObsString(JSON.stringify(v));
      } catch {
        out[k] = "[unserializable]";
      }
    }
  }
  return out;
}

export function redactObsError(
  err: { message: string; name?: string; stack?: string } | null | undefined,
): { message: string; name?: string; stack?: string } | null {
  if (!err) return null;
  return {
    message: redactObsString(err.message) ?? "",
    name: err.name,
    stack: redactObsString(err.stack) ?? undefined,
  };
}
