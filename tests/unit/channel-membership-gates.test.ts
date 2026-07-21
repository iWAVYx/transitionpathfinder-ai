import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * T-05 — Removed participants lose access, restricted student ↔ partner DMs.
 *
 * The runtime enforcement lives in two security-definer functions and their
 * SELECT/INSERT policies on channel_messages / channel_actions / etc.
 * This test pins the invariant at the migration level so a future edit can't
 * quietly drop the `left_at IS NULL` clause (which would let a removed user
 * keep reading the channel until they log out).
 */

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260721000023_94010d16-d613-440f-ba22-7d51a02e7dab.sql",
);

describe("channel membership gates (T-05)", () => {
  const sql = readFileSync(MIGRATION, "utf8");

  it("is_channel_member requires left_at IS NULL", () => {
    const match = sql.match(
      /CREATE OR REPLACE FUNCTION public\.is_channel_member[\s\S]*?\$\$;/,
    );
    expect(match, "is_channel_member definition not found").toBeTruthy();
    expect(match![0]).toMatch(/left_at IS NULL/);
  });

  it("is_channel_admin requires left_at IS NULL", () => {
    const match = sql.match(
      /CREATE OR REPLACE FUNCTION public\.is_channel_admin[\s\S]*?\$\$;/,
    );
    expect(match, "is_channel_admin definition not found").toBeTruthy();
    expect(match![0]).toMatch(/left_at IS NULL/);
  });

  it("indexes on channel_members filter out left_at (kicked users are excluded)", () => {
    expect(sql).toMatch(
      /CREATE INDEX idx_channel_members_user[^;]*WHERE left_at IS NULL/,
    );
    expect(sql).toMatch(
      /CREATE INDEX idx_channel_members_channel[^;]*WHERE left_at IS NULL/,
    );
  });

  it("channels table exposes 'kind' + 'purpose' so student↔partner DMs are typed", () => {
    // Slice H depends on channel kind/purpose to route who can start a DM
    // with a partner. Regressing either field would collapse audience gating.
    expect(sql).toMatch(/CREATE TABLE public\.channels[\s\S]*kind public\.channel_kind NOT NULL/);
    expect(sql).toMatch(/CREATE TABLE public\.channels[\s\S]*purpose TEXT/);
  });
});
