import { expect, it } from "vitest";
import { creatorFailureKind, creatorTransportDiagnostics, creatorCompletionSurface } from "../e2e/helpers/pathway-creator-diagnostics";

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
  expect(d.snapshot(error)).toMatchObject({ primaryFailureKind: "timeout", failedPostStatuses: [400,429,500,599], failedPostRequests: 1, postResponseStatuses: [200,302,400,429,500,599] });
  expect(JSON.stringify(d.snapshot(error))).not.toMatch(/private|sk_synthetic|student|headers|body|url|stack|message/);
  const snapshot = d.snapshot(error); snapshot.failedPostStatuses.push(403);
  expect(d.snapshot(error).failedPostStatuses).toEqual([400,429,500,599]);
});
it("caps retained failure metadata even if a page has many failing requests", () => {
  const d = creatorTransportDiagnostics();
  for(let i=0;i<1000;i++) { d.response(503); d.failed(); }
  expect(d.snapshot(undefined)).toMatchObject({primaryFailureKind:"unknown",failedPostStatuses:Array(16).fill(503),failedPostRequests:16,postResponseStatuses:Array(16).fill(503),pendingPostRequests:0});
});

it("distinguishes completed 200 responses from unfinished and failed generation transport", () => {
  const d=creatorTransportDiagnostics();
  d.started(); d.response(200);
  expect(d.snapshot(null)).toMatchObject({startedPostRequests:1,pendingPostRequests:1,postResponseStatuses:[200],failedPostStatuses:[]});
  d.finished();
  expect(d.snapshot(null)).toMatchObject({finishedPostRequests:1,pendingPostRequests:0});
  d.started(); d.failed();
  expect(d.snapshot(null)).toMatchObject({failedPostRequests:1,pendingPostRequests:0});
});
it("reports only fixed completion UI categories, stripping all paths and identifiers", () => {
  expect(creatorCompletionSurface("/pathway",true)).toEqual({page:"builder",completionAlert:true});
  expect(creatorCompletionSurface("/reports/11111111-1111-4111-8111-111111111111",false)).toEqual({page:"report",completionAlert:false});
  expect(creatorCompletionSurface("/private-data?token=secret",false)).toEqual({page:"other",completionAlert:false});
});
