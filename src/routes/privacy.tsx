import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & your child's records — TransitionForward" },
      { name: "description", content: "How TransitionForward stores IEPs, asks for consent, and keeps your child's records yours." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Privacy & your child's records"
      title="Your child's records are yours. Full stop."
      body="Everything you upload — your child's IEP, the Connecticut SED forms, any notes you keep alongside them — is encrypted, locked to your account alone, and never shared, sold, or used to train any outside model. You can delete a single document, or your entire account, whenever you choose. We'll publish the full consent flow, our retention windows, and our FERPA stance in plain language alongside the IEP upload feature in the next build. If you have a question between now and then, ask — we'd rather answer it directly."
    />
  ),
});
