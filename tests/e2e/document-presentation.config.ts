import { defineConfig } from "@playwright/test";

/** Credential-free component fixtures: no application server or stored session. */
export default defineConfig({
  testDir: ".", testMatch: "document-presentation.spec.ts", retries: 0,
  reporter: [["list"]],
  use: { trace: "off", launchOptions: process.env.DOCUMENT_QA_BROWSER_EXECUTABLE ? { executablePath: process.env.DOCUMENT_QA_BROWSER_EXECUTABLE } : undefined },
});
