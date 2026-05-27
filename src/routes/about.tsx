import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Meet Caysi — TransitionForward" },
      { name: "description", content: "A special-education teacher with an MBA and an MAT, building the tool she wishes had existed for her own students' families." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="The person behind it"
      title="Hi — I'm Caysi."
      body="I'm a high-school special-education teacher in Connecticut with an MBA and an MAT from Southern Connecticut State University. I built TransitionForward because I kept watching families show up to PPT meetings carrying questions no one had answered, holding stacks of paperwork no one had translated, hoping someone would tell them what came next. This is that someone — the steady, research-backed companion I wish my students' families had had all along. My graduate capstone, the Transition Forward handbook, is the foundation under everything you'll find here."
    />
  ),
});
