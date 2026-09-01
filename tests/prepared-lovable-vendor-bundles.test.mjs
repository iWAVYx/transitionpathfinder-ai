import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const originalLovableSandbox = process.env.LOVABLE_SANDBOX;
process.env.LOVABLE_SANDBOX = "1";
await import(`../scripts/prepare-lovable-vendor-bundles.mjs?test=${Date.now()}`);

const vendorDirectory = new URL("../.transitionforward-build/vendor/", import.meta.url);
const dayPickerUrl = new URL("react-day-picker.mjs", vendorDirectory);
const sentryUrl = new URL("sentry-browser.mjs", vendorDirectory);

test.after(() => {
  if (originalLovableSandbox === undefined) delete process.env.LOVABLE_SANDBOX;
  else process.env.LOVABLE_SANDBOX = originalLovableSandbox;
});

test("prepared Lovable vendor slices are substantive and expose only reviewed APIs", async () => {
  const [dayPickerStats, sentryStats, dayPicker, sentry] = await Promise.all([
    stat(dayPickerUrl),
    stat(sentryUrl),
    import(dayPickerUrl.href),
    import(sentryUrl.href),
  ]);

  assert.ok(dayPickerStats.size > 10_000);
  assert.ok(sentryStats.size > 10_000);
  assert.deepEqual(Object.keys(dayPicker).sort(), [
    "DayButton",
    "DayPicker",
    "getDefaultClassNames",
  ]);
  assert.deepEqual(Object.keys(sentry).sort(), [
    "applySdkMetadata",
    "captureMessage",
    "init",
    "isSyntheticEvent",
    "normalizeStringifyValue",
    "setContext",
    "setNormalizeStringifier",
  ]);
});

test("prepared DayPicker slice renders the reviewed calendar behavior", async () => {
  const { DayPicker } = await import(dayPickerUrl.href);
  const markup = renderToStaticMarkup(
    React.createElement(DayPicker, {
      defaultMonth: new Date(2026, 8, 1),
      mode: "single",
      selected: new Date(2026, 8, 15),
    }),
  );

  assert.match(markup, /September 2026/);
  assert.match(markup, /aria-label="Tuesday, September 15th, 2026, selected"/);
  assert.match(markup, /role="grid"/);
});
