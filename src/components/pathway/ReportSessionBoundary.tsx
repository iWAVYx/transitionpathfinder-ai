import { Fragment, useState, type ReactNode } from "react";
import type { PathwayReport } from "@/lib/pathway.functions";

/** Temporary report UI state belongs to one document and student context. */
export function ReportSessionBoundary({ report, studentId, studentName, demo, readOnly, children }: {
  report: PathwayReport;
  studentId?: string;
  studentName?: string;
  demo?: boolean;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const [session, setSession] = useState({ report, studentId, studentName, demo, readOnly, key: 0 });
  if (session.report !== report || session.studentId !== studentId || session.studentName !== studentName
      || session.demo !== demo || session.readOnly !== readOnly) {
    // React retries this render before committing children, so no previous document flashes.
    setSession({ report, studentId, studentName, demo, readOnly, key: session.key + 1 });
  }
  return <Fragment key={session.key}>{children}</Fragment>;
}
