import { afterEach, expect, it, vi } from "vitest";
import { openChannelAttachment } from "@/lib/channel-attachment-download.browser";
afterEach(() => vi.unstubAllGlobals());
it("opens HTTPS downloads with isolated opener flags", () => {
  const open = vi.fn();
  vi.stubGlobal("window", { open });
  openChannelAttachment("https://storage.example/synthetic");
  expect(open).toHaveBeenCalledWith(
    "https://storage.example/synthetic",
    "_blank",
    "noopener,noreferrer",
  );
});
it.each([
  "javascript:alert(1)",
  "data:text/plain,example",
  "http://storage.example/file",
  "not a URL",
])("rejects unsafe or invalid destination %s", (url) => {
  const open = vi.fn();
  vi.stubGlobal("window", { open });
  expect(() => openChannelAttachment(url)).toThrow();
  expect(open).not.toHaveBeenCalled();
});
