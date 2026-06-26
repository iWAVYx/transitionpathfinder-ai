import { createFileRoute } from "@tanstack/react-router";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import {
  ChapterOpener,
  MagazinePage,
  PullQuote,
  SpreadHead,
  HandbookCallout,
  HandbookSidebar,
} from "@/components/site/MagazinePage";
import { CHAPTER_META } from "@/lib/demo-chapters";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import { DEMO_VOICE } from "@/lib/demo-extras";

export const Route = createFileRoute("/demo_/voice")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Student Voice — TransitionForward Demo" },
      {
        name: "description",
        content:
          "See how a student's own answers shape the Pathway Report, action plan, and meeting prep.",
      },
      { property: "og:title", content: "Student Voice — TransitionForward Demo" },
      {
        property: "og:description",
        content:
          "Sample Student Voice prompts and responses, and how each one affects recommendations.",
      },
      { property: "og:url", content: "/demo/voice" },
    ],
    links: [{ rel: "canonical", href: "/demo/voice" }],
  }),
  component: DemoVoicePage,
});

function DemoVoicePage() {
  const { s = "maya" } = Route.useSearch() as { s?: DemoStudentId };
  const bundle = getDemoStudent(s);
  const prompts = DEMO_VOICE[s];
  const first = bundle.profile.first_name;
  const meta = CHAPTER_META.voice;
  const hero = prompts[0];

  // Lightweight aspirations list pulled from the first prompts.
  const aspirations = prompts.slice(0, 3).map((p) => p.affects);

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <DemoStepBar current="voice" student={s} />
        <ChapterOpener
          numeral={meta.numeral}
          kicker={meta.kicker}
          title={`${first}'s Voice, In ${first}'s Words`}
          dek={meta.dek}
          covers={meta.covers}
        />

        {/* ===== Page A — Feature interview opener with pull quote ===== */}
        <MagazinePage folio={meta.page}>
          <SpreadHead left={`${meta.numeral} — Student Voice`} />

          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-4">
              <div className="aspect-square overflow-hidden bg-gradient-to-br from-[color:var(--demo-surface-warm)] to-[color:var(--demo-accent-soft)]">
                <div className="grid h-full w-full place-items-center">
                  <div className="h-24 w-24 rounded-full border border-[color:var(--eh-teal)]/15" />
                </div>
              </div>
              <HandbookSidebar
                label="Key Aspirations"
                items={aspirations.map((a, i) => (
                  <span key={i}>{a}</span>
                ))}
              />
            </div>

            <div className="md:col-span-8 md:pl-2">
              {hero ? (
                <PullQuote cite={`In ${first}'s Own Words`}>
                  &ldquo;{hero.response}&rdquo;
                </PullQuote>
              ) : null}

              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div>
                  <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--eh-mute)]">
                    What This Tells Us
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                    {hero?.affects ??
                      "These answers anchor every recommendation in the Pathway Report and meeting prep."}
                  </p>
                </div>
                <div>
                  <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--eh-mute)]">
                    Where It Appears
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                    Pull quotes appear inside the Pathway Report, the meeting agenda, and the
                    family-facing summary so everyone hears {first} first.
                  </p>
                </div>
              </div>

              <HandbookCallout label={`What ${first} Wants You To Know`}>
                {first} prefers a minute to think before answering. Sharing the agenda and
                the main questions before the meeting helps {first} contribute fully — and
                gives families a chance to prepare together.
              </HandbookCallout>
            </div>
          </div>
        </MagazinePage>

        {/* ===== Page B — Interview transcript (Q&A spread) ===== */}
        <MagazinePage folio={String(Number(meta.page) + 1).padStart(2, "0")}>
          <SpreadHead left={`${meta.numeral} — The Full Interview`} />

          <div className="grid grid-cols-1 gap-10 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-8">
              {prompts.map((p, i) => (
                <article key={p.prompt} className="eh-qa">
                  <p className="q">Prompt {String(i + 1).padStart(2, "0")}</p>
                  <p className="prompt">{p.prompt}</p>
                  <p className="a">&ldquo;{p.response}&rdquo;</p>
                  <p className="mt-3 text-xs italic text-[color:var(--eh-mute)]">
                    Shapes the report → {p.affects}
                  </p>
                </article>
              ))}
            </div>

            <div className="md:col-span-4">
              <HandbookSidebar
                label="How To Use This Page"
                title="A Reading Guide"
                items={[
                  <span key="1">
                    Read each prompt aloud with {first} — answers can be updated together.
                  </span>,
                  <span key="2">
                    Highlight pull quotes the team should hear before the meeting.
                  </span>,
                  <span key="3">
                    Note any prompts {first} would like a trusted adult to answer first.
                  </span>,
                ]}
              />

              <div className="mt-8">
                <HandbookCallout label="What To Do Next">
                  Bring two or three pull quotes into the meeting prep page. The Pathway
                  Report will cite them automatically.
                </HandbookCallout>
              </div>
            </div>
          </div>

          <DemoStepFooter current="voice" student={s} />
        </MagazinePage>
      </div>
    </SiteShell>
  );
}
