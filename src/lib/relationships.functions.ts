import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Models the human relationship + consent between a student and another user
 * (parent, educator, case manager, partner mentor). Separate from
 * `student_collaborators`, which is a document-level ACL.
 */

const RELATIONSHIP_TYPE = z.enum([
  "parent",
  "guardian",
  "educator",
  "case_manager",
  "school_admin",
  "district_admin",
  "partner",
  "mentor",
  "other",
]);

const PERMISSION_LEVEL = z.enum([
  "view",
  "collaborate",
  "manage_documents",
  "manage_plan",
]);

export type StudentRelationship = {
  id: string;
  student_id: string;
  related_user_id: string;
  relationship_type: string;
  permission_level: string;
  consent_status: "pending" | "approved" | "declined" | "revoked";
  created_at: string;
  updated_at: string;
};

export const listStudentRelationships = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ student_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("student_relationships")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listStudentRelationships failed", error);
      return { relationships: [] as StudentRelationship[] };
    }
    return { relationships: (rows ?? []) as StudentRelationship[] };
  });

export const requestStudentConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        related_user_id: z.string().uuid(),
        relationship_type: RELATIONSHIP_TYPE,
        permission_level: PERMISSION_LEVEL.default("view"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("student_relationships")
      .upsert(
        {
          student_id: data.student_id,
          related_user_id: data.related_user_id,
          relationship_type: data.relationship_type,
          permission_level: data.permission_level,
          consent_status: "pending",
        } as never,
        { onConflict: "student_id,related_user_id" },
      );
    if (error) {
      console.error("requestStudentConnection failed", error);
      throw new Error("Could not request connection.");
    }
    return { ok: true };
  });

export const respondToConnectionRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        relationship_id: z.string().uuid(),
        decision: z.enum(["approve", "decline", "revoke"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const status =
      data.decision === "approve"
        ? "approved"
        : data.decision === "decline"
          ? "declined"
          : "revoked";
    const { error } = await supabase
      .from("student_relationships")
      .update({ consent_status: status } as never)
      .eq("id", data.relationship_id);
    if (error) throw new Error("Could not update consent.");
    return { ok: true };
  });
