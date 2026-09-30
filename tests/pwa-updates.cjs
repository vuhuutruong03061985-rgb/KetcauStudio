const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {chromium}=require('../.test-tools/node_modules/playwright');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');assert.equal(manifest.icons.length,2);
 const sw=fs.readFileSync('sw.js','utf8');assert(!sw.includes('skipWaiting('));assert(!sw.includes('/bridge-info'));assert(!sw.includes('/insert-word'));
 let version='v3',fail=false,workerRequests=0;
 const server=http.createServer((req,res)=>{const pathname=new URL(req.url,'http://local').pathname;const file=pathname==='/'?'index.html':pathname.slice(1);
  if(!['index.html','sw.js','manifest.webmanifest'].includes(file)&&!file.startsWith('assets/')){res.writeHead(404);return res.end()}
  if(file==='sw.js')workerRequests++;
  if(fail&&file==='assets/calculator.js'){res.writeHead(503);return res.end()}
  try{let body=fs.readFileSync(file);if(file==='sw.js'||file==='assets/tablet.js')body=Buffer.from(body.toString().replaceAll('shell-v4','shell-'+version));res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':file.endsWith('.webmanifest')?'application/manifest+json':file.endsWith('.png')?'image/png':'image/svg+xml');res.end(body)}catch{res.writeHead(404);res.end()}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext();let p=await context.newPage();const url='http://127.0.0.1:'+server.address().port+'/';await p.goto(url);
 await p.waitForFunction(()=>document.querySelector('#pwaStatus')?.dataset.state==='ready');assert((await p.locator('#pwaStatus').innerText()).includes('shell-v3'));
 const keys=await p.evaluate(async()=> (await (await caches.open('ket-cau-studio-shell-v3')).keys()).map(r=>new URL(r.url).pathname));
 for(const file of ['index.html','assets/app.css','assets/app.js','assets/tablet.js','assets/calculator.js','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png'])assert(keys.includes('/'+file));
 await p.evaluate(async()=>{await caches.open('other-app-cache');await caches.open('ket-cau-studio-user-documents');await caches.open('ket-cau-studio-equation-space-v2');await caches.open('ket-cau-studio-shell-v1')});
 await context.setOffline(true);await p.close();p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>document.querySelector('#pwaStatus')?.dataset.state==='ready');assert(await p.locator('#drawing').isVisible());await context.setOffline(false);
 await p.evaluate(()=>{window.auditSentinel='unchanged';savedDocument=documentText()});const snapshot=await p.evaluate(()=>({text:documentText(),past:JSON.stringify(past),saved:savedDocument}));
 version='v4';const requests=workerRequests;await p.evaluate(()=>window.dispatchEvent(new Event('online')));await p.waitForFunction(()=>document.querySelector('#pwaStatus')?.dataset.state==='update');assert(workerRequests>requests);assert.equal(await p.evaluate(()=>window.auditSentinel),'unchanged');assert.deepEqual(await p.evaluate(()=>({text:documentText(),past:JSON.stringify(past),saved:savedDocument})),snapshot);
 assert((await p.locator('#pwaStatus').innerText()).includes('shell-v3'));assert(await p.evaluate(()=>caches.has('ket-cau-studio-shell-v3')));
 await p.close();p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>document.querySelector('#pwaStatus')?.textContent.includes('shell-v4')&&document.querySelector('#pwaStatus').dataset.state==='ready');
 const names=await p.evaluate(()=>caches.keys());assert(names.includes('other-app-cache'));assert(names.includes('ket-cau-studio-user-documents'));assert(!names.includes('ket-cau-studio-shell-v3'));assert(!names.includes('ket-cau-studio-shell-v1'));assert(!names.includes('ket-cau-studio-equation-space-v2'));
 version='v5';fail=true;await p.evaluate(async()=>{await pwaRegistration.update();const w=pwaRegistration.installing;if(w)await new Promise(r=>{w.addEventListener('statechange',()=>{if(w.state==='redundant'||w.state==='installed')r()})})});assert.equal(await p.evaluate(()=>pwaRegistration.waiting),null);assert(await p.evaluate(()=>caches.has('ket-cau-studio-shell-v4')));
 await context.setOffline(true);await p.close();p=await context.newPage();await p.goto(url);await p.waitForFunction(()=>document.querySelector('#pwaStatus')?.dataset.state==='ready');assert((await p.locator('#pwaStatus').innerText()).includes('shell-v4'));assert(await p.locator('#drawing').isVisible());
 console.log('PASS manifest/full shell; first install; offline fresh page; A -> B waiting without reload/history changes; online update; activation/targeted cleanup; failed C install retains B; offline B startup');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});
