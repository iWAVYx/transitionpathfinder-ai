import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type DbResource = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  audience: string;
  topic: string | null;
  format: string | null;
  url: string | null;
  source_name: string | null;
  location_scope: string;
  estimated_time: string | null;
  grade_range: string | null;
};

export const listVerifiedResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("resources")
      .select(
        "id,title,description,resource_type,audience,topic,format,url,source_name,location_scope,estimated_time,grade_range",
      )
      .eq("verified_status", "verified")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("listVerifiedResources failed", error);
      return { resources: [] as DbResource[] };
    }
    return { resources: (data ?? []) as DbResource[] };
  });
