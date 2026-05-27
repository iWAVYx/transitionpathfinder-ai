import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarHeart, Sparkles } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listMyReports } from "@/lib/pathway.functions";
import { createPptPrep, type PptAgenda } from "@/lib/ppt.functions";

export const Route = createFileRoute("/_authenticated/ppt-prep")({
  head: () => ({ meta: [{ title: "PPT Meeting Prep — TransitionForward" }] }),
  component: PptPrepPage,
});

type ReportSummary = { id: string; student_first_name: string; grade_band: string | null; created_at: string };

function PptPrepPage() {
  const list = useServerFn(listMyReports);
  const prep = useServerFn(createPptPrep);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportId, setReportId] = useState<string>("");
  const [meetingDate, setMeetingDate] = useState("");
  const [topConcerns, setTopConcerns] = useState("");
  const [desiredOutcomes, setDesiredOutcomes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [agenda, setAgenda] = useState<{ agenda: PptAgenda; studentName: string } | null>(null);

  useEffect(() => {
    list()
      .then((r) => setReports(r.reports))
      .finally(() => setLoadingReports(false));
  }, [list]);

  const onGenerate = async () => {
    if (!reportId) {
      toast.error("Pick a Pathway Report first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await prep({
        data: { report_id: reportId, meeting_date: meetingDate, top_concerns: topConcerns, desired_outcomes: desiredOutcomes },
      });
      setAgenda(res);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  if (agenda) {
    return (
      <SiteShell>
        <AgendaView name={agenda.studentName} agenda={agenda.agenda} onReset={() => setAgenda(null)} />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "PPT Meeting Prep" }]} />
        <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-primary">PPT Meeting Prep</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Walk in calm. Walk out heard.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Pick a Pathway Report, tell us what you most want from this meeting, and we'll
          draft a one-page agenda, the right questions to ask, and a few scripts you can
          borrow word-for-word.
        </p>

        <InfoBox label="What's a PPT meeting?" className="mt-6">
          <p>
            A <Term definition={GLOSSARY.PPT}>PPT</Term> (Planning &amp; Placement Team) meeting
            is where your student's school team and family sit down together to review the{" "}
            <Term definition={GLOSSARY.IEP}>IEP</Term> — goals, services,{" "}
            <Term definition={GLOSSARY.Accommodations}>accommodations</Term>, and what's coming next.
          </p>
          <p className="mt-2">
            These meetings move fast. The prep below gives you a friendly agenda, the exact
            questions to ask, and language you can use when things get tense.
          </p>
        </InfoBox>

        {!loadingReports && reports.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-border/70 bg-gradient-hero p-10 text-center shadow-soft">
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background/80 shadow-soft">
              <CalendarHeart className="h-6 w-6 text-primary" aria-hidden />
            </div>
            <h2 className="mt-4 font-display text-2xl font-medium tracking-tight">
              Start with a Pathway Report.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              We build your meeting prep from the student, family, and educator voices in a
              Pathway Report. Create one and come back here.
            </p>
            <Link
              to="/pathway"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Create a Pathway Report
            </Link>
          </div>
        ) : (
        <div className="mt-10 space-y-5 rounded-3xl border border-border/60 bg-card p-6 shadow-soft sm:p-8">
          <div>
            <Label className="mb-1.5 inline-block">Pathway Report to build from</Label>
            {loadingReports ? (
              <p className="text-sm text-muted-foreground">Loading your reports…</p>
            ) : (
              <Select onValueChange={setReportId}>
                <SelectTrigger><SelectValue placeholder="Choose a report…" /></SelectTrigger>
                <SelectContent>
                  {reports.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.student_first_name}
                      {r.grade_band ? ` · ${r.grade_band}` : ""} ·{" "}
                      {new Date(r.created_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label className="mb-1.5 inline-block">Meeting date (optional)</Label>
            <Input value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} placeholder="e.g. May 14, 2026" />
          </div>

          <div>
            <Label className="mb-1.5 inline-block">What's on your mind going in?</Label>
            <p className="mb-1.5 text-xs text-muted-foreground">The concerns or questions you don't want to forget to raise.</p>
            <Textarea rows={3} value={topConcerns} onChange={(e) => setTopConcerns(e.target.value)} />
          </div>

          <div>
            <Label className="mb-1.5 inline-block">What do you want to walk out with?</Label>
            <p className="mb-1.5 text-xs text-muted-foreground">Decisions, services, or commitments you're hoping for.</p>
            <Textarea rows={3} value={desiredOutcomes} onChange={(e) => setDesiredOutcomes(e.target.value)} />
          </div>

          <Button onClick={onGenerate} disabled={generating || !reportId} className="w-full">
            {generating ? "Drafting your meeting prep…" : "Generate meeting prep"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Generation takes 15–30 seconds. You stay in charge — edit, print, or skip anything.
          </p>
        </div>
        )}
      </section>
    </SiteShell>
  );
}

function AgendaView({ name, agenda, onReset }: { name: string; agenda: PptAgenda; onReset: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">PPT Meeting Prep</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          A meeting plan for {name}.
        </h1>
        <p className="mt-4 text-base italic leading-relaxed text-foreground/80">{agenda.opening_note}</p>
      </div>

      <Block title="Suggested agenda">
        <ol className="space-y-3">
          {agenda.agenda.map((item, i) => (
            <li key={i} className="flex items-start gap-4 rounded-2xl border border-border/60 bg-card p-4">
              <span className="mt-0.5 inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {item.minutes} min
              </span>
              <div>
                <p className="font-display text-base font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.purpose}</p>
              </div>
            </li>
          ))}
        </ol>
      </Block>

      <Block title="Questions to ask">
        <BulletList items={agenda.questions_to_ask} />
      </Block>

      <Block title="What to bring as evidence">
        <BulletList items={agenda.evidence_to_bring} />
      </Block>

      <Block title="Language that works">
        <ul className="mt-2 space-y-3">
          {agenda.language_that_works.map((s, i) => (
            <li key={i} className="rounded-2xl border border-border/60 bg-card p-4 text-sm italic text-foreground/90">
              "{s}"
            </li>
          ))}
        </ul>
      </Block>

      <div className="mt-10 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">If things get stuck</p>
        <p className="mt-3 font-display text-lg italic text-foreground/90">{agenda.if_things_get_stuck}</p>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={onReset} variant="outline">Prep another meeting</Button>
        <Button onClick={() => window.print()}>Print / save as PDF</Button>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-10">
      <h2 className="font-display text-2xl font-medium tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
