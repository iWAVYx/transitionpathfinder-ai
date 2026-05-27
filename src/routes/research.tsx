import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "The research behind it — TransitionForward" },
      { name: "description", content: "The evidence base for every TransitionForward suggestion — Mazzotti, Test, Allensworth, Carter, Trainor, Burke, and Connecticut State Department of Education guidance." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="The research behind it"
      title="Every suggestion has a source you can read."
      body="We don't ask you to take our word for it. The library is being seeded directly from Caysi's graduate capstone and the Transition Forward handbook — Mazzotti (2021) on the updated predictors of post-school success, Test (2009) on the original evidence base, Allensworth (2013) on why 9th grade matters more than any other year, Carter (2011 and 2012) on work-based learning, plus Trainor, Burke, and the Connecticut State Department of Education's transition guidance. Plain-English summaries of each one land with the next build, so you can always check where a recommendation came from."
    />
  ),
});
