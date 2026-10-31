/** Navigation shortcuts and content actions are separate user-facing regions. */
export function duplicateDashboardLinks(main: Element) {
  const navigation = Array.from(main.querySelectorAll("nav, [role=\"navigation\"]"));
  const counts = new Map<string, { region: string; href: string; count: number }>();
  for (const link of main.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const bounds = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    if (!bounds.width || !bounds.height || style.visibility === "hidden" || style.display === "none") continue;
    const href = link.getAttribute("href");
    if (!href?.startsWith("/")) continue;
    const nav = link.closest("nav, [role=\"navigation\"]");
    const region = nav ? `navigation ${navigation.indexOf(nav) + 1}` : "content";
    const key = `${region}:${href}`;
    const previous = counts.get(key);
    counts.set(key, { region, href, count: (previous?.count ?? 0) + 1 });
  }
  return [...counts.values()].filter(({ count }) => count > 1);
}

/** Retain query and hash context when probing the links users actually open. */
export function dashboardTileHrefs(main: Element) {
  const seen = new Set<string>();
  const hrefs: string[] = [];
  for (const link of main.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    const href = link.getAttribute("href") ?? "";
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const bounds = link.getBoundingClientRect();
    const style = getComputedStyle(link);
    if (!bounds.width || !bounds.height || style.visibility === "hidden" || style.display === "none") continue;
    if (seen.has(href)) continue;
    seen.add(href);
    hrefs.push(href);
  }
  return hrefs;
}
