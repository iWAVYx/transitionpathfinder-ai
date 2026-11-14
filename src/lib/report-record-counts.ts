/** Count actual records separately from unique students covered. */
export function reportRecordsByStudent(rows: Array<{ student_id: string | null }>) {
  const counts = new Map<string, number>();
  for (const row of rows) if (row.student_id) counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
  return counts;
}
export function reportCountsForStudents(ids: string[], counts: Map<string, number>) {
  const unique = [...new Set(ids)];
  const covered = unique.filter(id => (counts.get(id) ?? 0) > 0).length;
  return { reports_count: unique.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0), students_with_report: covered };
}
