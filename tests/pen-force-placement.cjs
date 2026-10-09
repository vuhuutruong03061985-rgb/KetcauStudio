'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
const internal=a=>((90-a)%360+360)%360;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const tablet of [false,true]){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve('index.html')).href);
   await page.waitForFunction(()=>typeof handlePenForcePlacement==='function');
   await page.evaluate(()=>{window.forceSolveCalls=0;const solve=solveSupportAngle;solveSupportAngle=(...args)=>{forceSolveCalls++;return solve(...args)}});
   const input=page.locator('#dynamicInputValue'),bubble=page.locator('#penConnectionBubble'),halo=page.locator('#penConnectionLockHalo'),keypad=page.locator('#tabletNumericKeypad');
   const reset=(bars=[])=>page.evaluate(bars=>{
    cancelToSelection();document.activeElement?.blur();camera={x:0,y:0,w:1100,h:720};applyCamera();
    items=bars.map((b,i)=>make('bar',...b,{id:'reference-'+i}));past=[];future=[copy(items)];selected=null;snapEnabled=false;setMode('force');render();
   },bars);
   const screen=q=>page.evaluate(q=>{const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},q);
   const pen=(type,q={x:300,y:300},options={})=>page.evaluate(({type,q,options})=>{
    const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM()),{outside=false,...init}=options;
    (outside?document.body:svg).dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerType:'pen',pointerId:71,isPrimary:true,clientX:p.x,clientY:p.y,button:type==='pointermove'?-1:0,buttons:type==='pointerdown'?1:0,pressure:type==='pointerdown'?.22:0,...init}));
   },{type,q,options});
   const doc=()=>page.evaluate(()=>({items:copy(items),past:copy(past),future:copy(future),selected,text:documentText()}));
   const state=()=>page.evaluate(()=>penConnectionPlacement?.state||'tracking');
   const pose=()=>page.evaluate(()=>penConnectionPlacement?.lockedCandidate||null);
   const anchor=()=>page.evaluate(()=>penConnectionPlacement?.lockedAnchor||null);
   const preview=()=>page.locator('[data-load-preview]').evaluate(el=>el.outerHTML);
   async function command(action){
    const r=await page.locator(`[data-pen-connection-action=${action}]`).boundingBox();assert(r);
    if(tablet)await page.touchscreen.tap(r.x+24,r.y+24);else await page.mouse.click(r.x+24,r.y+24);
   }
   async function assertHalo(point){
    assert.equal(await halo.isVisible(),true);const p=await screen(point),r=await halo.boundingBox();
    assert(Math.abs(r.x+r.width/2-p.x)<.03&&Math.abs(r.y+r.height/2-p.y)<.03);assert.equal(await halo.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
   }
   async function lockAnchor(q={x:300,y:300}){
    const before=await doc();await pen('pointerdown',q);assert.equal(await state(),'anchor-locked');await assertHalo(await anchor());
    assert.equal(await bubble.isVisible(),false);assert.equal(await keypad.isVisible(),false);
    await pen('pointerup',{x:450,y:440},{pointerId:99});assert.equal(await state(),'anchor-locked');
    await pen('pointerup',{x:450,y:440},{outside:true});assert.equal(await state(),'anchor-confirming');
    assert.equal(await bubble.isVisible(),true);assert.equal(await input.isVisible(),false);assert.deepEqual(await doc(),before);return before;
   }
   async function trackAngle(q){
    const before=await lockAnchor(q),a=await anchor();await command('confirm');
    assert.equal(await state(),'angle-tracking');assert.deepEqual(await anchor(),a);await assertHalo(a);
    assert.equal(await bubble.isVisible(),false);assert.equal(await input.isVisible(),true);assert.equal(await keypad.isVisible(),tablet);
    assert.equal(await input.getAttribute('inputmode'),tablet?'none':'decimal');assert.deepEqual(await doc(),before);return before;
   }
   async function key(value){
    const el=page.locator(`[data-numeric-key="${value}"]`),r=await el.boundingBox();assert(r&&r.width>=44&&r.height>=44);
    assert.equal(await el.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-numeric-key]')===el}),true);
    await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
   }
   async function edit(value){
    if(!tablet){await input.fill(value);return}
    await key('clear');if(value.startsWith('-')){await key('sign');value=value.slice(1)}for(const c of value)await key(c);
   }
   const validate=()=>tablet?key('confirm'):input.press('Enter');
   // Hover is transient. Down uses its own authoritative existing snap result.
   await reset([[307,307,607,307]]);await page.evaluate(()=>{snapEnabled=true;gridVisible=true;gridSize=50;for(const k in snapOptions)snapOptions[k]=['endpoint','member','grid'].includes(k)});
   const untouched=await doc();await pen('pointermove',{x:210,y:210});const firstHover=await preview();
   for(const q of [{x:250,y:260},{x:303,y:303}])await pen('pointermove',q);
   assert.notEqual(await preview(),firstHover);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.deepEqual(await doc(),untouched);
   const expected=await page.evaluate(()=>{const p=new DOMPoint(303,303).matrixTransform(svg.getScreenCTM()),e={clientX:p.x,clientY:p.y};return snapToBar(rawPoint(e))||point(e)});
   await lockAnchor({x:303,y:303});near((await anchor()).x,expected.x);near((await anchor()).y,expected.y);
   const frozenAnchor=await anchor(),frozenPreview=await preview(),anchorBubble=await bubble.boundingBox();
   await pen('pointermove',{x:500,y:500});await pen('pointerdown',{x:500,y:500});await pen('pointerup');
   assert.deepEqual(await anchor(),frozenAnchor);assert.equal(await preview(),frozenPreview);assert.deepEqual(await bubble.boundingBox(),anchorBubble);assert.deepEqual(await doc(),untouched);
   await command('cancel');assert.equal(await page.evaluate(()=>loadPlacement),null);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.equal(await page.evaluate(()=>mode),'force');assert.deepEqual(await doc(),untouched);
   // Existing live solver, stored-angle adapter and arrowhead/tail geometry are authoritative.
   for(const [dx,dy,angle]of [[0,120,0],[-120,0,90],[120,0,-90],[0,-120,180],[90,120,Math.atan2(-90,120)*180/Math.PI]]){
    await reset();const before=await trackAngle(),a=await anchor(),calls=await page.evaluate(()=>forceSolveCalls);
    await pen('pointermove',{x:a.x+dx,y:a.y+dy});assert((await page.evaluate(()=>forceSolveCalls))>calls);
    near(await page.evaluate(()=>loadPlacement.angle),internal(angle));assert.deepEqual(await anchor(),a);
    const shaft=await page.locator('[data-load-preview] line[marker-end]').evaluate(el=>Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(el.getAttribute(k))])));
    near(shaft.x2,a.x);near(shaft.y2,a.y);near(shaft.x1-a.x,75*dx/Math.hypot(dx,dy));near(shaft.y1-a.y,75*dy/Math.hypot(dx,dy));
    await pen('pointerdown',{x:a.x+dx,y:a.y+dy});assert.equal(await state(),'position-locked');assert.deepEqual(await doc(),before);
    await pen('pointerup');assert.equal(await state(),'angle-confirming');assert.equal(await keypad.isVisible(),tablet);await assertHalo(a);
    const draft=await pose(),shape=await preview(),rect=await bubble.boundingBox();
    for(let i=0;i<3;i++){await pen('pointermove',{x:450,y:450});await pen('pointerdown',{x:400,y:400});await pen('pointerup')}
    assert.deepEqual(await pose(),draft);assert.equal(await preview(),shape);assert.deepEqual(await bubble.boundingBox(),rect);assert.deepEqual(await doc(),before);
    await command('confirm');const after=await doc();assert.equal(after.items.length,1);assert.deepEqual(after.past,[before.items]);near(after.items[0].loadAngle,internal(angle));near(after.items[0].x,a.x);near(after.items[0].y,a.y);
    assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.equal(await keypad.isVisible(),false);assert.equal(await page.evaluate(()=>mode),'force');
   }
   // Enter/keypad validate both phases, never commit. Latest draft wins over canvas contacts.
   await reset();let before=await trackAngle();const a=await anchor();
   for(const value of ['0','90','-90','45.5','180','83']){
    await edit(value);await validate();assert.equal(await state(),'angle-confirming');near((await pose()).loadAngle,internal(Number(value)));assert.equal(await bubble.isVisible(),true);assert.deepEqual(await doc(),before);
   }
   const rect=await bubble.boundingBox();await edit('90');await validate();near((await pose()).loadAngle,0);assert.deepEqual(await bubble.boundingBox(),rect);assert.deepEqual(await doc(),before);
   await edit('');await validate();assert.equal(await input.getAttribute('aria-invalid'),'true');await command('confirm');assert.deepEqual(await doc(),before);assert.equal(await bubble.isVisible(),true);
   await edit('90');await validate();await command('cancel');assert.equal(await state(),'angle-tracking');assert.deepEqual(await anchor(),a);await assertHalo(a);assert.equal(await input.isVisible(),true);assert.equal(await keypad.isVisible(),tablet);
   await pen('pointermove',{x:420,y:300});near(await page.evaluate(()=>loadPlacement.globalPlacementAngle),-90);assert.deepEqual(await doc(),before);
   await edit('45.5');await validate();
   // Intentional pen button down acts once; its up and compatibility clicks cannot duplicate it.
   await page.locator('[data-pen-connection-action=confirm]').dispatchEvent('pointerdown',{pointerType:'pen',pointerId:91,button:0,buttons:1,pressure:.22,bubbles:true});
   await pen('pointerup',undefined,{pointerId:91,outside:true});
   await page.locator('[data-pen-connection-action=confirm]').dispatchEvent('click',{bubbles:true});
   await page.locator('#drawing').dispatchEvent('click',{bubbles:true});
   assert.equal((await doc()).items.length,1);assert.equal((await doc()).past.length,1);near((await doc()).items[0].loadAngle,internal(45.5));assert.equal(await input.getAttribute('inputmode'),'decimal');
   // Reference selection/override remains live until angle lock, then the frame is frozen.
   await reset([[300,300,600,300],[300,300,300,600]]);before=await trackAngle();
   await pen('pointermove',{x:301,y:440});assert.equal(await page.evaluate(()=>loadPlacement.referenceBarId),'reference-0');
   await pen('pointerdown',{x:300,y:330});assert.equal(await state(),'angle-tracking');assert.equal(await page.evaluate(()=>loadPlacement.referenceBarId),'reference-1');await pen('pointerup');
   await edit('83');await validate();const frame=await page.evaluate(()=>copy(loadReferenceFrame()));
   await pen('pointermove',{x:330,y:300});await pen('pointerdown',{x:330,y:300});await pen('pointerup');assert.equal(await page.evaluate(()=>loadPlacement.referenceBarId),'reference-1');
   await edit('90');await validate();const global=await page.evaluate(()=>referenceAngleToGlobalPlacementAngle(90,loadReferenceFrame()));near((await pose()).loadAngle,internal(global));assert.deepEqual(await page.evaluate(()=>copy(loadReferenceFrame())),frame);assert.deepEqual(await doc(),before);
   await command('cancel');await pen('pointerdown',{x:330,y:300});assert.equal(await page.evaluate(()=>loadPlacement.referenceBarId),'reference-0');await pen('pointerup');assert.equal(await state(),'angle-tracking');
   // Reset/cancel paths retire both load session and shared transient UI without mutations.
   for(const action of ['pointercancel','mode','undo','reset']){
    await reset();before=await trackAngle();await page.evaluate(action=>{if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'pen',pointerId:71}));if(action==='mode')setMode('bar');if(action==='undo')actions.undo[1]();if(action==='reset')cancelToSelection()},action);
    assert.equal(await page.evaluate(()=>loadPlacement),null);assert.equal(await page.evaluate(()=>penConnectionPlacement),null);assert.equal(await bubble.isVisible(),false);assert.equal(await halo.isVisible(),false);assert.equal(await keypad.isVisible(),false);assert.equal((await doc()).items.length,before.items.length);assert.equal((await doc()).past.length,0);
   }
   // Ordinary mouse/finger Force retains its two-point and physical-keyboard commit paths.
   for(const numeric of [false,true]){
    await reset();const p=await screen({x:300,y:300});if(tablet)await page.touchscreen.tap(p.x,p.y);else await page.mouse.click(p.x,p.y);
    if(numeric){await input.fill('-90');await input.press('Enter')}
    else{const q=await screen({x:450,y:300});if(tablet)await page.touchscreen.tap(q.x,q.y);else await page.mouse.click(q.x,q.y)}
    assert.equal((await doc()).items.length,1);assert.equal((await doc()).past.length,1);near((await doc()).items[0].loadAngle,180);assert.equal(await bubble.isVisible(),false);
   }
   // Switching from an ordinary pending load to pen tracking retires the old numeric owner.
   await reset();let p=await screen({x:300,y:300});await page.mouse.click(p.x,p.y);assert.equal(await input.isVisible(),true);
   await pen('pointermove',{x:400,y:400});assert.equal(await input.isVisible(),false);assert.equal(await page.evaluate(()=>loadNumericSession),null);assert.equal((await doc()).items.length,0);
   if(tablet){
    // Actual radial hit testing + native pen events, including implicit capture and compatibility clicks.
    await reset();await page.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close()});
    for(const id of ['hub','loads','force']){
     const p=await page.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return{x:m.layout.cx+13,y:m.layout.cy};const ring=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(r=>r.id===ring.id).sectors[ring.entries.findIndex(e=>e.id===id)].icon},id);
     await page.touchscreen.tap(p.x,p.y);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    }
    assert.equal(await page.evaluate(()=>mode),'force');before=await doc();const cdp=await context.newCDPSession(page);
    const native=(type,p,pressed=false)=>cdp.send('Input.dispatchMouseEvent',{type,...p,pointerType:'pen',buttons:pressed?1:0,force:pressed?.22:0,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});
    p=await screen({x:300,y:300});await native('mouseMoved',p);await native('mousePressed',p,true);await native('mouseReleased',p);assert.equal(await state(),'anchor-confirming');
    let r=await page.locator('[data-pen-connection-action=confirm]').boundingBox(),target={x:r.x+24,y:r.y+24};
    await native('mouseMoved',target);await native('mousePressed',target,true);await native('mouseReleased',target);assert.equal(await state(),'angle-tracking');assert.deepEqual(await doc(),before);
    p=await screen({x:460,y:430});await native('mouseMoved',p);await native('mousePressed',p,true);await native('mouseReleased',p);assert.equal(await state(),'angle-confirming');
    const shape=await preview(),rect=await bubble.boundingBox();r=await page.locator('[data-pen-connection-action=confirm]').boundingBox();target={x:r.x+24,y:r.y+24};
    for(let i=1;i<=8;i++){await native('mouseMoved',{x:p.x+(target.x-p.x)*i/8,y:p.y+(target.y-p.y)*i/8});assert.equal(await preview(),shape);assert.deepEqual(await bubble.boundingBox(),rect);assert.deepEqual(await doc(),before)}
    await edit('90');await key('confirm');assert.deepEqual(await doc(),before);
    await native('mousePressed',target,true);await native('mouseReleased',target);assert.equal((await doc()).items.length,1);assert.equal((await doc()).past.length,1);near((await doc()).items[0].loadAngle,0);await cdp.detach();
   }
   assert.equal(await bubble.count(),1);assert.equal(await halo.count(),1);assert.equal(await keypad.count(),1);assert.deepEqual(errors,[]);
   console.log(`PASS Force ${tablet?'tablet emulated':'desktop'}: snapped arrowhead, two pen confirmations, solver/adapter geometry, reference freeze/retry, editable draft, keypad/Enter safety, one final commit/dedup, cleanup and non-pen paths`);
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
