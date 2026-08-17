import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type NextBestAction = {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  tone?: "primary" | "success" | "warning";
  reason?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
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
  .validator((input) => SurfaceSchema.parse(input))
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

    async function orgIdsForUser(types: string[]): Promise<string[]> {
      const { data: memberships } = await supabase
        .from("organization_memberships")
        .select("organization_id, organizations:organizations!inner(id,type,parent_organization_id)")
        .eq("user_id", userId)
        .eq("status", "active");
      const rows = (memberships ?? []) as unknown as Array<{
        organization_id: string;
        organizations: { id: string; type: string | null; parent_organization_id: string | null } | null;
      }>;
      return rows
        .filter((r) => r.organizations && types.includes(r.organizations.type ?? ""))
        .map((r) => r.organization_id);
    }

    if (surface === "school_admin") {
      const schoolIds = await orgIdsForUser(["school"]);
      if (schoolIds.length === 0) {
        return {
          headline: "Connect to your school",
          body: "Ask your district admin to add you to a school organization so you can see implementation data.",
          ctaLabel: "Open school overview",
          ctaHref: "/school/overview",
          tone: "primary",
        };
      }
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .in("organization_id", schoolIds);
      const studentIds = (students ?? []).map((s) => s.id as string);
      const totalStudents = studentIds.length;
      if (totalStudents === 0) {
        return {
          headline: "No students linked yet",
          body: "Once case managers add students to this school, you'll see readiness and report progress here.",
          ctaLabel: "Open school overview",
          ctaHref: "/school/overview",
          reason: `${schoolIds.length} school${schoolIds.length === 1 ? "" : "s"} linked, 0 students`,
          tone: "primary",
        };
      }
      const { data: reports } = await supabase
        .from("pathway_reports")
        .select("student_id")
        .in("student_id", studentIds);
      const withReport = new Set((reports ?? []).map((r) => r.student_id as string));
      const missing = totalStudents - withReport.size;
      if (missing > 0) {
        return {
          headline: `${missing} of ${totalStudents} students missing a Pathway Report`,
          body: "Review case manager progress and follow up where reports are still pending.",
          ctaLabel: "Open school overview",
          ctaHref: "/school/overview",
          reason: `${withReport.size}/${totalStudents} have a report`,
          tone: "warning",
          secondaryLabel: "View readiness",
          secondaryHref: "/school/readiness-trends",
        };
      }
      return {
        headline: "Every student has a Pathway Report",
        body: "Great work. Review trends and identify next-phase supports for the cohort.",
        ctaLabel: "Open school readiness",
        ctaHref: "/school/readiness-trends",
        reason: `${totalStudents}/${totalStudents} complete`,
        tone: "success",
      };
    }

    if (surface === "district_admin") {
      const districtIds = await orgIdsForUser(["district"]);
      if (districtIds.length === 0) {
        return {
          headline: "Connect to your district",
          body: "Ask the platform team to add you to a district organization to see school-by-school rollups.",
          ctaLabel: "Open district overview",
          ctaHref: "/district/overview",
          tone: "primary",
        };
      }
      const { data: schools } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("type", "school")
        .in("parent_organization_id", districtIds);
      const schoolIds = (schools ?? []).map((s) => s.id as string);
      if (schoolIds.length === 0) {
        return {
          headline: "Add schools to this district",
          body: "Schools you add will roll up into your district reports and readiness dashboards.",
          ctaLabel: "Open district overview",
          ctaHref: "/district/overview",
          reason: `${districtIds.length} district${districtIds.length === 1 ? "" : "s"}, 0 schools`,
          tone: "primary",
        };
      }
      const { data: students } = await supabase
        .from("students")
        .select("id, organization_id")
        .in("organization_id", schoolIds);
      const studentIds = (students ?? []).map((s) => s.id as string);
      const { data: reports } = studentIds.length
        ? await supabase.from("pathway_reports").select("student_id").in("student_id", studentIds)
        : { data: [] as Array<{ student_id: string }> };
      const withReport = new Set((reports ?? []).map((r) => r.student_id as string));
      const pct = studentIds.length
        ? Math.round((withReport.size / studentIds.length) * 100)
        : 0;
      return {
        headline: `District readiness: ${pct}% of students have a Pathway Report`,
        body: "Drill into schools that are lagging and surface the supports that are working.",
        ctaLabel: "Open district reports",
        ctaHref: "/district/reports",
        reason: `${schoolIds.length} schools · ${studentIds.length} students · ${withReport.size} with reports`,
        tone: pct < 50 ? "warning" : pct === 100 ? "success" : "primary",
        secondaryLabel: "School breakdown",
        secondaryHref: "/district/overview",
      };
    }

    if (surface === "partner") {
      const [{ count: opps }, { count: activeOpps }] = await Promise.all([
        supabase.from("partner_opportunities").select("id", { count: "exact", head: true }),
        supabase
          .from("partner_opportunities")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
      ]);

      if (!opps || opps === 0) {
        return {
          headline: "Submit your first opportunity",
          body: "Add a program, internship, or service so students get matched with what you offer.",
          ctaLabel: "Add opportunity",
          ctaHref: "/partners-manage",
          tone: "primary",
        };
      }
      if ((activeOpps ?? 0) === 0) {
        return {
          headline: "No active opportunities right now",
          body: "Reactivate or refresh an opportunity so students can be matched.",
          ctaLabel: "Manage opportunities",
          ctaHref: "/partners-manage",
          reason: `${opps} total · 0 active`,
          tone: "warning",
        };
      }
      return {
        headline: "Keep opportunities current",
        body: "Review and refresh your active opportunities so student matches stay accurate.",
        ctaLabel: "Manage opportunities",
        ctaHref: "/partners-manage",
        reason: `${activeOpps}/${opps} active`,
        tone: "success",
      };
    }


    if (surface === "admin") {
      const [
        { count: healthFail },
        { count: feedbackNew },
        { count: partnerPending },
        { count: issuesOpen },
        { count: supportOpen },
        { count: contactsNew },
        { count: waitlistNew },
      ] = await Promise.all([
        supabase
          .from("system_health_checks")
          .select("id", { count: "exact", head: true })
          .eq("status", "needs_attention"),
        supabase
          .from("feedback_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("partner_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("product_issues")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(closed,resolved,wont_fix)"),
        supabase
          .from("support_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "new"]),
        supabase
          .from("contact_submissions")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("waitlist")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
      ]);

      if ((healthFail ?? 0) > 0) {
        const n = healthFail!;
        return {
          headline: `${n} system health ${n === 1 ? "check needs" : "checks need"} attention`,
          body: "Resolve failing checks before they impact users. Review and update the status of each item.",
          ctaLabel: "Open System Health",
          ctaHref: "/owner/health",
          tone: "warning",
        };
      }
      if ((partnerPending ?? 0) > 0) {
        const n = partnerPending!;
        return {
          headline: `${n} partner ${n === 1 ? "submission" : "submissions"} awaiting review`,
          body: "New partner applications are pending approval to join the Partner Network.",
          ctaLabel: "Review submissions",
          ctaHref: "/owner/partner-submissions",
          tone: "warning",
        };
      }
      if ((feedbackNew ?? 0) > 0) {
        const n = feedbackNew!;
        return {
          headline: `${n} new ${n === 1 ? "piece" : "pieces"} of user feedback`,
          body: "Triage user-reported bugs, ideas, and questions to keep the product improving.",
          ctaLabel: "Open Feedback",
          ctaHref: "/owner/feedback",
          tone: "primary",
        };
      }
      if ((issuesOpen ?? 0) > 0) {
        const n = issuesOpen!;
        return {
          headline: `${n} open product ${n === 1 ? "issue" : "issues"}`,
          body: "Move open issues toward resolution so the launch checklist stays on track.",
          ctaLabel: "Open Issues",
          ctaHref: "/owner/issues",
          tone: "warning",
        };
      }
      if ((supportOpen ?? 0) > 0) {
        const n = supportOpen!;
        return {
          headline: `${n} open support ${n === 1 ? "request" : "requests"}`,
          body: "Respond to users waiting for help so no one is left stuck.",
          ctaLabel: "Open Contacts",
          ctaHref: "/owner/contacts",
          tone: "warning",
        };
      }
      if ((contactsNew ?? 0) > 0) {
        const n = contactsNew!;
        return {
          headline: `${n} new contact ${n === 1 ? "submission" : "submissions"}`,
          body: "Reply to inbound questions from families, educators, and partners.",
          ctaLabel: "Open Contacts",
          ctaHref: "/owner/contacts",
          tone: "primary",
        };
      }
      if ((waitlistNew ?? 0) > 0) {
        const n = waitlistNew!;
        return {
          headline: `${n} new waitlist ${n === 1 ? "entry" : "entries"}`,
          body: "Review and qualify new sign-ups so they can be moved into pilots or onboarded.",
          ctaLabel: "Open Waitlist",
          ctaHref: "/owner/waitlist",
          tone: "primary",
        };
      }
      return {
        headline: "Inbox is clear",
        body: "No pending submissions, feedback, or health issues. Review analytics or content updates.",
        ctaLabel: "Open Owner Hub",
        ctaHref: "/owner",
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
