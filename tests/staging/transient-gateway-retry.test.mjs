import assert from "node:assert/strict";
import { test } from "node:test";

import { isTransientGatewayError, retryTransientGatewayRead } from "./transient-gateway-retry.mjs";

test("recognizes only temporary gateway-class failures", () => {
  assert.equal(isTransientGatewayError({ message: "Gateway Timeout" }), true);
  assert.equal(isTransientGatewayError({ code: "503", message: "Service unavailable" }), true);
  assert.equal(isTransientGatewayError({ message: "relation does not exist" }), false);
  assert.equal(isTransientGatewayError({ message: "permission denied" }), false);
  assert.equal(isTransientGatewayError(null), false);
});

test("returns immediately when the first read succeeds", async () => {
  let calls = 0;
  const result = await retryTransientGatewayRead(async () => {
    calls += 1;
    return { data: [{ id: 1 }], error: null };
  });

  assert.equal(calls, 1);
  assert.deepEqual(result, { data: [{ id: 1 }], error: null });
});

test("retries a temporary gateway failure with bounded delays", async () => {
  let calls = 0;
  const delays = [];
  const result = await retryTransientGatewayRead(
    async () => {
      calls += 1;
      return calls < 3
        ? { data: null, error: { message: "Gateway Timeout" } }
        : { data: [], error: null };
    },
    {
      attempts: 3,
      delaysMs: [10, 20],
      sleep: async (delay) => delays.push(delay),
    },
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
  assert.equal(result.error, null);
});

test("does not retry schema, permission, or other non-gateway failures", async () => {
  let calls = 0;
  const failure = { data: null, error: { message: "relation plan_capacities does not exist" } };
  const result = await retryTransientGatewayRead(async () => {
    calls += 1;
    return failure;
  });

  assert.equal(calls, 1);
  assert.equal(result, failure);
});

test("stops after the configured attempt limit", async () => {
  let calls = 0;
  const result = await retryTransientGatewayRead(
    async () => {
      calls += 1;
      return { data: null, error: { code: "504", message: "Gateway Timeout" } };
    },
    { attempts: 3, delaysMs: [0], sleep: async () => assert.fail("sleep should not run") },
  );

  assert.equal(calls, 3);
  assert.equal(result.error.code, "504");
});
