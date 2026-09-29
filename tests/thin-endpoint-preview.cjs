const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const touch of [false,true]){
 const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginThinNumericInput==='function');
 const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {clientX:q.x,clientY:q.y}},{x,y});
 const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.clientX,q.clientY);else await p.mouse.click(q.clientX,q.clientY)};
 const move=async(x,y)=>p.locator('#drawing').dispatchEvent('pointermove',{...await coords(x,y),pointerType:touch?'touch':'mouse'});
 const start=async()=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];internalForceScale=10;camera={x:0,y:0,w:1100,h:720};applyCamera();setMode('thin')});await click(300,300);await move(500,300)};
 const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),draft:localStorage.getItem(draftKey),saved:savedDocument,snap:copy(snapOptions)}));
 await start();await p.evaluate(()=>{saveDraft();savedDocument=documentText()});const before=await snapshot();await p.evaluate(()=>openArmedDynamicInput());
 for(const invalid of ['','0','-110','NaN','Infinity']){await p.locator('#dynamicInputValue').fill(invalid);await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'live');assert(await p.locator('#dynamicInput').isVisible())}
 await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());assert(await p.locator('#dynamicInput').isVisible());assert.deepEqual(await snapshot(),before);
 for(const [x,y]of [[500,300],[320,300],[100,300],[300,100],[300,500],[600,600]]){
 await move(x,y);const r=await p.evaluate(()=>({first,endpoint:thinNumericSession.endpoint,value:thinNumericSession.value,line:svg.querySelector('[data-thin-preview] line')?.getAttribute('x2')}));assert.equal(r.value,110);assert(Math.abs(Math.hypot(r.endpoint.x-r.first.x,r.endpoint.y-r.first.y)-11)<1e-8);assert.equal(Number(r.line),r.endpoint.x);assert(await p.locator('#dynamicInput').isVisible());}
 for(const w of [550,2200]){await p.evaluate(w=>{camera.w=w;camera.h=w*720/1100;applyCamera()},w);await move(500,300);assert(Math.abs(await p.evaluate(()=>thinNumericSession.endpoint.x-first.x)-11)<1e-8)}
 await p.evaluate(()=>{internalForceScale=5});await move(500,300);assert(Math.abs(await p.evaluate(()=>thinNumericSession.endpoint.x-first.x)-22)<1e-8);
 // Task 5C commits the solved preview and starts a fresh unlocked session.
 await click(500,300);assert(Math.abs(await p.evaluate(()=>items[0].x2-items[0].x)-22)<.001);assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'live');
 for(const action of ['escape','tool','new','open','undo']){
 await start();await p.keyboard.type('110');await p.evaluate(()=>dynamicInputUI.confirmPending());
 if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(async a=>{if(a==='tool')setMode('bar');if(a==='new')newDocument();if(a==='undo'){past.push([]);actions.undo[1]()}if(a==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'old.json'))},action);
 assert.equal(await p.evaluate(()=>thinNumericSession),null);assert.equal(await p.locator('[data-thin-preview]').count(),0);}
 await start();assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'live');assert.equal(await p.evaluate(()=>thinNumericSession.value),await p.evaluate(()=>Math.hypot(hover.x-first.x,hover.y-first.y)*internalForceScale));
 assert.deepEqual(errors,[]);await c.close();
}console.log('PASS thin preview desktop/touch validation, lock without document changes, direction/zoom/scale, old commit and cleanup');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

