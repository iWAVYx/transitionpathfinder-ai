import assert from "node:assert/strict";
import test from "node:test";

import {
  assertLovablePublicBuildInputs,
  isIsolatedLovableStagingBuild,
  paymentsClientTokenMode,
  paymentsEnvironmentForHostname,
  resolvePublicBuildInputs,
  selectPaymentsClientConfig,
} from "../scripts/resolve-public-build-inputs.mjs";

const SANDBOX_TOKEN = "pk_test_fixture";
const LIVE_TOKEN = "pk_live_fixture";

test("isolated Lovable staging detection accepts Vite's loaded staging label", () => {
  assert.equal(
    isIsolatedLovableStagingBuild({
      isLovableSandbox: true,
      appEnv: "staging",
      publicBuildEnv: { VITE_APP_ENV: "staging" },
    }),
    true,
  );
});

test("isolated Lovable staging detection fails closed on identity drift", () => {
  assert.equal(
    isIsolatedLovableStagingBuild({
      isLovableSandbox: false,
      appEnv: "staging",
      publicBuildEnv: { VITE_APP_ENV: "staging" },
    }),
    false,
  );
  assert.equal(
    isIsolatedLovableStagingBuild({
      isLovableSandbox: true,
      appEnv: "production",
      publicBuildEnv: { VITE_APP_ENV: "staging" },
    }),
    false,
  );
  assert.equal(
    isIsolatedLovableStagingBuild({
      isLovableSandbox: true,
      appEnv: "staging",
      runtimeEnv: { VITE_APP_ENV: "production" },
      publicBuildEnv: { VITE_APP_ENV: "staging" },
    }),
    false,
  );
});

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

test("Lovable shared builds use the reviewed production label in development mode", () => {
  const inputs = resolvePublicBuildInputs({
    publicBuildEnv: {
      VITE_PAYMENTS_CLIENT_TOKEN: SANDBOX_TOKEN,
    },
    sandboxPublicBuildEnv: {
      VITE_PAYMENTS_CLIENT_TOKEN: SANDBOX_TOKEN,
    },
    livePublicBuildEnv: {
      VITE_APP_ENV: "production",
      VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
    },
    preferLiveBuildInputs: true,
  });

  assert.equal(inputs.viteAppEnv, "production");
  assert.equal(paymentsClientTokenMode(inputs.sandboxPaymentsClientToken), "sandbox");
  assert.equal(paymentsClientTokenMode(inputs.livePaymentsClientToken), "live");
  assert.doesNotThrow(() => assertLovablePublicBuildInputs(inputs));
});

test("Lovable shared builds fail closed when a reviewed public input is missing", () => {
  assert.throws(
    () =>
      assertLovablePublicBuildInputs({
        viteAppEnv: "",
        sandboxPaymentsClientToken: SANDBOX_TOKEN,
        livePaymentsClientToken: "",
      }),
    /VITE_APP_ENV.*live Stripe publishable token/,
  );
});

test("isolated Lovable staging builds can keep payments disabled without inheriting live inputs", () => {
  const inputs = resolvePublicBuildInputs({
    runtimeEnv: {
      VITE_APP_ENV: "staging",
    },
    publicBuildEnv: {
      VITE_APP_ENV: "production",
      VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
    },
    livePublicBuildEnv: {
      VITE_APP_ENV: "production",
      VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
    },
    stagingOnlyBuild: true,
  });

  assert.deepEqual(inputs, {
    viteAppEnv: "staging",
    paymentsClientToken: "",
    sandboxPaymentsClientToken: "",
    livePaymentsClientToken: "",
  });
  assert.doesNotThrow(() =>
    assertLovablePublicBuildInputs(inputs, {
      appEnv: "staging",
      stagingOnlyBuild: true,
    }),
  );
});

test("isolated Lovable staging builds may embed only a sandbox public token", () => {
  const inputs = resolvePublicBuildInputs({
    runtimeEnv: {
      VITE_APP_ENV: "staging",
    },
    sandboxPublicBuildEnv: {
      VITE_PAYMENTS_CLIENT_TOKEN: SANDBOX_TOKEN,
    },
    livePublicBuildEnv: {
      VITE_APP_ENV: "production",
      VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
    },
    stagingOnlyBuild: true,
  });

  assert.equal(inputs.paymentsClientToken, SANDBOX_TOKEN);
  assert.equal(inputs.sandboxPaymentsClientToken, SANDBOX_TOKEN);
  assert.equal(inputs.livePaymentsClientToken, "");
  assert.doesNotThrow(() =>
    assertLovablePublicBuildInputs(inputs, {
      appEnv: "staging",
      stagingOnlyBuild: true,
    }),
  );
});

test("isolated Lovable staging builds reject environment drift and live public inputs", () => {
  assert.throws(
    () =>
      assertLovablePublicBuildInputs(
        {
          viteAppEnv: "production",
          paymentsClientToken: LIVE_TOKEN,
          sandboxPaymentsClientToken: "",
          livePaymentsClientToken: LIVE_TOKEN,
        },
        { appEnv: "production", stagingOnlyBuild: true },
      ),
    /APP_ENV.*VITE_APP_ENV.*live Stripe public inputs/,
  );
});

test("isolated Lovable staging builds reject live runtime Stripe inputs before bundling", () => {
  const inputs = resolvePublicBuildInputs({
    runtimeEnv: {
      VITE_APP_ENV: "staging",
      VITE_PAYMENTS_CLIENT_TOKEN: LIVE_TOKEN,
      VITE_PAYMENTS_LIVE_CLIENT_TOKEN: LIVE_TOKEN,
    },
    stagingOnlyBuild: true,
  });

  assert.equal(inputs.paymentsClientToken, "");
  assert.equal(inputs.livePaymentsClientToken, "");
  assert.throws(
    () =>
      assertLovablePublicBuildInputs(inputs, {
        appEnv: "staging",
        runtimePaymentsClientTokenMode: "live",
        runtimePaymentsClientTokenPresent: true,
        runtimeLivePaymentsClientTokenPresent: true,
        stagingOnlyBuild: true,
      }),
    /live Stripe public inputs are forbidden in isolated staging/,
  );
});

test("isolated Lovable staging builds reject unrecognized generic runtime payment inputs", () => {
  const inputs = resolvePublicBuildInputs({
    runtimeEnv: {
      VITE_APP_ENV: "staging",
      VITE_PAYMENTS_CLIENT_TOKEN: "unrecognized_public_fixture",
    },
    stagingOnlyBuild: true,
  });

  assert.throws(
    () =>
      assertLovablePublicBuildInputs(inputs, {
        appEnv: "staging",
        runtimePaymentsClientTokenMode: "unknown",
        runtimePaymentsClientTokenPresent: true,
        stagingOnlyBuild: true,
      }),
    /live Stripe public inputs are forbidden in isolated staging/,
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

test("hosted preview recovers missing APP_ENV only with explicit isolated identity", async () => {
  const { resolveLovableBuildAppEnv } = await import('../scripts/resolve-public-build-inputs.mjs');
  const publicBuildEnv = { VITE_APP_ENV: 'staging', VITE_SUPABASE_URL: 'https://qgrertkqbwanerqqemph.supabase.co' };
  assert.equal(resolveLovableBuildAppEnv({ publicBuildEnv }), 'staging');
  assert.equal(resolveLovableBuildAppEnv({ runtimeEnv: { APP_ENV: 'production' }, publicBuildEnv }), 'production');
  assert.equal(resolveLovableBuildAppEnv({ publicBuildEnv: { ...publicBuildEnv, VITE_APP_ENV: 'production' } }), '');
  assert.equal(resolveLovableBuildAppEnv(), '');
  for (const url of ['', 'https://lrqcntqyekucamifpffs.supabase.co', 'https://qgrertkqbwanerqqemph.supabase.co.evil.test', 'http://qgrertkqbwanerqqemph.supabase.co']) {
    assert.throws(() => resolveLovableBuildAppEnv({ publicBuildEnv: { ...publicBuildEnv, VITE_SUPABASE_URL: url } }), /exact isolated/);
  }
  assert.throws(() => resolveLovableBuildAppEnv({ publicBuildEnv, runtimeEnv: { SUPABASE_URL: 'https://lrqcntqyekucamifpffs.supabase.co' } }), /exact isolated/);
});
