import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/provision-staging-stripe-catalog.yml", "utf8");
const script = readFileSync("scripts/provision-staging-stripe-catalog.ts", "utf8");

describe("staging Stripe catalog provisioning", () => {
  it("is manual-only, staging-scoped, and requires explicit confirmation", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("environment: staging");
    expect(workflow).toContain("provision-staging-catalog");
    expect(workflow).not.toContain("push:");
    expect(workflow).not.toContain("schedule:");
  });

  it("previews before applying and proves a second run is clean", () => {
    const preview = workflow.indexOf("--dry-run");
    const apply = workflow.indexOf("--apply");
    const finalPreview = workflow.lastIndexOf("--dry-run");

    expect(preview).toBeGreaterThan(-1);
    expect(apply).toBeGreaterThan(preview);
    expect(finalPreview).toBeGreaterThan(apply);
  });

  it("fails closed on live or gateway credentials", () => {
    expect(script).toContain("balance.livemode !== false");
    expect(script).toContain("the staging key matches STRIPE_LIVE_API_KEY");
    expect(script).not.toContain("transfer_lookup_key");
    expect(workflow).not.toContain("sk_live_");
  });
});
