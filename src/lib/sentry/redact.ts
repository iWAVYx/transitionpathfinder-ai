/**
 * Sentry event redaction — isomorphic, pure, dependency-free.
 *
 * Every event passes through `redactSentryEvent` in `beforeSend` before it
 * leaves the browser. The rule is deny-by-default for anything that could
 * carry student, family, document, or credential data:
 *
 *  - request bodies and cookies are dropped wholesale
 *  - Authorization / api-key / cookie headers are dropped
 *  - user identity is reduced to nothing (sendDefaultPii is also false)
 *  - UUIDs in URLs/messages become `:id` so student/document IDs never leak
 *  - emails, phones, SSNs, dates, long digit runs are pattern-scrubbed
 *  - any key whose NAME suggests PII (name/email/student/document/report/
 *    message/token/filename/content/…) has its value replaced outright
 *  - strings are clamped so a stringified Pathway Report can't ride along
 */

const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const PHONE_RE = /(?:\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const JWT_RE = /\beyJ[\w-]+\.[\w-]+\.[\w-]+/g;
const LONG_DIGITS_RE = /\b\d{7,}\b/g;
const DATE_RE = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
const FILENAME_RE = /\b[\w ,'()-]+\.(?:pdf|docx?|xlsx?|pptx?|csv|txt|rtf|png|jpe?g|heic)\b/gi;

/** Key names whose VALUE is always dropped, regardless of content. */
const SENSITIVE_KEY_RE =
  /(name|email|phone|student|child|guardian|parent|document|doc_?id|file|filename|attachment|report|pathway|goal|iep|message|body|content|note|comment|transcript|summary|token|secret|password|authorization|cookie|session|apikey|api_key|dob|birth|address|ssn)/i;

const MAX_STRING_LEN = 250;
const MAX_DEPTH = 6;

export const REDACTED = "[redacted]";

/** Scrub PII patterns out of a free-text string. */
export function redactString(input: string): string {
  let s = input
    .replace(JWT_RE, "[token]")
    .replace(EMAIL_RE, "[email]")
    .replace(SSN_RE, REDACTED)
    .replace(UUID_RE, ":id")
    .replace(FILENAME_RE, "[file]")
    .replace(PHONE_RE, "[phone]")
    .replace(DATE_RE, "[date]")
    .replace(LONG_DIGITS_RE, REDACTED);
  if (s.length > MAX_STRING_LEN) s = s.slice(0, MAX_STRING_LEN - 1) + "…";
  return s;
}

/** Replace UUID path segments and strip every query string from a URL. */
export function redactUrl(url: string): string {
  const withoutQuery = url.split("?")[0].split("#")[0];
  return withoutQuery.replace(UUID_RE, ":id");
}

/**
 * Recursively redact an arbitrary value: sensitive KEYS lose their value
 * entirely, remaining strings get pattern-scrubbed.
 */
export function redactValue(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return REDACTED;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactValue(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? REDACTED : redactValue(v, depth + 1);
    }
    return out;
  }
  return REDACTED;
}

/** Minimal structural shape of the parts of a Sentry event we touch. */
type LooseEvent = {
  user?: unknown;
  message?: unknown;
  server_name?: unknown;
  request?: {
    url?: string;
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  breadcrumbs?: Array<Record<string, unknown>>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  exception?: { values?: Array<Record<string, unknown>> };
} & Record<string, unknown>;

const ALLOWED_HEADERS = new Set(["content-type", "user-agent", "accept-language"]);

/**
 * `beforeSend` / `beforeSendTransaction` hook. Returns the sanitized event,
 * or null if it should be dropped entirely.
 */
export function redactSentryEvent<T>(event: T): T {
  const e = event as unknown as LooseEvent;
  if (!e || typeof e !== "object") return event;

  // Identity: never send who the user is.
  delete e.user;
  delete e.server_name;

  if (typeof e.message === "string") e.message = redactString(e.message);

  if (e.request) {
    // Request bodies, cookies, and query strings are dropped wholesale —
    // they are the highest-risk carriers of student/document payloads.
    delete e.request.data;
    delete e.request.cookies;
    delete e.request.query_string;
    if (e.request.url) e.request.url = redactUrl(e.request.url);
    if (e.request.headers) {
      const safe: Record<string, string> = {};
      for (const [k, v] of Object.entries(e.request.headers)) {
        if (ALLOWED_HEADERS.has(k.toLowerCase())) safe[k] = v;
      }
      e.request.headers = safe;
    }
  }

  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = e.breadcrumbs.map((b) => {
      const next: Record<string, unknown> = { ...b };
      if (typeof next.message === "string") next.message = redactString(next.message);
      if (next.data) next.data = redactValue(next.data);
      return next;
    });
  }

  if (e.extra) e.extra = redactValue(e.extra) as Record<string, unknown>;
  if (e.tags) e.tags = redactValue(e.tags) as Record<string, unknown>;

  if (e.contexts && typeof e.contexts === "object") {
    const ctx = e.contexts as Record<string, unknown>;
    // `trace` carries span ids that Sentry needs structurally intact.
    const trace = ctx.trace;
    const redacted = redactValue(ctx) as Record<string, unknown>;
    if (trace !== undefined) redacted.trace = trace;
    e.contexts = redacted;
  }

  if (e.exception?.values) {
    e.exception.values = e.exception.values.map((v) => {
      const next: Record<string, unknown> = { ...v };
      if (typeof next.value === "string") next.value = redactString(next.value);
      const st = next.stacktrace as { frames?: Array<Record<string, unknown>> } | undefined;
      if (st?.frames) {
        next.stacktrace = {
          ...st,
          frames: st.frames.map((f) => {
            const frame: Record<string, unknown> = { ...f };
            // Local variable snapshots can hold whole report objects.
            delete frame.vars;
            if (typeof frame.filename === "string") frame.filename = redactUrl(frame.filename);
            if (typeof frame.abs_path === "string") frame.abs_path = redactUrl(frame.abs_path);
            return frame;
          }),
        };
      }
      return next;
    });
  }

  return e as unknown as T;
}
