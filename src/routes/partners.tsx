import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/partners")({
  head: () => ({
    meta: [
      { title: "Real-world partners — TransitionForward" },
      { name: "description", content: "Universities, technical schools, supported employment, and trusted Connecticut organizations — curated so families don't have to start from scratch." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Real-world partners"
      title="Real places, real people, real next steps."
      body="The pathways your child might take aren't abstractions — they're four-year colleges with disability-services offices that actually pick up the phone, two-year programs that welcome IEP students, technical schools teaching skills employers want, supported-employment agencies, and Connecticut organizations like Higher Heights, the RISE Network, and Dalio Education who have been doing this work for years. We're curating a trusted directory so you don't have to start from a blank Google search. The first version arrives with the pilot."
    />
  ),
});
