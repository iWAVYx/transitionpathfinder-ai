/**
 * Credential-free scroll acceptance for the actual getRouter configuration,
 * SmartLink and demo context hooks. Synthetic long pages replace the app tree;
 * persistence/error UI are stubbed. No production sessions or provider calls.
 * All browser requests are intercepted; other hosts are aborted.
 * Run: node tests/e2e/demo-navigation-browser-check.cjs
 * Set DEMO_NAVIGATION_QA_BROWSER_EXECUTABLE for a different Chrome binary.
 * Optionally set DEMO_NAVIGATION_QA_RESULT to save the JSON evidence.
 * This is not signed-in app-page or database acceptance.
 */
const path=require('path'); const fs=require('fs');
const root=path.resolve(__dirname, '../..');
const esbuild=require(root+'/node_modules/esbuild');const {chromium}=require(root+'/node_modules/playwright');
const tree=`import React from 'react';
import {createRootRoute,createRoute,Outlet,Link,useParams} from '@tanstack/react-router';
import {useDemoStudent} from '${root}/src/lib/demo/use-demo-student';
import {useDemoPlanningRole} from '${root}/src/lib/demo/use-demo-planning-role';
import {SmartLink} from '${root}/src/components/site/SmartLink';
function Dashboard(){const {role}=useParams({strict:false});const {profile}=useDemoStudent();return <main><h1>{role} Dashboard</h1><p>{profile.id}</p><Link data-testid="open-tool" style={{position:'fixed',bottom:16,left:16}} to="/demo/report" search={{role,student:profile.id}}>Open Report</Link><div style={{height:5000}}>Dashboard Content</div></main>}
function Report(){const {profile,setProfile}=useDemoStudent();const {role,setRole}=useDemoPlanningRole(profile.id);return <main><h1>Report: {role}:{profile.id}</h1><div style={{height:5000}}>Report Content</div><nav style={{position:'fixed',bottom:16,left:16,display:'flex',gap:8}}><button data-testid="sample" onClick={()=>setProfile('riley')}>Riley</button><button data-testid="role" onClick={()=>setRole(role==='educator'?'family':'educator')}>Change Role</button><SmartLink data-testid="return" to={'/demo/'+role} search={{student:profile.id}}>Return</SmartLink></nav></main>}
const base=createRootRoute({component:Outlet});export const routeTree=base.addChildren([createRoute({getParentRoute:()=>base,path:'/demo/$role',component:Dashboard}),createRoute({getParentRoute:()=>base,path:'/demo/report',component:Report})]);`;
(async()=>{
const result=await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {RouterProvider} from '@tanstack/react-router';import {getRouter} from '${root}/src/router';createRoot(document.getElementById('root')).render(<RouterProvider router={getRouter()}/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',platform:'browser',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixture',setup(b){b.onResolve({filter:/^\.\/routeTree\.gen$/},()=>({path:'tree',namespace:'fixture'}));b.onResolve({filter:/^\.\/pwa\/query-persistence$/},()=>({path:'persist',namespace:'fixture'}));b.onResolve({filter:/^\.\/components\/routing\/RouteErrorComponent$/},()=>({path:'error',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='tree'?tree:a.path==='persist'?'export function setupQueryPersistence(){}':'export function RouteErrorComponent(){return null}',loader:'tsx',resolveDir:root}));}}]});
const bundle=result.outputFiles[0].text;const browser=await chromium.launch({headless:true,executablePath:process.env.DEMO_NAVIGATION_QA_BROWSER_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});const results=[];
try{for(const width of [375,1280])for(const role of ['student','family','educator']){
const page=await browser.newPage({viewport:{width,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='navigation.fixture.test')return r.abort();return r.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>body{margin:0;font:16px sans-serif}nav,a,button{font:inherit}nav{background:white}</style></head><body><div id="root"></div><script>'+bundle.replace(/<\/script/g,'<\\/script')+'</script></body></html>'});});
await page.goto('http://navigation.fixture.test/demo/'+role+'?student=sam');await page.getByRole('heading',{name:role+' Dashboard'}).waitFor();await page.evaluate(()=>scrollTo(0,900));await page.waitForTimeout(80);await page.getByTestId('open-tool').click();await page.getByRole('heading',{name:'Report: '+role+':sam'}).waitFor();await page.waitForTimeout(100);let y=await page.evaluate(()=>scrollY);if(y!==0)throw Error('New report did not start at top '+y);
await page.evaluate(()=>scrollTo(0,1200));await page.getByTestId('sample').click();await page.getByRole('heading',{name:'Report: '+role+':riley'}).waitFor();await page.waitForTimeout(80);y=await page.evaluate(()=>scrollY);if(y!==1200)throw Error('Sample reset scroll '+y);
await page.getByTestId('role').click();const next=role==='educator'?'family':'educator';await page.getByRole('heading',{name:'Report: '+next+':riley'}).waitFor();await page.waitForTimeout(80);y=await page.evaluate(()=>scrollY);if(y!==1200)throw Error('Role reset scroll '+y);
await page.goBack();await page.getByRole('heading',{name:'Report: '+role+':riley'}).waitFor();await page.goBack();await page.getByRole('heading',{name:'Report: '+role+':sam'}).waitFor();await page.waitForTimeout(80);y=await page.evaluate(()=>scrollY);if(y!==1200)throw Error('Report history did not restore '+y);
await page.getByTestId('return').click();await page.getByRole('heading',{name:role+' Dashboard'}).waitFor();await page.waitForTimeout(100);y=await page.evaluate(()=>scrollY);if(y!==900)throw Error('Dashboard return did not restore '+y+' '+await page.evaluate(()=>JSON.stringify({url:location.href,storage:Object.entries(sessionStorage)})));
await page.goBack();await page.getByRole('heading',{name:'Report: '+role+':sam'}).waitFor();await page.waitForTimeout(80);y=await page.evaluate(()=>scrollY);if(y!==1200)throw Error('Return back did not restore report '+y);
await page.goForward();await page.getByRole('heading',{name:role+' Dashboard'}).waitFor();await page.waitForTimeout(80);y=await page.evaluate(()=>scrollY);if(y!==900)throw Error('Return forward did not restore dashboard '+y);
if(errors.length)throw Error(errors.join(';'));results.push({width,role,dashboardScroll:900,reportScroll:1200,passed:true});await page.close();
}if(process.env.DEMO_NAVIGATION_QA_RESULT)fs.writeFileSync(process.env.DEMO_NAVIGATION_QA_RESULT,JSON.stringify(results,null,2));console.log(JSON.stringify(results));}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
