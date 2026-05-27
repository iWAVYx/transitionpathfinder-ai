import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research Library — TransitionForward" },
      { name: "description", content: "Evidence base for the TransitionForward framework — Mazzotti, Test, Allensworth, Carter, Trainor, Burke, CSDE." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Research library"
      title="The evidence behind every recommendation."
      body="We're seeding the library directly from Caysi's capstone and the Transition Forward handbook — Mazzotti (2021), Test (2009), Allensworth (2013), Carter (2011, 2012), Trainor, Burke, and CSDE guidance. Browsable summaries land in the next build."
    />
  ),
});
