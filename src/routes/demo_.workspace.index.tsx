import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/demo_/workspace/")({
  beforeLoad: () => {
    throw redirect({ to: "/demo/workspace/$stage", params: { stage: "start" }, search: {}, replace: true });
  },
});
