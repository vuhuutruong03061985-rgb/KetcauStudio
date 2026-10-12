'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const type of ['pen','touch']){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
   const cdp=await context.newCDPSession(p),length=p.locator('#dynamicInputValue'),angle=p.locator('#dynamicInputSecondary'),confirm=p.locator('[data-numeric-key="confirm"]');
   const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   async function tap(el){const r=await el.boundingBox();assert(r);await contact({x:r.x+r.width/2,y:r.y+r.height/2})}
   async function contact(q){if(type==='pen')for(const event of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:event,...q,pointerType:'pen',button:'left',buttons:event==='mousePressed'?1:0,clickCount:1});else await p.touchscreen.tap(q.x,q.y);await settle()}
   const key=value=>tap(p.locator(`[data-numeric-key="${value}"]`));
   const state=()=>p.evaluate(()=>({first:copy(first),fields:barNumericSession?copy(barNumericSession.state):null,items:copy(items),past:past.length,pending:!!penConnectionPlacement,eligible:canFinishLockedBar(),preview:!!svg.querySelector('[data-bar-preview] line')}));
   async function start(){await p.evaluate(()=>{cancelToSelection();document.activeElement.blur();items=[];past=[];future=[];geometryScale=40;setMode('bar')});await settle();const q=await p.evaluate(()=>{const q=new DOMPoint(300,300).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});await contact(q);await tap(p.locator('[data-pen-connection-action="confirm"]'));assert.equal(await confirm.textContent(),'✓');await p.evaluate(()=>{window.canvasMoves=0});}
   await p.evaluate(()=>svg.addEventListener('pointermove',()=>window.canvasMoves++));
   async function digits(value){for(const c of String(value))await key(c==='-'?'sign':c)}
   async function define(order){
    const first=order==='length-first'?length:angle,second=first===length?angle:length;
    const a=first===length?3:30,b=first===length?30:3;
    await tap(first);await digits(a);assert.equal(await first.inputValue(),String(a));
    await tap(second);let s=await state();assert.equal(s.fields[first===length?'distance':'angle'].mode,'locked');assert.equal(s.fields[first===length?'distance':'angle'].value,a);assert.equal(s.items.length,0);assert.equal(await confirm.textContent(),'✓');
    await digits(b);await key('confirm');s=await state();assert(s.eligible&&s.preview);assert.equal(s.items.length,0);assert.equal(await confirm.textContent(),'✓✓');assert.equal(await confirm.getAttribute('aria-label'),'Hoàn tất Thanh');assert.equal(await p.evaluate(()=>window.canvasMoves),0);return s;
   }
   for(const order of ['length-first','angle-first']){
    await start();const s=await define(order);const endpoint=await p.evaluate(()=>copy(barNumericSession.endpoint));
    await key('confirm');let after=await state();assert.equal(after.items.length,1);assert.equal(after.past,1);assert.deepEqual(after.first,endpoint);assert.equal(after.fields.distance.mode,'live');assert.equal(after.fields.angle.mode,'live');assert.equal(await confirm.textContent(),'✓');
    await confirm.dispatchEvent('click');await p.locator('#commandFinish').dispatchEvent('click');after=await state();assert.equal(after.items.length,1);assert.equal(after.past,1);assert.deepEqual(after.first,endpoint);assert.equal(s.pending,false);
    await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,0);await p.evaluate(()=>actions.redo[1]());assert.equal((await state()).items.length,1);
   }
   // An early digit before the deferred select-all must not be selected again on the next frame.
   await start();await p.evaluate(()=>{
    const input=$('dynamicInputValue');input.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'pen',button:0}));input.focus();
    input.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'pen',button:0}));
    for(const digit of ['3','4'])document.querySelector(`[data-numeric-key="${digit}"]`).click();
   });await settle();await key('5');assert.equal(await length.inputValue(),'345');assert.equal((await state()).items.length,0);
   // Invalid switches remain in the original field and retain the draft/valid lock.
   await start();await tap(length);await key('clear');await key('0');await tap(angle);let s=await state();assert.equal(s.fields.activeField,'distance');assert.equal(s.fields.distance.mode,'live');assert.equal(await length.inputValue(),'0');assert.equal(await length.getAttribute('aria-invalid'),'true');assert.equal(await confirm.textContent(),'✓');assert.equal(s.items.length,0);
   await key('clear');await key('3'); // Explicitly replace the retained invalid draft.
   assert.equal(await length.inputValue(),'3');await tap(angle);await digits(30);await key('confirm');assert.equal(await confirm.textContent(),'✓✓');
   // A tap starts a pending edit, even before a digit; Finish cannot consume it.
   await tap(length);assert.equal(await confirm.textContent(),'✓');assert.equal((await state()).eligible,false);await p.locator('#commandFinish').dispatchEvent('click');assert.equal((await state()).items.length,0);
   assert.deepEqual(await length.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,1]);await digits(12);assert.equal(await length.inputValue(),'12');await key('confirm');assert.equal(await confirm.textContent(),'✓✓');
   await tap(length);await key('backspace');assert.equal(await length.inputValue(),'');await tap(angle);assert.equal(await length.inputValue(),'');assert.equal((await state()).fields.distance.value,12);assert.equal((await state()).eligible,false);assert.equal(await length.getAttribute('aria-invalid'),'true');
   // Recover; actual selection/caret offsets are honored by native keypad contacts.
   await digits(123);await length.evaluate(el=>el.setSelectionRange(1,2));await settle();await key('9');assert.equal(await length.inputValue(),'193');
   await length.evaluate(el=>el.setSelectionRange(1,2));await settle();await key('backspace');assert.equal(await length.inputValue(),'13');
   await length.evaluate(el=>el.setSelectionRange(1,1));await settle();await key('.');assert.equal(await length.inputValue(),'1.3');await key('.');assert.equal(await length.inputValue(),'1.3');
   await key('confirm');assert.equal((await state()).fields.distance.value,1.3);assert.equal(await confirm.textContent(),'✓✓');
   // Store the selection before focus leaves; reopening field focus must not erase the caret range.
   await tap(length);await length.evaluate(el=>el.setSelectionRange(2,3));await settle();await p.evaluate(()=>{document.activeElement.blur();document.body.focus()});await key('4');assert.equal(await length.inputValue(),'1.4');await key('confirm');assert.equal((await state()).fields.distance.value,1.4);
   await tap(angle);await digits(45);await key('sign');assert.equal(await angle.inputValue(),'-45');await tap(length);s=await state();assert.equal(s.fields.angle.value,-45);assert.equal(s.fields.angle.mode,'locked');assert.equal(await confirm.textContent(),'✓');await key('confirm');assert.equal(await confirm.textContent(),'✓✓');
   await p.evaluate(()=>{panEnabled=true;render()});assert.equal(await confirm.textContent(),'✓');await key('confirm');assert.equal((await state()).items.length,0);
   await p.evaluate(()=>{panEnabled=false;render()});assert.equal(await confirm.textContent(),'✓✓');
   await p.evaluate(()=>{tabletInputKeypad.hide();updateCommandControls()});assert(await p.locator('#commandFinish').isVisible());await tap(p.locator('#commandFinish'));s=await state();assert.equal(s.items.length,1);assert.equal(s.past,1);assert.equal(await confirm.textContent(),'✓');
   assert.equal(await length.getAttribute('inputmode'),'none');assert.equal(await angle.getAttribute('inputmode'),'none');
   await p.evaluate(()=>cancelToSelection());assert.equal(await p.locator('#tabletNumericKeypad').isVisible(),false);assert.equal(await confirm.textContent(),'✓');assert.equal(await length.getAttribute('inputmode'),'decimal');
   // The shared keypad remains single-confirm for other tool adapters.
   await p.evaluate(()=>{setMode('support');first=null;const input=$('dynamicInputValue');showDynamicInput({value:'12',tabletKeypad:true,onConfirm:()=>{},onCancel:()=>{}})});assert.equal(await confirm.textContent(),'✓');await key('3');assert.equal(await length.inputValue(),'123');await key('confirm');assert.equal(await p.locator('#tabletNumericKeypad').isVisible(),false);
   assert.deepEqual(errors,[]);console.log(`PASS ${type}: bidirectional auto-lock, invalid drafts, selection/caret/focus replacement, pending-lock edit guard, ✓/✓✓, one commit/history/chaining, no-motion preview and other-tool isolation`);await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
