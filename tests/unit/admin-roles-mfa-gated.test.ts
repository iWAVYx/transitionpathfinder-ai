// B-07: every server fn that mutates public.admin_roles or admin_invitations
// must call requireAal2 in its .handler body. This is a static-source guard —
// a runtime harness for the full server-fn chain is covered by the E2E 2FA
// suites; this test locks the invariant so a future edit that removes the
// gate fails CI.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.functions\.ts$/.test(entry)) out.push(p);
  }
  return out;
}

describe("admin_roles mutations are MFA-gated (B-07)", () => {
  const files = walk("src/lib");

  it("every file that writes admin_roles/admin_invitations imports requireAal2", () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const mutates =
        /from\(["']admin_roles["']\)[\s\S]{0,200}\.(insert|update|delete|upsert)\(/.test(src) ||
        /from\(["']admin_invitations["']\)[\s\S]{0,200}\.(insert|update|delete|upsert)\(/.test(
          src,
        );
      if (!mutates) continue;
      if (!/requireAal2\s*\(/.test(src)) offenders.push(f);
    }
    expect(offenders, `Missing requireAal2 in: ${offenders.join(", ")}`).toEqual([]);
  });

  it("acceptAdminInvitation calls requireAal2", () => {
    const src = readFileSync("src/lib/owner/owner.functions.ts", "utf8");
    const idx = src.indexOf("export const acceptAdminInvitation");
    expect(idx).toBeGreaterThan(-1);
    const body = src.slice(idx, idx + 4000);
    expect(body).toMatch(/requireAal2\s*\(/);
  });
});
