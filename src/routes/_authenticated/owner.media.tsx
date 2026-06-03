import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Trash2, Upload, Copy } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import {
  adminListMedia,
  adminUploadMedia,
  adminDeleteMedia,
  type MediaAsset,
} from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/_authenticated/owner/media")({
  head: () => ({ meta: [{ title: "Media library — Admin Hub" }] }),
  component: MediaPage,
});

function MediaPage() {
  const list = useServerFn(adminListMedia);
  const upload = useServerFn(adminUploadMedia);
  const del = useServerFn(adminDeleteMedia);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await list();
      setMedia(r.media);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 8 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 8 MB limit`);
          continue;
        }
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = "";
        for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
        const base64 = btoa(bin);
        await upload({
          data: {
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            base64,
            title: file.name,
          },
        });
      }
      toast.success("Uploaded");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this media asset? This cannot be undone.")) return;
    try {
      await del({ data: { id } });
      toast.success("Deleted");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete");
    }
  };

  return (
    <OwnerShell
      title="Media library"
      description={`${media.length} items`}
      actions={
        <>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} size="sm">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Upload images
          </Button>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : media.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No media yet. Upload images to use in your site content.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {media.map((m) => (
            <div key={m.id} className="group overflow-hidden rounded-lg border border-border bg-background">
              <div className="aspect-square w-full overflow-hidden bg-muted">
                {m.mime_type?.startsWith("image/") ? (
                  <img src={m.public_url} alt={m.alt_text ?? m.title ?? ""} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    {m.mime_type ?? "file"}
                  </div>
                )}
              </div>
              <div className="p-2 text-xs">
                <div className="truncate font-medium" title={m.title ?? ""}>{m.title ?? "Untitled"}</div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <button
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText(m.public_url);
                      toast.success("URL copied");
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copy URL
                  </button>
                  <button
                    className="text-destructive hover:opacity-80"
                    onClick={() => handleDelete(m.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </OwnerShell>
  );
}
