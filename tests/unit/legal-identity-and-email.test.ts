import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONTACT_EMAILS,
  LEGAL_ATTRIBUTION,
  LEGAL_ENTITY_NAME,
  PRODUCT_NAME,
  legalCopyright,
  mailtoHref,
} from "@/lib/contact";

const TEMPLATE_DIR = join(process.cwd(), "src/lib/email-templates");

function templateFiles() {
  return readdirSync(TEMPLATE_DIR).filter(
    (f) => f.endsWith(".tsx") && f !== "legal-footer.tsx",
  );
}

/** Tokens that must never appear in an outbound subject line or preview text. */
const FORBIDDEN_SUBJECT_TOKENS = [
  "iep",
  "disability",
  "diagnos",
  "504 plan",
  "pathway report",
  "studentname",
  "student_name",
  "goal text",
];

describe("legal identity", () => {
  it("uses the product brand and the legal entity separately", () => {
    expect(PRODUCT_NAME).toBe("TransitionForward");
    expect(LEGAL_ENTITY_NAME).toBe("Transition Forward LLC");
    expect(LEGAL_ATTRIBUTION).toBe(
      "TransitionForward is a service of Transition Forward LLC.",
    );
    // Attribution only — never a DBA claim.
    expect(LEGAL_ATTRIBUTION.toLowerCase()).not.toContain("dba");
    expect(LEGAL_ATTRIBUTION.toLowerCase()).not.toContain("doing business as");
  });

  it("attributes copyright to the legal entity", () => {
    expect(legalCopyright(2026)).toBe("© 2026 Transition Forward LLC");
  });
});

describe("contact addresses", () => {
  it("covers every audience on the root domain", () => {
    expect(Object.keys(CONTACT_EMAILS).sort()).toEqual([
      "admin",
      "billing",
      "privacy",
      "sales",
      "security",
      "support",
    ]);
    for (const address of Object.values(CONTACT_EMAILS)) {
      expect(address).toMatch(/^[a-z]+@transitionforwardct\.com$/);
    }
  });

  it("builds mailto links with encoded subjects", () => {
    expect(mailtoHref("billing", "Invoice 42")).toBe(
      "mailto:billing@transitionforwardct.com?subject=Invoice%2042",
    );
  });

  it("is the only place public contact addresses are hardcoded", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(entry.name)) continue;
        if (path.endsWith(join("src", "lib", "contact.ts"))) continue;
        const source = readFileSync(path, "utf8");
        for (const address of Object.values(CONTACT_EMAILS)) {
          if (source.includes(address)) offenders.push(`${path} → ${address}`);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});

describe("email templates", () => {
  it("all render the shared legal footer", () => {
    for (const file of templateFiles()) {
      const source = readFileSync(join(TEMPLATE_DIR, file), "utf8");
      if (!source.includes("satisfies TemplateEntry") && !source.includes("export default"))
        continue;
      expect(source, `${file} is missing <EmailLegalFooter />`).toContain(
        "EmailLegalFooter",
      );
    }
  });

  it("never puts student or plan detail in subject lines", () => {
    for (const file of templateFiles()) {
      const source = readFileSync(join(TEMPLATE_DIR, file), "utf8");
      const subjects = [...source.matchAll(/subject:\s*([\s\S]*?)\n\s*(displayName|previewData|component|to|\})/g)]
        .map((m) => m[1].toLowerCase());
      for (const subject of subjects) {
        for (const token of FORBIDDEN_SUBJECT_TOKENS) {
          expect(subject, `${file} subject leaks "${token}"`).not.toContain(token);
        }
      }
    }
  });
});
