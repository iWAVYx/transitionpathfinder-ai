/** Offline navigation fixture: actual router, organizational selection hooks and role navs.
 * Synthetic readers/pages replace the app tree. All requests are intercepted; no sessions/providers.
 * Checks URL selection and scroll restoration, not signed-in permissions or real-page layout.
 */
const path = require("path");
const fs = require("fs");
const root = path.resolve(__dirname, "../..");
const esbuild = require(root + "/node_modules/esbuild");
const { chromium } = require(root + "/node_modules/playwright");
const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const tree = `import React from 'react';
import {createRootRoute,createRoute,Outlet} from '@tanstack/react-router';
import {useOrganizationDashboardSelection} from '${root}/src/hooks/use-organization-dashboard-selection';
import {schoolDashboardNavigation,districtDashboardNavigation} from '${root}/src/lib/organization-dashboard-navigation';
import {SchoolNav} from '${root}/src/components/school/SchoolNav';
import {DistrictNav} from '${root}/src/components/district/DistrictNav';
function Page({role,tool}){const reader=useOrganizationDashboardSelection(role,async id=>({id:id||'${A}'}),data=>data.id,'Could not load fixture');const Nav=role==='school'?SchoolNav:DistrictNav;return <main><h1>{role+' '+(tool?'Tool':'Dashboard')}</h1><output data-testid="context">{reader.data?.id}</output><div style={{position:'fixed',bottom:16,left:16,background:'white'}}><Nav/><button data-testid="switch" onClick={()=>reader.reload('${B}')}>Switch</button></div><div style={{height:5000}}>Synthetic Content</div></main>}
const base=createRootRoute({component:Outlet});export const routeTree=base.addChildren(['school','district'].flatMap(role=>['overview','team'].map(page=>createRoute({getParentRoute:()=>base,path:'/'+role+'/'+page,...(role==='school'?schoolDashboardNavigation:districtDashboardNavigation),component:()=> <Page key={role+page} role={role} tool={page==='team'}/>}))));`;
(async () => {
  const result = await esbuild.build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {RouterProvider} from '@tanstack/react-router';import {getRouter} from '${root}/src/router';createRoot(document.getElementById('root')).render(<RouterProvider router={getRouter()}/>);`,
      resolveDir: root,
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "fixture",
        setup(b) {
          b.onResolve({ filter: /^\.\/routeTree\.gen$/ }, () => ({
            path: "tree",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^\.\/pwa\/query-persistence$/ }, () => ({
            path: "persist",
            namespace: "fixture",
          }));
          b.onResolve({ filter: /^\.\/components\/routing\/RouteErrorComponent$/ }, () => ({
            path: "error",
            namespace: "fixture",
          }));
          b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
            contents:
              a.path === "tree"
                ? tree
                : a.path === "persist"
                  ? "export function setupQueryPersistence(){}"
                  : "export function RouteErrorComponent(){return null}",
            loader: "tsx",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const bundle = result.outputFiles[0].text;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.ORGANIZATION_NAVIGATION_QA_BROWSER_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const results = [];
  try {
    for (const width of [375, 1280])
      for (const role of ["school", "district"]) {
        const page = await browser.newPage({ viewport: { width, height: 800 } });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.route("**/*", (request) => {
          if (new URL(request.request().url()).hostname !== "organization.fixture.test")
            return request.abort();
          return request.fulfill({
            contentType: "text/html",
            body:
              '<!doctype html><html><head><style>body{margin:0;font:16px sans-serif}</style></head><body><div id="root"></div><script>' +
              bundle.replace(/<\/script/g, "<\\/script") +
              "</script></body></html>",
          });
        });
        const key = role === "school" ? "org_id" : "district_id";
        const start = "http://organization.fixture.test/" + role + "/overview?" + key + "=" + A;
        await page.goto(start);
        await page.waitForFunction(
          (id) => document.querySelector('[data-testid="context"]')?.textContent === id,
          A,
        );
        await page.evaluate(() => scrollTo(0, 900));
        await page.waitForTimeout(80);
        await page
          .getByRole("link", {
            name:
              role === "school"
                ? "School navigation: Staff & Team"
                : "District navigation: People & Access",
            exact: true,
          })
          .click();
        await page.getByRole("heading", { name: role + " Tool", exact: true }).waitFor();
        await page.waitForFunction(
          (id) => document.querySelector('[data-testid="context"]')?.textContent === id,
          A,
        );
        await page.waitForTimeout(80);
        if (new URL(page.url()).searchParams.get(key) !== A) throw Error("Tool lost organization");
        await page.evaluate(() => scrollTo(0, 1200));
        await page.getByTestId("switch").click();
        await page.waitForFunction(
          (id) => document.querySelector('[data-testid="context"]')?.textContent === id,
          B,
        );
        await page.waitForTimeout(80);
        if ((await page.evaluate(() => scrollY)) !== 1200) throw Error("Selection changed scroll");
        await page.goBack();
        await page.waitForFunction(
          (id) => document.querySelector('[data-testid="context"]')?.textContent === id,
          A,
        );
        await page.waitForTimeout(80);
        await page
          .getByRole("link", {
            name:
              role === "school"
                ? "School navigation: Overview"
                : "District navigation: District Overview",
            exact: true,
          })
          .click();
        await page.getByRole("heading", { name: role + " Dashboard", exact: true }).waitFor();
        await page.waitForTimeout(100);
        if (page.url() !== start || (await page.evaluate(() => scrollY)) !== 900)
          throw Error("Dashboard return did not restore exact location");
        await page.goBack();
        await page.getByRole("heading", { name: role + " Tool", exact: true }).waitFor();
        await page.waitForTimeout(100);
        if ((await page.evaluate(() => scrollY)) !== 1200) throw Error("Tool back scroll failed");
        await page.goForward();
        await page.getByRole("heading", { name: role + " Dashboard", exact: true }).waitFor();
        await page.waitForTimeout(100);
        if ((await page.evaluate(() => scrollY)) !== 900)
          throw Error("Dashboard forward scroll failed");
        await page.reload();
        await page.waitForFunction(
          (id) => document.querySelector('[data-testid="context"]')?.textContent === id,
          A,
        );
        if (new URL(page.url()).searchParams.get(key) !== A)
          throw Error("Refresh lost organization");
        if (errors.length) throw Error(errors.join(";"));
        results.push({ width, role, dashboardScroll: 900, toolScroll: 1200, passed: true });
        await page.close();
      }
    if (process.env.ORGANIZATION_NAVIGATION_QA_RESULT)
      fs.writeFileSync(
        process.env.ORGANIZATION_NAVIGATION_QA_RESULT,
        JSON.stringify(results, null, 2),
      );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
