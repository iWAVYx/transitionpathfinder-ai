import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Partner Directory — TransitionForward" },
      { name: "description", content: "Curated CT and national partners — universities, technical schools, supported employment, and employers." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Partner directory"
      title="Real pathways, real partners."
      body="4-year colleges, 2-year colleges, technical schools, supported employment, and CT-specific orgs like Higher Heights, RISE Network, and Dalio Education. Employers in retail, warehousing, logistics, and the trades. Curated directory launches with the pilot."
    />
  ),
});
