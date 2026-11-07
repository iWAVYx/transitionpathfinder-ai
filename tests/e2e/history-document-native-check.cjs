/**
 * Credential-free native history document fixtures. Bundles the actual shared
 * HistoryDocument/print styles with a synthetic dialog wrapper and local data.
 * All requests are intercepted for approved local assets; other hosts abort.
 * Checks 375/1280 screen overflow and negative print alignment; saves PDFs/JSON.
 * No signed-in browser, server/auth/RLS acceptance or real print-dialog automation.
 * Run node tests/e2e/history-document-native-check.cjs; set HISTORY_NATIVE_QA_DIR,
 * HISTORY_NATIVE_SAMPLE_PDF and HISTORY_NATIVE_BROWSER_EXECUTABLE as needed.
 */
const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname,'../..');
const req=require('node:module').createRequire(root+'/package.json');
const qa=process.env.HISTORY_NATIVE_QA_DIR||path.join(require('node:os').tmpdir(),'transitionforward-history-native');
const sampleOutput=process.env.HISTORY_NATIVE_SAMPLE_PDF||path.join(qa,'sample-history.pdf');fs.mkdirSync(path.dirname(sampleOutput),{recursive:true});fs.mkdirSync(qa,{recursive:true});
(async()=>{
const bundle=await req('esbuild').build({stdin:{contents:"export {HistoryDocument} from './src/components/history/HistoryDocument';export {demoHistoryRecords} from './src/lib/demo/history-sample';",resolveDir:root,loader:'tsx'},bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',external:['react','react-dom','react/jsx-runtime'],alias:{'@':root+'/src'}});
const mod={exports:{}};new Function('module','exports','require',bundle.outputFiles[0].text)(mod,mod.exports,req);
const React=req('react'),{renderToStaticMarkup}=req('react-dom/server');
const compiler=await req('@tailwindcss/node').compile(fs.readFileSync(root+'/src/styles.css','utf8'),{base:root+'/src',from:root+'/src/styles.css',onDependency:()=>{}});
const scanner=new(req('@tailwindcss/oxide').Scanner)({sources:compiler.sources});const css=compiler.build(scanner.scan());
const sample=mod.exports.demoHistoryRecords('Sam Alvarez');
const long={student:{first_name:'Fictional Student With A Long Name',last_name:'Équipe Sample'},workspace_scope:'district',entries:Array.from({length:60},(_,n)=>({created_at:'2026-10-13T15:00:00.123456Z',action:`fixture_event_${String(n+1).padStart(3,'0')}`,entity_type:'document',recorded_by:`fictional-contact-${String(n+1).padStart(3,'0')}-${'extended'.repeat(14)}@example.invalid`}))};
const browser=await req('playwright').chromium.launch({executablePath:process.env.HISTORY_NATIVE_BROWSER_EXECUTABLE||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined),headless:true});
const results=[];try{
 const page=await browser.newPage();
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='history-export-fixture.test')return route.abort();const file=u.pathname.startsWith('/@fontsource')?root+'/node_modules'+u.pathname:root+'/public'+u.pathname;return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':file.endsWith('.woff2')?'font/woff2':'application/octet-stream'}):route.abort();});
 for(const [name,records] of [['sample',sample],['long',long]]){
 const context={filter:'all',loadedCount:records.entries.length,olderAvailable:name==='long',exportedAt:'2026-10-13T16:00:00Z',sample:true};
 const body=renderToStaticMarkup(React.createElement(mod.exports.HistoryDocument,{records,context}));
 const html='<html><head><title>TransitionForward Activity History - Fictional Sample</title><base href="http://history-export-fixture.test"><style>'+css+'</style></head><body><div id="app-root"><h1>Site Navigation Must Not Print</h1><div style="height:5000px">Background History Must Not Print</div></div><div data-history-print-preview class="fixed left-[50%] top-[50%] z-50 grid w-[94vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-4 max-h-[90vh] overflow-y-auto"><div>Activity History Preview</div><button>Print Controls Must Not Print</button>'+body+'</div></body></html>';
 await page.setContent(html);await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
 if(name==='sample')for(const width of [375,1280]){await page.setViewportSize({width,height:1100});const overflow=await page.evaluate(()=>{const e=document.querySelector('[data-history-document]');return e.scrollWidth>e.clientWidth;});if(overflow)throw Error('Document horizontal overflow at '+width);await page.screenshot({path:qa+`/screen-${width}.png`,fullPage:false});}
 await page.emulateMedia({media:'print'});const pdf=name==='sample'?sampleOutput:qa+'/long-history.pdf';await page.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
 const measures=await page.evaluate(()=>Array.from(document.querySelectorAll('[data-history-document] h1,[data-history-document] h2,[data-history-document] td')).slice(0,8).map(e=>({tag:e.tagName,font:getComputedStyle(e).fontSize,x:e.getBoundingClientRect().x})));
 if(measures.some(m=>m.x < -1)) throw Error("Negative print alignment");results.push({name,pdf,rows:records.entries.length,measures});await page.emulateMedia({media:'screen'});
 }
 fs.writeFileSync(qa+'/evidence.json',JSON.stringify(results,null,2));
}finally{await browser.close();}
})();
