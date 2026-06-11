import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NextBestAction = {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tone?: "primary" | "success" | "warning";
};

const SurfaceSchema = z.object({
  surface: z.enum([
    "family",
    "student",
    "educator",
    "school_admin",
    "district_admin",
    "partner",
    "admin",
  ]),
});

export const getNextBestAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SurfaceSchema.parse(input))
  .handler(async ({ data, context }): Promise<NextBestAction> => {
    const { supabase, userId } = context;
    const surface = data.surface;

    // Helpers — keep all reads RLS-scoped (no admin client).
    async function ownedOrCollabStudentIds(): Promise<string[]> {
      const [{ data: owned }, { data: collab }] = await Promise.all([
        supabase.from("students").select("id").eq("owner_id", userId),
        supabase
          .from("student_collaborators")
          .select("student_id")
          .eq("user_id", userId)
          .eq("status", "accepted"),
      ]);
      const ids = new Set<string>();
      (owned ?? []).forEach((r) => ids.add(r.id as string));
      (collab ?? []).forEach((r) => ids.add(r.student_id as string));
      return [...ids];
    }

    if (surface === "family" || surface === "student") {
      const ids = await ownedOrCollabStudentIds();
      if (ids.length === 0) {
        return surface === "student"
          ? {
              headline: "Connect to your student profile",
              body: "Ask a parent, guardian, or case manager to invite you — then your Pathway shows up here.",
              ctaLabel: "Open dashboard",
              ctaHref: "/dashboard",
              tone: "primary",
            }
          : {
              headline: "Add your student to get started",
              body: "Create a private student profile, or try the demo student to see the full TransitionForward experience.",
              ctaLabel: "Add a student",
              ctaHref: "/students",
              tone: "primary",
            };
      }

      // Has a student — check profile completeness, voice, docs, report.
      const sid = ids[0];
      const [{ data: student }, { data: docs }, { data: reports }, { data: actions }] =
        await Promise.all([
          supabase
            .from("students")
            .select(
              "id, first_name, strengths_summary, interests_summary, support_needs_summary, student_voice_statement",
            )
            .eq("id", sid)
            .maybeSingle(),
          supabase.from("documents").select("id").eq("student_id", sid).limit(1),
          supabase
            .from("pathway_reports")
            .select("id, created_at")
            .eq("student_id", sid)
            .order("created_at", { ascending: false })
            .limit(1),
          supabase
            .from("action_items")
            .select("id, status")
            .eq("student_id", sid)
            .neq("status", "complete")
            .limit(1),
        ]);

      const profileFields = [
        student?.strengths_summary,
        student?.interests_summary,
        student?.support_needs_summary,
      ].filter((x) => typeof x === "string" && x.trim().length > 0).length;

      if (!student?.student_voice_statement && surface === "student") {
        return {
          headline: "Add your voice",
          body: "Tell us what you want to do, what you're good at, and what helps you most. Your answers shape your Pathway.",
          ctaLabel: "Answer Student Voice",
          ctaHref: "/students",
          tone: "primary",
        };
      }

      if (profileFields < 2) {
        return {
          headline: "Strengthen the student profile",
          body: "Add strengths, interests, and support needs so the Pathway Report has the context it needs.",
          ctaLabel: "Open student profile",
          ctaHref: "/students",
          tone: "primary",
        };
      }

      if ((docs ?? []).length === 0) {
        return {
          headline: "Upload an IEP or transition document",
          body: "TransitionForward extracts goals, services, and accommodations to enrich the Pathway Report.",
          ctaLabel: "Upload a document",
          ctaHref: "/documents",
          tone: "primary",
        };
      }

      if ((reports ?? []).length === 0) {
        return {
          headline: "Generate the first Pathway Report",
          body: "Combine the profile, voice, and documents into a personalized transition roadmap.",
          ctaLabel: "Generate Pathway Report",
          ctaHref: "/pathway",
          tone: "primary",
        };
      }

      if ((actions ?? []).length === 0) {
        return {
          headline: "Turn the report into action",
          body: "Create the first action items from the recommended next steps in the Pathway Report.",
          ctaLabel: "Open Pathway Report",
          ctaHref: `/reports/${reports![0].id}`,
          tone: "primary",
        };
      }

      return {
        headline: "Prepare for the next meeting",
        body: "Review action items, gather questions, and bring the Pathway Report to your next PPT or transition meeting.",
        ctaLabel: "Open Meeting Prep",
        ctaHref: "/ppt-prep",
        tone: "success",
      };
    }

    if (surface === "educator") {
      const { data: caseload } = await supabase
        .from("student_collaborators")
        .select("student_id")
        .eq("user_id", userId)
        .eq("status", "accepted");

      const ids = (caseload ?? []).map((r) => r.student_id as string);
      if (ids.length === 0) {
        return {
          headline: "Build your caseload",
          body: "Connect to students by accepting invites from families or adding students you support as a case manager.",
          ctaLabel: "Open caseload",
          ctaHref: "/caseload",
          tone: "primary",
        };
      }

      const { data: docs } = await supabase
        .from("documents")
        .select("student_id")
        .in("student_id", ids);
      const studentsWithDocs = new Set((docs ?? []).map((d) => d.student_id as string));
      const missingDocs = ids.filter((id) => !studentsWithDocs.has(id));

      if (missingDocs.length > 0) {
        return {
          headline: `${missingDocs.length} ${missingDocs.length === 1 ? "student is" : "students are"} missing an IEP`,
          body: "Upload the current IEP or transition plan so the Pathway Report has the right foundation.",
          ctaLabel: "Open caseload",
          ctaHref: "/caseload",
          tone: "warning",
        };
      }

      const { data: reports } = await supabase
        .from("pathway_reports")
        .select("student_id")
        .in("student_id", ids);
      const studentsWithReports = new Set((reports ?? []).map((r) => r.student_id as string));
      const missingReports = ids.filter((id) => !studentsWithReports.has(id));

      if (missingReports.length > 0) {
        return {
          headline: `Generate ${missingReports.length} Pathway ${missingReports.length === 1 ? "Report" : "Reports"}`,
          body: "Turn IEP information and student voice into a clear transition plan for each student.",
          ctaLabel: "Open caseload",
          ctaHref: "/caseload",
          tone: "primary",
        };
      }

      return {
        headline: "Assign follow-up action items",
        body: "Your caseload has Pathway Reports — keep momentum by assigning the next concrete actions.",
        ctaLabel: "Open action items",
        ctaHref: "/goals",
        tone: "success",
      };
    }

    if (surface === "school_admin") {
      return {
        headline: "Review students missing reports",
        body: "Check case manager progress and identify students still needing a completed Pathway Report.",
        ctaLabel: "Open school overview",
        ctaHref: "/school/overview",
        tone: "primary",
      };
    }

    if (surface === "district_admin") {
      return {
        headline: "Review school-by-school implementation",
        body: "Track transition readiness trends and identify schools that need additional support.",
        ctaLabel: "Open district reports",
        ctaHref: "/district/reports",
        tone: "primary",
      };
    }

    if (surface === "partner") {
      const { count: opps } = await supabase
        .from("partner_opportunities")
        .select("id", { count: "exact", head: true });

      if (!opps || opps === 0) {
        return {
          headline: "Submit your first opportunity",
          body: "Add a program, internship, or service so students get matched with what you offer.",
          ctaLabel: "Add opportunity",
          ctaHref: "/partners-manage",
          tone: "primary",
        };
      }
      return {
        headline: "Keep opportunities current",
        body: "Review and refresh your active opportunities so student matches stay accurate.",
        ctaLabel: "Manage opportunities",
        ctaHref: "/partners-manage",
        tone: "success",
      };
    }

    if (surface === "admin") {
      const [{ count: waitlist }, { count: contacts }] = await Promise.all([
        supabase.from("waitlist").select("id", { count: "exact", head: true }),
        supabase
          .from("contact_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
      ]);
      const total = (waitlist ?? 0) + (contacts ?? 0);
      if (total > 0) {
        return {
          headline: `${total} new ${total === 1 ? "item" : "items"} to review`,
          body: `${waitlist ?? 0} waitlist entries and ${contacts ?? 0} new contact submissions are waiting for triage.`,
          ctaLabel: "Open Admin Hub",
          ctaHref: "/admin",
          tone: "warning",
        };
      }
      return {
        headline: "Inbox is clear",
        body: "No new waitlist entries or contact submissions. Review analytics, resources, and recent activity.",
        ctaLabel: "Open Admin Hub",
        ctaHref: "/admin",
        tone: "success",
      };
    }

    // Fallback
    return {
      headline: "Welcome back",
      body: "Pick a section from the navigation to continue your work.",
      ctaLabel: "Open dashboard",
      ctaHref: "/dashboard",
    };
  });
