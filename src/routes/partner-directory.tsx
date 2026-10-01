import { createFileRoute } from "@tanstack/react-router";
import { PartnerDirectoryPage } from "@/components/partner-network/PartnerDirectoryPage";

export const Route = createFileRoute("/partner-directory")({
  head: () => ({
    meta: [
      { title: "Connecticut Partner Directory — TransitionForward" },
      {
        name: "description",
        content:
          "Browse Connecticut transition partners: state agencies, employment supports, day programs, postsecondary options, and community resources for students with disabilities.",
      },
      { property: "og:title", content: "Connecticut Partner Directory — TransitionForward" },
      {
        property: "og:description",
        content:
          "A living directory of CT transition opportunities — verified partners and community resource leads.",
      },
    ],
    links: [{ rel: "canonical", href: "/partner-directory" }],
  }),
  component: PartnerDirectoryPage,
});
