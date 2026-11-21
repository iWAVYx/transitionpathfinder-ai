import { ROUTE_AUDIENCES } from "@/lib/role-policy";

/** Per-router memory only: never persist private paths, IDs or search values. */
export type NavigationEntry = {
  href: string;
  pathname: string;
  state: { __TSR_index: number; __TSR_key?: string; key?: string };
};
export type NavigationOrigin = { href: string; pathname: string; index: number };

function safeOrigin(entry: NavigationEntry): NavigationOrigin | null {
  if (!/^\/(?!\/)/.test(entry.href) || /[\\\u0000-\u001f]/.test(entry.href)) return null;
  if (/(?:[?&#])(?:access_token|refresh_token|token|code|client_secret|receipt)=/i.test(entry.href)) return null;
  // Authentication callbacks and payment returns are not pages to revisit.
  if (/^\/(?:auth|sign-in|sign-out|login|logout|reset-password|checkout)(?:[/.?]|$)/.test(entry.pathname)) return null;
  return { href: entry.href, pathname: entry.pathname, index: entry.state.__TSR_index };
}

/** A direct public page must not invent a dashboard as its previous page. */
export function isWorkspaceReturnPath(pathname: string): boolean {
  if (pathname === "/bridgeforward") return false;
  return [...Object.keys(ROUTE_AUDIENCES), "/transition-channel", "/settings", "/owner"].some(
    path => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function navigationOriginLabel(pathname: string): string {
  const labels: Record<string, string> = {
    "/": "Home", "/dashboard": "Dashboard", "/caseload": "Educator Dashboard",
    "/school/overview": "School Dashboard", "/district/overview": "District Dashboard",
    "/partners-manage": "Partner Dashboard", "/owner": "Owner Hub",
    "/demo": "Demo", "/demo/dashboard": "Demo Dashboard",
    "/demo/family": "Family Demo Dashboard", "/demo/student": "Student Demo Dashboard",
    "/demo/educator": "Educator Demo Dashboard", "/demo/school-admin": "School Demo Dashboard",
    "/demo/district-admin": "District Demo Dashboard", "/demo/partner": "Partner Demo Dashboard",
    "/demo/owner": "Owner Hub Demo", "/reports": "Reports",
    "/pathway": "Pathway Builder", "/calendar": "Calendar", "/resources": "Resources",
    "/partner-network": "Partner Network", "/ppt-prep": "PPT Preparation",
  };
  return labels[pathname] ?? "Previous Page";
}

/** Remember the source for each history entry; Back/Forward never reverse it. */
export class NavigationOrigins {
  private current: NavigationEntry;
  private entries = new Map<string, NavigationOrigin | null>();
  origin: NavigationOrigin | null = null;
  constructor(initial: NavigationEntry) { this.current = initial; }
  private key(entry: NavigationEntry) {
    return entry.state.__TSR_key ?? entry.state.key ?? `${entry.state.__TSR_index}:${entry.href}`;
  }
  update(next: NavigationEntry, action: string) {
    const previous = this.current;
    const previousOrigin = this.entries.get(this.key(previous)) ?? null;
    const key = this.key(next);
    if (action === "PUSH") {
      // Filters and section anchors keep the page's original source.
      this.entries.set(key, next.pathname === previous.pathname ? previousOrigin : safeOrigin(previous));
    } else if (action === "REPLACE") {
      this.entries.delete(this.key(previous));
      this.entries.set(key, previousOrigin);
    }
    this.current = next;
    const origin = this.entries.get(key) ?? null;
    this.origin = origin && origin.index < next.state.__TSR_index ? origin : null;
    // Bound memory without writing any navigation state to storage or the server.
    if (this.entries.size > 200) this.entries.delete(this.entries.keys().next().value!);
    return this.origin;
  }
}
