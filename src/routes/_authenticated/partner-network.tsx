import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { PartnerNetworkPage } from "@/components/partner-network/PartnerNetworkPage";

export const Route = createFileRoute("/_authenticated/partner-network")({
  head: () => ({
    meta: [
      { title: "Partner Network — TransitionForward" },
      {
        name: "description",
        content:
          "Vetted community partners, explainable matches, and de-identified referral flow.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PartnerNetworkRoute,
});

function PartnerNetworkRoute() {
  return (
    <RoleGuard
      path="/partner-network"
      allow={["student", "family", "educator", "school_admin", "district_admin", "partner", "admin"]}
      keepMounted
    >
      <PartnerNetworkPage />
    </RoleGuard>
  );
}
