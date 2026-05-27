import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Caysi Morgan — TransitionForward" },
      { name: "description", content: "Built by a special-education teacher with an MBA and an MAT. Grounded in classroom reality and graduate research." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="About"
      title="Built by a teacher who saw the gap."
      body="Caysi Morgan is a special-education teacher with an MBA and an MAT from Southern Connecticut State University. TransitionForward is the product of her EDU 591 capstone — turning the Transition Forward handbook into a tool families can actually use between PPT meetings."
    />
  ),
});
