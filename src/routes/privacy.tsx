import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Lock,
  Database,
  Trash2,
  UserCheck,
  School,
  FileText,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy & your child's records — TransitionForward" },
      {
        name: "description",
        content:
          "How TransitionForward stores IEPs, asks for consent, handles FERPA, and keeps every student's records yours.",
      },
      { property: "og:title", content: "Privacy & your child's records — TransitionForward" },
      {
        property: "og:description",
        content:
          "Plain-language privacy notice for families, students, educators, and districts.",
      },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

const promises = [
  {
    icon: Lock,
    title: "Your Records Are Encrypted and Scoped to Your Account",
    body: "IEPs, evaluation reports, intake answers, and Pathway Reports are stored encrypted at rest and in transit. Only people you explicitly invite to a student's circle can see them. We do not share, sell, or rent any data — ever.",
  },
  {
    icon: Sparkles,
    title: "AI Suggestions Never Train Outside Models",
    body: "When you generate a Pathway Report, your student's information is sent to our AI provider strictly to produce that report. It is never used to train, fine-tune, or improve any model — ours or anyone else's. The provider processes it and discards it.",
  },
  {
    icon: UserCheck,
    title: "You Decide Who Sees What",
    body: "Families control which educators, mentors, or family members get access to a student's hub. Educators see only the students assigned to their caseload. Students 18+ can manage their own access. Every invite is logged.",
  },
  {
    icon: Trash2,
    title: "Delete Anything, Any Time",
    body: "You can delete a single document, an entire student profile, or your whole account from your settings. Deletion is real — your records are removed from active systems within 24 hours and from backups within 30 days.",
  },
  {
    icon: School,
    title: "We Are Not Your School's System of Record",
    body: "TransitionForward is a planning tool, not a replacement for CT SEDS or your district's IEP platform. Nothing here changes the legal IEP. We complement the system you already have — we do not absorb it.",
  },
  {
    icon: Database,
    title: "We Collect the Minimum We Need",
    body: "Only the information you choose to enter, plus the bare technical data needed to keep your account secure (login timestamps, IP for fraud prevention). No advertising trackers. No third-party analytics that personally identify you.",
  },
];

const ferpaPoints = [
  {
    label: "Who Owns the Records?",
    body: "You do. Parents own a minor student's records; students 18+ own their own. We are a processor acting on your direction, not the owner of the data.",
  },
  {
    label: "How Does This Work with FERPA?",
    body: "When a district uses TransitionForward under a contract, we act as a school official with a legitimate educational interest, governed by a Data Privacy Agreement. When a family uses us directly, FERPA does not apply because the school is not disclosing — you are. You stay in control either way.",
  },
  {
    label: "What About Students Under 13?",
    body: "Our pilot is for students grades 9–12 and post-secondary (ages 14–22). We do not knowingly create accounts for children under 13 and we do not target them with marketing.",
  },
  {
    label: "Will My Child's IEP End Up in an AI Training Set?",
    body: "No. Our agreements with AI providers prohibit using customer content for training. We do not log or store the prompts beyond what is needed to render the Pathway Report back to you.",
  },
  {
    label: "How Long Do You Keep Things?",
    body: "Active records stay as long as your account is active. After deletion: 24 hours to remove from active systems, up to 30 days to clear backups. We retain anonymized usage counts (e.g., 'how many reports were generated this month') indefinitely.",
  },
  {
    label: "Who Do You Share With?",
    body: "No one, except: (1) our hosting provider that runs the database under a signed processing agreement, (2) the AI provider that generates Pathway Reports, and (3) law enforcement only when legally required and only with notice to you whenever permitted.",
  },
];

function PrivacyPage() {
  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-60" />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 lg:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Privacy &amp; Your Child's Records
          </p>
          <h1 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl">
            Your Child's Records Are Yours. Full Stop.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            We built TransitionForward as parents and educators who would not hand our own
            children's IEPs to a system we couldn't read. This page is the plain-language version
            of every promise we make — and the small-print version is the same, just longer.
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Last updated for the 2026 pilot. We'll date and post any material change here before
            it takes effect.
          </p>
        </div>
      </section>

      {/* Six promises */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">
          Our Six Promises
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {promises.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-3xl border bg-card p-6 shadow-soft"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-hero text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-lg font-medium leading-snug">
                {toTitleCase(title)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* FERPA / common questions */}
      <section className="border-y border-border/60 bg-muted/30 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Common Questions
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            FERPA, AI, and the Questions Families Actually Ask
          </h2>
          <dl className="mt-8 divide-y divide-border/70 border-y border-border/70">
            {ferpaPoints.map(({ label, body }) => (
              <div key={label} className="grid gap-3 py-6 md:grid-cols-[1fr_2fr] md:gap-8">
                <dt className="font-display text-base font-semibold text-foreground">{toTitleCase(label)}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Your rights */}
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <h2 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          Your rights in one paragraph.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          You can see every record we hold about your student, correct anything that's wrong,
          export it to a file you can keep, restrict who else sees it, and delete all of it. You
          do not need a reason. To exercise any of these, email us from the address on your
          account or write to us from the contact page below — we'll confirm your identity and
          act within seven days.
        </p>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Link
            to="/contact"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-lift"
          >
            <HelpCircle className="h-4 w-4" />
            Ask a privacy question
          </Link>
          <Link
            to="/waitlist"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-semibold backdrop-blur hover:bg-muted"
          >
            <FileText className="h-4 w-4" />
            Join the pilot
          </Link>
        </div>

        <p className="mt-10 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Districts: a signed Data Privacy Agreement (CT-DPA aligned) is available on request
          before pilot start.
        </p>
      </section>
    </SiteShell>
  );
}
