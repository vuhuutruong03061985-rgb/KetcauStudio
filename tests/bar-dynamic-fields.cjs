const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const move=async(x,y)=>{const q=await coords(x,y);await p.mouse.move(q.x,q.y)};
  const start=async()=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];geometryScale=100;setMode('bar')});await click(300,300)};
  const state=()=>p.evaluate(()=>barNumericSession?.state);
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),saved:savedDocument,snap:copy(snapOptions)}));
  await start();assert(await p.locator('#dynamicInput').isVisible());assert(await p.locator('#dynamicInputSecondary').isVisible());
  assert.equal(await p.evaluate(()=>document.activeElement.id==='dynamicInputValue'),false);
  for(const [x,y,angle]of [[850,300,0],[300,100,90],[100,300,180],[300,500,270]]){await move(x,y);assert(Math.abs((await state()).angle.value-angle)<.01)}
  await move(850,300);assert.equal(await p.locator('#dynamicInputValue').inputValue(),'5.5');
  const before=await snapshot();await p.keyboard.type('5.5');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.deepEqual((await state()).distance,{mode:'locked',value:5.5});await move(300,500);assert.equal((await state()).distance.value,5.5);assert.equal((await state()).angle.mode,'live');assert(Math.abs((await state()).angle.value-270)<.01);
  await p.keyboard.press('Tab');assert.equal((await state()).activeField,'angle');await p.keyboard.type('30');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');await move(800,400);assert.deepEqual((await state()).angle,{mode:'locked',value:30});assert.equal((await state()).distance.value,5.5);
  await p.keyboard.press('Shift+Tab');assert.equal((await state()).activeField,'distance');await p.keyboard.type('6');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal((await state()).distance.value,6);assert.deepEqual(await snapshot(),before);
  // Invalid edits preserve the prior constraint until another valid confirmation.
  for(const invalid of ['', '0','-1','NaN','Infinity']){await p.locator('#dynamicInputValue').fill(invalid);await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal((await state()).distance.value,6);assert.equal(await p.locator('#dynamicInputValue').getAttribute('aria-invalid'),'true')}
  await p.keyboard.press('Escape');assert.equal(await state(),undefined);assert(await p.locator('#dynamicInput').isHidden());
  await start();await move(500,300);const angle=p.locator('#dynamicInputSecondary');if(touch)await angle.tap();else await angle.click();assert.equal((await state()).activeField,'angle');
  for(const value of ['-30','90','180','270','360','450']){await angle.fill(value);await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal((await state()).angle.value,Number(value))}
  await move(800,300);assert.equal((await state()).distance.mode,'live');assert(Math.abs((await state()).distance.value-5)<.001);assert.equal((await state()).angle.value,450);
  if(touch){await angle.tap();const box=await p.locator('#dynamicInput').boundingBox();await p.locator('#drawing').dispatchEvent('pointermove',{pointerType:'touch',clientX:400,clientY:400});const after=await p.locator('#dynamicInput').boundingBox();assert.equal(after.x,box.x);assert.equal(after.y,box.y)}
  // Mouse anchor follows the cursor while retaining the angle constraint.
  await move(700,200);const a=await p.locator('#dynamicInput').boundingBox();await move(600,400);const b=await p.locator('#dynamicInput').boundingBox();assert(a.x!==b.x||a.y!==b.y);assert.equal((await state()).angle.value,450);
  // The existing click path now commits the solver endpoint and resets constraints.
  await click(600,400);assert.equal((await state()).distance.mode,'live');assert.equal((await state()).angle.mode,'live');assert.deepEqual(await p.evaluate(()=>[items[0].x,items[0].y,items[0].x2,items[0].y2].map(Math.round)),[300,300,300,-16]);assert.equal(await p.evaluate(()=>past.length),1);
  await start();await p.evaluate(()=>setMode('thin'));assert.equal(await state(),undefined);assert(await p.locator('#dynamicInput').isHidden());
  await start();await p.setViewportSize({width:390,height:700});await p.evaluate(()=>updateDynamicNumericInputAnchor(389,699));const box=await p.locator('#dynamicInput').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=700);
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS bar Distance/Angle live geometry, angle convention, independent locks/editing/validation, field navigation/touch, positioning, native commit and transient cleanup');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
