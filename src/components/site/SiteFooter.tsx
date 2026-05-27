import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero shadow-soft"
            >
              <span className="h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight">
              TransitionForward
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            A quiet companion for families and educators walking the long road of
            transition — from a 9th-grade schedule to a real life after graduation.
            Built by a special-education teacher in Connecticut, grounded in the
            research that actually moves outcomes.
          </p>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground/80">
            A pilot program, not a school district's system of record. Your child's
            records stay yours — encrypted, scoped to your account, and never used
            to train AI models.
          </p>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold">Explore</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/framework" className="hover:text-foreground">How we walk through it</Link></li>
            <li><Link to="/research" className="hover:text-foreground">The research behind it</Link></li>
            <li><Link to="/partners" className="hover:text-foreground">Real-world partners</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">What it costs</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-semibold">About</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">Meet Caysi</Link></li>
            <li><Link to="/waitlist" className="hover:text-foreground">Join the pilot</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy & your records</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} TransitionForward. Made with care in Connecticut.</p>
          <p className="italic">Grounded in the work of Mazzotti, Test, Allensworth, Carter, and Burke.</p>
        </div>
      </div>
    </footer>
  );
}
