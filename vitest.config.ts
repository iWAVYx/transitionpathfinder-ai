import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config — used for static + light component-level regression checks
 * that don't need a real browser.
 *
 * Browser-real checks (mobile/tablet/desktop layout, refresh persistence,
 * dead-button click-through) live in tests/e2e/*.signedin.spec.ts and run
 * under Playwright.
 *
 * Run with:  bun run test:unit
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    globals: false,
  },
});
