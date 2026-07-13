import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarHeart, Sparkles, Trash2, History } from "lucide-react";
import { z } from "zod";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { AIDisclaimer } from "@/components/site/AIDisclaimer";
import { Term, GLOSSARY } from "@/components/site/Term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { listMyReports } from "@/lib/pathway.functions";
import {
  createPptPrep,
  getPptPrep,
  listPptPreps,
  deletePptPrep,
  type PptAgenda,
  type PptPrepSummary,
} from "@/lib/ppt.functions";
import { createStudentActionItem } from "@/lib/action-items.functions";
import { MeetingPrepPartners } from "@/components/pathway/MeetingPrepPartners";
import { PreMeetingChecklist } from "@/components/pathway/PreMeetingChecklist";


import { toTitleCase } from "@/lib/title-case";

const SearchSchema = z.object({
  id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/ppt-prep")({
  head: () => ({ meta: [{ title: "PPT Meeting Prep — TransitionForward" }] }),
  validateSearch: (s) => SearchSchema.parse(s),
  component: () => (<RoleGuard path="/ppt-prep"><PptPrepPage /></RoleGuard>),
});

type ReportSummary = { id: string; student_first_name: string; grade_band: string | null; created_at: string };

type LoadedAgenda = {
  id: string | null;
  agenda: PptAgenda;
  studentName: string;
  studentId: string | null;
  meetingDate: string | null;
};

function PptPrepPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const list = useServerFn(listMyReports);
  const prep = useServerFn(createPptPrep);
  const loadPrep = useServerFn(getPptPrep);
  const listPreps = useServerFn(listPptPreps);
  const removePrep = useServerFn(deletePptPrep);

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [savedPreps, setSavedPreps] = useState<PptPrepSummary[]>([]);
  const [reportId, setReportId] = useState<string>("");
  const [meetingDate, setMeetingDate] = useState("");
  const [topConcerns, setTopConcerns] = useState("");
  const [desiredOutcomes, setDesiredOutcomes] = useState("");
  const [generating, setGenerating] = useState(false);
  const [agenda, setAgenda] = useState<LoadedAgenda | null>(null);
  const [hydrating, setHydrating] = useState(false);

  useEffect(() => {
    list()
      .then((r) => setReports(r.reports))
      .finally(() => setLoadingReports(false));
    listPreps()
      .then((r) => setSavedPreps(r.preps))
      .catch(() => {});
  }, [list, listPreps]);

  // Hydrate saved prep from ?id= search param
  useEffect(() => {
    if (!search.id) {
      setAgenda(null);
      return;
    }
    setHydrating(true);
    loadPrep({ data: { id: search.id } })
      .then((row) =>
        setAgenda({
          id: row.id,
          agenda: row.agenda,
          studentName: row.studentName,
          studentId: row.studentId,
          meetingDate: row.meetingDate,
        }),
      )
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Couldn't load that meeting prep.");
        navigate({ to: "/ppt-prep", search: {} });
      })
      .finally(() => setHydrating(false));
  }, [search.id, loadPrep, navigate]);

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
      // Refresh saved list so the new one appears when they come back.
      listPreps().then((r) => setSavedPreps(r.preps)).catch(() => {});
      if (res.id) {
        // Navigate to the canonical URL so reload/share works.
        navigate({ to: "/ppt-prep", search: { id: res.id } });
      } else {
        setAgenda({
          id: null,
          agenda: res.agenda,
          studentName: res.studentName,
          studentId: res.studentId,
          meetingDate: res.meetingDate,
        });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  };

  const onReset = () => {
    setAgenda(null);
    navigate({ to: "/ppt-prep", search: {} });
  };

  const onDeleteSaved = async (id: string) => {
    if (!confirm("Delete this saved meeting prep? This can't be undone.")) return;
    try {
      await removePrep({ data: { id } });
      setSavedPreps((prev) => prev.filter((p) => p.id !== id));
      if (agenda?.id === id) onReset();
      toast.success("Deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete.");
    }
  };

  if (hydrating) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-sm text-muted-foreground">Loading your meeting prep…</p>
        </section>
      </SiteShell>
    );
  }

  if (agenda) {
    return (
      <SiteShell>
        <AgendaView
          name={agenda.studentName}
          agenda={agenda.agenda}
          studentId={agenda.studentId}
          meetingDate={agenda.meetingDate}
          onReset={onReset}
        />
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="demo-shell">
      <section className="tf-cover mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs trail={[{ label: "PPT Meeting Prep" }]} />
        <p className="tf-eyebrow mt-6">PPT Meeting Prep</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Walk in Calm. Walk Out Heard.
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

        {savedPreps.length > 0 && (
          <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <h2 className="font-display text-lg">Your saved meeting preps</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick up where you left off — these are saved to your account.
            </p>
            <ul className="mt-4 divide-y divide-border">
              {savedPreps.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <Link
                    to="/ppt-prep"
                    search={{ id: p.id }}
                    className="min-w-0 flex-1 text-sm hover:text-primary"
                  >
                    <span className="font-medium">{toTitleCase(p.student_name || "Untitled")}</span>
                    {p.meeting_date && (
                      <span className="text-muted-foreground"> · {p.meeting_date}</span>
                    )}
                    <span className="ml-2 text-xs text-muted-foreground">
                      Saved {new Date(p.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDeleteSaved(p.id)}
                    className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Delete saved prep"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

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
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift"
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
            Generation takes 15–30 seconds. We'll save it to your account so you can come back anytime.
          </p>
        </div>
        )}

        {!(!loadingReports && reports.length === 0) && (
          <div className="mt-6">
            <PreMeetingChecklist />
          </div>
        )}

      </section>
      </div>
    </SiteShell>
  );
}

function AgendaView({
  name,
  agenda,
  studentId,
  meetingDate,
  onReset,
}: {
  name: string;
  agenda: PptAgenda;
  studentId: string | null;
  meetingDate: string | null;
  onReset: () => void;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="rounded-3xl bg-gradient-hero p-8 shadow-soft sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">PPT Meeting Prep</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          A Meeting Plan For {toTitleCase(name)}.
        </h1>
        <p className="mt-4 text-base italic leading-relaxed text-foreground/80">{agenda.opening_note}</p>
      </div>

      <div className="mt-6">
        <AIDisclaimer />
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

      <Block title="Partner contacts & deadlines">
        <MeetingPrepPartners studentId={studentId} meetingDate={meetingDate} />
      </Block>

      <Block title="Questions to ask">
        <BulletList items={agenda.questions_to_ask} studentId={studentId} category="family" />
      </Block>

      <Block title="What to bring as evidence">
        <BulletList items={agenda.evidence_to_bring} studentId={studentId} category="team" />
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
      <h2 className="font-display text-2xl font-medium tracking-tight">{toTitleCase(title)}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function BulletList({
  items,
  studentId,
  category,
}: {
  items: string[];
  studentId?: string | null;
  category?: "family" | "team" | "educator" | "student" | "school";
}) {
  const addAction = useServerFn(createStudentActionItem);
  return (
    <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
      {items.map((it, i) => (
        <li key={i} className="flex items-start justify-between gap-3">
          <div className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <span>{it}</span>
          </div>
          {studentId && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await addAction({
                    data: {
                      student_id: studentId,
                      title: it.slice(0, 200),
                      category: category ?? "family",
                      priority: "medium",
                    },
                  });
                  toast.success("Added to action items.");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not add.");
                }
              }}
              className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted"
            >
              + Action
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
