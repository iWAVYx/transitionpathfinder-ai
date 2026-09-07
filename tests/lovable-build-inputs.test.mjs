import assert from "node:assert/strict";
import test from "node:test";

import {
  paymentsClientTokenMode,
  paymentsEnvironmentForHostname,
  resolvePublicBuildInputs,
  selectPaymentsClientConfig,
} from "../scripts/resolve-public-build-inputs.mjs";

const SANDBOX_TOKEN = "pk_test_fixture";
const LIVE_TOKEN = "pk_live_fixture";

test("standard VITE inputs retain priority and empty values do not mask tracked inputs", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        VITE_APP_ENV: "   ",
        VITE_PAYMENTS_CLIENT_TOKEN: "",
      },
      publicBuildEnv: {
        VITE_APP_ENV: "production",
        VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
      },
      sandboxPublicBuildEnv: {
        VITE_PAYMENTS_CLIENT_TOKEN: SANDBOX_TOKEN,
      },
      livePublicBuildEnv: {
        VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
      },
    }),
    {
      viteAppEnv: "production",
      paymentsClientToken: LIVE_TOKEN,
      sandboxPaymentsClientToken: SANDBOX_TOKEN,
      livePaymentsClientToken: LIVE_TOKEN,
    },
  );
});

test("an explicit sandbox VITE token overrides only the sandbox build input", () => {
  const runtimeSandboxToken = "pk_test_runtime_fixture";
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        VITE_APP_ENV: "staging",
        VITE_PAYMENTS_CLIENT_TOKEN: runtimeSandboxToken,
      },
      publicBuildEnv: {
        VITE_APP_ENV: "production",
        VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
      },
      sandboxPublicBuildEnv: {
        VITE_PAYMENTS_CLIENT_TOKEN: SANDBOX_TOKEN,
      },
      livePublicBuildEnv: {
        VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
      },
    }),
    {
      viteAppEnv: "staging",
      paymentsClientToken: runtimeSandboxToken,
      sandboxPaymentsClientToken: runtimeSandboxToken,
      livePaymentsClientToken: LIVE_TOKEN,
    },
  );
});

test("non-VITE compatibility aliases are ignored", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        TRANSITIONFORWARD_BUILD_APP_ENV: "production",
        PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
      },
    }),
    {
      viteAppEnv: "",
      paymentsClientToken: "",
      sandboxPaymentsClientToken: "",
      livePaymentsClientToken: "",
    },
  );
});

test("hostnames select Test for previews and staging and Live for published sites", () => {
  assert.equal(
    paymentsEnvironmentForHostname("preview--transitionpathfinder-ai.lovable.app"),
    "sandbox",
  );
  assert.equal(
    paymentsEnvironmentForHostname("transitionforward-staging.caysi101.workers.dev"),
    "sandbox",
  );
  assert.equal(paymentsEnvironmentForHostname("e2e.transitionforwardct.com"), "sandbox");
  assert.equal(paymentsEnvironmentForHostname("transitionforwardct.com"), "live");
  assert.equal(
    paymentsEnvironmentForHostname("transitionpathfinder-ai.lovable.app"),
    "live",
  );
  assert.equal(paymentsEnvironmentForHostname("unknown.example", "staging"), "sandbox");
  assert.equal(paymentsEnvironmentForHostname("unknown.example", "production"), "live");
  assert.equal(paymentsEnvironmentForHostname("unknown.example"), "unknown");
});

test("the running hostname receives only its matching public Stripe token", () => {
  const inputs = {
    sandboxPaymentsClientToken: SANDBOX_TOKEN,
    livePaymentsClientToken: LIVE_TOKEN,
  };
  assert.deepEqual(
    selectPaymentsClientConfig({
      hostname: "preview--transitionpathfinder-ai.lovable.app",
      ...inputs,
    }),
    { environment: "sandbox", clientToken: SANDBOX_TOKEN },
  );
  assert.deepEqual(
    selectPaymentsClientConfig({ hostname: "transitionforwardct.com", ...inputs }),
    { environment: "live", clientToken: LIVE_TOKEN },
  );
});

test("missing, malformed, or cross-environment tokens fail closed", () => {
  assert.equal(paymentsClientTokenMode(undefined), "unknown");
  assert.equal(paymentsClientTokenMode("not-a-token"), "unknown");
  assert.deepEqual(
    selectPaymentsClientConfig({
      hostname: "preview--transitionpathfinder-ai.lovable.app",
      sandboxPaymentsClientToken: LIVE_TOKEN,
      livePaymentsClientToken: LIVE_TOKEN,
    }),
    { environment: "sandbox", clientToken: "" },
  );
  assert.deepEqual(
    selectPaymentsClientConfig({
      hostname: "transitionforwardct.com",
      sandboxPaymentsClientToken: SANDBOX_TOKEN,
      livePaymentsClientToken: SANDBOX_TOKEN,
    }),
    { environment: "live", clientToken: "" },
  );
});
