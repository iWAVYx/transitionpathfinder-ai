import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & FERPA — TransitionForward" },
      { name: "description", content: "How TransitionForward stores IEPs, handles consent, and protects student data." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Privacy & FERPA"
      title="Your child's records are yours."
      body="IEP uploads are encrypted, scoped only to your account, and never used to train AI models. Full privacy and consent documentation lands with the upload feature in the next build."
    />
  ),
});
