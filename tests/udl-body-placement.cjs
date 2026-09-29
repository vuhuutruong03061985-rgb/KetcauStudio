const {chromium}=require('../.test-tools/node_modules/playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof updateUDLOrientation==='function');
 const screen=point=>p.evaluate(p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},point);
 const tap=async point=>{const q=await screen(point);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const arrows=selector=>p.locator(selector+' line[marker-end]').evaluateAll(lines=>lines.map(l=>Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(l.getAttribute(k))]))));
 function check(lines,a,b,dx,dy){assert(lines.length>=3);const length=Math.hypot(dx,dy);lines.forEach((l,i)=>{const t=i/(lines.length-1);near(l.x2,a.x+(b.x-a.x)*t);near(l.y2,a.y+(b.y-a.y)*t);near(l.x1-l.x2,55*dx/length);near(l.y1-l.y2,55*dy/length);assert((l.x1-l.x2)*dx+(l.y1-l.y2)*dy>0)})}
 for(const [a,b]of [[{x:250,y:300},{x:550,y:300}],[{x:400,y:200},{x:400,y:500}],[{x:250,y:200},{x:550,y:450}]])for(const [dx,dy,angle]of [[0,130,0],[-130,0,90],[130,0,-90],[0,-130,180],[80,130,Math.atan2(-80,130)*180/Math.PI]]){
  await p.evaluate(()=>{setMode('select');items=[];past=[];future=[];snapEnabled=false;selected=null;setMode('udl')});await tap(a);await tap(b);
  assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);
  const point={x:(a.x+b.x)/2+dx*2,y:(a.y+b.y)/2+dy*2};
  if(!touch){const q=await screen(point);await p.mouse.move(q.x,q.y);near(await p.evaluate(()=>loadPlacement.placementAngle),angle);check(await arrows('[data-load-preview]'),a,b,dx,dy)}
  await tap(point);assert.equal(await p.evaluate(()=>items.length),1,JSON.stringify({touch,a,b,point}));check(await arrows('g[data-id]'),a,b,dx,dy);assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
 }
 for(const angle of [0,90,180,270,37.5]){
  await p.evaluate(angle=>{setMode('select');items=validate({format:'ket-cau-studio',version:1,items:[make('udl',250,300,550,300,{loadAngle:angle})]});selected=null;render()},angle);
  const r=angle*Math.PI/180;check(await arrows('g[data-id]'),{x:250,y:300},{x:550,y:300},-Math.cos(r),Math.sin(r));
 }
 console.log(`PASS UDL body ${touch?'touch without hover':'mouse'}: cardinal/diagonal rays, all span orientations, fixed heads, preview, commit/history and legacy rendering`);await context.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
