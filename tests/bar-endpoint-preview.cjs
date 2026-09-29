const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const c=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
  const event=(x,y)=>p.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {clientX:p.x,clientY:p.y}},{x,y});
  const move=async(x,y)=>p.locator('#drawing').dispatchEvent('pointermove',{...await event(x,y),pointerType:touch?'touch':'mouse'});
  const start=async()=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];geometryScale=100;setMode('bar');camera={x:0,y:0,w:1100,h:720};applyCamera()});const e=await event(300,300);if(touch)await p.touchscreen.tap(e.clientX,e.clientY);else await p.mouse.click(e.clientX,e.clientY);await move(500,300)};
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),draft:localStorage.getItem(draftKey),saved:savedDocument}));
  const endpoint=()=>p.evaluate(()=>barNumericSession.endpoint);
  const lock=async(id,value)=>{await p.locator('#'+id).fill(value);await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab')};
  const length=async()=>p.evaluate(()=>Math.hypot(barNumericSession.endpoint.x-first.x,barNumericSession.endpoint.y-first.y));
  const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
  await start();assert.deepEqual(await endpoint(),await p.evaluate(()=>hover));
  await p.evaluate(()=>{saveDraft();savedDocument=documentText()});const before=await snapshot();
  await lock('dynamicInputValue','5.5');near(await length(),550);assert.deepEqual(await snapshot(),before);
  const line=await p.evaluate(()=>{const l=svg.querySelector('[data-bar-preview] line');return {x:+l.getAttribute('x2'),y:+l.getAttribute('y2')}});assert.deepEqual(line,await endpoint());
  await move(400,500);near(await length(),550);near(await p.evaluate(()=>barNumericSession.state.angle.value),(Math.atan2(-200,100)*180/Math.PI+360)%360);
  await lock('dynamicInputSecondary','30');const fixed=await endpoint();await move(600,600);assert.deepEqual(await endpoint(),fixed);near(fixed.x,await p.evaluate(()=>first.x+Math.cos(Math.PI/6)*550));near(fixed.y,await p.evaluate(()=>first.y-275));
  for(const w of [550,2200]){await p.evaluate(w=>{camera.w=w;camera.h=w*720/1100;applyCamera()},w);await move(500,400);assert.deepEqual(await endpoint(),fixed)}
  await start();await lock('dynamicInputSecondary','90');await move(600,700);near(await length(),500);near((await endpoint()).x,await p.evaluate(()=>first.x));near(await p.evaluate(()=>barNumericSession.state.distance.value),5);
  assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);
  for(const action of ['escape','tool','new','open','undo']){
   await start();await lock('dynamicInputValue','5.5');
   if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(async action=>{if(action==='tool')setMode('thin');if(action==='new')newDocument();if(action==='undo'){past.push([]);actions.undo[1]()}if(action==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'old.json'))},action);
   assert.equal(await p.evaluate(()=>barNumericSession),null);assert.equal(await p.locator('[data-bar-preview]').count(),0);
  }
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS solver preview desktop/touch: immediate lock rendering, live consistency, zoom invariance, no document/draft/history mutation on lock, cleanup');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
