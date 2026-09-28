import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const header = readFileSync("src/components/site/SiteHeader.tsx", "utf8");
const siteShell = readFileSync("src/components/site/SiteShell.tsx", "utf8");
const districtShell = readFileSync("src/components/district/DistrictPageShell.tsx", "utf8");
const schoolShell = readFileSync("src/components/school/SchoolPageShell.tsx", "utf8");
const ownerShell = readFileSync("src/components/owner/OwnerShell.tsx", "utf8");
const securityPage = readFileSync("src/routes/_authenticated/security.tsx", "utf8");

test("every authenticated page uses a shell with return navigation or redirects", () => {
  const routeFiles = readdirSync("src/routes/_authenticated").filter((name) =>
    name.endsWith(".tsx"),
  );
  for (const name of routeFiles) {
    const source = readFileSync(`src/routes/_authenticated/${name}`, "utf8");
    if (name === "partner-network.tsx") {
      assert.match(
        readFileSync("src/components/partner-network/PartnerNetworkPage.tsx", "utf8"),
        /<SiteShell>/,
      );
    } else if (name === "owner.index.tsx") {
      assert.match(
        readFileSync("src/components/owner/OwnerDashboardPage.tsx", "utf8"),
        /<OwnerShell/,
      );
    } else {
      assert.match(
        source,
        /SiteShell|FeatureShell|OwnerShell|SchoolPageShell|DistrictPageShell|SiteHeader|BackToDashboard|redirect\(/,
        `${name} should have return navigation or be a redirect`,
      );
    }
  }
});

test("shared signed-in tool shells expose the role's dashboard destination", () => {
  assert.match(siteShell, /<SiteHeader\s*\/>/);
  assert.match(districtShell, /<SiteHeader\s*\/>/);
  assert.match(schoolShell, /<SiteShell/);
  assert.match(securityPage, /<SiteShell>/);
  assert.match(header, /const dashboardHome = dashboardHomeForRoles\(roles, isPlatformAdmin\)/);
  assert.match(header, /to=\{dashboardHome\.to\}[\s\S]*?\{dashboardHome\.label\}/);
  assert.match(
    header,
    /<nav aria-label="Return to workspace"[\s\S]*?to=\{dashboardHome\.to\}[\s\S]*?\{dashboardHome\.label\}/,
  );
});

test("school and district breadcrumbs return to their own dashboards", () => {
  assert.match(schoolShell, /label: "School Dashboard", to: "\/school\/overview"/);
  assert.match(districtShell, /label: "District Dashboard", to: "\/district\/overview"/);
});

test("Owner Hub tools have a visible return link to the Owner Hub", () => {
  assert.match(
    ownerShell,
    /!isOwnerHubHome[\s\S]*?<Link[\s\S]*?to="\/owner"[\s\S]*?Back to Owner Hub/,
  );
  assert.match(ownerShell, /isOwnerHubHomePath\(location\.pathname\)/);
  assert.match(ownerShell, /n\.to === "\/owner" && isOwnerHubHome/g);
  assert.match(ownerShell, /to: "\/owner", label: "Owner Hub"/);
});
