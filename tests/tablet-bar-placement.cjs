'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,isMobile:true});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
  const cdp=await context.newCDPSession(p),bubble=p.locator('#penConnectionBubble'),keypad=p.locator('#tabletNumericKeypad'),length=p.locator('#dynamicInputValue'),angle=p.locator('#dynamicInputSecondary'),finish=p.locator('#commandFinish');
  const originalSnap=await p.evaluate(()=>copy(snapOptions));
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const client=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const state=()=>p.evaluate(()=>({first:copy(first),pending:penConnectionPlacement?.type==='bar'?{point:copy(penConnectionPlacement.lockedCandidate),snap:penConnectionPlacement.snapKind}:null,items:copy(items),past:copy(past),future:copy(future),locks:barNumericSession?copy(barNumericSession.state):null}));
  async function pen(type,q){await cdp.send('Input.dispatchMouseEvent',{type,x:q.x,y:q.y,pointerType:'pen',button:type==='mouseMoved'?'none':'left',buttons:type==='mousePressed'?1:0,clickCount:type==='mouseMoved'?0:1})}
  async function contact(x,y,type='touch'){
   const q=await client(x,y);
   assert(await p.evaluate(q=>svg.contains(document.elementFromPoint(q.x,q.y)),q),'requested canvas contact must be uncovered');
   if(type==='pen'){await pen('mousePressed',q);await pen('mouseReleased',q)}else await p.touchscreen.tap(q.x,q.y);
   await settle();
  }
  async function button(el,type='touch'){
   if(el===finish)await p.evaluate(()=>{tabletInputKeypad.hide();updateCommandControls()});
   const r=await el.boundingBox();assert(r);const q={x:r.x+r.width/2,y:r.y+r.height/2};
   if(type==='pen'){await pen('mousePressed',q);await pen('mouseReleased',q)}else await p.touchscreen.tap(q.x,q.y);
   await settle();
  }
  const pointAction=(action,type='touch')=>button(bubble.locator(`[data-pen-connection-action=${action}]`),type);
  const key=k=>button(keypad.locator(`[data-numeric-key="${k}"]`));
  async function reset(fixture=false){
   await p.evaluate(({fixture,originalSnap})=>{cancelToSelection();document.activeElement.blur();items=fixture?[make('bar',300,300,500,300)]:[];past=[];future=[];geometryScale=40;gridVisible=false;snapEnabled=true;Object.assign(snapOptions,originalSnap);setMode('bar')},{fixture,originalSnap});await settle();
  }
  async function start(type='touch'){
   const before=await state();
   await contact(300,300,type);const candidate=(await state()).pending.point;assert.equal((await state()).first,null);await pointAction('confirm',type);
   assert.deepEqual((await state()).first,candidate);near(candidate.x,300);near(candidate.y,300);assert.deepEqual((await state()).items,before.items);assert.equal((await state()).past.length,0);
   assert(await keypad.isVisible());assert.equal(await length.getAttribute('inputmode'),'none');assert.equal(await angle.getAttribute('inputmode'),'none');
  }
  async function lock(field,value){
   await button(field);assert.equal(await field.evaluate(el=>document.activeElement===el),true);
   await key('clear');for(const c of String(value)){if(c==='-')await key('sign');else await key(c)}await key('confirm');
   assert.equal(await field.evaluate(el=>document.activeElement===el),true);assert.equal(await field.getAttribute('inputmode'),'none');
  }
  // A held pen moving/releasing over the Bubble never substitutes for a fresh confirm press.
  await reset(true);await pen('mousePressed',await client(304,302));const held=(await state()).pending;
  const heldButton=await bubble.locator('[data-pen-connection-action=confirm]').boundingBox(),heldTarget={x:heldButton.x+heldButton.width/2,y:heldButton.y+heldButton.height/2};
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...heldTarget,pointerType:'pen',buttons:1});await pen('mouseReleased',heldTarget);
  assert.equal((await state()).first,null);assert.deepEqual((await state()).pending,held);assert.equal((await state()).items.length,1);
  await pointAction('confirm','pen');assert.deepEqual((await state()).first,held.point);assert.equal((await state()).items.length,1);
  for(const type of ['touch','pen']){
   await reset(true);const before=await state();await contact(304,302,type);
   let s=await state();assert.deepEqual(s.pending,{point:{x:300,y:300},snap:'endpoint'});assert.equal(s.first,null);assert.deepEqual(s.items,before.items);assert.deepEqual(s.past,[]);
   const mark=await p.locator('[data-endpoint-hint]').innerHTML();
   await pen('mouseMoved',await client(750,450));assert.deepEqual((await state()).pending,s.pending);assert.equal(await p.locator('[data-endpoint-hint]').innerHTML(),mark);
   await pointAction('cancel',type);assert.equal((await state()).first,null);assert.equal((await state()).pending,null);assert.deepEqual((await state()).items,before.items);
   await start(type);assert.equal(await bubble.isVisible(),false);
   await contact(504,302,type);s=await state();assert.deepEqual(s.pending.point,{x:500,y:300});assert.equal(s.pending.snap,'endpoint');
   await contact(850,150,type);assert.deepEqual((await state()).pending,s.pending);assert.equal((await state()).items.length,1);
   await pen('mouseMoved',await client(800,500));assert.deepEqual((await state()).pending,s.pending);
   await pointAction('confirm',type);s=await state();assert.equal(s.items.length,2);assert.equal(s.past.length,1);assert.deepEqual(s.first,{x:500,y:300});assert.equal(s.locks.distance.mode,'live');assert.equal(s.locks.angle.mode,'live');
   await bubble.locator('[data-pen-connection-action=confirm]').dispatchEvent('click');assert.deepEqual(await state(),s);
   await contact(620,420,type);assert.equal((await state()).items.length,2);await pointAction('confirm',type);s=await state();assert.equal(s.items.length,3);assert.equal(s.past.length,2);assert.deepEqual({x:s.items[2].x,y:s.items[2].y},{x:500,y:300});
   const saved=await p.evaluate(()=>documentText());await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,2);assert.equal((await state()).pending,null);await p.evaluate(()=>actions.redo[1]());assert.deepEqual((await state()).items,s.items);
   await p.evaluate(async text=>loadDocument(new File([text],'bar.json')),saved);assert.deepEqual((await state()).items,s.items);assert.equal(await keypad.isVisible(),false);assert.equal(await length.getAttribute('inputmode'),'decimal');assert.equal(await angle.getAttribute('inputmode'),'decimal');
  }
  // Numeric definition works from contact alone, with either field first and no canvas movement.
  for(const order of ['angle-first','length-first']){
   await reset();await start();
   const entries=order==='angle-first'?[[angle,30],[length,2.5]]:[[length,2.5],[angle,30]];
   for(const [field,value]of entries){await lock(field,value);assert.equal((await state()).items.length,0);assert.equal((await state()).pending,null)}
   let s=await state();assert.equal(s.locks.distance.value,2.5);assert.equal(s.locks.angle.value,30);assert.equal(s.locks.activeField,order==='angle-first'?'distance':'angle');
   assert.equal(await keypad.locator('.tablet-text-rollers').isVisible(),false);assert.equal(await keypad.locator('[data-numeric-key=sign]').textContent(),'\u00b1');
   const line=await p.locator('[data-bar-preview] line').evaluate(el=>['x1','y1','x2','y2'].map(a=>Number(el.getAttribute(a))));
   near(line[0],300);near(line[1],300);near(line[2],300+100*Math.cos(Math.PI/6));near(line[3],250);
   assert(await finish.isHidden());assert.equal(await p.evaluate(()=>commandFinish.hidden),false);assert.equal((await state()).past.length,0);
   await contact(700,500);assert.equal((await state()).items.length,0);assert.equal((await state()).pending,null);
   await button(finish);s=await state();assert.equal(s.items.length,1);assert.equal(s.past.length,1);near(s.items[0].x2,line[2]);near(s.items[0].y2,line[3]);assert.deepEqual(s.first,{x:s.items[0].x2,y:s.items[0].y2});assert.equal(s.locks.distance.mode,'live');assert.equal(s.locks.angle.mode,'live');assert(await keypad.isVisible());
   await finish.dispatchEvent('click');assert.deepEqual(await state(),s);
  }
  // Partial locks constrain the actual candidate; cancellation retains established geometry/locks.
  for(const field of [length,angle]){
   await reset();await start();await lock(field,field===length?2:90);await contact(500,400);
   const s=await state(),point=s.pending.point;
   if(field===length)near(Math.hypot(point.x-300,point.y-300),80);else{near(point.x,300);near(point.y,300-Math.hypot(200,100))}
   await pointAction('cancel');const canceled=await state();assert.deepEqual(canceled.first,s.first);assert.equal(canceled.items.length,0);assert.deepEqual(canceled.locks[field===length?'distance':'angle'],s.locks[field===length?'distance':'angle']);
   await contact(500,400);assert.deepEqual((await state()).pending.point,point);await pointAction('confirm');near((await state()).items[0].x2,point.x);near((await state()).items[0].y2,point.y);
  }
  // Field ownership, invalid input and editing never confirm a stale point or create geometry.
  await reset();await start();await contact(500,400);await button(angle);assert.equal((await state()).pending,null);await key('clear');assert.equal((await state()).pending,null);await key('9');await key('0');await key('confirm');assert.equal((await state()).locks.angle.value,90);assert.equal((await state()).locks.distance.mode,'live');
  await button(length);await key('clear');await key('0');await key('confirm');assert.equal(await length.getAttribute('aria-invalid'),'true');assert.equal((await state()).locks.distance.mode,'live');await contact(600,400);assert.equal((await state()).pending,null);assert.equal((await state()).items.length,0);
  await lock(length,2);await button(angle);await key('clear');await key('9'); // A pending tablet edit prevents either commit action.
  await finish.dispatchEvent('click');assert.equal((await state()).items.length,0);await key('confirm');assert.equal((await state()).items.length,0);
  await button(finish);assert.equal((await state()).items.length,1);assert(await keypad.isVisible());assert.equal(await length.getAttribute('inputmode'),'none');assert.equal(await angle.getAttribute('inputmode'),'none');
  // Frozen snap provenance and exact coordinates survive release, pointerleave and redraw.
  await reset(true);await start();await contact(504,302);const frozen=await state();await p.locator('#drawing').dispatchEvent('pointerleave',{pointerType:'pen'});await p.evaluate(()=>render());assert.deepEqual((await state()).pending,frozen.pending);assert(await p.locator('[data-endpoint-hint]').isVisible());
  // Snap kinds are acquired without hover, then retained at the actual candidate coordinate.
  for(const kind of ['midpoint','intersection','perpendicular','pendingIntersection']){
   await reset();
   if(['perpendicular','pendingIntersection'].includes(kind))await start('pen');
   await p.evaluate(kind=>{
    for(const key of Object.keys(snapOptions))snapOptions[key]=false;
    snapOptions[kind==='pendingIntersection'?'intersection':kind]=true;
    items=[make('bar',400,200,400,500)];
    if(kind==='midpoint')items=[make('bar',300,300,500,300)];
    if(kind==='intersection')items.push(make('bar',300,300,500,300));render();
   },kind);
   const establishedStart=(await state()).first,y=kind==='pendingIntersection'?400:300;await contact(402,y,'pen');const candidate=(await state()).pending;
   assert.equal(candidate.snap,kind);const selector=['perpendicular','pendingIntersection'].includes(kind)?'[data-extra-snap-hint]':`[data-${kind}-hint]`;
   const hint=await p.locator(selector).innerHTML();await pen('mouseMoved',await client(750,450));assert.equal(await p.locator(selector).innerHTML(),hint);assert.deepEqual((await state()).pending,candidate);
   await pointAction('confirm','pen');const s=await state();if(establishedStart){assert.equal(s.items.at(-1).x2,candidate.point.x);assert.equal(s.items.at(-1).y2,candidate.point.y)}else assert.deepEqual(s.first,candidate.point);
  }
  // Actual pen input/keypad taps retain field ownership and never select canvas coordinates.
  await reset();await start('pen');await button(angle,'pen');await button(keypad.locator('[data-numeric-key="9"]'),'pen');await button(keypad.locator('[data-numeric-key="0"]'),'pen');await button(keypad.locator('[data-numeric-key="confirm"]'),'pen');assert.equal((await state()).locks.angle.value,90);assert.equal((await state()).pending,null);assert.equal((await state()).items.length,0);assert.equal(await angle.getAttribute('inputmode'),'none');
  await lock(length,1);await button(finish,'pen');assert.equal((await state()).items.length,1);assert.equal((await state()).past.length,1);await finish.dispatchEvent('click');assert.equal((await state()).items.length,1);
  // Finish and Bubble remain reachable near the viewport edges in both orientations.
  for(const viewport of [{width:1280,height:800},{width:800,height:1100}]){
   await p.setViewportSize(viewport);await reset();await p.evaluate(()=>snapEnabled=false);
   const q=await p.locator('#drawing').evaluate(el=>{const r=el.getBoundingClientRect(),c=new DOMPoint(r.left+40,r.top+8).matrixTransform(svg.getScreenCTM().inverse());return {x:c.x,y:c.y}});
   await contact(q.x,q.y);let r=await bubble.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);await pointAction('confirm');await lock(length,1);await lock(angle,0);await p.evaluate(()=>{tabletInputKeypad.hide();updateCommandControls()});r=await finish.boundingBox();assert(r&&r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);
   assert.equal(await finish.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),true);
   await button(finish);assert.equal((await state()).items.length,1);
  }
  await p.setViewportSize({width:1280,height:800});
  // Lifecycle transitions discard candidates without changing already committed geometry.
  for(const action of ['resize','zoom','blur','cancel','tool','undo','redo','new','load','pinch','pointercancel']){
   await reset(true);await start();await contact(650,450);const before=await state();
   if(action==='resize'){await p.setViewportSize({width:1200,height:780});await p.setViewportSize({width:1280,height:800})}
   if(action==='zoom')await p.evaluate(()=>zoomAt(1.1));
   if(action==='blur')await p.evaluate(()=>window.dispatchEvent(new Event('blur')));
   if(action==='cancel')await p.keyboard.press('Escape');
   if(action==='tool')await p.evaluate(()=>setMode('thin'));
   if(action==='undo')await p.evaluate(()=>actions.undo[1]());
   if(action==='redo')await p.evaluate(()=>actions.redo[1]());
   if(action==='new'){await p.evaluate(()=>{window.confirm=()=>true;newDocument()})}
   if(action==='load')await p.evaluate(async()=>loadDocument(new File([documentText()],'fixture.json')));
   if(action==='pointercancel')await p.locator('#drawing').dispatchEvent('pointercancel',{pointerType:'pen',pointerId:await p.evaluate(()=>penConnectionPlacement.pointerId)});
   if(action==='pinch'){
    const q=await client(600,450);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x,y:q.y,id:8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x,y:q.y,id:8},{x:q.x+60,y:q.y+20,id:9}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   }
   await settle();assert.equal((await state()).pending,null,action);assert.deepEqual((await state()).items,action==='new'?[]:before.items,action);assert.equal(await bubble.isVisible(),false,action);
  }
  assert.deepEqual(errors,[]);console.log('PASS tablet Bar: native touch/pen frozen snap points, start versus endpoint confirmation, cancel, independent keypad ownership/suppression, no-motion numeric Finish, partial locks, chaining, history/JSON, duplicate events and lifecycle');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
