const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 for(const count of [1,10]){
  await p.evaluate(n=>{items=Array.from({length:n},(_,i)=>make('person',100+i*30,120));render()},count);
  for(let i=0;i<3;i++){
   assert.equal(await p.locator('defs #personSymbol').count(),1);assert.equal(await p.locator('use[href="#personSymbol"]').count(),count);
   assert.deepEqual(await p.locator('#personSymbol').evaluate(s=>[...s.children].map(n=>n.tagName)),['circle','line','line','line','line','line']);
   assert.equal(await p.locator('#personSymbol circle').getAttribute('cx'),'0');assert.equal(await p.locator('#personSymbol circle').getAttribute('cy'),'0');
   assert.equal(await p.locator('image').count(),0);await p.evaluate(()=>render());
  }
 }
 const result=await p.evaluate(async()=>{
  const text=exportSVG(),doc=new DOMParser().parseFromString(text,'image/svg+xml');
  const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(text);await img.decode();
  const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=720;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
  const pixels=ctx.getImageData(88,114,25,49).data;let dark=0;for(let i=0;i<pixels.length;i+=4)if(pixels[i]<100&&pixels[i+1]<100&&pixels[i+2]<100&&pixels[i+3]>0)dark++;
  return {symbols:doc.querySelectorAll('symbol#personSymbol').length,uses:doc.querySelectorAll('use[href="#personSymbol"]').length,dark};
 });assert.equal(result.symbols,1);assert.equal(result.uses,10);assert(result.dark>30);assert.deepEqual(errors,[]);
 console.log('PASS person shared symbol, 1/10 instances, repeat render, local head origin, no raster asset and standalone SVG rasterization');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
