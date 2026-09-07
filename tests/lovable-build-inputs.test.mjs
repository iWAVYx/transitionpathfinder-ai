import assert from "node:assert/strict";
import test from "node:test";

import { resolvePublicBuildInputs } from "../scripts/resolve-public-build-inputs.mjs";

test("standard VITE inputs retain priority", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        VITE_APP_ENV: "staging",
        VITE_PAYMENTS_CLIENT_TOKEN: "runtime-staging-token-fixture",
        TRANSITIONFORWARD_BUILD_APP_ENV: "production",
        PAYMENTS_CLIENT_TOKEN: "compatibility-production-token-fixture",
      },
      publicBuildEnv: {
        VITE_APP_ENV: "production",
        VITE_PAYMENTS_CLIENT_TOKEN: "file-production-token-fixture",
      },
      allowLovableCompatibility: true,
    }),
    {
      viteAppEnv: "staging",
      paymentsClientToken: "runtime-staging-token-fixture",
    },
  );
});

test("tracked public env values retain priority over Lovable compatibility inputs", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        TRANSITIONFORWARD_BUILD_APP_ENV: "staging",
        PAYMENTS_CLIENT_TOKEN: "compatibility-staging-token-fixture",
      },
      publicBuildEnv: {
        VITE_APP_ENV: "production",
        VITE_PAYMENTS_CLIENT_TOKEN: "file-production-token-fixture",
      },
      allowLovableCompatibility: true,
    }),
    {
      viteAppEnv: "production",
      paymentsClientToken: "file-production-token-fixture",
    },
  );
});

test("Lovable compatibility inputs fill only missing or empty public values", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        VITE_APP_ENV: "",
        VITE_PAYMENTS_CLIENT_TOKEN: "   ",
        TRANSITIONFORWARD_BUILD_APP_ENV: "production",
        PAYMENTS_CLIENT_TOKEN: "compatibility-production-token-fixture",
      },
      publicBuildEnv: {},
      allowLovableCompatibility: true,
    }),
    {
      viteAppEnv: "production",
      paymentsClientToken: "compatibility-production-token-fixture",
    },
  );
});

test("non-Lovable builds ignore compatibility inputs and fail closed", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({
      runtimeEnv: {
        TRANSITIONFORWARD_BUILD_APP_ENV: "production",
        PAYMENTS_CLIENT_TOKEN: "compatibility-production-token-fixture",
      },
      publicBuildEnv: {},
      allowLovableCompatibility: false,
    }),
    {
      viteAppEnv: "",
      paymentsClientToken: "",
    },
  );
});

test("missing Lovable inputs remain empty so deployment identity rejects them", () => {
  assert.deepEqual(
    resolvePublicBuildInputs({ allowLovableCompatibility: true }),
    {
      viteAppEnv: "",
      paymentsClientToken: "",
    },
  );
});
