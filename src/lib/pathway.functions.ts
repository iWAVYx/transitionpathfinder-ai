import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const IntakeSchema = z.object({
  submitter_role: z.enum(["family", "student", "educator"]),
  student_first_name: z.string().trim().min(1).max(80),
  grade_band: z.enum(["9-10", "11-12", "post-secondary", "not-applicable"]).optional(),
  strengths: z.string().trim().max(2000).optional().default(""),
  interests: z.string().trim().max(2000).optional().default(""),
  needs: z.string().trim().max(2000).optional().default(""),
  supports: z.string().trim().max(2000).optional().default(""),
  transportation: z.string().trim().max(500).optional().default(""),
  communication: z.string().trim().max(500).optional().default(""),
  current_goals: z.string().trim().max(2000).optional().default(""),
  family_concerns: z.string().trim().max(2000).optional().default(""),
  student_voice: z.string().trim().max(2000).optional().default(""),
});

export type IntakeInput = z.infer<typeof IntakeSchema>;

const ReportSchema = z.object({
  summary: z.string().describe("2-3 sentence warm, plain-language summary of this student."),
  strengths_snapshot: z.array(z.string()).min(2).max(6),
  career_pathways: z
    .array(
      z.object({
        title: z.string(),
        why_it_fits: z.string(),
        example_roles: z.array(z.string()).min(1).max(4),
        first_steps: z.array(z.string()).min(1).max(4),
      }),
    )
    .min(2)
    .max(4),
  education_training_options: z.array(z.string()).min(2).max(6),
  life_skills_focus: z.array(z.string()).min(3).max(6),
  family_questions_for_ppt: z.array(z.string()).min(3).max(6),
  teacher_next_steps: z.array(z.string()).min(3).max(6),
  thirty_day_plan: z
    .array(z.object({ week: z.number().int().min(1).max(4), action: z.string() }))
    .length(4),
  encouragement_to_student: z
    .string()
    .describe("A short, warm note (2-3 sentences) addressed to the student in plain language."),
});

export type PathwayReport = z.infer<typeof ReportSchema>;

function buildPrompt(intake: IntakeInput) {
  return `You are TransitionForward, a warm, trusted guide helping families, students, and educators plan life after high school for students receiving special education services in Connecticut. You speak in plain, hopeful, second-person language. You are NOT clinical. You honor student voice.

A ${intake.submitter_role} submitted this intake for a student we will call ${intake.student_first_name}.

Grade band: ${intake.grade_band ?? "not specified"}
Strengths: ${intake.strengths || "(not provided)"}
Interests: ${intake.interests || "(not provided)"}
Needs / disability-related supports: ${intake.needs || "(not provided)"}
Supports that work: ${intake.supports || "(not provided)"}
Transportation: ${intake.transportation || "(not provided)"}
Communication: ${intake.communication || "(not provided)"}
Current IEP transition goals: ${intake.current_goals || "(not provided)"}
Family concerns: ${intake.family_concerns || "(not provided)"}
Student's own voice: ${intake.student_voice || "(not provided)"}

Generate a personalized TransitionForward Pathway Report. Be specific and realistic — never generic. Tie every suggestion back to the student's interests, strengths, and stated needs. Use Connecticut-aware language where reasonable (community colleges, CT technical high schools, Bureau of Rehabilitation Services / BRS, etc.) but do not name specific programs you cannot verify. Keep the tone warm and student-centered.`;
}

export const createPathwayReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IntakeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const { supabase, userId } = context;

    const { data: intake, error: intakeErr } = await supabase
      .from("student_intakes")
      .insert({
        user_id: userId,
        submitter_role: data.submitter_role,
        student_first_name: data.student_first_name,
        grade_band: data.grade_band ?? null,
        strengths: data.strengths || null,
        interests: data.interests || null,
        needs: data.needs || null,
        supports: data.supports || null,
        transportation: data.transportation || null,
        communication: data.communication || null,
        current_goals: data.current_goals || null,
        family_concerns: data.family_concerns || null,
        student_voice: data.student_voice || null,
      })
      .select("id")
      .single();

    if (intakeErr || !intake) {
      console.error("intake insert failed", intakeErr);
      throw new Error("Could not save your intake. Please try again.");
    }

    const model = "google/gemini-2.5-flash";
    const gateway = createLovableAiGatewayProvider(apiKey);

    let report: PathwayReport;
    try {
      const { experimental_output } = await generateText({
        model: gateway(model),
        experimental_output: Output.object({ schema: ReportSchema }),
        prompt: buildPrompt(data),
      });
      report = experimental_output as PathwayReport;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("AI generation failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't generate the Pathway Report. Please try again.");
    }

    const { data: saved, error: reportErr } = await supabase
      .from("pathway_reports")
      .insert({
        user_id: userId,
        intake_id: intake.id,
        model,
        content: report as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();

    if (reportErr || !saved) {
      console.error("report insert failed", reportErr);
      throw new Error("Generated the report but couldn't save it. Please try again.");
    }

    return { reportId: saved.id, intakeId: intake.id, report };
  });

export const listMyReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("pathway_reports")
      .select("id, created_at, intake_id, student_intakes(student_first_name, grade_band)")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.error("listMyReports failed", error);
      return { reports: [] as Array<{ id: string; created_at: string; student_first_name: string; grade_band: string | null }> };
    }
    type Row = {
      id: string;
      created_at: string;
      intake_id: string;
      student_intakes: { student_first_name: string; grade_band: string | null } | null;
    };
    const reports = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      student_first_name: r.student_intakes?.student_first_name ?? "—",
      grade_band: r.student_intakes?.grade_band ?? null,
    }));
    return { reports };
  });
