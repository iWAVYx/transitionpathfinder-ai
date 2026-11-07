import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStudentVoiceResponses, type StudentVoiceResponse } from "@/lib/student-voice.functions";

/** Never display saved answers belonging to a previously selected student. */
export function useReportStudentVoice(studentId: string | undefined, demo: boolean) {
  const fetchVoice = useServerFn(getStudentVoiceResponses);
  const [result, setResult] = useState<{ studentId: string; responses: StudentVoiceResponse[] } | null>(null);
  useEffect(() => {
    if (demo || !studentId) {
      setResult(null);
      return;
    }
    let cancelled = false;
    fetchVoice({ data: { studentId } })
      .then((r) => {
        if (!cancelled) setResult({ studentId, responses: r.responses ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ studentId, responses: [] });
      });
    return () => { cancelled = true; };
  }, [demo, studentId, fetchVoice]);
  return !demo && studentId && result?.studentId === studentId ? result.responses : [];
}
