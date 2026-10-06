import { expect, it } from "vitest";
import { reportRecordsByStudent, reportCountsForStudents } from "../../src/lib/report-record-counts";
it("multiple report records do not inflate student coverage", () => {
 const rows = [{student_id:"a"}, {student_id:"a"}, {student_id:"a"}, {student_id:"b"}, {student_id:null}, {student_id:"outside"}];
 expect(reportCountsForStudents(["a","b","c"], reportRecordsByStudent(rows))).toEqual({reports_count:4, students_with_report:2});
});
it("empty schools and duplicate student ids produce consistent counts", () => {
 const counts = reportRecordsByStudent([{student_id:"a"},{student_id:"a"}]);
 expect(reportCountsForStudents([], counts)).toEqual({reports_count:0, students_with_report:0});
 expect(reportCountsForStudents(["a","a"], counts)).toEqual({reports_count:2, students_with_report:1});
});
