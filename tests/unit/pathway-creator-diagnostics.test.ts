import { expect, it } from "vitest";
import { creatorFailureKind, creatorTransportDiagnostics } from "../e2e/helpers/pathway-creator-diagnostics";

it("retains a timeout category even when cleanup wraps the primary error", () => {
  const primary = new Error("URL with sensitive query and fictional student details");
  primary.name = "TimeoutError";
  const combined = new AggregateError([primary, new Error("cleanup pending")]);
  expect(creatorFailureKind(combined.errors[0])).toBe("timeout");
  expect(creatorFailureKind(new Error("private text"))).toBe("error");
  expect(creatorFailureKind({ name: "AssertionError" })).toBe("assertion");
  expect(creatorFailureKind({ name: "ExpectError" })).toBe("assertion");
  expect(creatorFailureKind({ name: "private-token" })).toBe("unknown");
  expect(creatorFailureKind("private-token")).toBe("unknown");
});
it("records bounded HTTP failures and transport counts without sensitive fields", () => {
  const d = creatorTransportDiagnostics();
  for (const n of [200, 302, 400, 429, 500, 599, 600, NaN, 401.5]) d.response(n);
  d.failed();
  const error = Object.assign(new Error("sk_synthetic_secret student details"), {
    name: "TimeoutError", headers: { authorization: "private" }, body: "private", url: "private",
  });
  expect(d.snapshot(error)).toEqual({ primaryFailureKind: "timeout", failedPostStatuses: [400,429,500,599], failedPostRequests: 1 });
  expect(JSON.stringify(d.snapshot(error))).not.toMatch(/private|sk_synthetic|student|headers|body|url|stack|message/);
  const snapshot = d.snapshot(error); snapshot.failedPostStatuses.push(403);
  expect(d.snapshot(error).failedPostStatuses).toEqual([400,429,500,599]);
});
it("caps retained failure metadata even if a page has many failing requests", () => {
  const d = creatorTransportDiagnostics();
  for(let i=0;i<1000;i++) { d.response(503); d.failed(); }
  expect(d.snapshot(undefined)).toEqual({primaryFailureKind:"unknown",failedPostStatuses:Array(16).fill(503),failedPostRequests:16});
});
