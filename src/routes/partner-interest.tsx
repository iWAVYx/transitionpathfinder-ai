import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep old links and bookmarks useful while routing every partner prospect to
// the real, dedicated application form. Partner applications are deliberately
// separate from family/educator/school waitlist entries.
export const Route = createFileRoute("/partner-interest")({
  beforeLoad: () => {
    throw redirect({
      to: "/partners",
      hash: "apply",
      replace: true,
    });
  },
});
