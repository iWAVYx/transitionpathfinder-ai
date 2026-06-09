import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  adminListPageSections,
  adminUpsertPageSection,
  adminUploadMedia,
  getPageSection,
  type PageSection,
} from "@/lib/cms/cms.functions";

export const Route = createFileRoute("/_authenticated/owner/content")({
  head: () => ({ meta: [{ title: "Content — Admin Hub" }] }),
  component: ContentPage,
});

type HeroContent = {
  eyebrow: string;
  headline_lead: string;
  headline_accent: string;
  headline_tail: string;
  subhead: string;
  tagline: string;
  cta_primary_label: string;
  cta_secondary_label: string;
};

const HERO_DEFAULTS: HeroContent = {
  eyebrow: "Transition planning, made human",
  headline_lead: "From IEP Goals to",
  headline_accent: "Real-Life",
  headline_tail: "Pathways.",
  subhead:
    "A warm, easy-to-use platform that helps students with disabilities, families, and educators plan life after high school — together.",
  tagline: "One Platform. One Plan. Forward Together.",
  cta_primary_label: "Join the waitlist",
  cta_secondary_label: "Try the live demo",
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

function ContentPage() {
  const list = useServerFn(adminListPageSections);
  const save = useServerFn(adminUpsertPageSection);
  const fetchSection = useServerFn(getPageSection);
  const upload = useServerFn(adminUploadMedia);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hero, setHero] = useState<HeroContent>(HERO_DEFAULTS);
  const [sections, setSections] = useState<PageSection[]>([]);

  const [careerUrl, setCareerUrl] = useState<string | null>(null);
  const [uploadingCareer, setUploadingCareer] = useState(false);
  const careerFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Promise.all([
      list().catch(() => ({ sections: [] as PageSection[] })),
      fetchSection({ data: { page_key: "home", section_key: "pathway_images" } }).catch(
        () => ({ content: null as any }),
      ),
    ])
      .then(([sectionsRes, imagesRes]) => {
        setSections(sectionsRes.sections);
        const heroSection = sectionsRes.sections.find(
          (s) => s.page_key === "home" && s.section_key === "hero",
        );
        if (heroSection?.content) {
          setHero({ ...HERO_DEFAULTS, ...(heroSection.content as Partial<HeroContent>) });
        }
        const url = imagesRes?.content?.career_url;
        if (typeof url === "string" && url.length > 0) setCareerUrl(url);
      })
      .finally(() => setLoading(false));
  }, []);

  const onSaveHero = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          page_key: "home",
          section_key: "hero",
          content: hero as unknown as Record<string, unknown>,
          is_published: true,
        },
      });
      toast.success("Homepage hero saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const update = (k: keyof HeroContent) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setHero((h) => ({ ...h, [k]: e.target.value }));

  const onCareerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, WebP).");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image is too large. Max 5 MB.");
      return;
    }
    setUploadingCareer(true);
    try {
      const base64 = await fileToBase64(file);
      const { asset } = await upload({
        data: {
          filename: file.name,
          mime_type: file.type,
          base64,
          title: "Career & Employment pathway tile",
          alt_text: "Career & Employment pathway tile image",
        },
      });
      await save({
        data: {
          page_key: "home",
          section_key: "pathway_images",
          content: { career_url: asset.public_url } as Record<string, unknown>,
          is_published: true,
        },
      });
      setCareerUrl(asset.public_url);
      toast.success("Career & Employment image updated");
      // refresh sections list footer
      const refreshed = await list().catch(() => ({ sections }));
      setSections(refreshed.sections);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to upload image");
    } finally {
      setUploadingCareer(false);
      if (careerFileRef.current) careerFileRef.current.value = "";
    }
  };

  const onResetCareer = async () => {
    setUploadingCareer(true);
    try {
      await save({
        data: {
          page_key: "home",
          section_key: "pathway_images",
          content: { career_url: null } as Record<string, unknown>,
          is_published: true,
        },
      });
      setCareerUrl(null);
      toast.success("Reverted to the default image");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reset");
    } finally {
      setUploadingCareer(false);
    }
  };

  return (
    <OwnerShell
      title="Site content"
      description="Edit content blocks rendered on marketing pages. Saved changes appear live."
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="space-y-8">
          <section className="rounded-lg border border-border bg-background p-6">
            <header className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-medium">Homepage hero</h2>
                <p className="text-xs text-muted-foreground">
                  Page: <code>home</code> · Section: <code>hero</code>
                </p>
              </div>
              <Button onClick={onSaveHero} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Eyebrow"><Input value={hero.eyebrow} onChange={update("eyebrow")} /></Field>
              <Field label="Headline (lead)"><Input value={hero.headline_lead} onChange={update("headline_lead")} /></Field>
              <Field label="Headline (accent)"><Input value={hero.headline_accent} onChange={update("headline_accent")} /></Field>
              <Field label="Headline (tail)"><Input value={hero.headline_tail} onChange={update("headline_tail")} /></Field>
              <Field label="Subhead" full>
                <Textarea rows={3} value={hero.subhead} onChange={update("subhead")} />
              </Field>
              <Field label="Tagline" full><Input value={hero.tagline} onChange={update("tagline")} /></Field>
              <Field label="Primary CTA label"><Input value={hero.cta_primary_label} onChange={update("cta_primary_label")} /></Field>
              <Field label="Secondary CTA label"><Input value={hero.cta_secondary_label} onChange={update("cta_secondary_label")} /></Field>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-6">
            <header className="mb-4">
              <h2 className="font-display text-lg font-medium">Pathway tile images</h2>
              <p className="text-xs text-muted-foreground">
                Page: <code>home</code> · Section: <code>pathway_images</code> · Upload replaces the homepage tile photo instantly. PNG, JPG, or WebP, max 5&nbsp;MB.
              </p>
            </header>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-md border border-border bg-muted sm:w-56">
                {careerUrl ? (
                  <img
                    src={careerUrl}
                    alt="Current Career & Employment tile"
                    className="h-full w-full object-cover"
                    style={{ objectPosition: "50% 40%" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Using bundled default
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Career &amp; Employment</p>
                <p className="text-xs text-muted-foreground">
                  This image fills the small Career &amp; Employment tile in the “Many Roads Forward” section on the homepage.
                </p>
                <input
                  ref={careerFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={onCareerFile}
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => careerFileRef.current?.click()}
                    disabled={uploadingCareer}
                  >
                    {uploadingCareer ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {careerUrl ? "Replace image" : "Upload image"}
                  </Button>
                  {careerUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onResetCareer}
                      disabled={uploadingCareer}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset to default
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-background p-6">
            <h2 className="mb-3 font-display text-lg font-medium">All saved sections</h2>
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No content overrides saved yet.</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {sections.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2">
                    <span>
                      <code>{s.page_key}</code> / <code>{s.section_key}</code>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.is_published ? "Published" : "Hidden"} ·{" "}
                      {s.updated_at ? new Date(s.updated_at).toLocaleString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </OwnerShell>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
