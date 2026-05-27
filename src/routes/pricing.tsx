import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "What it costs — TransitionForward" },
      { name: "description", content: "Free for our first pilot families and educators. We're letting your needs shape pricing — not the other way around." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="What it costs"
      title="Free for our first families."
      body="Our pilot families and educators get full access at no charge, in exchange for honest feedback as we build. After the pilot, pricing will be quiet, fair, and shaped by what families actually told us they needed — deeper AI analysis, room for more students under one parent account, caseload tools for teachers. You'll know exactly what's free and what's premium before anything changes for you."
    />
  ),
});
