import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/studio/StudioPage";

import { validateStudentSearch } from "@/components/site/DemoStepBar";
import { CHAPTER_META } from "@/lib/demo-chapters";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import { DEMO_VOICE } from "@/lib/demo-extras";
import {
  PublicationSpread, PublicationPullQuote, PublicationCallout, PublicationSidebar,
} from "@/components/publication/PublicationPage";
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

  const aspirations = prompts.slice(0, 3).map((p) => p.affects);

  return (
    <StudioPage stage="voice" student={s} preserveStudent={!!search.s} title={`${first} dek={meta.dek}>
          {/* Feature opener — hero pull quote with sidebar */}
          <PublicationSpread
            lead={
              <>
                {hero ? (
                  <PublicationPullQuote attribution={`In ${first}'s Own Words`}>
                    &ldquo;{hero.response}&rdquo;
                  </PublicationPullQuote>
                ) : null}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 mt-6">
                  <div>
                    <h3>What This Tells Us</h3>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {hero?.affects ??
                        "These answers anchor every recommendation in the Pathway Report and meeting prep."}
                    </p>
                  </div>
                  <div>
                    <h3>Where It Appears</h3>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      Pull quotes appear inside the Pathway Report, the meeting agenda,
                      and the family-facing summary so everyone hears {first} first.
                    </p>
                  </div>
                </div>

                <PublicationCallout kind="next" title={`What ${first} Wants You To Know`}>
                  {first} prefers a minute to think before answering. Sharing the agenda
                  and the main questions before the meeting helps {first} contribute
                  fully — and gives families a chance to prepare together.
                </PublicationCallout>
              </>
            }
            side={
              <PublicationSidebar label="Key Aspirations">
                <ul className="space-y-2 text-sm">
                  {aspirations.map((a, i) => (
                    <li key={i} className="text-foreground/80">{a}</li>
                  ))}
                </ul>
              </PublicationSidebar>
            }
          />

          {/* Full interview transcript */}
          <h2>The Full Interview</h2>

          <PublicationSpread
            lead={
              <div className="space-y-6">
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
            }
            side={
              <>
                <PublicationSidebar label="How To Use This Page">
                  <p className="pub-sidebar-label sr-only">A Reading Guide</p>
                  <ul className="space-y-3 text-sm">
                    <li>
                      Read each prompt aloud with {first} — answers can be updated together.
                    </li>
                    <li>
                      Highlight pull quotes the team should hear before the meeting.
                    </li>
                    <li>
                      Note any prompts {first} would like a trusted adult to answer first.
                    </li>
                  </ul>
                </PublicationSidebar>

                <PublicationCallout kind="next">
                  Bring two or three pull quotes into the meeting prep page. The Pathway
                  Report will cite them automatically.
                </PublicationCallout>
              </>
            }
          />
        </StudioPage>
  );
}
