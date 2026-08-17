import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import type { PathwayReport } from "./pathway.functions";

const PrepInputSchema = z.object({
  report_id: z.string().uuid(),
  meeting_date: z.string().trim().max(80).optional().default(""),
  top_concerns: z.string().trim().max(2000).optional().default(""),
  desired_outcomes: z.string().trim().max(2000).optional().default(""),
});

const AgendaSchema = z.object({
  opening_note: z
    .string()
    .describe("A warm 2-3 sentence framing the family can read at the start of the meeting."),
  agenda: z
    .array(
      z.object({
        title: z.string(),
        minutes: z.number().int().min(2).max(20),
        purpose: z.string(),
      }),
    )
    .min(4)
    .max(7),
  questions_to_ask: z.array(z.string()).min(4).max(8),
  evidence_to_bring: z.array(z.string()).min(3).max(6),
  language_that_works: z.array(z.string()).min(3).max(6)
    .describe("Short scripts the family can borrow word-for-word when advocating."),
  if_things_get_stuck: z
    .string()
    .describe("A 2-3 sentence calm script for when the meeting stalls or goes sideways."),
});

export type PptAgenda = z.infer<typeof AgendaSchema>;

export const createPptPrep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PrepInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service is not configured.");

    const { supabase } = context;

    const { data: report, error } = await supabase
      .from("pathway_reports")
      .select("id, student_id, content, student_intakes(student_first_name, grade_band, family_concerns, current_goals)")
      .eq("id", data.report_id)
      .single();

    if (error || !report) throw new Error("We couldn't find that Pathway Report.");

    type Intake = { student_first_name: string; grade_band: string | null; family_concerns: string | null; current_goals: string | null } | null;
    const intake = (report as unknown as { student_intakes: Intake }).student_intakes;
    const name = intake?.student_first_name ?? "this student";

    const prompt = `You are TransitionForward, a calm, trusted guide preparing a Connecticut family for a PPT (Planning and Placement Team) meeting. You speak in plain, hopeful, second-person language. You honor the student's voice and the family's authority. Avoid clinical or adversarial tone.

Student first name: ${name}
Grade band: ${intake?.grade_band ?? "not specified"}
Meeting date (if known): ${data.meeting_date || "not specified"}
Family's top concerns going in: ${data.top_concerns || "(not provided — infer from the Pathway Report)"}
What the family wants to walk out with: ${data.desired_outcomes || "(not provided — infer from the Pathway Report)"}

Existing Pathway Report context (use as background, do not repeat verbatim):
${JSON.stringify(report.content)}

Generate a PPT meeting prep packet. Make every question and script specific to ${name} — never generic. Keep total reading time under five minutes.`;

    const gateway = createLovableAiGatewayProvider(apiKey);
    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-2.5-flash"),
        experimental_output: Output.object({ schema: AgendaSchema }),
        prompt,
      });
      const agenda = experimental_output as PptAgenda;
      const studentId = (report as unknown as { student_id: string | null }).student_id;

      // Persist so the agenda survives reloads / device switches.
      const { data: saved, error: saveErr } = await supabase
        .from("ppt_meeting_preps")
        .insert({
          user_id: context.userId,
          report_id: data.report_id,
          student_id: studentId,
          student_name: name,
          meeting_date: data.meeting_date || null,
          top_concerns: data.top_concerns,
          desired_outcomes: data.desired_outcomes,
          agenda: JSON.parse(JSON.stringify(agenda)),
          title: `${name}${data.meeting_date ? ` · ${data.meeting_date}` : ""}`,
        })
        .select("id")
        .single();
      if (saveErr) console.error("PPT prep save failed", saveErr);

      return {
        id: saved?.id ?? null,
        agenda,
        studentName: name,
        studentId,
        meetingDate: data.meeting_date || null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("PPT prep generation failed", msg);
      if (msg.includes("429")) throw new Error("The AI is busy right now. Please try again in a moment.");
      if (msg.includes("402")) throw new Error("AI usage limit reached. Please add credits to continue.");
      throw new Error("We couldn't generate the meeting prep. Please try again.");
    }
  });

export type PptPrepSummary = {
  id: string;
  student_name: string;
  meeting_date: string | null;
  created_at: string;
};

export const listPptPreps = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("ppt_meeting_preps")
      .select("id, student_name, meeting_date, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("listPptPreps failed", error);
      return { preps: [] as PptPrepSummary[] };
    }
    return { preps: (data ?? []) as PptPrepSummary[] };
  });

export const getPptPrep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("ppt_meeting_preps")
      .select("id, student_id, student_name, meeting_date, top_concerns, desired_outcomes, agenda, created_at")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !row) throw new Error("That meeting prep was not found.");
    // Validate stored agenda shape — old/malformed rows shouldn't crash render.
    const parsed = AgendaSchema.safeParse(row.agenda);
    if (!parsed.success) throw new Error("That meeting prep is missing or corrupted.");
    return {
      id: row.id,
      agenda: parsed.data,
      studentName: row.student_name,
      studentId: row.student_id,
      meetingDate: row.meeting_date,
      topConcerns: row.top_concerns,
      desiredOutcomes: row.desired_outcomes,
      createdAt: row.created_at,
    };
  });

export const deletePptPrep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("ppt_meeting_preps")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("Could not delete that meeting prep.");
    return { ok: true };
  });

export const getPathwayReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("pathway_reports")
      .select("id, created_at, content, student_intakes(student_first_name, grade_band)")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Report not found.");
    type Intake = { student_first_name: string; grade_band: string | null } | null;
    const intake = (row as unknown as { student_intakes: Intake }).student_intakes;
    return {
      id: row.id,
      created_at: row.created_at,
      student_first_name: intake?.student_first_name ?? "—",
      grade_band: intake?.grade_band ?? null,
      content: row.content as PathwayReport,
    };
  });
