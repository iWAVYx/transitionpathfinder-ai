import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  authorizeScheduledHook,
  evaluateScheduledHookIdentity,
  type ScheduledHookConfig,
} from "@/lib/cron-auth.server";
import { PRODUCTION_PROJECT_REF, STAGING_PROJECT_REF } from "@/lib/env-identity";

const STAGING_ORIGIN = "https://transitionforward-staging.caysi101.workers.dev";
const PRODUCTION_ORIGIN = "https://transitionforwardct.com";
const SECRET = "staging-only-scheduled-secret-00000000000000000000";

const STAGING_CONFIG: ScheduledHookConfig = {
  appEnv: "staging",
  viteAppEnv: "staging",
  supabaseUrl: `https://${STAGING_PROJECT_REF}.supabase.co`,
  expectedOrigin: STAGING_ORIGIN,
  secret: SECRET,
};

function request(origin = STAGING_ORIGIN, authorization = `Bearer ${SECRET}`): Request {
  return new Request(`${origin}/api/public/channel-digest-tick`, {
    method: "POST",
    headers: { authorization },
  });
}

describe("scheduled hook authorization", () => {
  it("accepts a dedicated bearer secret for the exact staging identity", async () => {
    await expect(authorizeScheduledHook(request(), STAGING_CONFIG)).resolves.toEqual({
      ok: true,
      environment: "staging",
    });
  });

  it("rejects missing, malformed, and incorrect bearer credentials", async () => {
    await expect(
      authorizeScheduledHook(request(STAGING_ORIGIN, ""), STAGING_CONFIG),
    ).resolves.toMatchObject({ ok: false, status: 401 });
    await expect(
      authorizeScheduledHook(request(STAGING_ORIGIN, `apikey ${SECRET}`), STAGING_CONFIG),
    ).resolves.toMatchObject({ ok: false, status: 401 });
    await expect(
      authorizeScheduledHook(request(STAGING_ORIGIN, "Bearer incorrect-secret"), STAGING_CONFIG),
    ).resolves.toMatchObject({ ok: false, status: 401 });
  });

  it("does not accept the public apikey header as authorization", async () => {
    const apikeyOnly = new Request(`${STAGING_ORIGIN}/api/public/channel-digest-tick`, {
      method: "POST",
      headers: { apikey: "public-supabase-key" },
    });
    await expect(authorizeScheduledHook(apikeyOnly, STAGING_CONFIG)).resolves.toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("fails closed when the secret is missing or too short", async () => {
    await expect(
      authorizeScheduledHook(request(), { ...STAGING_CONFIG, secret: null }),
    ).resolves.toMatchObject({ ok: false, status: 503 });
    await expect(
      authorizeScheduledHook(request(), { ...STAGING_CONFIG, secret: "too-short" }),
    ).resolves.toMatchObject({ ok: false, status: 503 });
  });

  it("fails closed on cross-environment Supabase or origin identities", async () => {
    await expect(
      authorizeScheduledHook(request(), {
        ...STAGING_CONFIG,
        supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
      }),
    ).resolves.toMatchObject({ ok: false, status: 503 });
    await expect(
      authorizeScheduledHook(request(PRODUCTION_ORIGIN), STAGING_CONFIG),
    ).resolves.toMatchObject({ ok: false, status: 503 });
  });

  it("accepts only approved production hosts with the production project", () => {
    expect(
      evaluateScheduledHookIdentity({
        appEnv: "production",
        viteAppEnv: "production",
        supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        expectedOrigin: PRODUCTION_ORIGIN,
        requestUrl: `${PRODUCTION_ORIGIN}/api/public/channel-digest-tick`,
      }).ok,
    ).toBe(true);
    expect(
      evaluateScheduledHookIdentity({
        appEnv: "production",
        viteAppEnv: "production",
        supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        expectedOrigin: "https://example.com",
        requestUrl: "https://example.com/api/public/channel-digest-tick",
      }).ok,
    ).toBe(false);
    expect(
      evaluateScheduledHookIdentity({
        appEnv: "production",
        viteAppEnv: "production",
        supabaseUrl: `https://${PRODUCTION_PROJECT_REF}.supabase.co`,
        expectedOrigin: "https://project--00000000-0000-0000-0000-000000000000.lovable.app",
        requestUrl:
          "https://project--00000000-0000-0000-0000-000000000000.lovable.app/api/public/channel-digest-tick",
      }).ok,
    ).toBe(false);
  });
});

describe("scheduled hook source and migration contract", () => {
  const routeSources = [
    "src/routes/api/public/channel-digest-tick.ts",
    "src/routes/api/public/hooks/obs-alert-check.ts",
    "src/routes/api/public/hooks/obs-events-purge.ts",
  ].map((path) => readFileSync(path, "utf8"));
  const migration = readFileSync(
    "supabase/migrations/20260813013345_20260812163612_harden_scheduled_hook_isolation.sql",
    "utf8",
  );

  it("keeps public Supabase keys out of privileged hook authorization", () => {
    for (const source of routeSources) {
      expect(source).toContain("authorizeScheduledHook");
      expect(source).not.toMatch(/SUPABASE_(ANON|PUBLISHABLE)_KEY/);
      expect(source).not.toContain('headers.get("apikey")');
    }
  });

  it("disarms legacy jobs and stores no decrypted credential in cron commands", () => {
    expect(migration).toContain("PERFORM cron.unschedule(job_name)");
    expect(migration).toContain("transitionforward_cron_webhook_secret");
    expect(migration).toContain("vault.decrypted_secrets");
    expect(migration).toContain("'Authorization', 'Bearer '");
    expect(migration).not.toMatch(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
    expect(migration).not.toContain("project--a4a5068b-10df-4e31-8d22-73186657d452");
  });

  it("keeps the scheduler private and requires explicit operator activation", () => {
    expect(migration).toContain("CREATE SCHEMA IF NOT EXISTS transitionforward_private");
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    );
    expect(migration).not.toMatch(
      /SELECT\s+transitionforward_private\.schedule_privileged_http_jobs\(\)/,
    );
  });
});
