'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),records=[];
 const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
 try{
  for(const viewport of [{width:1280,height:800},{width:800,height:1280},{width:1024,height:768},{width:980,height:650}]){
   const p=await browser.newPage({viewport,hasTouch:true,isMobile:true});await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginLoadNumericInput==='function');
   // Sweep the actual numeric adapter independently of reference geometry.
   await p.evaluate(()=>{cancelToSelection();items=[];snapEnabled=false;setMode('force');const q=new DOMPoint(400,300).matrixTransform(svg.getScreenCTM());beginLoadPlacement({clientX:q.x,clientY:q.y,pointerType:'touch'})});
   for(const x of [30,100,300,viewport.width-100,viewport.width-30])for(const y of [140,220,350,450,500,600,viewport.height-100]){
    await p.evaluate(({x,y})=>updateDynamicInput({clientX:x,clientY:y}),{x,y});await p.waitForTimeout(80);
    const r=await p.evaluate(({x,y,viewport})=>{
     const rect=id=>$(id).getBoundingClientRect().toJSON(),visible=id=>{const e=$(id),r=e.getBoundingClientRect();return !e.hidden&&getComputedStyle(e).display!=='none'&&r.width>0&&r.height>0};
     return {x,y,viewport,primary:document.body.dataset.radialPrimary,input:rect('dynamicInput'),keypad:rect('tabletNumericKeypad'),drawing:rect('drawing'),chrome:['tabletTopBar','tabletBottomLeftBar','tabletBottomRightBar'].map(rect),fallback:visible('commandRibbon')||visible('toggleTools'),menus:[leftDrawingMenu,rightCommandMenu].map(m=>({fits:m.layout.fits,bounds:m===leftDrawingMenu?leftDrawingBounds():rightCommandBounds()}))};
    },{x,y,viewport});records.push(r);
    assert.equal(r.primary,'true');assert.equal(r.fallback,false);assert(r.menus.every(m=>m.fits));
    for(const box of [r.input,r.keypad]){assert(box.left>=0&&box.top>=0&&box.right<=viewport.width+.1&&box.bottom<=viewport.height+.1);for(const chrome of r.chrome)assert.equal(overlap(box,chrome),0)}
    assert(r.input.top>=r.drawing.top);assert.equal(overlap(r.input,r.keypad),0);
   }
   await p.close();
  }
  const small=await browser.newPage({viewport:{width:360,height:640},hasTouch:true,isMobile:true});await small.goto(pathToFileURL(path.resolve('index.html')).href);await small.waitForFunction(()=>typeof leftDrawingMenu!=='undefined');await small.waitForTimeout(150);assert.equal(await small.evaluate(()=>document.body.dataset.radialPrimary),'false');await small.close();
 }finally{await browser.close();fs.writeFileSync(process.env.FORCE_LAYOUT_OUTPUT||'.test-tools/force-layout-'+Date.now()+'.json',JSON.stringify(records,null,2))}
 console.log('PASS Force presentation: 140 anchor/viewport layouts, readable editor/keypad, radial ownership and small-screen fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
