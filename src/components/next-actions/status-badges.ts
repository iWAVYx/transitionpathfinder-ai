import type { NextActionStatus, NextActionUrgency } from "@/lib/next-actions/types";

export const STATUS_LABEL: Record<NextActionStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  waiting: "Waiting On Someone",
  needs_review: "Needs Review",
  due_soon: "Due Soon",
  overdue: "Overdue",
  completed: "Completed",
  dismissed: "Dismissed",
};

export const STATUS_CLASS: Record<NextActionStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  waiting: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  needs_review: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  due_soon: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  overdue: "bg-red-500/15 text-red-700 dark:text-red-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  dismissed: "bg-muted text-muted-foreground line-through",
};

export const URGENCY_LABEL: Record<NextActionUrgency, string> = {
  overdue: "Overdue",
  due_soon: "Due Soon",
  normal: "",
  later: "Later",
};
