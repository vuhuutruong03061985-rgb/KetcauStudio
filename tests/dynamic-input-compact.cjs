const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const touch of [false,true]){
 const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginThinNumericInput==='function');
 const click=async(x,y)=>{const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const start=async mode=>{await p.evaluate(mode=>{document.activeElement.blur();items=[];past=[];future=[];setMode(mode)},mode);await click(300,300);if(mode==='thin')await p.evaluate(()=>openArmedDynamicInput())};
 for(const mode of ['bar','thin']){
 await start(mode);assert.equal(await p.locator('#dynamicInput button:visible').count(),0);assert.equal(await p.locator('#dynamicInput input:visible').count(),mode==='bar'?2:1);
 const box=await p.locator('#dynamicInput').boundingBox();assert(box.width<230);const input=p.locator('#dynamicInputValue');const ib=await input.boundingBox();assert(ib.height<=30&&ib.width<90);
 if(touch){const hit=p.locator('#dynamicInput .dynamic-hit-area').first();assert((await hit.boundingBox()).height>=44);await hit.tap()}else await input.click();assert.equal(await p.evaluate(()=>document.activeElement.id),'dynamicInputValue');
 await input.fill(mode==='bar'?'5.5':'110');
 if(mode==='bar'){const angle=p.locator('#dynamicInputSecondary');if(touch)await angle.tap();else await angle.click();await angle.fill('30')}
 await click(600,500);assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);const length=await p.evaluate(()=>Math.hypot(items[0].x2-items[0].x,items[0].y2-items[0].y));assert(Math.abs(length-(mode==='bar'?550:11))<1e-6);
 await start(mode);await input.fill('0');await click(600,500);assert.equal(await p.evaluate(()=>items.length),0);assert(await p.locator('#dynamicInput').isVisible());await p.keyboard.press('Escape');
 }
 await p.evaluate(()=>showDynamicInput({clientX:100,clientY:100,value:'2',focus:true}));assert.equal(await p.locator('#dynamicInput button:visible').count(),2);await p.locator('#dynamicInput button').first().click();assert(await p.locator('#dynamicInput').isHidden());
 assert.equal(await p.locator('#drawingScales small').count(),0);assert.equal(await p.locator('#internalForceScale').inputValue(),'0.1');
 await start('bar');await p.setViewportSize({width:390,height:700});await p.evaluate(()=>updateDynamicNumericInputAnchor(389,699));const rect=await p.locator('#dynamicInput').boundingBox();assert(rect.x>=0&&rect.y>=0&&rect.x+rect.width<=390&&rect.y+rect.height<=700);
 assert.deepEqual(errors,[]);await c.close();
}console.log('PASS compact drawing vs generic buttons, dimensions/touch hit areas, pending canvas validation/commit, scale presentation/semantics, viewport');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
