'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
const samePoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
async function assertLocalBubble(page,bubble,point,dimensions){
 const p=await page.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},point),r=await bubble.boundingBox(),canvas=await page.locator('#drawing').boundingBox();
 assert.equal(r.width,dimensions.width);assert.equal(r.height,dimensions.height);
 assert(r.x>=canvas.x+7.9&&r.y>=canvas.y+7.9&&r.x+r.width<=canvas.x+canvas.width-7.9&&r.y+r.height<=canvas.y+canvas.height-7.9);
 assert(Math.hypot(Math.max(r.x-p.x,0,p.x-r.x-r.width),Math.max(r.y-p.y,0,p.y-r.y-r.height))<=120);
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForFunction(()=>typeof supportGlobalAngle==='function');
  // Count actual solver use; events below always traverse the production handlers.
  await page.evaluate(()=>{window.supportSolveCalls=0;const solve=solveSupportAngle;solveSupportAngle=(a,b)=>{supportSolveCalls++;return solve(a,b)}});
  const reset=(subtype='pin',bars=[[307,307,607,307],[307,307,307,607]])=>page.evaluate(({subtype,bars})=>{
   cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();document.activeElement?.blur();
   items=bars.map((bar,i)=>make('bar',...bar,{id:'reference-'+i}));past=[];future=[copy(items)];selected=items[0]?.id||null;
   snapEnabled=true;gridVisible=true;gridSize=50;for(const key in snapOptions)snapOptions[key]=['endpoint','grid','member'].includes(key);
   $('support').value=subtype;$('direction').value='down';setMode('support');render();
  },{subtype,bars});
  const screen=q=>page.evaluate(q=>{const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},q);
  const pen=(type,q={x:303,y:303},options={})=>page.evaluate(({type,q,options})=>{
   const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM()),{target=null,outside=false,...init}=options;
   (target?document.querySelector(target):outside?document.body:svg).dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:71,isPrimary:true,clientX:p.x,clientY:p.y,button:type==='pointermove'?-1:0,buttons:0,pressure:0,...init}));
  },{type,q,options});
  const down=(q,options={})=>pen('pointerdown',q,{buttons:1,pressure:.22,...options});
  const doc=()=>page.evaluate(()=>({text:documentText(),items:copy(items),past:copy(past),future:copy(future),selected,multi:[...multiSelection]}));
  const state=()=>page.evaluate(()=>penConnectionPlacement?.state||(supportPlacementSession?.tablet?'angle-tracking':'tracking'));
  const anchor=()=>page.evaluate(()=>penConnectionPlacement?.lockedAnchor||supportPlacementSession?.anchorPoint||null);
  const pose=()=>page.evaluate(()=>supportPlacementSession?{...supportPlacementSession.anchorPoint,support:supportPlacementSession.supportSubtype,direction:supportPlacementSession.direction,supportAngle:supportPlacementSession.previewAngle}:null);
  const session=()=>page.evaluate(()=>copy(supportPlacementSession));
  const calls=()=>page.evaluate(()=>supportSolveCalls);
  const preview=()=>page.locator('[data-support-preview]').count().then(n=>n?page.locator('[data-support-preview]').evaluate(el=>el.outerHTML):null);
  const bubble=page.locator('#penConnectionBubble'),halo=page.locator('#penConnectionLockHalo'),input=page.locator('#dynamicInputValue');
  const selector=action=>`#penConnectionBubble [data-pen-connection-action="${action}"]`;
  const button=action=>page.locator(selector(action));
  async function assertHalo(point){
   assert.equal(await halo.isVisible(),true);const p=await screen(point),r=await halo.boundingBox();
   assert(Math.abs(r.x+r.width/2-p.x)<.03&&Math.abs(r.y+r.height/2-p.y)<.03);assert.equal(r.width,30);assert.equal(r.height,30);
   assert.equal(await halo.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
  }
  async function assertCleared(subtype){
   assert.equal(await anchor(),null);assert.equal(await session(),null);assert.equal(await preview(),null);
   assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.equal(await page.evaluate(()=>supportNumericSession),null);
   assert.equal(await page.evaluate(()=>mode),'support');assert.equal(await page.locator('#support').inputValue(),subtype);
   assert.equal(await page.locator('[data-support-reference],.reference-angle-preview').count(),0);
  }
  async function activate(action,touch=false){
   const r=await button(action).boundingBox();assert(r);assert.equal(r.width,48);assert.equal(r.height,48);
   if(touch)await page.touchscreen.tap(r.x+24,r.y+24);else await page.mouse.click(r.x+24,r.y+24);
  }
  async function assertAngleTracking(before,point,subtype){
   assert.equal(await state(),'angle-tracking');assert.deepEqual(await anchor(),point);assert.equal(await halo.isVisible(),false);assert.equal(await page.evaluate(()=>penConnectionPlacement),null);
   assert.equal(await bubble.isVisible(),false);assert.equal((await session()).supportSubtype,subtype);
   assert.equal(await page.evaluate(()=>isDynamicNumericInputArmed()),true);assert.equal(await page.locator('#dynamicInput').isVisible(),true);assert.deepEqual(await doc(),before);
  }
  async function lockAnchor(q={x:303,y:303},options={}){
   const before=await doc();
   await down(q,options);assert.equal(await state(),'anchor-locked');assert.equal(await bubble.isVisible(),false);
   const point=await anchor();await assertHalo(point);await pen('pointerup',{x:507,y:407});
   assert.equal(await state(),'anchor-confirming');assert.equal(await bubble.isVisible(),true);assert.deepEqual(await doc(),before);
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await pen('pointerup',undefined,{outside:true});
   await assertAngleTracking(before,point,await page.locator('#support').inputValue());return point;
  }
  async function assertPlaced(before,candidate,subtype){
   const after=await doc();assert.equal(after.items.length,before.items.length+1);const object=after.items.at(-1);
   for(const key of ['x','y','support','direction','supportAngle'])assert.equal(object[key],candidate[key]);
   assert.equal(object.type,'support');assert.equal(object.support,subtype);assert(!('referenceBarId'in object));
   assert.deepEqual(after.past,[...before.past,before.items]);assert.deepEqual(after.future,[]);assert.equal(after.selected,object.id);await assertCleared(subtype);return after;
  }
  for(const subtype of ['pin','pin-plain','roller','roller-plain','fixed']){
   await reset(subtype);const before=await doc();
   for(const q of [{x:303,y:303},{x:424,y:436},{x:524,y:536},{x:303,y:303}]){
    const expected=await page.evaluate(q=>{const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return drawingPoint({clientX:p.x,clientY:p.y})},q);
    await pen('pointermove',q,{buttons:0,pressure:0});const transform=await page.locator('[data-support-preview] > g').getAttribute('transform');
    assert.equal(transform,`translate(${expected.x} ${expected.y}) rotate(0)`);assert.equal(await page.locator('[data-support-preview]').count(),1);
    assert.equal(await session(),null);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.deepEqual(await doc(),before);
   }
   for(const type of ['pointerenter','pointerover'])await pen(type,undefined,{buttons:1,pressure:.22});assert.equal(await state(),'tracking');assert.deepEqual(await doc(),before);
   // The down-event endpoint wins over the previous grid hover, and subtype is stored by the normal session.
   await pen('pointermove',{x:424,y:436});await down({x:303,y:303});const point=await anchor();samePoint(point,{x:307,y:307});
   assert.equal((await session()).supportSubtype,subtype);assert.equal(await page.evaluate(()=>Object.isFrozen(penConnectionPlacement.lockedAnchor)),true);
   await assertHalo(point);assert.deepEqual(await doc(),before);const initialHalo=await halo.boundingBox(),initialPreview=await preview();
   await pen('pointermove',{x:600,y:650},{buttons:1,pressure:.22});await down({x:600,y:650},{pointerId:72});assert.deepEqual(await anchor(),point);assert.equal(await preview(),initialPreview);
   await pen('pointerup',undefined,{pointerId:72});assert.equal(await state(),'anchor-locked');await pen('pointercancel',undefined,{pointerId:72});assert.equal(await state(),'anchor-locked');
   await pen('pointerup',{x:507,y:407},{outside:true});assert.equal(await state(),'anchor-confirming');assert.equal(await bubble.isVisible(),true);
   assert.equal(await page.evaluate(()=>isDynamicNumericInputArmed()),false);const anchorBubble=await bubble.boundingBox(),anchorSession=await session(),anchorCalls=await calls();
   for(const q of [{x:307,y:337},{x:337,y:307},{x:700,y:600}]){
    await pen('pointermove',q);await down(q);await pen('pointerup',q);
    assert.deepEqual(await anchor(),point);assert.equal(await preview(),initialPreview);assert.deepEqual(await session(),anchorSession);
    assert.deepEqual(await bubble.boundingBox(),anchorBubble);assert.deepEqual(await halo.boundingBox(),initialHalo);assert.equal(await calls(),anchorCalls);assert.deepEqual(await doc(),before);
   }

   // Bubble point confirmation releases ownership to the existing shared keypad.
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await assertAngleTracking(before,point,subtype);
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await down({x:477,y:427});assert.equal((await session()).angle.mode,'live');assert.deepEqual(await doc(),before);
   await pen('pointerup',undefined,{outside:true});await assertAngleTracking(before,point,subtype);
   assert(await page.locator('#tabletNumericKeypad').isVisible());assert.equal(await input.getAttribute('inputmode'),'none');
   for(const q of [{x:407,y:507},{x:407,y:207},{x:207,y:407},{x:437,y:407}]){
    const expected=await page.evaluate(({point,q})=>solveSupportAngle(point,q),{point,q});await pen('pointermove',q);
    near((await session()).previewAngle,expected);assert.equal((await session()).angle.mode,'live');assert.deepEqual(await anchor(),point);assert.deepEqual(await doc(),before);
   }
   // Canvas contact never locks or places; it still uses the raw orientation solver.
   const angle=await page.evaluate(()=>solveSupportAngle(supportPlacementSession.anchorPoint,{x:477,y:427}));
   await down({x:477,y:427});await pen('pointerup');near((await pose()).supportAngle,angle);assert.equal((await session()).angle.mode,'live');assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
   const key=page.locator('[data-numeric-key="confirm"]');
   await input.fill('90');assert.equal((await session()).angle.mode,'live');assert.equal(await key.textContent(),'✓');
   const expected=await page.evaluate(()=>supportReferenceFrame()?referenceAngleToGlobalPlacementAngle(90,supportReferenceFrame()):90);near((await pose()).supportAngle,expected);
   // Hardware Enter must neither lock nor commit a tablet draft.
   await input.press('Enter');assert.equal((await session()).angle.mode,'live');assert.deepEqual(await doc(),before);
   const rect=await key.boundingBox();await key.evaluate(el=>window.originalSupportKey=el);await key.tap();
   assert.equal((await session()).angle.mode,'locked');assert.equal(await key.textContent(),'✓✓');assert.deepEqual(await key.boundingBox(),rect);assert(await key.evaluate(el=>el===originalSupportKey));assert.equal(await bubble.isVisible(),false);
   let candidate=await pose(),frozenPreview=await preview();const solveCount=await calls();
   for(const q of [{x:407,y:507},{x:507,y:407},{x:700,y:600}]){await pen('pointermove',q);await down(q,{pointerId:72});await pen('pointerup',q,{pointerId:72});assert.deepEqual(await pose(),candidate);assert.equal(await preview(),frozenPreview);assert.equal(await calls(),solveCount);assert.deepEqual(await doc(),before)}
   const exportState=await page.evaluate(()=>new DOMParser().parseFromString(exportSVG(),'image/svg+xml').querySelectorAll('[data-support-preview],[data-support-reference],.reference-angle-preview,#penConnectionBubble,#penConnectionLockHalo').length);assert.equal(exportState,0);
   await page.evaluate(()=>{camera.x+=15;applyCamera();render();window.dispatchEvent(new Event('resize'))});assert.equal(await preview(),frozenPreview);assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
   await input.fill('-');assert.equal(await key.textContent(),'✓');await key.tap();assert.equal(await input.getAttribute('aria-invalid'),'true');assert.deepEqual(await pose(),candidate);assert.deepEqual(await doc(),before);
   await input.fill('90');await key.tap();candidate=await pose();await key.tap();let placed=await assertPlaced(before,candidate,subtype);
   // Hidden final Bubble and duplicate compatibility activations cannot place again.
   for(const action of ['confirm','cancel'])for(const detail of [0,1,2])await button(action).evaluate((b,detail)=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail})),detail);
   await key.evaluate(el=>el.click());assert.deepEqual(await doc(),placed);
   // Cancellation and continuation preserve completed geometry and subtype.
   await down();await pen('pointerup');assert.equal(await state(),'anchor-confirming');await pen('pointerdown',undefined,{target:selector('cancel'),buttons:1,pressure:.22});await assertCleared(subtype);assert.deepEqual(await doc(),placed);await pen('pointerup',undefined,{outside:true});
   await lockAnchor(undefined,{pressure:0});await down({x:437,y:407},{pressure:0});await pen('pointerup');assert.deepEqual(await doc(),placed);assert.equal((await session()).angle.mode,'live');await page.locator('[data-numeric-key="exit"]').tap();assert.equal(await page.evaluate(()=>mode),'select');const exited=await doc();assert.deepEqual(exited.items,placed.items);assert.deepEqual(exited.past,placed.past);assert.deepEqual(exited.future,placed.future);assert.equal(exited.text,placed.text);assert.equal(exited.selected,before.selected);assert.deepEqual(exited.multi,[before.selected]);
   for(const phase of ['tracking','anchor-locked','anchor-confirming','angle-tracking','numeric-locked']){
    await reset(subtype);const base=await doc();await pen('pointermove');
    if(phase!=='tracking')await down();if(['anchor-confirming','angle-tracking','numeric-locked'].includes(phase))await pen('pointerup');if(['angle-tracking','numeric-locked'].includes(phase))await activate('confirm');
    if(phase==='numeric-locked'){await input.fill('90');await key.tap()}
    const interrupted=await session();await pen('pointercancel',undefined,{outside:true});
    if(['tracking','anchor-locked'].includes(phase))await assertCleared(subtype);
    else if(phase==='anchor-confirming'){assert.deepEqual(await session(),interrupted);assert.equal(await state(),'anchor-confirming');assert(await bubble.isVisible())}
    else{await assertAngleTracking(base,interrupted.anchorPoint,subtype);assert.deepEqual(await session(),interrupted);assert.equal(await key.textContent(),phase==='numeric-locked'?'\u2713\u2713':'\u2713')}
    assert.deepEqual(await doc(),base);await pen('pointerup');assert.equal(await bubble.isVisible(),phase==='anchor-confirming');
   }
   await reset(subtype);await lockAnchor();await input.fill('30');const exitDoc=await doc();await page.evaluate(()=>setMode('bar'));assert.equal(await session(),null);assert.equal(await preview(),null);assert.equal(await halo.isVisible(),false);assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),exitDoc);
   // Reference selection, locked relative angle, and LIVE override remain authoritative.
   await reset(subtype);const referenceDoc=await doc();await lockAnchor();await down({x:337,y:307});await pen('pointerup');assert.equal((await session()).referenceBarId,'reference-0');
   await input.fill('30');near((await session()).previewAngle,-60);assert.equal((await session()).angle.mode,'live');await key.tap();
   await down({x:307,y:337});await pen('pointerup');assert.equal((await session()).referenceBarId,'reference-1');near((await session()).previewAngle,30);near(Number(await input.inputValue()),30);assert.deepEqual(await doc(),referenceDoc);assert.equal(await bubble.isVisible(),false);
   await input.fill('20');assert.equal(await key.textContent(),'✓');await key.tap();near((await session()).previewAngle,20);await key.tap();await assertPlaced(referenceDoc,{...point,support:subtype,direction:'down',supportAngle:20},subtype);
   for(const value of [0,90,-90,180]){
    await reset(subtype,[]);const numericDoc=await doc(),numericAnchor=await lockAnchor();await page.evaluate(()=>window.confirmedSupportSession=supportPlacementSession);
    for(const q of [{x:200,y:450},{x:700,y:600},{x:500,y:200}]){await pen('pointermove',q);assert.deepEqual(await anchor(),numericAnchor);assert(await page.evaluate(()=>supportPlacementSession===confirmedSupportSession))}
    await input.fill(String(value));near((await session()).previewAngle,value);assert.equal((await session()).angle.mode,'live');await key.tap();let draft=await pose();near(draft.supportAngle,value);assert.deepEqual(await doc(),numericDoc);
    await input.fill(String(value===90?-90:90));assert.equal(await key.textContent(),'✓');assert.equal((await session()).angle.mode,'live');assert.equal(await bubble.isVisible(),false);assert.deepEqual(await anchor(),numericAnchor);assert.deepEqual(await doc(),numericDoc);
    await input.fill(String(value));await key.tap();draft=await pose();await key.tap();await assertPlaced(numericDoc,draft,subtype);
   }
   console.log('PASS pen Support '+subtype+': frozen snapped anchor, ownership, live raw angles, explicit numeric lock/commit, invalid drafts, reference override, cancellation and compatibility dedup');
  }
  // Point-only Bubble still supports native mouse/finger and keyboard confirmation/cancellation.
  for(const touch of [false,true])for(const action of ['confirm','cancel']){
   await reset();const before=await doc();await down();await pen('pointerup');const point=await anchor();await activate(action,touch);
   if(action==='confirm')await assertAngleTracking(before,point,'pin');else{await assertCleared('pin');assert.deepEqual(await doc(),before)}
  }
  for(const [action,key]of [['confirm','Enter'],['cancel','Space']]){
   await reset();const before=await doc();await down();await pen('pointerup');const point=await anchor();await button(action).focus();await page.keyboard.press(key);
   if(action==='confirm')await assertAngleTracking(before,point,'pin');else{await assertCleared('pin');assert.deepEqual(await doc(),before)}
  }
  // Genuine mouse retains original two-point placement even on a touch-capable PC.
  for(const subtype of ['pin','pin-plain','roller','roller-plain','fixed']){
   await reset(subtype,[]);const before=await doc(),a=await screen({x:303,y:303}),b=await screen({x:477,y:427});await page.mouse.click(a.x,a.y);assert.equal(await page.evaluate(()=>penConnectionPlacement),null);assert.equal(await bubble.isVisible(),false);
   const normalAnchor=(await session()).anchorPoint;await page.mouse.click(b.x,b.y);const after=await doc(),object=after.items.at(-1);assert.equal(after.items.length,before.items.length+1);assert.deepEqual(after.past,[before.items]);samePoint(object,normalAnchor);near(object.supportAngle,await page.evaluate(a=>solveSupportAngle(a,{x:477,y:427}),normalAnchor));await assertCleared(subtype);
  }
  // Native radial subtype selection plus CDP pen point, numeric lock and same-key commit.
  for(const subtype of ['pin','roller','fixed']){
   await reset(subtype);await page.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close()});
   for(const id of ['hub','supports',subtype]){const q=await page.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return {x:m.layout.cx+13,y:m.layout.cy};const ring=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(r=>r.id===ring.id).sectors[ring.entries.findIndex(e=>e.id===id)].icon},id);await page.touchscreen.tap(q.x,q.y);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
   assert.equal(await page.evaluate(()=>mode),'support');assert.equal(await page.locator('#support').inputValue(),subtype);
   const before=await doc(),cdp=await page.context().newCDPSession(page),a=await screen({x:303,y:303});
   const native=async(type,q)=>{await cdp.send('Input.dispatchMouseEvent',{type,...q,pointerType:'pen',button:'left',buttons:type==='mousePressed'?1:0,clickCount:1});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)))};
   await native('mousePressed',a);samePoint(await anchor(),{x:307,y:307});await native('mouseReleased',a);const r=await button('confirm').boundingBox();await native('mousePressed',{x:r.x+24,y:r.y+24});await native('mouseReleased',{x:r.x+24,y:r.y+24});await input.fill('90');
   const key=page.locator('[data-numeric-key="confirm"]'),k=await key.boundingBox(),q={x:k.x+k.width/2,y:k.y+k.height/2};await native('mousePressed',q);await native('mouseReleased',q);const candidate=await pose();assert.equal(await key.textContent(),'✓✓');assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
   await native('mousePressed',q);await native('mouseReleased',q);await assertPlaced(before,candidate,subtype);await cdp.detach();
  }
  assert.deepEqual(await page.evaluate(()=>[document.querySelectorAll('#penConnectionBubble').length,document.querySelectorAll('#penConnectionLockHalo').length]),[1,1]);assert.deepEqual(errors,[]);
  console.log('PASS point-only Bubble mouse/finger/keyboard; hybrid PC mouse; radial/native pen; one shared Bubble and keypad');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
