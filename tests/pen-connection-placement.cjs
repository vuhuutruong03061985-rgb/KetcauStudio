'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const nearPoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForFunction(()=>typeof cancelToSelection==='function');
  await page.evaluate(()=>{window.penButtonCanvasReleases=0;svg.addEventListener('pointerup',()=>penButtonCanvasReleases++)});
  const reset=type=>page.evaluate(type=>{
   cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();
   items=[make('bar',307,307,607,307)];past=[];future=[copy(items)];selected=items[0].id;
   snapEnabled=true;gridVisible=true;gridSize=50;
   for(const key in snapOptions)snapOptions[key]=['endpoint','grid'].includes(key);
   setMode(type);render();
  },type);
  const screen=q=>page.evaluate(q=>{const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},q);
  // Original PointerEvents traverse the production handlers, never placement helper calls.
  const pen=(type,q={x:303,y:303},options={})=>page.evaluate(({type,q,options})=>{
   const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());
   const {outside=false,target=null,...init}=options;
   (target?document.querySelector(target):outside?document.body:svg).dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:71,pointerType:'pen',isPrimary:true,clientX:p.x,clientY:p.y,button:type==='pointermove'?-1:0,buttons:0,pressure:0,...init}));
  },{type,q,options});
  const doc=()=>page.evaluate(()=>({text:documentText(),items:copy(items),past:copy(past),future:copy(future),selected,multi:[...multiSelection]}));
  const state=()=>page.evaluate(()=>penConnectionPlacement?.state||'tracking');
  const locked=()=>page.evaluate(()=>penConnectionPlacement?.lockedCandidate||null);
  const preview=()=>page.evaluate(()=>{
   const g=svg.querySelector('[data-pen-connection-preview]');if(!g)return null;
   const symbol=g.querySelector('circle,rect'),hinge=symbol.tagName==='circle';
   return {type:g.dataset.penConnectionPreview,x:Number(symbol.getAttribute(hinge?'cx':'x'))+(hinge?0:6),y:Number(symbol.getAttribute(hinge?'cy':'y'))+(hinge?0:6),pointerEvents:getComputedStyle(symbol).pointerEvents,hit:!!g.querySelector('[data-id],[data-hit-area]')};
  });
  const bubble=page.locator('#penConnectionBubble');
  const halo=page.locator('#penConnectionLockHalo');
  async function assertHaloAt(candidate){
   const expected=await screen(candidate);assert.equal(await halo.isVisible(),true);
   const actual=await halo.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,pointerEvents:s.pointerEvents,ariaHidden:el.getAttribute('aria-hidden')}});
   assert(Math.abs(actual.x-expected.x)<.03&&Math.abs(actual.y-expected.y)<.03,'Halo must align with locked model point');
   assert.equal(actual.width,30);assert.equal(actual.height,30);assert.equal(actual.pointerEvents,'none');assert.equal(actual.ariaHidden,'true');
  }
  const selector=action=>`#penConnectionBubble [data-pen-connection-action="${action}"]`;
  const button=action=>page.locator(selector(action));
  const lock=async(q={x:424,y:436})=>{await pen('pointerdown',q,{buttons:1,pressure:.22});await pen('pointerup',{x:524,y:536});assert.equal(await state(),'confirming');assert.equal(await bubble.isVisible(),true)};
  async function activate(action,touch=false){
   const b=await button(action).boundingBox();assert(b);assert.equal(b.width,48);assert.equal(b.height,48);
   if(touch)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
  }
  async function assertPlaced(before,type,candidate){
   const after=await doc();assert.equal(after.items.length,before.items.length+1);assert.equal(after.items.at(-1).type,type);nearPoint(after.items.at(-1),candidate);
   assert.deepEqual(after.past,[...before.past,before.items]);assert.deepEqual(after.future,[]);assert.equal(after.selected,after.items.at(-1).id);
   assert.equal(await preview(),null);assert.equal(await bubble.isVisible(),false);assert.equal(await locked(),null);assert.equal(await state(),'tracking');assert.equal(await page.evaluate(()=>mode),type);
   assert.equal(await halo.isVisible(),false);return after;
  }
  async function assertCanceled(before,type){
   assert.deepEqual(await doc(),before);assert.equal(await preview(),null);assert.equal(await bubble.isVisible(),false);assert.equal(await locked(),null);assert.equal(await state(),'tracking');assert.equal(await page.evaluate(()=>mode),type);
   assert.equal(await halo.isVisible(),false);
  }
  async function selectRadial(tool){
   await page.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close()});
   for(const id of ['hub','supports',tool]){
    const q=await page.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return {x:m.layout.cx+13,y:m.layout.cy};const ring=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(r=>r.id===ring.id).sectors[ring.entries.findIndex(e=>e.id===id)].icon},id);
    await page.touchscreen.tap(q.x,q.y);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   }
   assert.equal(await page.evaluate(()=>mode),tool);assert.equal(await page.evaluate(()=>leftDrawingMenu.state.open),false);
  }
  for(const type of ['hinge','weld']){
   await reset(type);const before=await doc();
   for(const [q,expected]of [[{x:303,y:303},{x:307,y:307}],[{x:424,y:436},{x:400,y:450}],[{x:524,y:536},{x:500,y:550}],[{x:303,y:303},{x:307,y:307}]]){
    await pen('pointermove',q,{buttons:0,pressure:0});nearPoint(await preview(),expected);assert.equal(await state(),'tracking');assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
    assert.equal(await halo.isVisible(),false);
   }
   const trackingPreview=await preview();assert.equal(trackingPreview.type,type);assert.equal(trackingPreview.pointerEvents,'none');assert.equal(trackingPreview.hit,false);assert.equal(await page.locator('[data-endpoint-hint]').count(),1);
   for(const event of ['pointerenter','pointerover','pointerleave','pointerout'])await pen(event,{x:550,y:550},{buttons:1,pressure:.22});
   assert.deepEqual(await preview(),trackingPreview);assert.equal(await state(),'tracking');assert.deepEqual(await doc(),before);
   // The down-event snap, rather than the prior hover or later release, is authoritative.
   await pen('pointerdown',{x:424,y:436},{buttons:1,pressure:.22});assert.equal(await state(),'position-locked');nearPoint(await locked(),{x:400,y:450});assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
   assert.equal(await page.evaluate(()=>Object.isFrozen(penConnectionPlacement.lockedCandidate)),true);
   await assertHaloAt({x:400,y:450});const frozenHaloRect=await halo.boundingBox();
   assert(await halo.evaluate(el=>{const r=el.getBoundingClientRect();return svg.contains(document.elementFromPoint(r.x+15,r.y+15))}),'Halo must not intercept canvas hit testing');
   const pulse=await halo.evaluate(el=>{const s=getComputedStyle(el,'::before');return {animation:s.animationName,duration:s.animationDuration,border:s.borderTopWidth,pointerEvents:s.pointerEvents,background:s.backgroundColor}});
   assert.equal(pulse.animation,'pen-connection-lock-pulse');assert.equal(pulse.duration,'0.8s');assert.equal(pulse.border,'2px');assert.equal(pulse.pointerEvents,'none');assert.equal(pulse.background,'rgba(0, 0, 0, 0)');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await halo.evaluate(el=>getComputedStyle(el,'::before').animationName),'none');assert.equal(await halo.evaluate(el=>el.getAnimations({subtree:true}).length),0);await assertHaloAt({x:400,y:450});
   await page.emulateMedia({reducedMotion:'no-preference'});
   const frozen=await preview();
   for(const q of [{x:303,y:303},{x:524,y:536},{x:724,y:636}]){
    await pen('pointermove',q,{buttons:1,pressure:.22});await pen('pointerdown',q,{pointerId:72,buttons:1,pressure:.5});assert.deepEqual(await preview(),frozen);nearPoint(await locked(),{x:400,y:450});assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
    assert.deepEqual(await halo.boundingBox(),frozenHaloRect);
   }
   await pen('pointerup',{x:303,y:303},{pointerId:72});assert.equal(await state(),'position-locked');assert.equal(await bubble.isVisible(),false);
   await pen('pointerup',{x:524,y:536},{outside:true});assert.equal(await state(),'confirming');nearPoint(await locked(),{x:400,y:450});assert.deepEqual(await doc(),before);
   await assertHaloAt({x:400,y:450});assert.deepEqual(await halo.boundingBox(),frozenHaloRect);
   const frozenRect=await bubble.boundingBox();
   for(const q of [{x:303,y:303},{x:524,y:536},{x:724,y:636},{x:303,y:303}]){
    await pen('pointermove',q);await pen('pointerdown',q,{buttons:1,pressure:.22});await pen('pointerup',q);
    assert.deepEqual(await preview(),frozen);assert.deepEqual(await bubble.boundingBox(),frozenRect);nearPoint(await locked(),{x:400,y:450});assert.deepEqual(await doc(),before);
    assert.deepEqual(await halo.boundingBox(),frozenHaloRect);
   }
   await pen('pointercancel');await page.evaluate(()=>{render();window.dispatchEvent(new Event('resize'));window.dispatchEvent(new Event('scroll'));camera.x+=15;applyCamera()});
   assert.deepEqual(await preview(),frozen);assert.deepEqual(await bubble.boundingBox(),frozenRect);
   await assertHaloAt({x:400,y:450});
   assert.equal(await page.evaluate(()=>new DOMParser().parseFromString(exportSVG(),'image/svg+xml').querySelectorAll('[data-pen-connection-preview],#penConnectionBubble').length),0);
   assert.deepEqual(await preview(),frozen);assert.deepEqual(await bubble.boundingBox(),frozenRect);assert.deepEqual(await doc(),before);
   assert.equal(await page.evaluate(()=>new DOMParser().parseFromString(exportSVG(),'image/svg+xml').querySelectorAll('#penConnectionLockHalo').length),0);
   await page.evaluate(()=>zoomAt(1.5));await assertHaloAt({x:400,y:450});assert.deepEqual(await bubble.boundingBox(),frozenRect);assert.deepEqual(await doc(),before);
   assert.equal(await page.evaluate(()=>getComputedStyle(svg.querySelector('[data-pen-connection-preview]')).animationName),'none');
   // Explicit pen confirm acts once; its release cannot fall through to the SVG.
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});const placed=await assertPlaced(before,type,{x:400,y:450});
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await pen('pointermove');assert.deepEqual(await doc(),placed);assert.equal(await preview(),null);
   await pen('pointerup',undefined,{pointerId:72});assert.equal(await page.evaluate(()=>penConnectionButtonPointerId),71);
   const releasesBefore=await page.evaluate(()=>penButtonCanvasReleases);await pen('pointerup');assert.equal(await page.evaluate(()=>penConnectionButtonPointerId),null);assert.equal(await page.evaluate(()=>penButtonCanvasReleases),releasesBefore);
   // Even a newly visible locked placement cannot be resolved by the old compatibility click.
   await pen('pointermove');assert.equal(await bubble.isVisible(),false);await lock({x:524,y:536});const nextPreview=await preview(),nextRect=await bubble.boundingBox();
   for(const action of ['confirm','cancel']){
    for(const detail of [0,1,2])await button(action).evaluate((b,detail)=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail})),detail);
    await pen('click',undefined,{target:selector(action)});await pen('pointerup');assert.deepEqual(await doc(),placed);assert.deepEqual(await preview(),nextPreview);assert.deepEqual(await bubble.boundingBox(),nextRect);
   }
   await pen('pointerdown',undefined,{target:selector('confirm'),buttons:1,pressure:.22});await assertPlaced(placed,type,{x:500,y:550});await pen('pointerup',undefined,{outside:true});
   // Explicit pen cancel clears only transient state; a matching cancel retires the button.
   await lock();const cancelBefore=await doc();await pen('pointerdown',undefined,{target:selector('cancel'),buttons:1,pressure:.22});await assertCanceled(cancelBefore,type);
   await pen('pointercancel',undefined,{outside:true});assert.equal(await page.evaluate(()=>penConnectionButtonPointerId),null);
   await lock({x:524,y:536});const cancelNext=await preview();await button('cancel').evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1})));assert.deepEqual(await preview(),cancelNext);assert.deepEqual(await doc(),cancelBefore);
   await activate('cancel');await assertCanceled(cancelBefore,type);
   // Canvas cancel before confirming clears the lock, with no checkpoint or creation.
   await reset(type);const canceledDoc=await doc();await pen('pointermove');await pen('pointerdown',{x:424,y:436},{buttons:1,pressure:.22});
   await pen('pointercancel',undefined,{pointerId:72,outside:true});assert.equal(await state(),'position-locked');await pen('pointercancel',undefined,{outside:true});await assertCanceled(canceledDoc,type);
   await pen('pointerup');assert.equal(await bubble.isVisible(),false);await pen('pointermove');nearPoint(await preview(),{x:307,y:307});
   await pen('pointerdown',{x:424,y:436},{button:2,buttons:2,pressure:.5});assert.equal(await state(),'tracking');assert.equal(await bubble.isVisible(),false);
   // No pressure threshold is used: a primary false-contact cycle can lock, never create.
   await pen('pointerdown',{x:424,y:436},{buttons:1,pressure:0});await pen('pointerup',{x:724,y:636});assert.equal(await state(),'confirming');nearPoint(await locked(),{x:400,y:450});assert.deepEqual(await doc(),canceledDoc);
   await page.keyboard.press('Escape');await pen('pointerup');assert.equal(await page.evaluate(()=>mode),'select');assert.equal(await preview(),null);assert.equal(await bubble.isVisible(),false);assert.deepEqual((await doc()).items,canceledDoc.items);assert.deepEqual((await doc()).past,canceledDoc.past);
   assert.equal(await halo.isVisible(),false);
   await reset(type);await pen('pointerdown',{x:424,y:436},{buttons:1,pressure:.22});await assertHaloAt({x:400,y:450});
   await page.evaluate(()=>setMode('bar'));assert.equal(await halo.isVisible(),false);
   // Native finger/mouse and keyboard commands continue to resolve a locked placement.
   for(const touch of [true,false])for(const action of ['confirm','cancel']){
    await reset(type);const base=await doc();await lock();await activate(action,touch);if(action==='confirm')await assertPlaced(base,type,{x:400,y:450});else await assertCanceled(base,type);
   }
   for(const [action,key]of [['confirm','Enter'],['cancel','Space']]){
    await reset(type);await lock();const base=await doc();await button(action).focus();await page.keyboard.press(key);if(action==='confirm')await assertPlaced(base,type,{x:400,y:450});else await assertCanceled(base,type);
   }
   // Normal mouse/finger canvas placement is unchanged in every pen workflow state.
   for(const touch of [false,true])for(const phase of ['tracking','position-locked','confirming']){
    await reset(type);const base=await doc();await pen('pointermove');if(phase!=='tracking')await pen('pointerdown',{x:424,y:436},{buttons:1,pressure:.22});if(phase==='confirming')await pen('pointerup');
    const q=await screen({x:303,y:303});if(touch)await page.touchscreen.tap(q.x,q.y);else await page.mouse.click(q.x,q.y);await assertPlaced(base,type,{x:307,y:307});
   }
   // Real radial source activation plus native pen events, including a different release point.
   await reset(type);await selectRadial(type);const nativeBefore=await doc(),cdp=await page.context().newCDPSession(page),a=await screen({x:303,y:303}),b=await screen({x:424,y:436});
   const native=(event,q,down=false)=>cdp.send('Input.dispatchMouseEvent',{type:event,...q,pointerType:'pen',buttons:down?1:0,force:down? .22:0,...(event==='mouseMoved'?{}:{button:'left',clickCount:1})});
   await native('mouseMoved',a);nearPoint(await preview(),{x:307,y:307});assert.equal(await bubble.isVisible(),false);
   await native('mousePressed',a,true);await native('mouseMoved',b,true);assert.equal(await bubble.isVisible(),false);nearPoint(await locked(),{x:307,y:307});assert.deepEqual(await doc(),nativeBefore);
   await native('mouseReleased',b);assert.equal(await bubble.isVisible(),true);nearPoint(await locked(),{x:307,y:307});const nativeRect=await bubble.boundingBox();
   const confirmBox=await button('confirm').boundingBox(),q={x:confirmBox.x+24,y:confirmBox.y+24};
   for(let i=1;i<=10;i++){await native('mouseMoved',{x:b.x+(q.x-b.x)*i/10,y:b.y+(q.y-b.y)*i/10});assert.deepEqual(await bubble.boundingBox(),nativeRect);nearPoint(await preview(),{x:307,y:307})}
   await native('mousePressed',q,true);await native('mouseReleased',q);const nativePlaced=await assertPlaced(nativeBefore,type,{x:307,y:307});
   await native('mouseMoved',b);await native('mousePressed',b,true);await native('mouseMoved',a,true);await native('mouseReleased',a);nearPoint(await locked(),{x:400,y:450});
   await button('confirm').evaluate(b=>b.dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1})));assert.deepEqual(await doc(),nativePlaced);
   const cancelBox=await button('cancel').boundingBox(),c={x:cancelBox.x+24,y:cancelBox.y+24};await native('mouseMoved',c);await native('mousePressed',c,true);await native('mouseReleased',c);await assertCanceled(nativePlaced,type);await cdp.detach();
   console.log(`PASS ${type}: tracking preview only; down snap locked; matching up confirms UI; immutable candidate/rect; cancel/wrong-ID guards; pen dedup; native radial/pen and mouse/touch/keyboard`);
  }
  // Geometry wins over Grid; the down snap stays authoritative through release and confirm.
  for(const kind of ['endpoint','midpoint','intersection','member','tangent','grid','raw']){
   await reset('hinge');const sample=await page.evaluate(kind=>{
    for(const key in snapOptions)snapOptions[key]=key==='grid'||key===kind;
    if(['grid','raw'].includes(kind))items=[];else if(kind==='intersection')items=[make('bar',207,307,607,307),make('bar',407,207,407,607)];else items=[make(kind==='tangent'?'thin':'bar',307,307,507,307)];
    if(kind==='raw')snapEnabled=false;render();const q={x:kind==='endpoint'?303:kind==='midpoint'||kind==='intersection'?403:424,y:303},s=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {q,expected:drawingPoint({clientX:s.x,clientY:s.y}),grid:gridSnap(q)};
   },kind);
   const before=await doc();await pen('pointermove');await pen('pointerdown',sample.q,{buttons:1,pressure:.22});nearPoint(await locked(),sample.expected);assert.equal(await bubble.isVisible(),false);assert.deepEqual(await doc(),before);
   if(!['grid','raw'].includes(kind))assert.notDeepEqual(sample.expected,sample.grid);
   if(kind==='endpoint')nearPoint(sample.expected,{x:307,y:307});if(kind==='midpoint'||kind==='intersection')nearPoint(sample.expected,{x:407,y:307});
   await pen('pointermove',{x:724,y:636},{buttons:1,pressure:.22});await pen('pointerup',{x:724,y:636});await pen('pointermove',{x:524,y:536});nearPoint(await preview(),sample.expected);assert.deepEqual(await doc(),before);await activate('confirm');await assertPlaced(before,'hinge',sample.expected);
  }
  // Bubble flips/clamps once at release; redraw/camera changes never reposition it.
  for(const viewport of [{width:1500,height:1100},{width:800,height:1000},{width:1100,height:720}]){
   await page.setViewportSize(viewport);await reset('weld');await page.evaluate(()=>{snapEnabled=false});
   const edges=await page.evaluate(()=>{
    const r=svg.getBoundingClientRect(),left=Math.max(0,r.left)+20,right=Math.min(innerWidth,r.right)-20,top=Math.max(0,r.top)+20,bottom=Math.min(innerHeight,r.bottom)-20;
    return [[left,top,1,1],[right,top,-1,1],[left,bottom,1,-1],[right,bottom,-1,-1]].map(([x,y,sx,sy])=>{
     for(let distance=0;distance<=120;distance+=20)for(const [dx,dy]of [[distance,0],[0,distance],[distance,distance]]){const p={x:x+sx*dx,y:y+sy*dy};if(svg.contains(document.elementFromPoint(p.x,p.y)))return p}throw Error('No visible canvas point near viewport corner');
    });
   });
   for(const corner of edges){
    const q=await page.evaluate(p=>{const q=new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM().inverse());return {x:q.x,y:q.y}},corner),before=await doc();
    await lock(q);nearPoint(await locked(),q);assert.deepEqual(await doc(),before);const box=await bubble.boundingBox();assert(box.x>=7&&box.y>=7&&box.x+box.width<=viewport.width-7&&box.y+box.height<=viewport.height-7);
    assert(await button('confirm').evaluate(b=>{const r=b.getBoundingClientRect();return document.elementFromPoint(r.x+24,r.y+24)===b}));
    await page.evaluate(()=>{camera.x+=15;applyCamera();render()});assert.deepEqual(await bubble.boundingBox(),box);nearPoint(await preview(),q);assert.deepEqual(await doc(),before);await activate('confirm');await assertPlaced(before,'weld',q);
   }
  }
  assert.deepEqual(errors,[]);console.log('PASS down-event shared snap priority, clean export and stationary viewport-clamped UI');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
