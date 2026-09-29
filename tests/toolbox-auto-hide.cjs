const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const c=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const panel=p.locator('#toolPanel'),handle=p.locator('#toggleTools'),pin=p.locator('#toolboxPin');
  const tap=async el=>touch?el.tap():el.click();
  const mode=()=>p.locator('main').getAttribute('data-toolbox-mode');
  const rect=()=>p.locator('#drawing').boundingBox();
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),first,mode,geometryScale,internalForceScale,camera}));
  const before=await snapshot();assert.equal(await mode(),'pinned-open');assert(await panel.isVisible());assert.equal(await pin.getAttribute('aria-pressed'),'true');
  const pinned=await rect();await p.mouse.move(1300,800);await p.waitForTimeout(450);assert(await panel.isVisible());
  await tap(pin);assert.equal(await mode(),'auto-hide');assert(await panel.isHidden());const closed=await rect();assert(closed.width>pinned.width);
  if(touch)await tap(handle);else await handle.hover();assert(await panel.isVisible());assert.deepEqual(await rect(),closed);
  assert.equal(await pin.getAttribute('aria-pressed'),'false');
  if(!touch){
   await panel.hover();await p.mouse.move(1300,800);await p.waitForTimeout(200);assert(await panel.isVisible());await panel.hover();await p.waitForTimeout(450);assert(await panel.isVisible());
   await p.mouse.move(1300,800);await p.waitForTimeout(450);assert(await panel.isHidden());assert.deepEqual(await rect(),closed);await handle.hover();
  }else{
   await p.locator('#toolPanel h2').tap();await panel.evaluate(el=>{el.scrollTop=40;el.dispatchEvent(new Event('scroll'))});await p.waitForTimeout(450);assert(await panel.isVisible());
   await p.locator('header strong').tap();assert(await panel.isHidden());await tap(handle);assert(await panel.isVisible());
  }
  await tap(pin);assert.equal(await mode(),'pinned-open');assert.deepEqual(await rect(),pinned);
  await tap(handle);assert.equal(await mode(),'collapsed');assert(await panel.isHidden());assert.equal(await handle.textContent(),'›');
  await handle.hover();await p.waitForTimeout(450);assert(await panel.isHidden());await tap(handle);assert.equal(await mode(),'pinned-open');assert(await panel.isVisible());
  assert.deepEqual(await snapshot(),before);
  // Keyboard focus opens auto-hide and keeps it accessible until focus leaves.
  if(!touch){await tap(pin);await p.keyboard.press('Tab');await p.evaluate(()=>document.getElementById('toggleTools').focus());assert(await panel.isVisible());await p.waitForTimeout(450);assert(await panel.isVisible());await p.locator('#installApp').evaluate(el=>{el.hidden=false;el.focus()});await p.waitForTimeout(450);assert(await panel.isHidden())}
  for(const width of [1280,800,600,360]){
   await p.setViewportSize({width,height:900});
   for(const next of ['pinned-open','auto-hide','collapsed']){
    await p.evaluate(next=>setToolboxMode(next),next);if(next==='auto-hide')await p.evaluate(()=>openToolboxOverlay());
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${next}`);assert(await handle.isVisible());
    if(next==='auto-hide'){const box=await panel.boundingBox();assert(box.x>=0&&box.x+box.width<=width)}
   }
  }
  assert.deepEqual(errors,[]);await c.close();console.log(`PASS toolbox ${touch?'touch':'mouse'}: pin/hover/focus/delay/reentry/tap/outside/scroll, overlay stable canvas, collapse/reopen, unchanged drawing, responsive overflow`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
