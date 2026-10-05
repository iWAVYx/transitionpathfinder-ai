import { PptAgendaDocument } from "@/components/documents/PptAgendaDocument";
import { demoMeetingGuide } from "@/lib/demo/meeting-guide";
import type { DemoProfile } from "@/lib/demo/demo-profiles";

export function DemoMeetingGuide({ profile, role }: { profile: DemoProfile; role: "family" | "educator" }) {
  return <PptAgendaDocument name={profile.shortName} agenda={demoMeetingGuide(profile, role)} studentId={null} meetingDate={null} />;
}
