import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

/**
 * The dedicated /demo/partner-network preview has been folded into the
 * standard per-role demo feature page contract. This route preserves
 * any existing links and redirects to `/demo/feature/{role}/partner-network`.
 */
const searchSchema = z.object({
  role: z
    .enum(["student", "family", "educator", "school-admin", "district-admin", "partner"])
    .optional(),
});

export const Route = createFileRoute("/demo_/partner-network")({
  validateSearch: (s) => searchSchema.parse(s),
  beforeLoad: ({ search }) => {
    const role = (search as { role?: string }).role ?? "family";
    throw redirect({
      to: "/demo/feature/$role/$slug",
      params: { role, slug: "partner-network" },
      replace: true,
    });
  },
});
