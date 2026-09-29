const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const c=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
  const client=(x,y)=>p.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},{x,y});
  const click=async(x,y)=>{const q=await client(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const start=async()=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];geometryScale=100;setMode('bar');savedDocument=documentText()});await click(300,300)};
  const lock=async(id,value)=>{await p.locator('#'+id).fill(String(value));await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab')};
  const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
  for(const [distance,angle,x,y]of [[null,null,600,400],[5.5,null,400,500],[5.5,null,600,500],[null,0,600,400],[null,90,600,400],[null,-90,600,400],[null,30,600,400],[5.5,30,600,400],[5.5,30,200,550]]){
   await start();if(distance!==null)await lock('dynamicInputValue',distance);if(angle!==null)await lock('dynamicInputSecondary',angle);
   assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>documentText()===savedDocument),true);
   // Predict with the same candidate provider, without changing the preview or document.
   const q=await client(x,y);const expected=await p.evaluate(({x,y})=>{const s=barNumericSession.state;return solveBarEndpoint({startPoint:first,candidatePoint:drawingPoint({clientX:x,clientY:y}),geometryScale,distanceMode:s.distance.mode,distanceValue:s.distance.value,angleMode:s.angle.mode,angleValue:s.angle.value})},q);
   await click(x,y);const result=await p.evaluate(()=>({o:items[0],first,state:barNumericSession.state,past:past.length,dirty:documentText()!==savedDocument}));
   near(result.o.x2,expected.x);near(result.o.y2,expected.y);assert.deepEqual(result.first,{x:result.o.x2,y:result.o.y2});assert.equal(result.state.distance.mode,'live');assert.equal(result.state.angle.mode,'live');assert.equal(result.past,1);assert(result.dirty);
   if(distance!==null)near(Math.hypot(result.o.x2-result.o.x,result.o.y2-result.o.y),550);
   const saved=await p.evaluate(()=>documentText());assert(!saved.includes('locked'));assert(!saved.includes('activeField'));
   await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>barNumericSession),null);
   await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),result.o);assert.equal(await p.evaluate(()=>barNumericSession),null);
   await p.evaluate(async saved=>loadDocument(new File([saved],'numeric.json')),saved);assert.deepEqual(await p.evaluate(()=>items[0]),result.o);
  }
  await start();await lock('dynamicInputValue',5.5);await lock('dynamicInputSecondary',30);await click(600,500);const joint=await p.evaluate(()=>({...first}));await click(800,500);assert.deepEqual(await p.evaluate(()=>({x:items[1].x,y:items[1].y})),joint);assert.equal(await p.evaluate(()=>past.length),2);
  // A snapped direction controls the angle, but no final snap shortens the locked length.
  await start();await p.evaluate(()=>items.push(make('bar',500,300,800,300)));await lock('dynamicInputValue',5.5);await click(502,302);near(await p.evaluate(()=>items[1].x2),850);near(await p.evaluate(()=>items[1].y2),300);
  await start();await lock('dynamicInputValue',5.5);await click(300,300);assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>barNumericSession.state.distance.mode),'locked');
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>barNumericSession),null);assert.equal(await p.evaluate(()=>items.length),0);
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS constrained commit desktop/touch: four states, exact lengths/angles, snap, fresh chained sessions, undo/redo, save/load, dirty, invalid and cancel');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
