const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const touch of [false,true]){
 const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginThinNumericInput==='function');
 const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const start=async()=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];internalForceScale=10;setMode('thin');savedDocument=documentText()});await click(300,300)};
 const lock=async()=>{await p.evaluate(()=>openArmedDynamicInput());await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>documentText()===savedDocument),true)};
 const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
 for(const [x,y]of [[400,300],[800,300],[100,300],[300,100],[300,500],[600,500]]){
  await start();await lock();const q=await coords(x,y);const expected=await p.evaluate(q=>solveThinEndpointFromValue({startPoint:first,candidatePoint:drawingPoint({clientX:q.x,clientY:q.y}),internalForceValue:110,internalForceScale}),q);
  await click(x,y);const r=await p.evaluate(()=>({o:items[0],first,state:thinNumericSession.valueMode,value:thinNumericSession.value,h:past.length,dirty:documentText()!==savedDocument}));near(r.o.x2,expected.x);near(r.o.y2,expected.y);near(Math.hypot(r.o.x2-r.o.x,r.o.y2-r.o.y),11);assert.deepEqual(r.first,{x:r.o.x2,y:r.o.y2});assert.equal(r.state,'live');assert.equal(r.value,0);assert.equal(r.h,1);assert(r.dirty);
  const saved=await p.evaluate(()=>documentText());assert(!saved.includes('internalForceValue'));assert(!saved.includes('locked'));
  await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>thinNumericSession),null);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),r.o);
  await p.evaluate(async text=>loadDocument(new File([text],'thin.json')),saved);assert.deepEqual(await p.evaluate(()=>items[0]),r.o);
 }
 await start();await click(500,300);near(await p.evaluate(()=>items[0].x2),500);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),true);
 await start();await lock();await click(500,300);const joint=await p.evaluate(()=>({...first}));await click(700,500);assert.deepEqual(await p.evaluate(()=>({x:items[1].x,y:items[1].y})),joint);assert.equal(await p.evaluate(()=>past.length),2);
 await start();await p.evaluate(()=>{items.push(make('bar',500,300,800,300));savedDocument=documentText()});
 // Confirm without using lock helper's empty-items assertion.
 await p.evaluate(()=>openArmedDynamicInput());await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());await click(502,302);near(await p.evaluate(()=>items[1].x2),311);near(await p.evaluate(()=>items[1].y2),300);
 await start();await lock();await click(300,300);assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'locked');await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>items.length),0);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>thinNumericSession),null);
 assert.deepEqual(errors,[]);await c.close();
}console.log('PASS thin commit desktop/touch: exact magnitude/directions/snap, legacy clicks, fresh chained sessions, dirty/history/undo/redo/save/load, invalid/cancel, field confirmation stays separate from commit');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
