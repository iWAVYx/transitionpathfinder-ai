import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — TransitionForward" },
      { name: "description", content: "Free during the pilot. Premium features arrive after we learn what families need most." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Pricing"
      title="Free during the pilot."
      body="Our first families and educators get full access at no charge in exchange for feedback. Premium tiers — deeper AI analysis, more students per parent, teacher caseload tools — go live after the pilot informs them."
    />
  ),
});
