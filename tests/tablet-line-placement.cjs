'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const pointer of ['touch','pen'])for(const type of ['thin','dashed']){
 const p=await b.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof tabletLineInteraction==='function');const cdp=await p.context().newCDPSession(p);
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const screen=q=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
 const contact=async(kind,q)=>{if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd'}[kind],touchPoints:kind==='up'?[]:[{...q,id:1}]});else await cdp.send('Input.dispatchMouseEvent',{type:{down:'mousePressed',move:'mouseMoved',up:'mouseReleased'}[kind],...q,button:'left',buttons:kind==='up'?0:1,clickCount:1,pointerType:'pen'});await settle()};
 const tap=async selector=>{const r=await p.locator(selector).boundingBox();assert(r,selector);await contact('down',{x:r.x+r.width/2,y:r.y+r.height/2});await contact('up',{x:r.x+r.width/2,y:r.y+r.height/2})};
 const bubble=a=>tap('[data-pen-connection-action="'+a+'"]');
 const command=async id=>{if(!await p.evaluate(()=>rightCommandMenu.state.open)){const q=await p.evaluate(()=>({x:rightCommandMenu.layout.cx-13,y:rightCommandMenu.layout.cy}));await contact('down',q);await contact('up',q)}const q=await p.evaluate(id=>rightCommandMenu.layout.contextRing.sectors[sharedOuterActions.findIndex(a=>a.id===id)].icon,id);await contact('down',q);await contact('up',q)};
 const seed=async()=>{await p.evaluate(type=>{rightCommandMenu.close();leftDrawingMenu.close();cancelToSelection();items=[];past=[];future=[];snapEnabled=false;internalForceScale=2;setMode(type)},type);await settle()};
 const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,first:copy(first),point:penConnectionPlacement?.lockedCandidate&&copy(penConnectionPlacement.lockedCandidate),start:penConnectionPlacement?.lockedStart&&copy(penConnectionPlacement.lockedStart),lock:thinNumericSession?.valueMode}));
 const pick=async q=>{q=await screen(q);await contact('down',q);await contact('move',{x:q.x+180,y:q.y+110});await contact('up',{x:q.x+180,y:q.y+110})};
 await seed();await pick({x:300,y:300});let s=await state();assert.equal(s.first,null);assert.equal(s.items.length,0);const frozen=s.point;await p.evaluate(()=>render());assert.deepEqual((await state()).point,frozen);await bubble('cancel');assert.equal((await state()).first,null);
 await pick({x:300,y:300});await bubble('confirm');assert(Math.abs((await state()).first.x-300)<1e-3);assert.equal((await state()).items.length,0);
 if(type==='thin'){
  assert.equal(await p.locator('#dynamicInputSuffix').textContent(),'NL');assert.equal(await p.locator('#dynamicInputValue').getAttribute('inputmode'),'none');assert(await p.locator('#tabletNumericKeypad').isVisible());
  await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await p.locator('#dynamicInputValue').fill('-2');await tap('[data-numeric-key="confirm"]');assert.equal(await p.locator('#dynamicInputValue').getAttribute('aria-invalid'),'true');await pick({x:350,y:400});assert.equal((await state()).point,undefined);
  await p.locator('#dynamicInputValue').fill('100');await tap('[data-numeric-key="confirm"]');assert.equal((await state()).lock,'locked');assert.equal(await p.locator('#dynamicInputValueLock').getAttribute('data-lock-state'),'locked');assert.equal((await state()).items.length,0);await p.locator('#dynamicInputValue').blur();await p.keyboard.press('Enter');assert.equal((await state()).items.length,0);
 }
 await pick({x:350,y:400});s=await state();assert.equal(s.items.length,0);const end=s.point;await bubble('cancel');assert.equal((await state()).items.length,0);assert((await state()).first);
 await pick({x:350,y:400});s=await state();const expected=s.point;await bubble('confirm');s=await state();assert.equal(s.items.length,1);assert.equal(s.past,1);assert(Math.hypot(s.items[0].x2-expected.x,s.items[0].y2-expected.y)<1e-8);if(type==='thin')assert(Math.abs(Math.hypot(s.items[0].x2-s.items[0].x,s.items[0].y2-s.items[0].y)-50)<1e-7);
 await p.evaluate(()=>activatePenConnectionButton('confirm',{ctrlKey:false,altKey:false}));assert.equal((await state()).items.length,1);assert.equal(s.items[0].type,type);
 await pick({x:500,y:500});await bubble('confirm');assert.equal((await state()).items.length,2);assert.equal((await state()).past,2);await command('commandCancel');assert.equal((await state()).items.length,2);assert.equal(await p.evaluate(()=>mode),type);assert.equal((await state()).first,null);await command('commandFinish');assert.equal(await p.evaluate(()=>mode),'select');assert.equal((await state()).items.length,2);
 await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,1);await p.evaluate(()=>actions.redo[1]());assert.equal((await state()).items.length,2);
 if(type==='thin'){
  for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){
   await p.setViewportSize(viewport);await seed();await pick({x:300,y:300});await bubble('confirm');
   assert.equal(await p.locator('body').getAttribute('data-radial-primary'),'true');
   const input=p.locator('#dynamicInput'),field=p.locator('#dynamicInputValue'),before=await input.boundingBox();assert(before.y>=(await p.locator('#drawing').boundingBox()).y);
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await field.fill('12.5');await field.evaluate(el=>el.setSelectionRange(1,3));await settle();await tap('[data-numeric-key="0"]');assert.equal(await field.inputValue(),'105');await tap('[data-numeric-key="confirm"]');assert.equal((await state()).items.length,0);
   assert.deepEqual(await input.boundingBox(),before);await p.evaluate(()=>zoomAt(1.1));await settle();assert.equal(await field.inputValue(),'105');
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');
   const rows=await p.locator('#tabletNumericKeypad .tablet-number-keys').evaluate(el=>new Set([...el.children].filter(x=>!x.hidden&&x.dataset.numericKey!=='exit'&&x.getClientRects().length).map(x=>Math.round(x.getBoundingClientRect().top))).size);assert.equal(rows,4);
   const boxes=await Promise.all([input.boundingBox(),p.locator('#tabletNumericKeypad').boundingBox()]);for(const q of boxes){assert(q.x>=0&&q.y>=0&&q.x+q.width<=viewport.width+.1&&q.y+q.height<=viewport.height+.1)}
   if(pointer==='touch')await p.screenshot({path:'.test-tools/tablet-line-placement-20261013/final-'+viewport.width+'.png'});
   assert(Math.min(boxes[0].x+boxes[0].width,boxes[1].x+boxes[1].width)<=Math.max(boxes[0].x,boxes[1].x)||Math.min(boxes[0].y+boxes[0].height,boxes[1].y+boxes[1].height)<=Math.max(boxes[0].y,boxes[1].y));
   if(viewport.width===1280){await field.evaluate(el=>el.setSelectionRange(1,2));await p.setViewportSize({width:800,height:1280});await settle();assert.equal(await field.inputValue(),'105');assert.deepEqual(await field.evaluate(el=>[el.selectionStart,el.selectionEnd]),[1,2]);assert.equal(await field.getAttribute('inputmode'),'none')}
   await tap('[data-numeric-key="confirm"]');await pick({x:350,y:400});
   const panel=await input.boundingBox(),pointPanel=await p.locator('#penConnectionBubble').boundingBox();assert(pointPanel);assert(panel.y+panel.height<=pointPanel.y||pointPanel.y+pointPanel.height<=panel.y||panel.x+panel.width<=pointPanel.x||pointPanel.x+pointPanel.width<=panel.x);
   for(const a of ['confirm','cancel']){const r=await p.locator('[data-pen-connection-action="'+a+'"]').boundingBox();assert(r.width>=44&&r.height>=44)}assert(await p.locator('#commandControls').isHidden());assert(await p.locator('#tabletTopBar').isVisible());
   if(pointer==='touch')await p.screenshot({path:'.test-tools/tablet-line-placement-20261013/final-bubble-'+viewport.width+'.png'});await bubble('cancel');
   await field.press('Escape');assert.equal(await p.evaluate(()=>mode),'thin');assert.equal((await state()).first,null);await p.evaluate(()=>finishActiveCommand());assert.equal(await p.evaluate(()=>mode),'select');
  }
  await p.setViewportSize({width:1280,height:800});
  for(const side of [-1,1]){
   await seed();await p.evaluate(()=>{items=[make('bar',200,300,600,300,{id:'T'})];render()});await pick({x:300,y:300});await bubble('confirm');
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await p.locator('#dynamicInputValue').fill('100');await tap('[data-numeric-key="confirm"]');
   await pick({x:350,y:300+side*100});const frozen=await state();assert(frozen.start);assert.equal(await p.evaluate(()=>getThinReferenceBar()?.id),'T');await bubble('confirm');const o=(await state()).items.at(-1);assert.equal(o.type,'thin');assert(Math.abs(o.x2-o.x)<1e-7);assert(Math.abs(o.y2-o.y-side*50)<1e-7);assert(Math.hypot(o.x-frozen.start.x,o.y-frozen.start.y)<1e-8);assert.equal((await state()).past,1);
  }
  await seed();await pick({x:300,y:300});await bubble('confirm');await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await p.locator('#dynamicInputValue').fill('1000000');await tap('[data-numeric-key="confirm"]');await pick({x:350,y:400});assert.equal((await state()).point,undefined);assert.equal((await state()).items.length,0);
 }
 await seed();const q=await screen({x:300,y:300});await contact('down',q);await p.evaluate(pointer=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:penConnectionPlacement.pointerId,pointerType:pointer})),pointer);await contact('up',q);assert.equal((await state()).point,undefined);assert.equal((await state()).items.length,0);
 assert.deepEqual(errors,[]);await p.close();console.log('PASS tablet '+type+' '+pointer+' frozen points/numeric/caret/layout/reference sides/commit/cancel/chaining/history');
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
