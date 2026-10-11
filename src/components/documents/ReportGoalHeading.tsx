import { toTitleCase } from "@/lib/title-case";

/** One heading treatment; each reader supplies the recorded goal area or its age-appropriate label. */
export function ReportGoalHeading({ title, as: Heading = "h3" }: { title: string; as?: "h3" | "span" }) {
  return <Heading data-report-goal-heading className="font-display text-lg">{toTitleCase(title)}</Heading>;
}
