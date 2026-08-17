import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type SavedResourceRow = {
  id: string;
  resource_id: string;
  collection_name: string | null;
  notes: string | null;
  created_at: string;
  resource: {
    id: string;
    title: string;
    description: string | null;
    resource_type: string;
    topic: string | null;
    url: string | null;
    source_name: string | null;
  } | null;
};

export const listSavedResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("saved_resources")
      .select(
        "id, resource_id, collection_name, notes, created_at, resource:resources(id,title,description,resource_type,topic,url,source_name)",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      console.error("listSavedResources", error);
      return { items: [] as SavedResourceRow[] };
    }
    return { items: (data ?? []) as unknown as SavedResourceRow[] };
  });

export const saveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        resource_id: z.string().uuid(),
        collection_name: z.string().trim().min(1).max(80).optional(),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("saved_resources").upsert(
      {
        user_id: userId,
        resource_id: data.resource_id,
        collection_name: data.collection_name ?? "Saved",
        notes: data.notes ?? null,
      },
      { onConflict: "user_id,resource_id,collection_name" },
    );
    if (error) throw new Error("Could not save resource.");
    return { ok: true };
  });

export const unsaveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ resource_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("saved_resources")
      .delete()
      .eq("user_id", userId)
      .eq("resource_id", data.resource_id);
    if (error) throw new Error("Could not remove saved resource.");
    return { ok: true };
  });

export const updateSavedResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        collection_name: z.string().trim().min(1).max(80).optional(),
        notes: z.string().trim().max(500).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: { collection_name?: string; notes?: string | null } = {};
    if (data.collection_name !== undefined) patch.collection_name = data.collection_name;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("saved_resources")
      .update(patch)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error("Could not update saved resource.");
    return { ok: true };
  });

