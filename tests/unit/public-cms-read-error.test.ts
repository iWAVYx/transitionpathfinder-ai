import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PUBLIC_CMS_UNAVAILABLE_MESSAGE,
  throwIfPublicCmsReadFailed,
} from "@/lib/cms/public-read-error";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public CMS read errors", () => {
  it("does nothing when the provider reports success", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => throwIfPublicCmsReadFailed(null, "faqs")).not.toThrow();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("logs only a constrained provider code and throws a visitor-safe message", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const providerError = {
      code: "42501",
      message: "permission denied for function is_platform_admin",
      details: "internal database details",
    };

    expect(() => throwIfPublicCmsReadFailed(providerError, "blog-posts")).toThrow(
      PUBLIC_CMS_UNAVAILABLE_MESSAGE,
    );
    expect(errorSpy).toHaveBeenCalledWith("[public-cms] read failed", {
      operation: "blog-posts",
      code: "42501",
    });
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(providerError.message);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(providerError.details);
  });

  it("replaces malformed provider codes before logging", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      throwIfPublicCmsReadFailed({ code: "unsafe code with spaces" }, "page-section"),
    ).toThrow(PUBLIC_CMS_UNAVAILABLE_MESSAGE);
    expect(errorSpy).toHaveBeenCalledWith("[public-cms] read failed", {
      operation: "page-section",
      code: "unknown",
    });
  });
});
