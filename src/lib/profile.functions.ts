import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Profile = {
  id: string;
  full_name: string | null;
  language: string;
};

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, language")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error("Could not load profile.");
    return (data ?? { id: userId, full_name: null, language: "en" }) as Profile;
  });

export const updateProfileLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ language: z.string().min(2).max(8) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ language: data.language })
      .eq("id", userId);
    if (error) throw new Error("Could not save language.");
    return { ok: true };
  });
