import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/site/SiteShell";
import { PageSection } from "@/components/layout/PageSection";
import { Badge } from "@/components/ui/badge";
import { PartnerNetworkPage } from "@/components/partner-network/PartnerNetworkPage";
import type { RoleAudience } from "@/lib/role-policy";

const ROLE_OPTIONS: { id: RoleAudience; label: string }[] = [
  { id: "student", label: "Student" },
  { id: "family", label: "Family" },
  { id: "educator", label: "Educator" },
  { id: "school_admin", label: "School Admin" },
  { id: "district_admin", label: "District Admin" },
  { id: "partner", label: "Partner" },
];

const searchSchema = z.object({
  role: z
    .enum(["student", "family", "educator", "school-admin", "district-admin", "partner"])
    .optional(),
});

function toAudience(r: string | undefined): RoleAudience {
  switch (r) {
    case "student":
      return "student";
    case "family":
      return "family";
    case "educator":
      return "educator";
    case "school-admin":
      return "school_admin";
    case "district-admin":
      return "district_admin";
    case "partner":
      return "partner";
    default:
      return "family";
  }
}

export const Route = createFileRoute("/demo_/partner-network")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Partner Network Preview — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Preview the signed-in Partner Network from every role — explainable matches, de-identified partner view, all sample data.",
      },
      { property: "og:title", content: "Partner Network Preview — TransitionForward" },
      {
        property: "og:description",
        content:
          "See how students, families, educators, and administrators discover vetted community partners with explainable matches.",
      },
    ],
  }),
  component: DemoPartnerNetworkRoute,
});

function DemoPartnerNetworkRoute() {
  const { role } = Route.useSearch();
  const audience = toAudience(role);
  const activeId = role ?? "family";
  return (
    <SiteShell>
      <PageSection tone="muted" className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="uppercase tracking-wide">
              Public Demo
            </Badge>
            <span className="text-xs text-muted-foreground">
              All partners, students, and metrics on this page are fictional sample data.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              View as
            </span>
            {ROLE_OPTIONS.map((opt) => {
              const isActive = opt.id === audience;
              return (
                <Link
                  key={opt.id}
                  to="/demo/partner-network"
                  search={{
                    role:
                      opt.id === "school_admin"
                        ? "school-admin"
                        : opt.id === "district_admin"
                          ? "district-admin"
                          : (opt.id as
                              | "student"
                              | "family"
                              | "educator"
                              | "partner"),
                  }}
                  className={
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors " +
                    (isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary/60 hover:text-primary")
                  }
                  aria-current={isActive ? "page" : undefined}
                >
                  {opt.label}
                </Link>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground" data-demo-active-role={activeId}>
            This is an isolated preview of the signed-in Partner Network. No real
            student data, referrals, or partner accounts are touched.
          </p>
        </div>
      </PageSection>
      <PartnerNetworkPage audienceOverride={audience} demo />
    </SiteShell>
  );
}
