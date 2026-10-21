/** Offline verification of passive diagnostic capture; no hosted requests/sessions. */
const path = require('node:path');
const assert = require('node:assert/strict');
const Module = require('node:module');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
(async () => {
  const file = path.join(root, 'tests/e2e/helpers/scroll-handoff.ts');
  const built = await build({entryPoints:[file],bundle:true,write:false,format:'cjs',platform:'node'});
  const module = new Module(file); module._compile(built.outputFiles[0].text, file);
  const {startScrollHandoffTrace,attachScrollHandoffTrace} = module.exports;
  const browser = await chromium.launch({headless:true,executablePath:process.env.DIRECTIONAL_SCROLL_BROWSER || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page = await browser.newPage();
    const requests = [];
    await page.route('**/*',route=>{
      requests.push(route.request().url());
      if(new URL(route.request().url()).hostname!=='handoff.fixture.test')return route.abort();
      return route.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;height:4000px}a{position:fixed;bottom:20px}</style><a href='/guided'>Open Flow</a><script>document.querySelector('a').onclick=e=>{e.preventDefault();history.pushState({},'', '/guided');scrollTo(0,0)};addEventListener('popstate',()=>scrollTo(0,1200));</script>`});
    });
    process.env.STAGING_TEST_SCOPE='scroll-diagnosis';
    await startScrollHandoffTrace(page);
    await page.goto('http://handoff.fixture.test/source?token=FICTIONAL_CANARY#private-fragment');
    await page.evaluate(()=>scrollTo(0,1200));
    await page.waitForFunction(()=>scrollY===1200);
    await page.getByRole('link',{name:'Open Flow'}).click();
    await page.waitForFunction(()=>location.pathname==='/guided'&&scrollY===0);
    await page.goBack();
    await page.waitForFunction(()=>location.pathname==='/source'&&scrollY===1200);
    // Let the passive frame observers run after the synthetic app's pop handler.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    let rows;
    await attachScrollHandoffTrace(page,{attach:async(_,value)=>{rows=JSON.parse(value.body)}});
    assert(rows.some(r=>r.event==='click'&&r.pathname==='/source'&&r.y===1200));
    assert(rows.some(r=>r.event.startsWith('popstate:frame')&&r.pathname==='/source'&&r.y===1200));
    assert(rows.length<=200);
    assert(!JSON.stringify(rows).includes('FICTIONAL_CANARY'));
    assert(!JSON.stringify(rows).includes('private-fragment'));
    assert(rows.every(r=>Object.keys(r).sort().join(',')==='elapsedMs,event,maximum,pathname,y'));
    delete process.env.STAGING_TEST_SCOPE;
    const disabled = await browser.newPage();
    await startScrollHandoffTrace(disabled);
    let attached = false;
    await attachScrollHandoffTrace(disabled,{attach:async()=>{attached=true}});
    assert(!attached);
    console.log(JSON.stringify({passiveEvents:true,clickDepartureY:1200,backY:1200,queryAndHashExcluded:true,disabledOutsideDiagnostic:true,bounded:true,requests:requests.length}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
