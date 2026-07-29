import { describe, it, expect } from "vitest";

import { resolveSentryConfig, resolveSentryEnvironment } from "@/lib/sentry/config";
import { redactSentryEvent, redactString, redactUrl, REDACTED } from "@/lib/sentry/redact";

describe("sentry environment resolution", () => {
  it("maps the two production hostnames to production", () => {
    expect(resolveSentryEnvironment("transitionforwardct.com")).toBe("production");
    expect(resolveSentryEnvironment("www.transitionforwardct.com")).toBe("production");
    expect(resolveSentryEnvironment("WWW.TransitionForwardCT.com")).toBe("production");
  });

  it("maps staging, localhost, previews, and unknown hosts to staging", () => {
    for (const host of [
      "e2e.transitionforwardct.com",
      "localhost",
      "127.0.0.1",
      "id-preview--a4a5068b.lovable.app",
      "transitionpathfinder-ai.lovable.app",
      "evil.example.com",
      "",
      undefined,
      null,
    ]) {
      expect(resolveSentryEnvironment(host as string)).toBe("staging");
    }
  });

  it("never returns production for a subdomain that merely contains the prod host", () => {
    expect(resolveSentryEnvironment("staging.transitionforwardct.com")).toBe("staging");
    expect(resolveSentryEnvironment("transitionforwardct.com.evil.net")).toBe("staging");
  });

  it("reports disabled when no DSN is configured", () => {
    // DSNs ship empty until pasted; init must stay inert rather than throw.
    const cfg = resolveSentryConfig("localhost");
    expect(cfg.environment).toBe("staging");
    expect(cfg.enabled).toBe(cfg.dsn.length > 0);
  });
});

describe("redactString", () => {
  it("strips emails, phones, SSNs, UUIDs, JWTs, filenames, and dates", () => {
    expect(redactString("contact jane.doe@school.org")).toContain("[email]");
    expect(redactString("call 860-555-1234")).toContain("[phone]");
    expect(redactString("ssn 123-45-6789")).toContain(REDACTED);
    expect(redactString("student 3f2504e0-4f89-11d3-9a0c-0305e82c3301")).toContain(":id");
    expect(redactString("bearer eyJhbGci.eyJzdWIi.sig")).toContain("[token]");
    expect(redactString("uploaded Jordan IEP 2026.pdf")).toContain("[file]");
    expect(redactString("meeting on 2026-03-14")).toContain("[date]");
  });

  it("clamps very long strings so report bodies cannot ride along", () => {
    expect(redactString("x".repeat(5000)).length).toBeLessThanOrEqual(250);
  });
});

describe("redactUrl", () => {
  it("drops query strings and masks UUID path segments", () => {
    expect(redactUrl("/students/3f2504e0-4f89-11d3-9a0c-0305e82c3301?token=abc")).toBe(
      "/students/:id",
    );
  });
});

describe("redactSentryEvent", () => {
  it("removes user identity, request body, cookies, and unsafe headers", () => {
    const out = redactSentryEvent({
      user: { id: "u1", email: "parent@example.com", username: "Jordan Rivera" },
      server_name: "worker-3",
      request: {
        url: "https://app/students/3f2504e0-4f89-11d3-9a0c-0305e82c3301?tok=1",
        headers: {
          Authorization: "Bearer abc",
          Cookie: "sb=1",
          "Content-Type": "application/json",
        },
        cookies: { sb: "1" },
        data: { iepContent: "full report text" },
        query_string: "tok=1",
      },
    } as Record<string, unknown>) as Record<string, never>;

    const e = out as unknown as {
      user?: unknown;
      server_name?: unknown;
      request: { url: string; headers: Record<string, string>; cookies?: unknown; data?: unknown };
    };
    expect(e.user).toBeUndefined();
    expect(e.server_name).toBeUndefined();
    expect(e.request.data).toBeUndefined();
    expect(e.request.cookies).toBeUndefined();
    expect(e.request.url).toBe("https://app/students/:id");
    expect(e.request.headers.Authorization).toBeUndefined();
    expect(e.request.headers.Cookie).toBeUndefined();
    expect(e.request.headers["Content-Type"]).toBe("application/json");
  });

  it("blanks values under sensitive keys anywhere in extra/contexts", () => {
    const out = redactSentryEvent({
      extra: {
        student_name: "Jordan Rivera",
        documentTitle: "IEP 2026",
        pathwayReport: { summary: "long narrative" },
        safeCount: 3,
      },
    } as Record<string, unknown>) as unknown as { extra: Record<string, unknown> };

    expect(out.extra.student_name).toBe(REDACTED);
    expect(out.extra.documentTitle).toBe(REDACTED);
    expect(out.extra.pathwayReport).toBe(REDACTED);
    expect(out.extra.safeCount).toBe(3);
  });

  it("scrubs exception values and drops stack frame local variables", () => {
    const out = redactSentryEvent({
      exception: {
        values: [
          {
            value: "failed for parent@example.com on Jordan IEP.pdf",
            stacktrace: {
              frames: [
                {
                  filename: "/app/students/3f2504e0-4f89-11d3-9a0c-0305e82c3301.js",
                  vars: { iep: "secret" },
                },
              ],
            },
          },
        ],
      },
    } as Record<string, unknown>) as unknown as {
      exception: {
        values: Array<{ value: string; stacktrace: { frames: Array<Record<string, unknown>> } }>;
      };
    };

    const v = out.exception.values[0];
    expect(v.value).toContain("[email]");
    expect(v.value).toContain("[file]");
    expect(v.stacktrace.frames[0].vars).toBeUndefined();
    expect(v.stacktrace.frames[0].filename).toBe("/app/students/:id.js");
  });

  it("preserves the trace context so Sentry can still correlate spans", () => {
    const out = redactSentryEvent({
      contexts: { trace: { trace_id: "abc", span_id: "def" }, student: { name: "Jordan" } },
    } as Record<string, unknown>) as unknown as { contexts: Record<string, unknown> };

    expect(out.contexts.trace).toEqual({ trace_id: "abc", span_id: "def" });
    expect(out.contexts.student).toBe(REDACTED);
  });
});
