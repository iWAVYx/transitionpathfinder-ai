export type GoalProgressStatus = "not-started" | "in-progress" | "met";
export type EarlierGoalProgress = { id: string; label: string; status: GoalProgressStatus };

/** Labels describe the old key's category/position, never claim its original wording. */
export function earlierGoalProgress(statuses: Record<string, GoalProgressStatus>): EarlierGoalProgress[] {
  return Object.entries(statuses).flatMap(([id, status]) => {
    if (!["not-started", "in-progress", "met"].includes(status)) return [];
    let match: RegExpMatchArray | null;
    let label: string;
    if ((match = id.match(/^life:(\d{1,6})$/))) label = `Earlier Life Skills Entry ${Number(match[1]) + 1}`;
    else if ((match = id.match(/^edu:(\d{1,6})$/))) label = `Earlier Education Entry ${Number(match[1]) + 1}`;
    else if ((match = id.match(/^path:(\d{1,6}):(\d{1,6})$/))) label = `Earlier Pathway ${Number(match[1]) + 1}, Step ${Number(match[2]) + 1}`;
    else if ((match = id.match(/^30d:([1-4])$/))) label = `Earlier Week ${match[1]} Entry`;
    else return [];
    return [{ id, label, status }];
  });
}
