import { PathwayReportCard } from "@/components/students/PathwayReportCard";

type Props = {
  studentId: string;
  studentFirstName: string | null;
};

export function StudentPathwayReportPanel({ studentId, studentFirstName }: Props) {
  return (
    <div className="mt-8">
      <PathwayReportCard studentId={studentId} studentFirstName={studentFirstName} />
    </div>
  );
}
