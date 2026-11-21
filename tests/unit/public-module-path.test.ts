import { expect, it } from "vitest";
import { publicModulePath } from "../e2e/helpers/public-module-path";
const origin = "https://transitionforward-staging.caysi101.workers.dev";
it("retains a public module path without query or fragment values", () => {
  expect(publicModulePath(`${origin}/assets/demo_.plan-hash.js?token=private#fragment`, origin)).toBe("/assets/demo_.plan-hash.js");
});
it.each(["https://foreign.example/assets/module.js", `${origin}/api/private.js`, `${origin}/assets/style.css`, "malformed"])("excludes unrelated diagnostic URL %s", url => {
  expect(publicModulePath(url, origin)).toBeUndefined();
});
