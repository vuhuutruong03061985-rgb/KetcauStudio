const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginThinNumericInput==='function');
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const reset=()=>p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];setMode('thin');savedDocument=documentText();saveDraft()});
  const armed=()=>p.evaluate(()=>isDynamicNumericInputArmed());
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),draft:localStorage.getItem(draftKey),saved:savedDocument,snap:copy(snapOptions)}));
  await reset();assert.equal(await armed(),false);await click(200,200);assert.equal(await armed(),true);
  const q=await coords(400,300);await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType:touch?'touch':'mouse'});assert(await p.evaluate(()=>!!hover));const anchor=await p.evaluate(()=>[dynamicNumericCapture.clientX,dynamicNumericCapture.clientY]);assert(Math.abs(anchor[0]-q.x)<.001&&Math.abs(anchor[1]-q.y)<.001);
  await p.evaluate(()=>saveDraft());const before=await snapshot();await p.keyboard.type('110');assert.equal(await p.locator('#dynamicInputValue').inputValue(),'110');assert.equal(await p.locator('#dynamicInputSuffix').textContent(),'NL');assert(await p.locator('#dynamicInputSecondary').isHidden());await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await armed(),true);assert.deepEqual(await snapshot(),before);
  await click(400,300);assert(Math.abs(await p.evaluate(()=>Math.hypot(items[0].x2-items[0].x,items[0].y2-items[0].y))-11)<1e-6);assert.equal(await p.evaluate(()=>past.length),1);
  await reset();await click(200,200);await p.evaluate(()=>{window.calls=[];dynamicNumericCapture.onConfirm=()=>calls.push('confirm');dynamicNumericCapture.onCancel=()=>calls.push('cancel')});await click(400,300);assert.equal(await armed(),true);assert.deepEqual(await p.evaluate(()=>calls),[]);await click(600,300);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await armed(),true);
  for(const action of ['escape','tool','new','open','undo']){
   await reset();await click(200,200);await p.evaluate(()=>openArmedDynamicInput());
   if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(async action=>{if(action==='tool')setMode('dashed');if(action==='new')newDocument();if(action==='undo'){past.push([]);actions.undo[1]()}if(action==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'old.json'))},action);
   assert.equal(await armed(),false);assert.equal(await p.evaluate(()=>thinNumericSession),null);assert(await p.locator('#dynamicInput').isHidden());
  }
  await reset();await click(200,200);await p.keyboard.press('Escape');assert.equal(await armed(),false);
  await reset();await click(200,200);await p.evaluate(()=>openArmedDynamicInput());await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await armed(),true);
  await reset();await p.evaluate(()=>{items=[make('bar',200,200,500,200)];render()});await click(202,201);assert.deepEqual(await p.evaluate(()=>first),{x:200,y:200});await click(498,201);assert.deepEqual(await p.evaluate(()=>[items[1].x,items[1].y,items[1].x2,items[1].y2]),[200,200,500,200]);assert.equal(await armed(),true);
  await reset();await click(200,200);await p.evaluate(()=>{showDynamicInput({value:'42',suffix:'other'});setMode('select')});assert(await p.locator('#dynamicInput').isVisible());await p.evaluate(()=>hideDynamicInput());
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS thin numeric lifecycle desktop/touch: arm, typing/API, anchor/preview/snap, native click/chaining, confirm without model changes, cleanup and ownership');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
