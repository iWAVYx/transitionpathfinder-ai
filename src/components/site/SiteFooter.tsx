import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-hero shadow-soft"
            >
              <span className="h-3 w-3 rounded-full bg-primary" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              TransitionForward
            </span>
          </Link>
          <p className="mt-4 max-w-md text-sm text-muted-foreground">
            A research-backed hub for families and educators to start transition
            planning in 9th grade — not 11th. Built by a special-education teacher,
            grounded in IDEA and Connecticut transition guidance.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/80">
            Pilot program. Not a district system of record. IEPs are stored privately
            and never used to train AI models.
          </p>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/framework" className="hover:text-foreground">The Framework</Link></li>
            <li><Link to="/research" className="hover:text-foreground">Research library</Link></li>
            <li><Link to="/partners" className="hover:text-foreground">Partner directory</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-foreground">About Caysi</Link></li>
            <li><Link to="/waitlist" className="hover:text-foreground">Join the pilot</Link></li>
            <li><Link to="/privacy" className="hover:text-foreground">Privacy & FERPA</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} TransitionForward. Made with care in Connecticut.</p>
          <p>Grounded in Mazzotti et al. (2021), Test et al. (2009), Allensworth (2013).</p>
        </div>
      </div>
    </footer>
  );
}
