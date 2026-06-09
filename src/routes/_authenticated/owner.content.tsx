import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  adminListPageSections,
  adminUpsertPageSection,
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
  headline_accent: "real-life",
  headline_tail: "pathways.",
  subhead:
    "A warm, easy-to-use platform that helps students with disabilities, families, and educators plan life after high school — together.",
  tagline: "One Platform. One Plan. Forward Together.",
  cta_primary_label: "Join the waitlist",
  cta_secondary_label: "Try the live demo",
};

function ContentPage() {
  const list = useServerFn(adminListPageSections);
  const save = useServerFn(adminUpsertPageSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hero, setHero] = useState<HeroContent>(HERO_DEFAULTS);
  const [sections, setSections] = useState<PageSection[]>([]);

  useEffect(() => {
    list()
      .then((r) => {
        setSections(r.sections);
        const heroSection = r.sections.find(
          (s) => s.page_key === "home" && s.section_key === "hero",
        );
        if (heroSection?.content) {
          setHero({ ...HERO_DEFAULTS, ...(heroSection.content as Partial<HeroContent>) });
        }
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
