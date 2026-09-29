const assert=require('node:assert/strict');
(async()=>{
 const root='http://localhost:18767';
 const infoResponse=await fetch(root+'/bridge-info');
 assert.equal(infoResponse.status,200);assert.equal(infoResponse.headers.get('cache-control'),'no-store');
 const info=await infoResponse.json();assert.match(info.token,/^[0-9a-f]{32}$/);
 for(const [file,type]of [['/','text/html'],['/assets/app.js','text/javascript'],['/assets/tablet.js','text/javascript'],['/assets/app.css','text/css'],['/sw.js','text/javascript'],['/manifest.webmanifest','application/manifest+json'],['/assets/icon-192.png','image/png']]){
  const r=await fetch(root+file);assert.equal(r.status,200,file);assert(r.headers.get('content-type').includes(type),file);
 }
 assert.equal((await fetch(root+'/Word-Bridge.ps1')).status,404);
 assert.equal((await fetch(root+'/archive/before-tablet-20260913/index.html')).status,404);
 const rejected=await fetch(root+'/insert-word',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"png":""}'});
 assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/token/i);
 const malformed=await fetch(root+'/insert-word',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':info.token},body:'{"png":"AA=="}'});
 assert.equal(malformed.status,400);assert.match((await malformed.json()).error,/PNG/i);
 console.log('PASS real PowerShell bridge: static routes, MIME types, no-store token, private paths, invalid token/PNG rejected before Word access');
})().catch(e=>{console.error(e);process.exitCode=1});
