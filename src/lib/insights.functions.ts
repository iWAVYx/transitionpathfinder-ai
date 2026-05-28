import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EngagementInsights = {
  studentVoiceProfiles: number;
  familyInputForms: number;
  pathwayReports: number;
  meetingsUpcoming: number;
  meetingsCompleted: number;
  formsCompleted: number;
  messagesPosted: number;
  activeFamiliesLast7d: number;
  topCareerInterests: { label: string; count: number }[];
  topLifeSkills: { label: string; count: number }[];
};

export const getEngagementInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EngagementInsights> => {
    const { supabase } = context;

    const [
      voiceProfiles,
      familyInput,
      reports,
      meetingsUp,
      meetingsDone,
      formsDone,
      messagesPosted,
      careerEvents,
      lifeEvents,
    ] = await Promise.all([
      supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("template_slug", "student-interest-survey").eq("status", "completed"),
      supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("template_slug", "family-input").eq("status", "completed"),
      supabase.from("pathway_reports").select("id", { count: "exact", head: true }),
      supabase.from("meetings").select("id", { count: "exact", head: true }).eq("status", "upcoming"),
      supabase.from("meetings").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("form_responses").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("feed_events").select("id", { count: "exact", head: true }).eq("kind", "message.posted"),
      supabase.from("feed_events").select("payload").eq("kind", "report.generated").limit(500),
      supabase.from("form_responses").select("answers").eq("template_slug", "life-skills-checklist").eq("status", "completed").limit(500),
    ]);

    // Top career interests come from report payloads
    const careerCounts = new Map<string, number>();
    for (const r of (careerEvents.data ?? []) as { payload: { careers?: string[] } }[]) {
      for (const c of r.payload?.careers ?? []) {
        careerCounts.set(c, (careerCounts.get(c) ?? 0) + 1);
      }
    }

    const lifeCounts = new Map<string, number>();
    for (const r of (lifeEvents.data ?? []) as { answers: Record<string, unknown> }[]) {
      const ans = r.answers ?? {};
      for (const key of ["daily", "community", "social"]) {
        const arr = ans[key];
        if (Array.isArray(arr)) {
          for (const v of arr) {
            if (typeof v === "string") lifeCounts.set(v, (lifeCounts.get(v) ?? 0) + 1);
          }
        }
      }
    }

    const sortedTop = (m: Map<string, number>) =>
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, count]) => ({ label, count }));

    return {
      studentVoiceProfiles: voiceProfiles.count ?? 0,
      familyInputForms: familyInput.count ?? 0,
      pathwayReports: reports.count ?? 0,
      meetingsUpcoming: meetingsUp.count ?? 0,
      meetingsCompleted: meetingsDone.count ?? 0,
      formsCompleted: formsDone.count ?? 0,
      messagesPosted: messagesPosted.count ?? 0,
      activeFamiliesLast7d: 0, // requires aggregate; placeholder for now
      topCareerInterests: sortedTop(careerCounts),
      topLifeSkills: sortedTop(lifeCounts),
    };
  });
