'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const type of ['pen','touch','mouse']){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:type!=='mouse',isMobile:type!=='mouse'}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
   const cdp=await context.newCDPSession(p),length=p.locator('#dynamicInputValue'),angle=p.locator('#dynamicInputSecondary'),panel=p.locator('#dynamicInput'),keypad=p.locator('#tabletNumericKeypad'),bubble=p.locator('#penConnectionBubble');
   const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const indicators=p.locator('.dynamic-unit-lock');
   async function contact(q){if(type==='pen')for(const event of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:event,...q,pointerType:'pen',button:'left',buttons:event==='mousePressed'?1:0,clickCount:1});else if(type==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);await settle()}
   async function tap(el){const r=await el.boundingBox();assert(r);await contact({x:r.x+r.width/2,y:r.y+r.height/2})}
   const key=k=>tap(p.locator(`[data-numeric-key="${k}"]`));
   const modes=()=>p.locator('.dynamic-lock-icon').evaluateAll(icons=>icons.map(el=>el.dataset.lockState));
   const model=()=>p.evaluate(()=>({start:copy(first),items:copy(items),past:past.length,pending:!!penConnectionPlacement}));
   async function start(){await p.evaluate(()=>{cancelToSelection();document.activeElement.blur();items=[];past=[];future=[];geometryScale=40;setMode('bar')});await settle();const q=await p.evaluate(()=>{const q=new DOMPoint(300,300).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});await contact(q);if(type!=='mouse')await tap(p.locator('[data-pen-connection-action="confirm"]'));assert.deepEqual(await modes(),['live','live'])}
   await start();
   async function geometry(viewport){
    const metrics=await indicators.evaluateAll(cols=>cols.map(col=>{const input=col.closest('label').querySelector('input'),unit=col.querySelector('span'),icon=col.querySelector('svg'),r=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}};return {input:r(input),column:r(col),unit:r(unit),icon:r(icon),unitText:unit.textContent,pointerEvents:getComputedStyle(col).pointerEvents,iconPointer:getComputedStyle(icon).pointerEvents,role:icon.getAttribute('role'),description:input.getAttribute('aria-describedby'),name:icon.getAttribute('aria-label'),path:icon.querySelector('path').getAttribute('d')}}));
    assert.deepEqual(metrics.map(m=>m.unitText),['m','°']);
    for(const m of metrics){assert(m.column.x>=m.input.x+m.input.width&&m.column.x-m.input.x-m.input.width<=3);assert(m.unit.y+m.unit.height<=m.icon.y);assert(m.icon.width>=16&&m.icon.width<=18);assert.equal(m.pointerEvents,'none');assert.equal(m.iconPointer,'none');assert.equal(m.role,'img');assert(m.name&&m.description.endsWith('Lock'));assert(m.input.width>=(type==='mouse'?50:60));} // Existing 7ch fields use 14px desktop / 16px coarse input fonts.
    assert.equal(metrics[0].input.y,metrics[1].input.y);assert(metrics[1].input.x>metrics[0].column.x+metrics[0].column.width);
    const r=await panel.boundingBox();assert(r.width<230&&r.height<=52);assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);
    if(type!=='mouse')assert.equal(overlap(r,await keypad.boundingBox()),0);
    assert.equal(await panel.locator('button:visible').count(),0);assert.equal(await indicators.locator('button,input').count(),0);
    return metrics;
   }
   const initial=await geometry({width:1280,height:800});
   if(type!=='mouse'){
    // Reverse order covers LIVE/LOCKED; an invalid switch keeps the draft open.
    await tap(angle);await key('1');await key('5');await key('confirm');assert.deepEqual(await modes(),['live','locked']);
    await tap(length);await key('0');await tap(angle);assert.equal(await length.getAttribute('aria-invalid'),'true');assert.deepEqual(await modes(),['editing','locked']);
    await key('clear');await key('3');await tap(angle);assert.deepEqual(await modes(),['locked','editing']);await key('confirm');assert.deepEqual(await modes(),['locked','locked']);
    await start();
   }
   await tap(length);
   if(type!=='mouse'){
    assert.deepEqual(await modes(),['editing','live']);await key('3');await tap(angle);assert.deepEqual(await modes(),['locked','editing']);await key('3');await key('0');await key('confirm');
   }else{
    await length.fill('3');assert.deepEqual(await modes(),['editing','live']);await p.keyboard.press('Tab');assert.deepEqual(await modes(),['locked','live']);await angle.fill('30');assert.deepEqual(await modes(),['locked','editing']);await p.keyboard.press('Tab');
   }
   assert.deepEqual(await modes(),['locked','locked']);assert.equal((await model()).items.length,0);assert(await p.locator('[data-bar-preview] line').count());
   const locked=await geometry({width:1280,height:800});assert(locked.every((m,i)=>m.path!==initial[i].path));
   if(type==='pen')await p.screenshot({path:'.test-tools/bar-unit-lock-indicators-landscape.png'});
   // Editing changes the presentation immediately, while keeping the confirmed model constraint.
   await tap(length);if(type!=='mouse'){assert.deepEqual(await modes(),['editing','locked']);assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓');await key('4');await key('confirm')}else{await length.fill('4');assert.deepEqual(await modes(),['editing','locked']);await p.keyboard.press('Tab')}
   assert.deepEqual(await modes(),['locked','locked']);assert.equal(await p.evaluate(()=>barNumericSession.state.distance.value),4);assert.equal((await model()).items.length,0);
   if(type!=='mouse'){
    assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓✓');await key('confirm');assert.equal((await model()).items.length,1);assert.equal((await model()).past,1);assert.deepEqual(await modes(),['live','live']);
    await tap(length);await key('2');await tap(angle);await key('0');await key('confirm');assert.deepEqual(await modes(),['locked','locked']);
   }else{await p.keyboard.press('Enter');assert.equal((await model()).items.length,1);assert.deepEqual(await modes(),['live','live'])}
   // Pointer-transparent indicators reuse field hit areas, without inserting text or selecting a canvas point.
   const before=await model(),value=await length.inputValue();await p.evaluate(()=>{window.indicatorInputs=0;$('dynamicInputValue').addEventListener('input',()=>window.indicatorInputs++)});
   const icon=await indicators.first().locator('svg').boundingBox();const hit=await p.evaluate(({x,y})=>document.elementFromPoint(x,y).tagName,{x:icon.x+icon.width/2,y:icon.y+icon.height/2});assert(!['svg','path','rect'].includes(hit.toLowerCase()));
   await contact({x:icon.x+icon.width/2,y:icon.y+icon.height/2});assert.deepEqual(await model(),before);assert.equal(await length.inputValue(),value);assert.equal(await p.evaluate(()=>window.indicatorInputs),0);
   for(const viewport of [{width:800,height:1100},{width:1280,height:800}]){await p.setViewportSize(viewport);await settle();await p.evaluate(()=>updateDynamicInput());await geometry(viewport);if(type==='pen'&&viewport.width===800)await p.screenshot({path:'.test-tools/bar-unit-lock-indicators-portrait.png'})}
   if(type!=='mouse'){
    await start();const q=await p.evaluate(()=>{const q=new DOMPoint(500,400).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});await contact(q);assert(await bubble.isVisible());assert.equal(overlap(await panel.boundingBox(),await bubble.boundingBox()),0);assert.equal(overlap(await keypad.boundingBox(),await bubble.boundingBox()),0);
   }
   await p.evaluate(()=>{cancelToSelection();setMode('thin')});assert.equal(await p.locator('.dynamic-unit-lock:visible').count(),0);
   await p.evaluate(()=>showDynamicInput({clientX:150,clientY:150,value:'2',suffix:'kN',onConfirm:()=>{}}));assert.equal(await p.locator('.dynamic-unit-lock:visible').count(),0);assert.equal(await p.locator('#dynamicInputSuffix').textContent(),'kN');assert.equal(await length.getAttribute('aria-describedby'),'dynamicInputSuffix');
   assert.deepEqual(errors,[]);console.log(`PASS ${type}: vertical units/icons, model and pending-edit states, confirm/reset, hit transparency, field/selection ownership, compact portrait/landscape and shared-editor isolation`);await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
