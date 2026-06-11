import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, Lock, UserCheck, Trash2, Database, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";

export const Route = createFileRoute("/trust-and-safety")({
  head: () => ({
    meta: [
      { title: "Trust & Safety — TransitionForward" },
      {
        name: "description",
        content:
          "How TransitionForward handles AI assistance, student data, consent, and data access and removal during the pilot.",
      },
      { property: "og:title", content: "Trust & Safety — TransitionForward" },
      {
        property: "og:description",
        content:
          "AI disclaimer, student data scoping, consent, and the right to access or delete your data.",
      },
      { property: "og:url", content: "/trust-and-safety" },
      { rel: "canonical", href: "/trust-and-safety" },
    ],
  }),
  component: TrustSafetyPage,
});

function TrustSafetyPage() {
  return (
    <SiteShell>
      <article className="mx-auto max-w-3xl space-y-10 px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Trust & Safety · Pilot release
          </p>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            Trust & Safety
          </h1>
          <p className="text-lg text-muted-foreground">
            Families share some of the most sensitive information they have with us — IEPs,
            evaluations, hopes for their child's future. This page explains the commitments
            we make in return.
          </p>
        </header>

        <Section icon={Sparkles} title="AI assistance disclaimer">
          <p>
            TransitionForward uses AI to summarize uploaded documents, suggest pathways,
            draft action items, and recommend resources. AI is a <strong>starting point,
            not a decision-maker</strong>.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>AI output can contain errors, omissions, or outdated information.</li>
            <li>Every AI-generated summary, recommendation, or draft is reviewable and editable by you.</li>
            <li>AI does not replace IEP teams, clinicians, school staff, or legal counsel.</li>
            <li>We never use a child's data to train any third-party model.</li>
          </ul>
        </Section>

        <Section icon={Database} title="Student data — what we store and where">
          <ul className="list-disc space-y-2 pl-5">
            <li>Student records you create are scoped to your account by row-level security at the database layer.</li>
            <li>Uploaded IEP documents live in private storage with signed-URL access that expires.</li>
            <li>Only collaborators you explicitly invite (and accept) can view a student's record.</li>
            <li>We do not sell, rent, or share student data with advertisers or data brokers — ever.</li>
          </ul>
        </Section>

        <Section icon={UserCheck} title="Consent">
          <p>
            Sensitive actions — uploading IEPs, sharing with partners, inviting school
            staff — require an explicit, logged consent record. You can revoke any consent
            at any time from the <Link to="/trust" className="underline">Trust &
            Consent</Link> page in your signed-in account.
          </p>
        </Section>

        <Section icon={Lock} title="Authentication & access">
          <ul className="list-disc space-y-2 pl-5">
            <li>Accounts are protected by email/password or trusted single sign-on.</li>
            <li>Two-factor authentication is available and recommended for educators and admins.</li>
            <li>Share links you create can be revoked at any time, and access is logged.</li>
          </ul>
        </Section>

        <Section icon={Trash2} title="Data access & removal">
          <p>
            You own your data. You can:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Export your student records and pathway reports from your account.</li>
            <li>Delete any individual record, document, or your entire account.</li>
            <li>Request a full data-deletion audit by emailing us through the{" "}
              <Link to="/help" hash="contact" className="underline">Help & Contact</Link>{" "}
              page.</li>
          </ul>
        </Section>

        <Section icon={ShieldCheck} title="Reporting a concern">
          <p>
            If something feels wrong — a privacy incident, a bug exposing data, harassment,
            or a safety concern about a student — please reach us immediately through the{" "}
            <Link to="/help" hash="contact" className="underline">Help & Contact</Link>{" "}
            page. Signed-in users can also use the floating <strong>Feedback</strong>{" "}
            button on any page.
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
