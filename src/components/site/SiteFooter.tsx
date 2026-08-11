import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

import { LEGAL_ATTRIBUTION, legalCopyright } from "@/lib/contact";

const productLinks = [
  { to: "/platform", label: "The Platform" },
  { to: "/demo", label: "See the Demo" },
  { to: "/programs/transitionforward", label: "TransitionForward (9–12)" },
  { to: "/resources", label: "Resource Hub" },
  { to: "/research", label: "Research" },
] as const;

const companyLinks = [
  { to: "/about", label: "Our Story" },
  { to: "/partners", label: "Partners" },
  { to: "/pricing", label: "Pricing" },
  { to: "/blog", label: "Blog" },
  { to: "/waitlist", label: "Join the Waitlist" },
] as const;

const supportLinks = [
  { to: "/families", label: "For Families" },
  { to: "/educators", label: "For Educators" },
  { to: "/help", label: "Help & Contact" },
  { to: "/privacy", label: "Privacy" },
  { to: "/trust-and-safety", label: "Trust & Safety" },
  { to: "/terms", label: "Terms of Use" },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-border/60 bg-muted/40">
      {/* Ambient gradient */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <motion.div
          aria-hidden
          className="absolute -left-40 top-0 h-[420px] w-[420px] rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -right-40 bottom-0 h-[380px] w-[380px] rounded-full bg-accent/10 blur-3xl"
          animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:px-8">
        <div className="sm:col-span-2 md:col-span-3 lg:col-span-2">
          <Link to="/" className="group flex items-center gap-2">
            <motion.span
              aria-hidden
              whileHover={{ rotate: 12, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero shadow-soft"
            >
              <span className="h-3 w-3 rounded-full bg-primary" />
            </motion.span>
            <span className="font-display text-xl font-semibold tracking-tight">
              TransitionForward
            </span>
          </Link>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            From IEP Plans to Real-Life Pathways. One platform for the students,
            families, and educators walking the long road of transition together.
          </p>
          <p className="mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
            A pilot program — not a school district's system of record. Your
            child's information stays yours, scoped to your account, and is
            never shared, sold, or used to train any outside model.
          </p>

          <Link
            to="/waitlist"
            className="group mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm font-semibold text-foreground shadow-soft backdrop-blur transition-all hover:border-primary/40 hover:shadow-lift"
          >
            Join the waitlist
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <FooterColumn title="Product" links={productLinks} />
        <FooterColumn title="Company" links={companyLinks} />
        <FooterColumn title="Support" links={supportLinks} />
      </div>

      <div className="border-t border-border/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>
            {legalCopyright()} · {LEGAL_ATTRIBUTION} Made with care in Connecticut.
          </p>
          <p className="italic">
            <span className="whitespace-nowrap">One&nbsp;Platform.</span>{" "}
            <span className="whitespace-nowrap">One&nbsp;Plan.</span>{" "}
            <span className="whitespace-nowrap">Forward&nbsp;Together.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { to: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              className="group inline-flex items-center gap-1 transition-colors hover:text-foreground"
            >
              <span className="relative">
                {link.label}
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-foreground/60 transition-transform duration-300 group-hover:scale-x-100" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}