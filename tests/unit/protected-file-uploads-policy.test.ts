import { describe, expect, it } from "vitest";
import { PRODUCTION_PROJECT_REF, STAGING_PROJECT_REF } from "@/lib/env-identity";
import { resolveProtectedFileUploadsEnabled } from "@/lib/protected-file-uploads";

const STAGING_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;

describe("protected file upload policy", () => {
  it("enables uploads only for the isolated staging identity", () => {
    expect(
      resolveProtectedFileUploadsEnabled({
        appEnv: "staging",
        supabaseUrl: STAGING_URL,
      }),
    ).toBe(true);
  });

  it("stays disabled in production even when given the staging database", () => {
    expect(
      resolveProtectedFileUploadsEnabled({
        appEnv: "production",
        supabaseUrl: STAGING_URL,
      }),
    ).toBe(false);
  });

  it("rejects the production database even when mislabeled as staging", () => {
    expect(
      resolveProtectedFileUploadsEnabled({
        appEnv: "staging",
        supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
      }),
    ).toBe(false);
  });

  it("rejects arbitrary, missing, and malformed database identities", () => {
    expect(
      resolveProtectedFileUploadsEnabled({
        appEnv: "staging",
        supabaseUrl: "https://not-isolated-staging.supabase.co",
      }),
    ).toBe(false);
    expect(resolveProtectedFileUploadsEnabled({ appEnv: "staging", supabaseUrl: undefined })).toBe(
      false,
    );
    expect(
      resolveProtectedFileUploadsEnabled({ appEnv: "staging", supabaseUrl: "not-a-url" }),
    ).toBe(false);
  });

  it("rejects development, missing, and unknown environment labels", () => {
    expect(
      resolveProtectedFileUploadsEnabled({ appEnv: "development", supabaseUrl: STAGING_URL }),
    ).toBe(false);
    expect(
      resolveProtectedFileUploadsEnabled({ appEnv: undefined, supabaseUrl: STAGING_URL }),
    ).toBe(false);
    expect(
      resolveProtectedFileUploadsEnabled({ appEnv: "preview", supabaseUrl: STAGING_URL }),
    ).toBe(false);
  });
});
