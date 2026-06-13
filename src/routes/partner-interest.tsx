import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { PartnerApplyForm } from "@/components/site/PartnerApplyForm";

export const Route = createFileRoute("/partner-interest")({
  head: () => ({
    meta: [
      { title: "Become a Partner — PartnerForward" },
      {
        name: "description",
        content:
          "Tell us about your organization and we'll be in touch about joining the PartnerForward network.",
      },
    ],
  }),
  component: PartnerInterestPage,
});

function PartnerInterestPage() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs
          trail={[
            { label: "PartnerForward", to: "/partnerforward" },
            { label: "Become a Partner" },
          ]}
        />
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Become a Partner
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Tell us about your organization — colleges, technical schools,
          employers, supported-employment programs, mentor networks, and
          community partners are all welcome. We review every submission and
          will reach out about next steps.
        </p>
        <div className="mt-8">
          <PartnerApplyForm />
        </div>
      </div>
    </SiteShell>
  );
}
