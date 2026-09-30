'use strict';
const CACHE='ket-cau-studio-shell-v4';
const SHELL=['./','./index.html','./assets/app.css','./assets/app.js','./assets/tablet.js','./assets/calculator.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('ket-cau-studio-shell-')||key==='ket-cau-studio-equation-space-v2')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
 const allowed=SHELL.map(path=>new URL(path,self.registration.scope).pathname);
 // Do not cache Word credentials, API responses, documents or arbitrary paths.
 if(!allowed.includes(url.pathname))return;
 const key=new Request(url.origin+url.pathname);
 event.respondWith(caches.open(CACHE).then(async cache=>{
  const cached=await cache.match(key);
  return cached||fetch(event.request);
 }));
});

// Readiness is verified against the active worker's complete shell, not navigator.onLine.
self.addEventListener('message',event=>{
 if(event.data?.type!=='OFFLINE_STATUS'||!event.ports[0])return;
 event.waitUntil(caches.open(CACHE).then(async cache=>{
  const ready=(await Promise.all(SHELL.map(path=>cache.match(new URL(path,self.registration.scope).href)))).every(Boolean);
  event.ports[0].postMessage({cache:CACHE,ready});
 }).catch(()=>event.ports[0].postMessage({cache:CACHE,ready:false})));
});
