'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`);
const samePose=(a,b)=>{for(const key of ['x','y','angle','size'])near(a[key],b[key])};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForFunction(()=>typeof cancelToSelection==='function');
  // Count the production solver calls without substituting a second geometry implementation.
  await page.evaluate(()=>{
   window.personSolveCalls=0;const solve=personPlacementAt;personPlacementAt=e=>{personSolveCalls++;return solve(e)};
  });
  const reset=()=>page.evaluate(()=>{
   cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();
   items=[make('bar',200,300,600,300),make('bar',700,200,700,600),make('bar',200,500,600,700)];
   past=[];future=[copy(items)];selected=items[0].id;setMode('person');render();
  });
  const screen=q=>page.evaluate(q=>{const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},q);
  const expected=q=>page.evaluate(q=>{
   const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM()),pose=personPlacementAt({clientX:p.x,clientY:p.y});
   return pose?{...pose,size:PERSON_DEFAULT_SIZE}:null;
  },q);
  // Dispatch original PointerEvents through the existing SVG/window handlers, not helper calls.
  const pen=(type,q={x:400,y:288},options={})=>page.evaluate(({type,q,options})=>{
   const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM()),{target=null,outside=false,...init}=options;
   (target?document.querySelector(target):outside?document.body:svg).dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:71,isPrimary:true,clientX:p.x,clientY:p.y,button:type==='pointermove'?-1:0,buttons:0,pressure:0,...init}));
  },{type,q,options});
  const doc=()=>page.evaluate(()=>({text:documentText(),items:copy(items),past:copy(past),future:copy(future),selected,multi:[...multiSelection]}));
  const pose=()=>page.evaluate(()=>penConnectionPlacement?.lockedCandidate||null);
  const state=()=>page.evaluate(()=>penConnectionPlacement?.state||'tracking');
  const calls=()=>page.evaluate(()=>personSolveCalls);
  const preview=()=>page.locator('[data-person-preview]').count().then(n=>n?page.locator('[data-person-preview]').getAttribute('transform'):null);
  const bubble=page.locator('#penConnectionBubble'),halo=page.locator('#penConnectionLockHalo');
  const selector=action=>`#penConnectionBubble [data-pen-connection-action="${action}"]`;
  const button=action=>page.locator(selector(action));
  async function assertPreview(candidate){
   const transform=await page.evaluate(candidate=>personTransform(candidate),candidate);assert.equal(await preview(),transform);
   assert.equal(await page.locator('[data-person-preview]').getAttribute('opacity'),'0.45');
   assert.equal(await page.locator('[data-person-preview]').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  }
  async function assertHalo(candidate){
   assert.equal(await halo.isVisible(),true);const point=await screen(candidate);
   const actual=await halo.evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,pointerEvents:getComputedStyle(el).pointerEvents}});
   assert(Math.abs(actual.x-point.x)<.03&&Math.abs(actual.y-point.y)<.03);assert.equal(actual.pointerEvents,'none');
  }
  async function lock(q={x:400,y:288},pressure=.22){
   const candidate=await expected(q);await pen('pointerdown',q,{buttons:1,pressure});assert.equal(await state(),'position-locked');
   samePose(await pose(),candidate);await assertPreview(candidate);await assertHalo(candidate);assert.equal(await bubble.isVisible(),false);
   await pen('pointerup',{x:712,y:400});assert.equal(await state(),'confirming');assert.equal(await bubble.isVisible(),true);return candidate;
  }
  async function activate(action,touch=false){
   const r=await button(action).boundingBox();assert(r);assert.equal(r.width,48);assert.equal(r.height,48);
   if(touch)await page.touchscreen.tap(r.x+24,r.y+24);else await page.mouse.click(r.x+24,r.y+24);
  }
  async function assertCleared(){
   assert.equal(await pose(),null);assert.equal(await preview(),null);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.equal(await page.evaluate(()=>mode),'person');
  }
  async function assertPlaced(before,candidate,exact=true){
   const after=await doc();assert.equal(after.items.length,before.items.length+1);const object=after.items.at(-1);
   assert.equal(object.type,'person');samePose(object,candidate);if(exact)assert.deepEqual({x:object.x,y:object.y,angle:object.angle,size:object.size},candidate);
   assert.deepEqual(Object.keys(object).sort(),['angle','id','size','type','x','y']);
   assert.deepEqual(after.past,[...before.past,before.items]);assert.deepEqual(after.future,[]);assert.equal(after.selected,object.id);await assertCleared();return after;
  }
  await reset();const before=await doc();
  for(const q of [{x:400,y:288},{x:400,y:312},{x:688,y:400},{x:712,y:400},{x:395.528,y:608.944},{x:404.472,y:591.056}]){
   const candidate=await expected(q);assert(candidate);await pen('pointermove',q,{buttons:0,pressure:0});await assertPreview(candidate);
   assert.equal(await state(),'tracking');assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.deepEqual(await doc(),before);
  }
  for(const q of [{x:400,y:300},{x:400,y:450}]){
   assert.equal(await expected(q),null);await pen('pointermove',q);await assertCleared();assert.deepEqual(await doc(),before);
   await pen('pointerdown',q,{buttons:1,pressure:.22});await pen('pointerup',q);await assertCleared();assert.deepEqual(await doc(),before);
  }
  for(const type of ['pointerenter','pointerover'])await pen(type,{x:400,y:288},{buttons:1,pressure:.22});
  await assertCleared();assert.deepEqual(await doc(),before);
  // A different down-event side is authoritative, then no further Bar/side solve is allowed.
  await pen('pointermove',{x:400,y:312});const downPose=await expected({x:400,y:288});samePose(downPose,{x:400,y:276,angle:180,size:2});
  await pen('pointerdown',{x:400,y:288},{buttons:1,pressure:.22});samePose(await pose(),downPose);
  assert.equal(await page.evaluate(()=>Object.isFrozen(penConnectionPlacement.lockedCandidate)),true);
  assert.deepEqual(Object.keys(await pose()).sort(),['angle','size','x','y']);assert.deepEqual(await doc(),before);await assertHalo(downPose);
  const solveCount=await calls(),frozenPreview=await preview(),frozenHalo=await halo.boundingBox();
  for(const q of [{x:400,y:312},{x:712,y:400},{x:395.528,y:608.944},{x:800,y:450}]){
   await pen('pointermove',q,{buttons:1,pressure:.22});await pen('pointerdown',q,{pointerId:72,buttons:1,pressure:.5});
   assert.deepEqual(await pose(),downPose);assert.equal(await preview(),frozenPreview);assert.deepEqual(await halo.boundingBox(),frozenHalo);assert.equal(await calls(),solveCount);assert.deepEqual(await doc(),before);
  }
  await pen('pointerleave');assert.equal(await preview(),frozenPreview);
  await pen('pointerup',undefined,{pointerId:72});assert.equal(await state(),'position-locked');assert.equal(await bubble.isVisible(),false);
  await pen('pointerup',{x:712,y:400},{outside:true});assert.equal(await state(),'confirming');assert.equal(await bubble.isVisible(),true);
  const frozenBubble=await bubble.boundingBox();
  for(const q of [{x:400,y:312},{x:688,y:400},{x:404.472,y:591.056}]){
   await pen('pointermove',q);await pen('pointerdown',q,{buttons:1,pressure:.22});await pen('pointerup',q);
   assert.deepEqual(await pose(),downPose);assert.equal(await preview(),frozenPreview);assert.deepEqual(await halo.boundingBox(),frozenHalo);assert.deepEqual(await bubble.boundingBox(),frozenBubble);assert.deepEqual(await doc(),before);
  }
  await pen('pointerleave');await pen('pointercancel');await page.evaluate(()=>{render();camera.x+=15;applyCamera();window.dispatchEvent(new Event('resize'))});
  await assertPreview(downPose);await assertHalo(downPose);assert.deepEqual(await bubble.boundingBox(),frozenBubble);assert.equal(await calls(),solveCount);
  assert.equal(await page.evaluate(()=>new DOMParser().parseFromString(exportSVG(),'image/svg+xml').querySelectorAll('[data-person-preview],#penConnectionBubble,#penConnectionLockHalo').length),0);
  await assertPreview(downPose);assert.deepEqual(await doc(),before);assert.equal(await calls(),solveCount);
  assert.deepEqual(await page.evaluate(()=>[document.querySelectorAll('#penConnectionBubble').length,document.querySelectorAll('#penConnectionLockHalo').length]),[1,1]);
  // Pen command down resolves once; release/click cannot resolve even a newly locked pose.
  await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});const placed=await assertPlaced(before,downPose);
  await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await pen('pointermove');assert.deepEqual(await doc(),placed);await assertCleared();
  await pen('pointerup',undefined,{outside:true});const next=await lock({x:400,y:312}),nextPreview=await preview();
  for(const action of ['confirm','cancel']){
   for(const detail of [0,1,2])await button(action).evaluate((b,detail)=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail})),detail);
   await pen('click',undefined,{target:selector(action)});await pen('pointerup');assert.deepEqual(await doc(),placed);assert.equal(await preview(),nextPreview);
  }
  await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});const twice=await assertPlaced(placed,next);await pen('pointerup',undefined,{outside:true});
  await lock();await pen('pointerdown',undefined,{target:selector('cancel'),buttons:1,pressure:.22});await assertCleared();assert.deepEqual(await doc(),twice);
  await pen('pointercancel',undefined,{outside:true});
  // False contacts can only lock; matching cancel and tool exit retire all transient UI.
  await reset();const safe=await doc();await lock({x:400,y:288},0);assert.deepEqual(await doc(),safe);await activate('cancel');await assertCleared();assert.deepEqual(await doc(),safe);
  await pen('pointerdown',undefined,{buttons:1,pressure:.22});await pen('pointercancel',undefined,{pointerId:72,outside:true});assert.equal(await state(),'position-locked');
  await pen('pointercancel',undefined,{outside:true});await assertCleared();assert.deepEqual(await doc(),safe);await pen('pointerup');await assertCleared();
  await lock();await page.evaluate(()=>setMode('bar'));assert.equal(await preview(),null);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.deepEqual(await doc(),safe);
  // Reuse the command controls for finger, mouse and keyboard; no new UI/component behavior.
  for(const touch of [false,true])for(const action of ['confirm','cancel']){
   await reset();const base=await doc(),candidate=await lock();await activate(action,touch);
   if(action==='confirm')await assertPlaced(base,candidate);else{await assertCleared();assert.deepEqual(await doc(),base)}
  }
  for(const [action,key]of [['confirm','Enter'],['cancel','Space']]){
   await reset();const base=await doc(),candidate=await lock();await button(action).focus();await page.keyboard.press(key);
   if(action==='confirm')await assertPlaced(base,candidate);else{await assertCleared();assert.deepEqual(await doc(),base)}
  }
  // Native mouse/finger canvas placement still uses its own current event pose, in every phase.
  for(const touch of [false,true])for(const phase of ['tracking','position-locked','confirming']){
   await reset();const base=await doc();await pen('pointermove');if(phase!=='tracking')await pen('pointerdown',undefined,{buttons:1,pressure:.22});if(phase==='confirming')await pen('pointerup');
   const q={x:400,y:312},candidate=await expected(q),p=await screen(q);
   if(touch)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);await assertPlaced(base,candidate,false);
  }
  // Grid/Snap toggles do not replace Person's existing raw-point/nearest-Bar policy.
  for(const enabled of [true,false]){
   await reset();await page.evaluate(enabled=>{gridVisible=enabled;snapEnabled=enabled;gridSize=50},enabled);
   const base=await doc(),candidate=await lock();samePose(candidate,{x:400,y:276,angle:180,size:2});assert.deepEqual(await doc(),base);await activate('cancel');
  }
  // Select Person through the real tablet radial menu, then use native Chromium pen input.
  await reset();await page.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close()});
  for(const id of ['hub','annotation','person']){
   const q=await page.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return {x:m.layout.cx+13,y:m.layout.cy};const ring=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(r=>r.id===ring.id).sectors[ring.entries.findIndex(e=>e.id===id)].icon},id);
   await page.touchscreen.tap(q.x,q.y);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  assert.equal(await page.evaluate(()=>mode),'person');assert.equal(await page.evaluate(()=>leftDrawingMenu.state.open),false);
  const nativeBefore=await doc(),nativePose=await expected({x:400,y:288}),a=await screen({x:400,y:288}),b=await screen({x:400,y:312}),cdp=await page.context().newCDPSession(page);
  const native=(type,q,down=false)=>cdp.send('Input.dispatchMouseEvent',{type,...q,pointerType:'pen',buttons:down?1:0,force:down?.22:0,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});
  await native('mouseMoved',a);const nativeHover=await page.evaluate(()=>penConnectionPlacement.hoverCandidate);samePose(nativeHover,nativePose);await assertPreview(nativeHover);assert.equal(await halo.isVisible(),false);
  await native('mousePressed',a,true);const nativeLocked=await pose();samePose(nativeLocked,nativePose);
  await native('mouseMoved',b,true);assert.deepEqual(await pose(),nativeLocked);assert.deepEqual(await doc(),nativeBefore);
  await native('mouseReleased',b);const rect=await bubble.boundingBox();assert(rect);await assertPreview(nativeLocked);
  const r=await button('confirm').boundingBox(),target={x:r.x+24,y:r.y+24};
  for(let i=1;i<=8;i++){await native('mouseMoved',{x:b.x+(target.x-b.x)*i/8,y:b.y+(target.y-b.y)*i/8});await assertPreview(nativeLocked);assert.deepEqual(await bubble.boundingBox(),rect)}
  await native('mousePressed',target,true);await native('mouseReleased',target);const nativePlaced=await assertPlaced(nativeBefore,nativeLocked);
  await native('mouseMoved',b);await native('mousePressed',b,true);await native('mouseReleased',a);const c=await button('cancel').boundingBox(),cancelTarget={x:c.x+24,y:c.y+24};
  await native('mouseMoved',cancelTarget);await native('mousePressed',cancelTarget,true);await native('mouseReleased',cancelTarget);await assertCleared();assert.deepEqual(await doc(),nativePlaced);await cdp.detach();
  assert.deepEqual(errors,[]);
  console.log('PASS pen Person: existing solver/side/orientation, immutable full pose, matching release/cancel, canvas false-contact safety, shared halo/bubble, explicit commands/dedup, mouse/touch/keyboard, Grid/Snap policy and native radial/pen input (emulated)');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
