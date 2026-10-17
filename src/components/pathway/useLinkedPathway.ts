import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listStudents, type Student } from "@/lib/students.functions";
import { listMyReports, type ReportListRow } from "@/lib/pathway.functions";

/** Keep every preview tied to the same authorized student, never a name match. */
export function useLinkedPathway() {
  const loadStudents = useServerFn(listStudents);
  const loadReports = useServerFn(listMyReports);
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<ReportListRow[]>([]);
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    (async () => {
      try {
        const [studentResult, reportResult] = await Promise.all([loadStudents(), loadReports()]);
        if (studentResult.loadFailed || reportResult.loadFailed) throw new Error("Pathway unavailable");
        if (cancelled) return;
        setStudents(studentResult.students);
        setReports(reportResult.reports);
        setStudentId(current => studentResult.students.some(student => student.id === current)
          ? current : (studentResult.students[0]?.id ?? ""));
      } catch {
        if (!cancelled) { setError(true); setStudents([]); setReports([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadStudents, loadReports, attempt]);
  const student = students.find(student => student.id === studentId);
  const latest = student ? reports.filter(report => report.student_id === student.id)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] : undefined;
  return { students, student, studentId, setStudentId, latest, loading, error,
    retry: () => setAttempt(current => current + 1) };
}
