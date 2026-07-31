import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldCheck, AlertTriangle, Scale } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use — TransitionForward" },
      {
        name: "description",
        content:
          "Plain-language terms for using TransitionForward during the pilot — what we provide, what you agree to, and the limits of the service.",
      },
      { property: "og:title", content: "Terms of Use — TransitionForward" },
      {
        property: "og:description",
        content: "What you agree to when using TransitionForward.",
      },
      { property: "og:url", content: "/terms" },
      { rel: "canonical", href: "/terms" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Last updated: June 2026 · Pilot release
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Terms of Use
          </h1>
          <p className="text-lg text-muted-foreground">
            TransitionForward is a pilot platform helping students, families, and educators
            organize the long road of transition planning. These terms describe what we
            provide and what you agree to when you use it.
          </p>
        </header>

        <Section icon={FileText} title="What TransitionForward is">
          <p>
            {LEGAL_ATTRIBUTION} Where these terms say "we" or "us," they mean{" "}
            {LEGAL_ENTITY_NAME}, the company that operates the service.
          </p>
          <p>
            TransitionForward is software that helps families and education teams capture
            IEP goals, action items, voice, partner connections, and a unified pathway
            report. It is <strong>not</strong> a school district's official system of
            record and does not replace IEP documents, school services, or legal advice.
          </p>
        </Section>

        <Section icon={ShieldCheck} title="Your account and your data">
          <ul className="list-disc space-y-2 pl-5">
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for keeping your login credentials secure.</li>
            <li>
              Data you enter about a student stays scoped to your account and the
              collaborators you explicitly invite. See the{" "}
              <Link to="/privacy" className="underline">Privacy Notice</Link> and{" "}
              <Link to="/trust-and-safety" className="underline">Trust & Safety</Link>{" "}
              page for details.
            </li>
            <li>You may request export or deletion of your data at any time.</li>
          </ul>
        </Section>

        <Section icon={AlertTriangle} title="Pilot limitations and AI assistance">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              TransitionForward is in active development. Features may change, break, or
              be removed during the pilot.
            </li>
            <li>
              Some features use AI to summarize documents, suggest pathways, and draft
              text. AI output is a starting point, may contain errors, and should always
              be reviewed by a person who knows the student.
            </li>
            <li>
              We do not guarantee the platform will be available without interruption,
              and we are not liable for decisions made solely based on AI output.
            </li>
          </ul>
        </Section>

        <Section icon={Scale} title="Acceptable use">
          <ul className="list-disc space-y-2 pl-5">
            <li>Do not upload data about a student you do not have permission to support.</li>
            <li>Do not attempt to access another account's data or bypass security controls.</li>
            <li>Do not use the platform to harass, harm, or discriminate against any person.</li>
            <li>
              Educators, partners, and district users agree to follow all applicable
              FERPA, IDEA, HIPAA, and local privacy requirements when using the platform.
            </li>
          </ul>
        </Section>

        <Section icon={FileText} title="Changes and contact">
          <p>
            We may update these terms as the pilot evolves. Material changes will be
            announced inside the app. Questions or concerns? Reach us through the{" "}
            <Link to="/help" hash="contact" className="underline">
              Help & Contact page
            </Link>
            .
          </p>
        </Section>
      </article>
    </SiteShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
        <Icon className="h-5 w-5 text-primary" />
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
