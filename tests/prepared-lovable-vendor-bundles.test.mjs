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
const motionUrl = new URL("motion-client.mjs", vendorDirectory);
const reactMarkdownUrl = new URL("react-markdown.mjs", vendorDirectory);
const remarkGfmUrl = new URL("remark-gfm.mjs", vendorDirectory);
const qrcodeUrl = new URL("qrcode-client.mjs", vendorDirectory);
const zodUrl = new URL("zod-client.mjs", vendorDirectory);

test.after(() => {
  if (originalLovableSandbox === undefined) delete process.env.LOVABLE_SANDBOX;
  else process.env.LOVABLE_SANDBOX = originalLovableSandbox;
});

test("prepared Lovable vendor slices are substantive and expose only reviewed APIs", async () => {
  const [dayPickerStats, sentryStats, motionStats, dayPicker, sentry, motion] = await Promise.all([
    stat(dayPickerUrl),
    stat(sentryUrl),
    stat(motionUrl),
    import(dayPickerUrl.href),
    import(sentryUrl.href),
    import(motionUrl.href),
  ]);

  assert.ok(dayPickerStats.size > 10_000);
  assert.ok(sentryStats.size > 10_000);
  assert.ok(motionStats.size > 10_000);
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
  assert.deepEqual(Object.keys(motion).sort(), [
    "AnimatePresence",
    "LazyMotion",
    "domMax",
    "motion",
    "useInView",
    "useReducedMotion",
    "useScroll",
    "useSpring",
    "useTransform",
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

test("prepared Motion slice renders a motion component", async () => {
  const { motion } = await import(motionUrl.href);
  const markup = renderToStaticMarkup(
    React.createElement(motion.div, { initial: false, "data-motion-check": "ready" }, "Ready"),
  );

  assert.match(markup, /data-motion-check="ready"/);
  assert.match(markup, />Ready<\/div>/);
});

test("prepared Markdown slices render GFM content", async () => {
  const previousDocument = globalThis.document;
  try {
    globalThis.document = {
      createElement: () => ({ innerHTML: "", textContent: "" }),
    };
    const [{ default: ReactMarkdown }, { default: remarkGfm }] = await Promise.all([
      import(reactMarkdownUrl.href),
      import(remarkGfmUrl.href),
    ]);
    const markup = renderToStaticMarkup(
      React.createElement(
        ReactMarkdown,
        { remarkPlugins: [remarkGfm] },
        "| Path | Ready |\n| --- | --- |\n| College | Yes |",
      ),
    );
    assert.match(markup, /<table>/);
    assert.match(markup, /<td>College<\/td>/);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("prepared validation and QR slices preserve public behavior", async () => {
  const [{ z }, { default: QRCode }] = await Promise.all([
    import(zodUrl.href),
    import(qrcodeUrl.href),
  ]);
  assert.deepEqual(z.object({ role: z.literal("student") }).parse({ role: "student" }), {
    role: "student",
  });
  const qr = QRCode.create("transitionforward:test");
  assert.ok(qr.modules.size > 0);
  assert.equal(typeof qr.modules.get(0, 0), "number");
});
