import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/site/ComingSoon";

export const Route = createFileRoute("/waitlist")({
  head: () => ({
    meta: [
      { title: "Join the pilot — TransitionForward" },
      { name: "description", content: "Request access to the TransitionForward pilot for CT families and educators." },
    ],
  }),
  component: () => (
    <ComingSoon
      eyebrow="Pilot access"
      title="Request access for your family or classroom."
      body="A working signup form lands next turn — once we enable Lovable Cloud for auth and email capture. For now, save this page and we'll wire it up."
    />
  ),
});
