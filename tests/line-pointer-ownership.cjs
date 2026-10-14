'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('../.test-tools/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const touch of [true,false])for(const tool of ['thin','dashed']){
 const p=await browser.newPage({hasTouch:touch,viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof tabletLineInteraction==='function');const cdp=await p.context().newCDPSession(p);
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const screen=q=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
 const mouse=async q=>{q=await screen(q);await p.mouse.click(q.x,q.y);await settle()};
 const pen=async(type,q)=>{q=await screen(q);await cdp.send('Input.dispatchMouseEvent',{type,...q,pointerType:'pen',button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:type==='mouseMoved'?0:1});await settle()};
 const point=async q=>{await pen('mousePressed',q);await pen('mouseReleased',q)};
 const bubble=async action=>{const r=await p.locator('[data-pen-connection-action="'+action+'"]').boundingBox();assert(r);await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:r.x+r.width/2,y:r.y+r.height/2,pointerType:'pen',button:'left',buttons:1,clickCount:1});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:r.x+r.width/2,y:r.y+r.height/2,pointerType:'pen',button:'left',buttons:0,clickCount:1});await settle()};
 const seed=async()=>{await p.evaluate(tool=>{cancelToSelection();items=[];past=[];future=[];snapEnabled=false;internalForceScale=2;setMode(tool)},tool);await settle()};
 const state=()=>p.evaluate(()=>({first:first&&{...first},count:items.length,history:past.length,mode,marker:tabletLineCommand,pending:penConnectionPlacement&&{point:{...penConnectionPlacement.lockedCandidate},pointerId:penConnectionPlacement.pointerId},items:copy(items)}));
 const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`);
 const segment=async(n,start,end)=>{const s=await state();assert.equal(s.count,n);assert.equal(s.history,n);const o=s.items.at(-1);assert.equal(o.type,tool);near(o.x,start.x);near(o.y,start.y);near(o.x2,end.x);near(o.y2,end.y)};
 await seed();await pen('mouseMoved',{x:300,y:300});assert.equal((await state()).marker,null,'Pen hover must not own the command');await mouse({x:300,y:300});assert((await state()).first);await mouse({x:500,y:400});await segment(1,{x:300,y:300},{x:500,y:400});
 if(touch){
  // Hover -> mouse -> pen, including a mouse-started chained session.
  await point({x:600,y:500});let s=await state();assert(s.pending);assert.equal(s.count,1);await bubble('confirm');await segment(2,{x:500,y:400},{x:600,y:500});
  // A genuine mouse cannot replace a legitimate pending pen candidate.
  await seed();await point({x:300,y:300});const frozen=(await state()).pending;await mouse({x:700,y:500});s=await state();assert.deepEqual(s.pending,frozen);assert.equal(s.first,null);assert.equal(s.count,0);await bubble('confirm');assert((await state()).first);await point({x:500,y:400});await bubble('confirm');await segment(1,{x:300,y:300},{x:500,y:400});
  // Confirmed tablet input may switch to the supported mouse commit path.
  await mouse({x:700,y:500});await segment(2,{x:500,y:400},{x:700,y:500});
  await seed();await point({x:300,y:300});await bubble('cancel');assert.equal((await state()).pending,null);assert.equal((await state()).history,0);await mouse({x:300,y:300});await mouse({x:500,y:400});await segment(1,{x:300,y:300},{x:500,y:400});
  await seed();await pen('mousePressed',{x:300,y:300});const id=(await state()).pending.pointerId;await p.evaluate(id=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'pen',pointerId:id})),id);await pen('mouseReleased',{x:300,y:300});assert.equal((await state()).pending,null);await mouse({x:300,y:300});await mouse({x:500,y:400});await segment(1,{x:300,y:300},{x:500,y:400});
  await seed();await point({x:300,y:300});await p.evaluate(()=>cancelActiveCommand());assert.equal((await state()).first,null);assert.equal((await state()).pending,null);await mouse({x:300,y:300});await mouse({x:500,y:400});await segment(1,{x:300,y:300},{x:500,y:400});
  await p.evaluate(()=>cancelActiveCommand());assert.equal((await state()).mode,'select');assert.equal((await state()).marker,null);await seed();await mouse({x:300,y:300});await mouse({x:500,y:400});await segment(1,{x:300,y:300},{x:500,y:400});
  await seed();for(const q of [{x:300,y:300},{x:500,y:400}]){const a=await screen(q);await p.touchscreen.tap(a.x,a.y);assert((await state()).pending);await bubble('confirm')}await segment(1,{x:300,y:300},{x:500,y:400});
  // Touch-generated compatibility MouseEvents must not enter PointerEvent geometry paths.
  await p.evaluate(()=>{for(const type of ['mousedown','mouseup','click'])svg.dispatchEvent(new MouseEvent(type,{bubbles:true,clientX:600,clientY:400,button:0}))});assert.equal((await state()).count,1);assert.equal((await state()).history,1);
 }
 assert.deepEqual(errors,[]);await p.close();console.log('PASS '+tool+' '+(touch?'hybrid native mouse/CDP pen/touch':'PC mouse')+': hover, switching, pending/cancel/lifecycle ownership, exact geometry and history');
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
