/** Offline shared-router check. Synthetic pages, actual scroll/Lenis components;
 * every request intercepted, no sessions/backend/provider or hosted acceptance. */
const path = require('node:path');
const fs = require('node:fs');
const { build } = require('esbuild');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const renderedCancellation = process.env.DIRECTIONAL_SCROLL_RENDERED_CANCEL === '1';
const pendingCancellation = process.env.DIRECTIONAL_SCROLL_PENDING_CANCEL === '1';
(async () => {
  const tree = `import React from 'react';import {createRootRoute,createRoute,Outlet,Link,useRouter,useRouterState} from '@tanstack/react-router';import {ScrollToTop} from '${root}/src/components/site/ScrollToTop';import {SmoothScroll} from '${root}/src/components/effects/SmoothScroll';function Source(){const [ready,setReady]=React.useState(false);React.useEffect(()=>{const t=setTimeout(()=>setReady(true),400);return ()=>clearTimeout(t)},[]);return <main><h1>Source</h1><div style={{height:ready?5000:200}}/><Link style={{position:'fixed',bottom:20,left:20}} to='/guided'>Open Guided Flow</Link><Link style={{position:'fixed',bottom:20,left:200}} to='/guided' hash='focus'>Open Focused Flow</Link></main>}function Guided(){const router=useRouter();const [ready,setReady]=React.useState(false);React.useEffect(()=>{const t=setTimeout(()=>setReady(true),250);return ()=>clearTimeout(t)},[]);if(${renderedCancellation ? 'true' : 'false'}&&!ready)return <main><h1>Preparing Guided Flow</h1></main>;return <main><h1>Guided Flow</h1><div style={{height:1500}}/><h2 id='focus'>Focused Content</h2><div style={{height:3500}}/><button style={{position:'fixed',bottom:20,left:20}} onClick={()=>router.history.back()}>Return</button></main>}function PendingReturn(){const router=useRouter();const pathname=useRouterState({select:s=>s.location.pathname});return pathname==='/guided'?<button style={{position:'fixed',top:10,left:10}} onClick={()=>router.history.back()}>Cancel Loading Tool</button>:null}function Root(){const router=useRouter();const [revision,setRevision]=React.useState(0);React.useEffect(()=>router.history.subscribe(({action})=>{if(${renderedCancellation ? 'true' : 'false'}&&(action.type==='BACK'||action.type==='GO'))setTimeout(()=>setRevision(value=>value+1),50)}),[router]);return <React.Fragment key='root'><span hidden>{revision}</span><SmoothScroll/><ScrollToTop/><PendingReturn/><Outlet/></React.Fragment>}const base=createRootRoute({component:Root});export const routeTree=base.addChildren([createRoute({getParentRoute:()=>base,path:'/',beforeLoad:()=>new Promise(resolve=>setTimeout(resolve,250)),component:Source}),createRoute({getParentRoute:()=>base,path:'/dashboard',beforeLoad:()=>new Promise(resolve=>setTimeout(resolve,250)),component:Source}),createRoute({getParentRoute:()=>base,path:'/guided',${pendingCancellation ? 'beforeLoad:()=>new Promise(resolve=>setTimeout(resolve,1500)),' : ''}component:Guided})]);`;
  const result = await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {RouterProvider} from '@tanstack/react-router';import {getRouter} from '${root}/src/router';createRoot(document.getElementById('root')).render(<RouterProvider router={getRouter()}/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture',setup(b){if(renderedCancellation)b.onLoad({filter:/[/\\]Transitioner\.(js|tsx)$/},a=>{const original=fs.readFileSync(a.path,'utf8');const needle='acknowledgement.push(expected, resolve)';if(!original.includes(needle))throw Error('Fixture cannot locate render acknowledgement');return {contents:original.replace(needle,"acknowledgement.push(expected, rendered => { if(rendered && expected?.some(match => match.pathname === '/guided')) setTimeout(() => resolve(rendered), 1500); else resolve(rendered); })"),loader:a.path.endsWith('.tsx')?'tsx':'js',resolveDir:path.dirname(a.path)}});if(process.env.DIRECTIONAL_SCROLL_INTENT)b.onResolve({filter:/use-navigation-scroll-intent$/},()=>({path:'intent',namespace:'fixture'}));if(process.env.DIRECTIONAL_SCROLL_COMPONENT)b.onResolve({filter:/src\/components\/site\/ScrollToTop$/},()=>({path:'baseline',namespace:'fixture'}));b.onResolve({filter:/^\.\/routeTree\.gen$/},()=>({path:'tree',namespace:'fixture'}));b.onResolve({filter:/^\.\/pwa\/query-persistence$/},()=>({path:'persist',namespace:'fixture'}));b.onResolve({filter:/^\.\/components\/routing\/RouteErrorComponent$/},()=>({path:'error',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='intent'?fs.readFileSync(process.env.DIRECTIONAL_SCROLL_INTENT,'utf8'):a.path==='baseline'?fs.readFileSync(process.env.DIRECTIONAL_SCROLL_COMPONENT,'utf8'):a.path==='tree'?tree:a.path==='error'?'export function RouteErrorComponent(){return null}':'export function setupQueryPersistence(){}',loader:'tsx',resolveDir:root}));}}]});
  const browser = await chromium.launch({headless:true,executablePath:process.env.DIRECTIONAL_SCROLL_BROWSER || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const rows=[];
  try {
    for (const width of [390,1440]) for (const source of ['/', '/dashboard']) {
      const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('fixture page error:',e.message)});console.log('Checking',width,source);
      await page.route('**/*',route=>new URL(route.request().url()).hostname==='scroll.fixture.test'?route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}a,button{background:white;z-index:10}</style><div id="root"></div><script>'+result.outputFiles[0].text.replace(/<\/script/g,'<\\/script')+'</script>'}):route.abort());
      const at=async target=>{
        const deadline=Date.now()+10000;let matches=0;let actual;
        while(Date.now()<deadline){
          actual=await page.evaluate(()=>scrollY);
          matches=Math.abs(actual-target)<=2?matches+1:0;
          if(matches>=3)return;
          await new Promise(resolve=>setTimeout(resolve,100));
        }
        throw Error('Expected scroll '+target+' actual '+actual+' across three samples');
      };
      await page.goto('http://scroll.fixture.test'+source);await page.getByRole('heading',{name:'Source',exact:true}).waitFor();await page.waitForFunction(()=>document.documentElement.scrollHeight>=5000);
      await page.evaluate(()=>scrollTo(0,1100));await at(1100);
      await page.getByRole('link',{name:'Open Guided Flow',exact:true}).click();
      if(renderedCancellation){
        // Match the hosted handoff: the receiving tool is visible while its
        // render acknowledgement is pending and resolvedLocation is still source.
        await page.getByRole('heading',{name:'Guided Flow',exact:true}).waitFor();
        await page.waitForFunction(expected=>window.__TSR_ROUTER__.state.resolvedLocation?.pathname===expected,source);
        if(await page.evaluate(()=>scrollY)!==0)throw Error('The short loading shell must clamp the visible tool to top');
        await page.getByRole('button',{name:'Return',exact:true}).click();
      }else if(pendingCancellation){
        await page.getByRole('button',{name:'Cancel Loading Tool',exact:true}).waitFor();
        // Observe the deliberately slow route between request and commit.
        await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,300)));
        await page.getByRole('heading',{name:'Source',exact:true}).waitFor();
        const pendingY=await page.evaluate(()=>scrollY);
        if(pendingY!==1100)throw Error('Pending navigation scrolled the departure page: '+pendingY);
        await page.getByRole('button',{name:'Cancel Loading Tool',exact:true}).click();
      }else{
        await page.getByRole('heading',{name:'Guided Flow',exact:true}).waitFor();await at(0);
        await page.evaluate(()=>scrollTo(0,900));await at(900);await page.getByRole('button',{name:'Return',exact:true}).click();
      }
      await page.getByRole('heading',{name:'Source',exact:true}).waitFor();await at(1100);
      await page.goForward();await page.getByRole('heading',{name:'Guided Flow',exact:true}).waitFor();await at(0);
      await page.goBack();await page.getByRole('heading',{name:'Source',exact:true}).waitFor();await at(1100);
      await page.getByRole('link',{name:'Open Guided Flow',exact:true}).click();await page.getByRole('heading',{name:'Guided Flow',exact:true}).waitFor();await at(0);
      await page.goBack();await page.getByRole('heading',{name:'Source',exact:true}).waitFor();await at(1100);
      await page.getByRole('link',{name:'Open Focused Flow',exact:true}).click();await page.getByRole('heading',{name:'Focused Content',exact:true}).waitFor();await page.waitForFunction(()=>Math.abs(document.getElementById('focus').getBoundingClientRect().top-112)<=2);
      if(errors.length)throw Error(errors.join(';'));rows.push({width,source,pendingDeparture:pendingCancellation?1100:undefined,newPage:0,browserForward:0,back:1100,reopenedPage:0,anchorOffset:112,passed:true});await page.close();
    }
    if(process.env.DIRECTIONAL_SCROLL_RESULT)fs.writeFileSync(process.env.DIRECTIONAL_SCROLL_RESULT,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
