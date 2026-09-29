const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
  const point=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await point(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const armed=()=>p.evaluate(()=>isDynamicNumericInputArmed());
  const reset=()=>p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];setMode('bar');geometryScale=789;saveDraft()});
  await reset();assert.equal(await armed(),false);await click(200,200);assert.equal(await armed(),true);
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),snap:copy(snapOptions),enabled:snapEnabled}));const before=await snapshot();
  const q=await point(400,300);await p.mouse.move(q.x,q.y);assert(await p.evaluate(()=>!!hover));const anchor=await p.evaluate(()=>[dynamicNumericCapture.clientX,dynamicNumericCapture.clientY]);assert(Math.abs(anchor[0]-q.x)<0.001&&Math.abs(anchor[1]-q.y)<0.001);
  await p.keyboard.type('5');assert.equal(await p.locator('#dynamicInputValue').inputValue(),'5');assert.equal(await p.locator('#dynamicInputSuffix').textContent(),'m');await p.keyboard.type('.5');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal(await armed(),true);assert.equal(await p.evaluate(()=>barNumericSession.state.distance.mode),'locked');assert.deepEqual(await snapshot(),before);
  await click(400,300);assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);assert(Math.abs(await p.evaluate(()=>Math.hypot(items[0].x2-items[0].x,items[0].y2-items[0].y))-5.5*789)<1e-6);assert.equal(await armed(),true);
  // Native chaining now re-arms a fresh LIVE/LIVE session after completion.
  await click(600,300);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await armed(),true);
  await reset();await click(200,200);await p.evaluate(()=>{window.calls=[];const s=dynamicNumericCapture;s.onConfirm=()=>calls.push('confirm');s.onCancel=()=>calls.push('cancel')});await click(400,300);assert.deepEqual(await p.evaluate(()=>calls),[]);assert.equal(await armed(),true);
  for(const action of ['escape','tool','new','undo','open']){
   await reset();await click(200,200);await p.keyboard.type('5');
   if(action==='escape')await p.keyboard.press('Escape');
   else if(action==='tool')await p.evaluate(()=>setMode('thin'));
   else if(action==='new')await p.evaluate(()=>newDocument());
   else if(action==='undo')await p.evaluate(()=>{past.push([]);actions.undo[1]()});
   else await p.evaluate(async()=>loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'empty.json')));
   assert.equal(await armed(),false);assert(await p.locator('#dynamicInput').isHidden());
  }
  await reset();await click(200,200);await p.keyboard.press('Escape');assert.equal(await armed(),false);assert.equal(await p.evaluate(()=>first),null);
  await reset();await click(200,200);await p.evaluate(()=>openArmedDynamicInput());assert.equal(await p.locator('#dynamicInputSuffix').textContent(),'m');await p.locator('#dynamicInputValue').fill('9');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await armed(),true);
  // Existing endpoint snapping still supplies the selected start and endpoint.
  await p.evaluate(()=>{document.activeElement.blur();items=[make('bar',200,200,500,200)];setMode('bar')});await click(203,202);assert.deepEqual(await p.evaluate(()=>first),{x:200,y:200});await click(498,202);assert.deepEqual(await p.evaluate(()=>[items[1].x,items[1].y,items[1].x2,items[1].y2]),[200,200,500,200]);assert.equal(await armed(),true);
  // A direct component session owned by another caller survives bar cleanup.
  await reset();await click(200,200);await p.evaluate(()=>{showDynamicInput({value:'42',suffix:'other'});setMode('thin')});assert(await p.locator('#dynamicInput').isVisible());await p.evaluate(()=>hideDynamicInput());
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS bar numeric integration desktop/touch: first point, anchor, typing/API, no numeric creation, native click/chaining/snap/history, cleanup and ownership');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

