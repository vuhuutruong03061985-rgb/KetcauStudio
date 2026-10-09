'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
const samePoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
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
  const state=()=>page.evaluate(()=>penConnectionPlacement?.state||'tracking');
  const anchor=()=>page.evaluate(()=>penConnectionPlacement?.lockedAnchor||null);
  const pose=()=>page.evaluate(()=>penConnectionPlacement?.lockedCandidate||null);
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
   assert.equal(await state(),'angle-tracking');assert.deepEqual(await anchor(),point);await assertHalo(point);
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
  async function lockAngle(q={x:437,y:407},options={}){
   await down(q,options);assert.equal(await state(),'position-locked');assert.equal(await bubble.isVisible(),false);
   const candidate=await pose();await pen('pointerup',{x:707,y:607});assert.equal(await state(),'angle-confirming');assert.equal(await bubble.isVisible(),true);return candidate;
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
   // Pen anchor confirm only starts orientation; its repeat press/release cannot lock an angle.
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await assertAngleTracking(before,point,subtype);
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await down({x:477,y:427});assert.equal(await state(),'angle-tracking');
   await pen('pointerup',undefined,{outside:true});await assertAngleTracking(before,point,subtype);
   assert.equal(await page.evaluate(()=>isDynamicNumericInputArmed()),true);assert.deepEqual(await halo.boundingBox(),initialHalo);
   for(const q of [{x:407,y:507},{x:407,y:207},{x:207,y:407},{x:437,y:407}]){
    const expected=await page.evaluate(({point,q})=>solveSupportAngle(point,q),{point,q});await pen('pointermove',q);
    near((await session()).previewAngle,expected);assert.deepEqual(await anchor(),point);assert.deepEqual(await halo.boundingBox(),initialHalo);assert.deepEqual(await doc(),before);
   }
   // Second contact uses the existing raw direction solver, not angle-point Grid snapping.
   const angle=await page.evaluate(()=>solveSupportAngle(supportPlacementSession.anchorPoint,{x:477,y:427}));
   await down({x:477,y:427});let candidate=await pose();near(candidate.supportAngle,angle);assert.equal(candidate.support,subtype);
   assert.deepEqual(Object.keys(candidate).sort(),['direction','support','supportAngle','x','y']);assert.equal(await page.evaluate(()=>Object.isFrozen(penConnectionPlacement.lockedCandidate)),true);
   assert.equal(await state(),'position-locked');assert.equal(await bubble.isVisible(),false);assert.equal(await page.locator('#dynamicInput').isVisible(),true);assert.equal(await page.evaluate(()=>isDynamicNumericInputArmed()),true);assert.deepEqual(await doc(),before);
   let frozenPreview=await preview(),frozenSession=await session();const solveCount=await calls();
   for(const q of [{x:307,y:337},{x:337,y:307},{x:700,y:600}]){
    await pen('pointermove',q,{buttons:1,pressure:.22});await down(q,{pointerId:72});
    assert.deepEqual(await pose(),candidate);assert.deepEqual(await session(),frozenSession);assert.equal(await preview(),frozenPreview);assert.deepEqual(await halo.boundingBox(),initialHalo);assert.equal(await calls(),solveCount);
   }
   await pen('pointerup',undefined,{pointerId:72});await pen('pointercancel',undefined,{pointerId:72});assert.equal(await state(),'position-locked');
   await pen('pointerup',{x:700,y:600},{outside:true});assert.equal(await state(),'angle-confirming');assert.equal(await bubble.isVisible(),true);const frozenBubble=await bubble.boundingBox();
   // Anchor-confirm compatibility clicks must not resolve the newly visible angle bubble.
   for(const action of ['confirm','cancel'])await button(action).evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1})));
   assert.equal(await state(),'angle-confirming');assert.deepEqual(await doc(),before);
   for(const q of [{x:307,y:337},{x:337,y:307},{x:700,y:600}]){
    await pen('pointermove',q);await down(q);await pen('pointerup',q);assert.deepEqual(await pose(),candidate);assert.equal(await preview(),frozenPreview);assert.deepEqual(await bubble.boundingBox(),frozenBubble);assert.deepEqual(await halo.boundingBox(),initialHalo);assert.deepEqual(await doc(),before);
   }
   // The numeric editor may refine the draft while canvas/reference changes stay blocked.
   assert.equal(await page.locator('#dynamicInput').isVisible(),true);const referenceId=frozenSession.referenceBarId;
   const exactAngle=await page.evaluate(()=>{const frame=supportReferenceFrame();return frame?referenceAngleToGlobalPlacementAngle(90,frame):90});
   await input.fill('90');candidate=await pose();near(candidate.supportAngle,exactAngle);assert.notEqual(await preview(),frozenPreview);
   assert.equal(await state(),'angle-confirming');assert.deepEqual(await anchor(),point);assert.deepEqual(await bubble.boundingBox(),frozenBubble);assert.deepEqual(await halo.boundingBox(),initialHalo);assert.deepEqual(await doc(),before);
   assert.equal(await page.locator('[data-support-preview] > g').getAttribute('transform'),`translate(${point.x} ${point.y}) rotate(${candidate.supportAngle})`);
   await input.press('Enter');assert.deepEqual(await pose(),candidate);assert.equal(await state(),'angle-confirming');assert.deepEqual(await doc(),before);
   await input.fill('-');await input.press('Enter');assert.equal(await input.getAttribute('aria-invalid'),'true');assert.deepEqual(await pose(),candidate);assert.deepEqual(await doc(),before);
   await input.fill('90');await input.press('Enter');frozenPreview=await preview();frozenSession=await session();const editedCalls=await calls();
   await page.evaluate(()=>{setSupportReference('reference-1');render()});await pen('pointermove',{x:707,y:607});await pen('pointercancel');
   assert.equal((await session()).referenceBarId,referenceId);assert.deepEqual(await pose(),candidate);assert.deepEqual(await session(),frozenSession);assert.equal(await preview(),frozenPreview);assert.equal(await calls(),editedCalls);
   const exportState=await page.evaluate(()=>new DOMParser().parseFromString(exportSVG(),'image/svg+xml').querySelectorAll('[data-support-preview],[data-support-reference],.reference-angle-preview,#penConnectionBubble,#penConnectionLockHalo').length);assert.equal(exportState,0);
   await page.evaluate(()=>{camera.x+=15;applyCamera();render();window.dispatchEvent(new Event('resize'))});await assertHalo(point);assert.equal(await preview(),frozenPreview);assert.deepEqual(await bubble.boundingBox(),frozenBubble);assert.deepEqual(await doc(),before);
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});let placed=await assertPlaced(before,candidate,subtype);
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await pen('pointermove');assert.deepEqual(await doc(),placed);
   await pen('pointerup',undefined,{outside:true});
   // Old compatibility clicks cannot resolve a fresh, visible two-phase placement.
   await lockAnchor();await lockAngle();const nextPreview=await preview();
   for(const action of ['confirm','cancel']){
    for(const detail of [0,1,2])await button(action).evaluate((b,detail)=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail})),detail);
    await pen('click',undefined,{target:selector(action)});assert.deepEqual(await doc(),placed);assert.equal(await preview(),nextPreview);
   }
   const retryAnchor=await anchor();await pen('pointerdown',undefined,{target:selector('cancel'),buttons:1,pressure:.22});await assertAngleTracking(placed,retryAnchor,subtype);await pen('pointerup',undefined,{outside:true});
   assert.equal((await session()).angle.mode,'live');await pen('pointermove',{x:407,y:507});near((await session()).previewAngle,await page.evaluate(a=>solveSupportAngle(a,{x:407,y:507}),retryAnchor));assert.deepEqual(await anchor(),retryAnchor);
   const retryCandidate=await lockAngle({x:477,y:427});await activate('confirm');placed=await assertPlaced(placed,retryCandidate,subtype);
   // Anchor cancel restarts the whole placement, preserving subtype and history.
   await down();await pen('pointerup');assert.equal(await state(),'anchor-confirming');await pen('pointerdown',undefined,{target:selector('cancel'),buttons:1,pressure:.22});await assertCleared(subtype);assert.deepEqual(await doc(),placed);await pen('pointerup',undefined,{outside:true});
   // Both phases accept false primary contacts without any pressure/time threshold or creation.
   await down(undefined,{pressure:0});await pen('pointerup');assert.equal(await state(),'anchor-confirming');assert.deepEqual(await doc(),placed);await activate('cancel');await assertCleared(subtype);
   const falseAnchor=await lockAnchor(undefined,{pressure:0});await lockAngle(undefined,{pressure:0});assert.deepEqual(await doc(),placed);await activate('cancel');await assertAngleTracking(placed,falseAnchor,subtype);
   await pen('pointercancel',undefined,{outside:true});await assertCleared(subtype);assert.deepEqual(await doc(),placed);
   for(const phase of ['tracking','anchor-locked','anchor-confirming','angle-tracking','position-locked']){
    await reset(subtype);const base=await doc();await pen('pointermove');
    if(phase!=='tracking')await down();if(['anchor-confirming','angle-tracking','position-locked'].includes(phase))await pen('pointerup');if(['angle-tracking','position-locked'].includes(phase))await activate('confirm');if(phase==='position-locked')await down({x:437,y:407});
    await pen('pointercancel',undefined,{outside:true});await assertCleared(subtype);assert.deepEqual(await doc(),base);await pen('pointerup');assert.equal(await bubble.isVisible(),false);
   }
   await lockAnchor();await lockAngle();const exitDoc=await doc();await page.evaluate(()=>setMode('bar'));assert.equal(await session(),null);assert.equal(await preview(),null);assert.equal(await halo.isVisible(),false);assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),exitDoc);
   // Existing local/global and explicit reference switching semantics remain authoritative.
   await reset(subtype);const referenceDoc=await doc();await lockAnchor();
   await down({x:337,y:307});await pen('pointerup');assert.equal(await state(),'angle-tracking');assert.equal((await session()).referenceBarId,'reference-0');
   await input.fill('30');assert.equal(await state(),'angle-tracking');near((await session()).previewAngle,-60);assert.deepEqual(await doc(),referenceDoc);
   await down({x:307,y:337});await pen('pointerup');assert.equal(await state(),'angle-tracking');assert.equal((await session()).referenceBarId,'reference-1');near((await session()).previewAngle,30);near(Number(await input.inputValue()),30);
   await input.press('Enter');assert.equal(await state(),'angle-confirming');assert.equal(await bubble.isVisible(),true);assert.equal(await page.locator('#dynamicInput').isVisible(),true);
   const referencePose=await pose();near(referencePose.supportAngle,30);const confirmedAnchor=await anchor();
   await activate('cancel');await assertAngleTracking(referenceDoc,confirmedAnchor,subtype);assert.equal((await session()).angle.mode,'live');
   await pen('pointermove',{x:407,y:507});near((await session()).previewAngle,await page.evaluate(a=>solveSupportAngle(a,{x:407,y:507}),confirmedAnchor));
   const liveGlobal=(await session()).previewAngle;await down({x:337,y:307});await pen('pointerup');assert.equal((await session()).referenceBarId,'reference-0');near((await session()).previewAngle,liveGlobal);
   await input.fill('20');await input.press('Enter');assert.equal(await state(),'angle-confirming');assert.deepEqual(await anchor(),confirmedAnchor);assert.deepEqual(await doc(),referenceDoc);near((await session()).previewAngle,-70);
   const retryReferencePose=await pose();near(retryReferencePose.supportAngle,-70);await activate('confirm');await assertPlaced(referenceDoc,retryReferencePose,subtype);
   // Numeric Enter and existing field validation are alternate angle confirmations.
   for(const value of [0,90,-90,180]){
    await reset(subtype,[]);const numericDoc=await doc(),numericAnchor=await lockAnchor();
    await page.evaluate(()=>{window.confirmedSupportSession=supportPlacementSession});
    for(const q of [{x:200,y:450},{x:700,y:600},{x:500,y:200}]){await pen('pointermove',q);assert.deepEqual(await anchor(),numericAnchor);assert.equal(await page.evaluate(()=>supportPlacementSession===confirmedSupportSession),true)}
    await input.fill(String(value));near((await session()).previewAngle,value);assert.equal(await state(),'angle-tracking');
    await input.press('Enter');assert.equal(await state(),'angle-confirming');assert.equal(await bubble.isVisible(),true);assert.equal(await page.locator('#dynamicInput').isVisible(),true);
    let draft=await pose();near(draft.supportAngle,value);assert.deepEqual(await doc(),numericDoc);const rect=await bubble.boundingBox();
    await pen('pointermove',{x:507,y:407});assert.deepEqual(await pose(),draft);
    await input.fill(String(value===90?-90:90));draft=await pose();assert.equal(await state(),'angle-confirming');assert.deepEqual(await bubble.boundingBox(),rect);assert.deepEqual(await anchor(),numericAnchor);assert.deepEqual(await doc(),numericDoc);
    await input.press('Enter');assert.deepEqual(await pose(),draft);assert.deepEqual(await doc(),numericDoc);
    await activate('cancel');await assertAngleTracking(numericDoc,numericAnchor,subtype);await pen('pointermove',{x:407,y:507});assert.equal(await page.evaluate(()=>supportPlacementSession===confirmedSupportSession),true);
    await input.fill(String(value));assert.equal(await page.evaluate(()=>confirmSupportNumericInput()),true);assert.equal(await state(),'angle-confirming');draft=await pose();near(draft.supportAngle,value);assert.deepEqual(await doc(),numericDoc);
    await activate('confirm');await assertPlaced(numericDoc,draft,subtype);
   }
   await reset(subtype,[]);const contactDoc=await doc(),contactAnchor=await lockAnchor();await input.fill('83');
   await down({x:437,y:407});assert.equal(await state(),'position-locked');assert.equal(await bubble.isVisible(),false);assert.equal(await page.locator('#dynamicInput').isVisible(),true);
   await pen('pointerup');assert.equal(await state(),'angle-confirming');near((await pose()).supportAngle,83);const contactBubble=await bubble.boundingBox();
   await input.fill('90');const latestContact=await pose();near(latestContact.supportAngle,90);assert.deepEqual(await anchor(),contactAnchor);assert.deepEqual(await bubble.boundingBox(),contactBubble);assert.deepEqual(await doc(),contactDoc);
   await activate('confirm');await assertPlaced(contactDoc,latestContact,subtype);
   console.log(`PASS pen Support ${subtype}: persistent anchor/session, two confirmation phases, editable Dynamic Input beside bubble, numeric Enter/confirm versus contact, live/reference/global angles, latest-draft commit, retry, dedup and false-contact safety`);
  }
  // Shared buttons retain native mouse/finger and keyboard activation.
  for(const touch of [false,true])for(const phase of ['anchor','angle'])for(const action of ['confirm','cancel']){
   await reset();const before=await doc();
   if(phase==='angle')await lockAnchor();else{await down();await pen('pointerup')}
   const point=await anchor(),candidate=phase==='angle'?await lockAngle():null;await activate(action,touch);
   if(phase==='angle'&&action==='confirm')await assertPlaced(before,candidate,'pin');
   else if(phase==='angle'||action==='confirm')await assertAngleTracking(before,point,'pin');
   else{await assertCleared('pin');assert.deepEqual(await doc(),before)}
  }
  for(const phase of ['anchor','angle'])for(const [action,key]of [['confirm','Enter'],['cancel','Space']]){
   await reset();const before=await doc();
   if(phase==='angle')await lockAnchor();else{await down();await pen('pointerup')}
   const point=await anchor(),candidate=phase==='angle'?await lockAngle():null;await button(action).focus();await page.keyboard.press(key);
   if(phase==='angle'&&action==='confirm')await assertPlaced(before,candidate,'pin');
   else if(phase==='angle'||action==='confirm')await assertAngleTracking(before,point,'pin');
   else{await assertCleared('pin');assert.deepEqual(await doc(),before)}
  }
  // Normal mouse/finger canvas Support placement remains the original two-point workflow.
  for(const touch of [false,true])for(const subtype of ['pin','pin-plain','roller','roller-plain','fixed']){
   await reset(subtype,[]);const before=await doc(),a=await screen({x:303,y:303}),b=await screen({x:477,y:427});
   const tap=async q=>touch?page.touchscreen.tap(q.x,q.y):page.mouse.click(q.x,q.y);
   await tap(a);assert.equal(await page.evaluate(()=>penConnectionPlacement),null);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);
   const normalAnchor=(await session()).anchorPoint;await tap(b);const after=await doc(),object=after.items.at(-1);
   assert.equal(after.items.length,before.items.length+1);assert.deepEqual(after.past,[before.items]);assert.equal(object.support,subtype);samePoint(object,normalAnchor);near(object.supportAngle,await page.evaluate(a=>solveSupportAngle(a,{x:477,y:427}),normalAnchor));
   await assertCleared(subtype);
  }
  // Native radial selection and pen events exercise the actual production path for each main subtype.
  for(const subtype of ['pin','roller','fixed']){
   await reset(subtype);await page.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close()});
   for(const id of ['hub','supports',subtype]){
    const p=await page.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return {x:m.layout.cx+13,y:m.layout.cy};const ring=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(r=>r.id===ring.id).sectors[ring.entries.findIndex(e=>e.id===id)].icon},id);
    await page.touchscreen.tap(p.x,p.y);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   }
   assert.equal(await page.evaluate(()=>mode),'support');assert.equal(await page.locator('#support').inputValue(),subtype);
   const before=await doc(),cdp=await page.context().newCDPSession(page),a=await screen({x:303,y:303}),b=await screen({x:477,y:427});
   const native=(type,q,pressed=false)=>cdp.send('Input.dispatchMouseEvent',{type,...q,pointerType:'pen',buttons:pressed?1:0,force:pressed?.22:0,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});
   await native('mouseMoved',a);assert.equal(await halo.isVisible(),false);await native('mousePressed',a,true);samePoint(await anchor(),{x:307,y:307});assert.deepEqual(await doc(),before);
   await native('mouseReleased',a);assert.equal(await state(),'anchor-confirming');const anchorRect=await bubble.boundingBox(),anchorButton=await button('confirm').boundingBox(),anchorTarget={x:anchorButton.x+24,y:anchorButton.y+24};
   await native('mouseMoved',b);assert.deepEqual(await bubble.boundingBox(),anchorRect);assert.deepEqual(await doc(),before);
   await native('mousePressed',anchorTarget,true);assert.equal(await state(),'angle-tracking');assert.deepEqual(await doc(),before);await native('mouseReleased',anchorTarget);
   await native('mouseMoved',b);await native('mousePressed',b,true);const candidate=await pose();assert.equal(candidate.support,subtype);
   await native('mouseReleased',b);const frozen=await preview(),rect=await bubble.boundingBox(),r=await button('confirm').boundingBox(),target={x:r.x+24,y:r.y+24};
   for(let i=1;i<=8;i++){await native('mouseMoved',{x:b.x+(target.x-b.x)*i/8,y:b.y+(target.y-b.y)*i/8});assert.equal(await preview(),frozen);assert.deepEqual(await bubble.boundingBox(),rect);assert.deepEqual(await doc(),before)}
   await native('mousePressed',target,true);await native('mouseReleased',target);await assertPlaced(before,candidate,subtype);await cdp.detach();
  }
  assert.deepEqual(await page.evaluate(()=>[document.querySelectorAll('#penConnectionBubble').length,document.querySelectorAll('#penConnectionLockHalo').length]),[1,1]);
  assert.deepEqual(errors,[]);
  console.log('PASS shared mouse/finger/keyboard controls; normal mouse/touch Support engine; native radial and pen input for pin/roller/fixed (emulated); one shared bubble/halo');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
