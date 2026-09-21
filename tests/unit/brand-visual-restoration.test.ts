import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

const CSS = read("src/styles.css");
const HOME = read("src/routes/index.tsx");
const ABOUT = read("src/routes/about.tsx");
const DEMO = read("src/routes/demo.tsx");
const OPPORTUNITY_MATCHES = read("src/components/demo/OpportunityMatches.tsx");
const BREADCRUMBS = read("src/components/site/Breadcrumbs.tsx");
const ONBOARDING_CHECKLIST = read("src/components/dashboard/OnboardingChecklist.tsx");
const PAGE_HEADER = read("src/components/layout/PageHeader.tsx");
const STUDENT_DASHBOARD = read("src/components/dashboard/StudentDashboard.tsx");
const DISTRICT_OVERVIEW = read("src/routes/_authenticated/district.overview.tsx");
const DISTRICT_SCHOOLS = read("src/routes/_authenticated/district.schools.tsx");

describe("recovered Lovable visual update", () => {
  it("maps the shared light theme to the approved TransitionForward palette", () => {
    expect(CSS).toContain("--primary: oklch(0.4 0.148 305)");
    expect(CSS).toContain("--accent: oklch(0.93 0.045 189)");
    expect(CSS).toContain("--secondary: oklch(0.92 0.075 85)");
    expect(CSS).toContain("--foreground: oklch(0.283 0.019 258)");
    expect(CSS).toContain("--background: oklch(0.985 0.003 265)");
    expect(CSS).toContain("--brand-forward-gold-ink: #8A5A12");
    expect(CSS).toContain("--color-brand-gold-ink: var(--brand-forward-gold-ink)");
  });

  it("keeps light, dark, high-contrast, demo and report surfaces aligned", () => {
    expect(CSS).toContain("--color-sky-500: oklch(0.704 0.119 188.5)");
    expect(CSS).toContain("--color-violet-700: oklch(0.4 0.148 305)");
    expect(CSS).toContain(".dark {");
    expect(CSS).toContain("html.high-contrast {");
    expect(CSS).toContain(".demo-shell,");
    expect(CSS).toContain("--demo-ink: oklch(0.283 0.019 258)");
    expect(CSS).toContain(".report-shell .text-amber-700 { color: #8A5A12; }");
  });

  it("restores the final hero color placement and headline treatment", () => {
    expect(HOME).toContain('gradientFrom="#19B7AE"');
    expect(HOME).toContain('gradientTo="#0E6E68"');
    expect(HOME).toContain('gradientFrom="#F2B84B"');
    expect(HOME).toContain('gradientTo="#B07E17"');
    expect(HOME).toContain("from-brand-teal to-brand-gold");
    expect(HOME).toContain('className="text-brand-teal"');
    expect(HOME).toContain('<span className="text-brand-gold">{suffix}</span>');
    expect(HOME).toContain(
      'className="text-xs font-bold uppercase tracking-[0.22em] text-white"',
    );
    expect(HOME).toContain(
      'className="mt-6 max-w-xl text-lg leading-relaxed text-white sm:text-xl"',
    );
    expect(HOME).toContain(
      'className="mt-5 font-display text-xl font-bold italic text-brand-teal-ink sm:text-2xl"',
    );
  });

  it("restores the final About-page emphasis", () => {
    for (const word of ["people", "context", "time"]) {
      expect(ABOUT).toContain(`<span className="text-brand-gold-ink">${word}</span>`);
    }
    expect(ABOUT).toContain(
      '<span className="italic text-brand-gold-ink"> They are the reason for it.</span>',
    );
    expect(ABOUT).toContain('className="mt-5 text-base text-[#8A5A12] sm:text-lg"');
  });

  it("restores the dashboard-preview wording", () => {
    expect(DEMO).toContain("Choose a dashboard to preview");
    expect(DEMO).not.toContain("Choose a role to preview");
  });

  it("keeps the restored gold opportunity badge accessible on the public demo report", () => {
    expect(OPPORTUNITY_MATCHES).toContain(
      'worth_exploring: "bg-amber-500/10 text-[#8A5A12] dark:text-amber-400 border-amber-500/30"',
    );
  });

  it("keeps branded text and dashboard helper copy legible on light surfaces", () => {
    expect(CSS).toContain("--brand-status-warning-text: var(--brand-forward-gold-ink)");
    expect(CSS).toContain("--color-brand-warning-text: var(--brand-status-warning-text)");
    expect(BREADCRUMBS).toContain("text-foreground/75");
    expect(ONBOARDING_CHECKLIST).not.toContain("text-muted-foreground");
    expect(PAGE_HEADER).toContain("text-foreground/75 sm:text-[15px]");
    expect(STUDENT_DASHBOARD).toContain(
      "font-semibold uppercase tracking-wider text-foreground/75",
    );
    expect(DISTRICT_OVERVIEW).toContain("text-brand-warning-text dark:text-amber-300");
    expect(DISTRICT_SCHOOLS).toContain("text-brand-warning-text dark:text-amber-300");
  });
});

describe("brand color migration coverage", () => {
  const migratedFiles = [
    "src/styles.css",
    "src/routes/about.tsx",
    "src/components/empty/IllustratedEmptyState.tsx",
    "src/components/pathway/ReportChapterPager.tsx",
    "src/components/pathway/ReportView.tsx",
    "src/components/site/MagazineReader.tsx",
    "src/lib/email-templates/admin-invitation.tsx",
    "src/lib/email-templates/channel-activity-digest.tsx",
    "src/lib/email-templates/collaborator-invitation.tsx",
    "src/lib/publication/milestone-art.tsx",
  ];

  const retiredColors = [
    "#e8b14a",
    "#3a7ea1",
    "#0c2340",
    "#2d8a9e",
    "#2563eb",
    "#1e3a8a",
    "#006666",
    "#0a6c4a",
    "#0f172a",
    "#0b1220",
    "#0b0a09",
    "#1c1814",
    "#f4ede3",
  ];

  it.each(migratedFiles)("%s no longer uses the retired visual palette", (file) => {
    const source = read(file).toLowerCase();
    for (const color of retiredColors) {
      expect(source).not.toContain(color);
    }
  });
});
