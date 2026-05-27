import { Link, createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { GraduationCap, Rocket, BookHeart, Compass } from "lucide-react";
import aboutHero from "@/assets/about-hero.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Meet Caysi | TransitionForward" },
      { name: "description", content: "A Connecticut special education teacher with an MBA and an MAT, building the tool she wishes had existed for her own students' families." },
      { property: "og:title", content: "Meet Caysi | TransitionForward" },
      { property: "og:description", content: "The story behind TransitionForward: classroom grit meets entrepreneurial conviction." },
    ],
  }),
  component: AboutPage,
});

const chapters = [
  {
    icon: BookHeart,
    chapter: "Chapter One",
    title: "The Classroom That Changed Everything",
    body: "Caysi did not set out to build software. She set out to teach. Year after year, in a Connecticut high school special education classroom, she watched the same quiet heartbreak repeat itself: brilliant students aging out of a system that had nowhere to send them, and families showing up to PPT meetings holding paperwork no one had translated, carrying questions no one had answered.",
  },
  {
    icon: GraduationCap,
    chapter: "Chapter Two",
    title: "Two Degrees, One Conviction",
    body: "She doubled down. An MAT from Southern Connecticut State University to deepen the craft of teaching. An MBA, in the same years, to learn the language of systems, scale, and what it actually takes to build something that lasts. The capstone became the Transition Forward handbook, a research backed framework for the years that decide a young person's future.",
  },
  {
    icon: Rocket,
    chapter: "Chapter Three",
    title: "The Founder's Leap",
    body: "Caysi could have kept the handbook on a shelf. Instead she chose the harder path: turn it into a platform every Connecticut family could open at midnight, every educator could lean on at 6 a.m., every student could see themselves inside. TransitionForward was born at the intersection of classroom truth and entrepreneurial nerve.",
  },
  {
    icon: Compass,
    chapter: "Chapter Four",
    title: "Built for the Ones Who Cannot Wait",
    body: "Every feature here was sketched first on a sticky note next to a real student's name. Every plain language explanation was tested first across a kitchen table. This is not a tech company that found special education. It is a special education classroom that learned to ship.",
  },
];

function AboutPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-70" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1fr_1.05fr] lg:px-8 lg:pt-24 lg:pb-16">
          <div className="relative order-2 md:order-1">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-warm blur-2xl opacity-60" />
            <img
              src={aboutHero}
              alt="Portrait of Caysi at a chalkboard mapping student pathways in golden hour light"
              width={1600}
              height={1200}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
          <div className="order-1 md:order-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">The Story</p>
            <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              She Refused to Watch One More Family Walk in Unprepared.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              TransitionForward was not built in a boardroom. It was built between bell schedules,
              after meetings, on the back of napkins, by a teacher who saw the gap and an MBA who
              knew how to close it. Same person. Two callings. One company.
            </p>
            <p className="mt-4 max-w-xl font-display text-lg italic text-foreground/80">
              "I am Caysi. I taught the students you are reading about. I am building the tool I wish
              I had handed their parents on day one."
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {chapters.map(({ icon: Icon, chapter, title, body }) => (
            <article
              key={title}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift sm:p-10"
            >
              <div className="flex items-start gap-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-sky text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{chapter}</p>
                  <h2 className="mt-2 font-display text-2xl font-medium tracking-tight sm:text-3xl">{title}</h2>
                  <p className="mt-4 text-base leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-soft sm:p-14">
          <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Walk the Next Mile With Us.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-foreground/80">
            If this story sounds like your story, you are exactly who we built this for. Join the
            pilot and help shape what comes next.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/waitlist" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft hover:shadow-lift">
              Join the Waitlist
            </Link>
            <Link to="/framework" className="inline-flex items-center justify-center rounded-full border border-border bg-background/80 px-6 py-3 text-sm font-semibold hover:bg-background">
              Read the Framework
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
