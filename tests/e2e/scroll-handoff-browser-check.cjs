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
  const clickFile = path.join(root, 'tests/e2e/helpers/click-departure.ts');
  const clickBuild = await build({entryPoints:[clickFile],bundle:true,write:false,format:'cjs',platform:'node'});
  const clickModule = new Module(clickFile); clickModule._compile(clickBuild.outputFiles[0].text, clickFile);
  const {clickWithDeparturePosition} = clickModule.exports;
  const browser = await chromium.launch({headless:true,executablePath:process.env.DIRECTIONAL_SCROLL_BROWSER || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  try {
    const page = await browser.newPage();
    const requests = [];
    await page.route('**/*',route=>{
      requests.push(route.request().url());
      if(new URL(route.request().url()).hostname!=='handoff.fixture.test')return route.abort();
      return route.fulfill({contentType:'text/html',body:`<!doctype html><style>body{margin:0;height:4000px}a{position:fixed;bottom:20px}</style><a href='/guided'>Open Flow</a><script>const listeners=new Map();window.__TSR_ROUTER__=Object.freeze({subscribe:(type,callback)=>{listeners.set(type,callback);document.body.dataset.lifecycleObservers=String(listeners.size);return ()=>listeners.delete(type)}});const emit=(type,from)=>listeners.get(type)?.({fromLocation:{pathname:from}});document.querySelector('a').onclick=e=>{e.preventDefault();emit('onBeforeLoad',location.pathname);history.pushState({},'', '/guided');scrollTo(0,0);emit('onResolved','/source');emit('onRendered','/source')};addEventListener('popstate',()=>scrollTo(0,1200));</script>`});
    });
    process.env.STAGING_TEST_SCOPE=process.env.STAGING_TEST_SCOPE || 'scroll-diagnosis';
    await startScrollHandoffTrace(page);
    await page.goto('http://handoff.fixture.test/source?token=FICTIONAL_CANARY#private-fragment');
    if(['remaining-role-scroll','deep-role-history-return'].includes(process.env.STAGING_TEST_SCOPE))await page.waitForFunction(()=>document.body.dataset.lifecycleObservers==='3');
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
    assert(rows.every(r=>Object.keys(r).every(key=>['elapsedMs','event','maximum','pathname','y','fromPathname'].includes(key))));
    if(['remaining-role-scroll','deep-role-history-return'].includes(process.env.STAGING_TEST_SCOPE)){assert(rows.some(r=>r.event==='router:before-load'&&r.fromPathname==='/source'&&r.y===1200));assert(rows.some(r=>r.event==='router:rendered'&&r.fromPathname==='/source'&&r.y===0));}
    // Reproduce the hosted mismatch: focus scrolls after a pre-click reading.
    await page.getByRole('link',{name:'Open Flow'}).evaluate(element=>{
      element.blur();
      element.addEventListener('focus',()=>scrollTo(0,1700),{once:true});
    });
    const beforeClick = await page.evaluate(()=>scrollY);
    const departure = await clickWithDeparturePosition(page.getByRole('link',{name:'Open Flow'}));
    assert.equal(beforeClick,1200);
    assert.equal(departure.y,1700);
    assert.equal(new URL(departure.sourceHref).pathname,'/source');
    assert.equal(await page.evaluate(()=>location.pathname),'/guided');
    delete process.env.STAGING_TEST_SCOPE;
    const disabled = await browser.newPage();
    await startScrollHandoffTrace(disabled);
    let attached = false;
    await attachScrollHandoffTrace(disabled,{attach:async()=>{attached=true}});
    assert(!attached);
    console.log(JSON.stringify({passiveEvents:true,focusAwareDepartureY:1700,clickDepartureY:1200,backY:1200,queryAndHashExcluded:true,disabledOutsideDiagnostic:true,bounded:true,requests:requests.length}));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
