const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const touch of [false,true]){
 const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginThinNumericInput==='function');
 const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const move=async(x,y)=>{const q=await coords(x,y);await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType:touch?'touch':'mouse'})};
 await p.evaluate(()=>{items=[];past=[];setMode('thin');internalForceScale=10});await click(300,300);
 assert(await p.locator('#dynamicInput').isVisible());assert.equal(await p.locator('#dynamicInput input:visible').count(),1);assert.equal(await p.locator('#dynamicInput button:visible').count(),0);assert(await p.locator('#dynamicInput').evaluate(el=>el.classList.contains('dynamic-compact')));assert.notEqual(await p.evaluate(()=>document.activeElement.id),'dynamicInputValue');
 await move(311,300);assert.equal(await p.locator('#dynamicInputValue').inputValue(),'110');const before=await p.locator('#dynamicInput').boundingBox();await move(308,300);assert.equal(await p.locator('#dynamicInputValue').inputValue(),'80');const after=await p.locator('#dynamicInput').boundingBox();assert.notEqual(before.x,after.x);
 // Untouched LIVE data never becomes a constraint at canvas commit.
 await click(500,300);assert(Math.abs(await p.evaluate(()=>items[0].x2-items[0].x)-200)<.001);assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'live');assert(await p.locator('#dynamicInput').isVisible());assert.equal(await p.locator('#dynamicInputValue').inputValue(),'0');
 const input=p.locator('#dynamicInputValue');if(touch)await input.tap();else await input.click();await input.fill('110.123456789');
 if(touch)await p.keyboard.press('Enter');else await p.evaluate(()=>dynamicInputUI.confirmPending());
 assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'locked');assert.equal(await input.inputValue(),'110.123456789');const lockedPos=await p.locator('#dynamicInput').boundingBox();await move(600,450);assert.equal(await input.inputValue(),'110.123456789');assert(Math.abs(await p.evaluate(()=>Math.hypot(thinNumericSession.endpoint.x-first.x,thinNumericSession.endpoint.y-first.y))-11.0123456789)<1e-8);
 if(touch){const pos=await p.locator('#dynamicInput').boundingBox();assert.equal(pos.x,lockedPos.x);assert.equal(pos.y,lockedPos.y)}
 await click(600,450);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'live');assert.equal(await input.inputValue(),'0');await p.keyboard.press('Escape');assert(await p.locator('#dynamicInput').isHidden());
 assert.deepEqual(errors,[]);await c.close();
}console.log('PASS thin immediate compact LIVE display, model scaling, shared positioning, no autofocus, precision-preserving LOCKED, touch stability, native commit and fresh sessions');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
