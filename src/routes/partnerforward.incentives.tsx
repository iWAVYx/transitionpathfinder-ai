import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Info } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPublishedIncentives } from "@/lib/partnerforward.functions";

export const Route = createFileRoute("/partnerforward/incentives")({
  head: () => ({
    meta: [
      { title: "Incentives & Support — PartnerForward" },
      {
        name: "description",
        content:
          "Plain-language overview of federal, state, philanthropic, and workforce incentives, grants, credits, and accessibility resources partners may explore.",
      },
    ],
  }),
  component: IncentivesPage,
});

const CATEGORY_LABEL: Record<string, string> = {
  tax_credit: "Tax Credit",
  tax_deduction: "Tax Deduction",
  wotc: "WOTC",
  state_workforce: "State Workforce",
  vocational_rehab: "Vocational Rehabilitation",
  inclusive_hiring: "Inclusive Hiring",
  accessibility: "Accessibility",
  grant_sponsorship: "Grants & Sponsorship",
  other: "Other",
};

function IncentivesPage() {
  const fetchIncentives = useServerFn(listPublishedIncentives);
  const { data, isLoading } = useQuery({
    queryKey: ["partnerforward-incentives"],
    queryFn: () => fetchIncentives(),
  });

  const resources = data?.resources ?? [];

  return (
    <SiteShell>
      <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "PartnerForward", to: "/partnerforward" },
            { label: "Incentives & Support" },
          ]}
        />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Incentives & Support
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Some partners may qualify for federal, state, local, philanthropic,
          or workforce-development incentives, grants, credits, deductions, or
          support programs. The summaries below link directly to authoritative
          agencies.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>
            <strong>TransitionForward does not provide tax, legal, or
            financial advice.</strong> Eligibility rules, dollar limits, and
            reporting requirements change. Partners should review official
            guidance and consult qualified professionals before acting on any
            information shown here.
          </p>
        </div>


        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {resources.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </Badge>
                    {r.agency && (
                      <span className="text-xs text-muted-foreground">
                        {r.agency}
                      </span>
                    )}
                  </div>
                  <CardTitle className="mt-2 text-lg">{r.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>{r.short_description}</p>
                  {r.long_description && (
                    <p className="text-muted-foreground">
                      {r.long_description}
                    </p>
                  )}
                  {r.external_url && (
                    <a
                      href={r.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Visit official source
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {r.cautious_disclaimer && (
                    <p className="rounded-md bg-muted/50 p-2 text-[11px] leading-relaxed text-muted-foreground">
                      {r.cautious_disclaimer}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SiteShell>
  );
}
