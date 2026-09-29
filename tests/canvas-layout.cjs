const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const [width,height,touch] of [[1440,1000,false],[800,1100,true],[1100,800,true],[390,844,true]]){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.evaluate(()=>{items[0].label='Layout restore';saveDraft()});await p.reload();
  assert.equal(await p.evaluate(()=>items[0].label),'Layout restore');
  for(const collapsed of [false,true]){
   await p.evaluate(collapsed=>document.body.classList.toggle('tools-collapsed',collapsed),collapsed);
   const current=await p.evaluate(()=>{
    const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
    msg('No status element');const aside=document.querySelector('aside');aside.scrollTop=100;
    return {canvas:rect('#drawing'),article:rect('article'),bottomPadding:parseFloat(getComputedStyle(document.querySelector('article')).paddingBottom),wrap:rect('.canvas-wrap'),toolbar:rect('#actions'),view:rect('#viewTools'),scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,sidebarOverflow:aside.scrollHeight>aside.clientHeight,sidebarScroll:aside.scrollTop,status:!!document.querySelector('#status'),help:!!document.querySelector('article>p')};
   });
   assert.equal(current.status,false);assert.equal(current.help,false);
   assert(current.canvas.height>0);assert(current.canvas.bottom<=height);assert(current.scrollWidth<=width);assert(current.scrollHeight<=height);
   assert(Math.abs(current.wrap.height-current.canvas.height-2)<1);
   if(!collapsed&&current.sidebarOverflow)assert(current.sidebarScroll>0);
   assert(Math.abs(current.canvas.bottom-(current.article.bottom-current.bottomPadding-1))<1);
   console.log(`PASS layout ${width}x${height} collapsed=${collapsed}: canvas ${current.canvas.height}, no overflow, sidebar scroll and restore`);
  }
  assert.deepEqual(errors,[]);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
