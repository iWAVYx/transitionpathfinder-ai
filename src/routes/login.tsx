import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — TransitionForward" },
      { name: "description", content: "Sign in to your TransitionForward parent account." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Sign in"
      title="Accounts arrive with the next build."
      body="Email + Google sign-in goes live once we enable Lovable Cloud. If you're already on the pilot list, watch your inbox."
    />
  ),
});
