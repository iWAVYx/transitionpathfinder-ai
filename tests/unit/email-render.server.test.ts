import * as React from "react";
import { describe, expect, it } from "vitest";
import { renderEmail } from "../../src/lib/email-render.server";

const email = React.createElement(
  "html",
  null,
  React.createElement(
    "body",
    null,
    React.createElement("h1", null, "TransitionForward update"),
    React.createElement(
      "a",
      { href: "https://example.com/plan" },
      "Open your plan",
    ),
    React.createElement("img", {
      src: "https://example.com/decorative.png",
      alt: "decorative marker",
    }),
  ),
);

describe("renderEmail", () => {
  it("renders complete transactional HTML without formatting dependencies", async () => {
    const html = await renderEmail(email);

    expect(html).toMatch(/^<!DOCTYPE html PUBLIC/);
    expect(html).toContain("TransitionForward update");
    expect(html).toContain('href="https://example.com/plan"');
  });

  it("preserves the existing plain-text email behavior", async () => {
    const text = await renderEmail(email, { plainText: true });

    expect(text).toContain("TRANSITIONFORWARD UPDATE");
    expect(text).toContain("Open your plan");
    expect(text).toContain("https://example.com/plan");
    expect(text).not.toContain("decorative marker");
  });
});
