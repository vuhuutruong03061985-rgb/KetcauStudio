'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');
const {focusRadialEntry}=require('./radial-focus.cjs');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await ownership(p,true);
  await p.evaluate(()=>{
   window.clickCounts={};
   for(const id of ['extend','snapOptions'])rightCommandSource(id).addEventListener(id==='snapOptions'?'keydown':'click',e=>{
    if(id!=='snapOptions'||e.key==='ArrowDown')clickCounts[id]=(clickCounts[id]||0)+1;
   });
   $('gridToggle').addEventListener('click',()=>clickCounts.grid=(clickCounts.grid||0)+1);
  });
  const reset=async()=>{await p.evaluate(()=>{
   document.activeElement?.blur();cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close();
   snapPanel.open=false;snapEnabled=true;updateSnapControls();window.clickCounts={};
  });await settled(p)};
  const focus=async id=>{
   if(!await p.evaluate(()=>rightCommandMenu.state.open))await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');
   await settled(p);
   await focusRadialEntry(p,'right',id);
  };
  const point=id=>p.evaluate(id=>{
   const m=rightCommandMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));
   return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon;
  },id);
  const leftTap=async()=>{
   const q=await p.evaluate(()=>({x:leftDrawingMenu.layout.cx+13,y:leftDrawingMenu.layout.cy}));
   await p.touchscreen.tap(q.x,q.y);await settled(p);
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),true,'first fresh LEFT touch must open');
  };
  const counts=()=>p.evaluate(()=>clickCounts);
  const tap=async(type,q)=>{
   if(type==='touch')await p.touchscreen.tap(q.x,q.y);
   else if(type==='mouse')await p.mouse.click(q.x,q.y);
   else{
    const cdp=await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
    await cdp.detach();
   }
   await settled(p);
  };
  // Controlled pointer-up with no automatic click lets lifecycle tests hold the
  // compatibility click pending. Native mouse/pen/touch are exercised below too.
  const pending=async(id,pointerId=73)=>{
   await focus(id);const q=await point(id);
   await p.evaluate(({id,q,pointerId})=>{
    const target=rightCommandMenu.host.querySelector(`[data-demo-id="${id}"]`);
    for(const type of ['pointerdown','pointerup'])target.dispatchEvent(new PointerEvent(type,{bubbles:true,pointerId,pointerType:'touch',button:0,buttons:type==='pointerdown'?1:0,clientX:q.x,clientY:q.y}));
   },{id,q,pointerId});await settled(p);
  };
  const compatGrid=pointerId=>p.evaluate(pointerId=>$('gridToggle').dispatchEvent(new PointerEvent('click',{bubbles:true,cancelable:true,detail:1,pointerId,pointerType:'touch'})),pointerId);

  // The reported regression: keyboard activation must not steal LEFT's first tap.
  for(const key of ['Enter','Space']){
   await reset();await focus('extend');await p.locator('.semicircle-right-menu [data-demo-id="extend"]').focus();
   await p.keyboard.press(key);await settled(p);
   assert.deepEqual(await counts(),{extend:1});assert.equal(await p.evaluate(()=>mode),'extend');
   await leftTap();assert.deepEqual(await counts(),{extend:1});
   await reset();await focus('extend');await p.locator('.semicircle-right-menu [data-demo-id="extend"]').focus();
   await p.keyboard.press(key);await settled(p);assert.deepEqual(await counts(),{extend:1});
   // No pointerdown intervenes: keyboard must not arm a pointer-click token at all.
   assert.equal(await compatGrid(73),true);assert.deepEqual(await counts(),{extend:1,grid:1});
  }
  console.log('PASS Enter/Space exactly once; no pointer guard; first LEFT touch');

  for(const type of ['mouse','pen','touch']){
   await reset();await focus('snapOptions');const before=await p.evaluate(()=>({...snapOptions})),q=await point('snapOptions');
   await tap(type,q);
   assert.equal(await p.evaluate(()=>snapPanel.open),true);
   assert.deepEqual(await p.evaluate(()=>({...snapOptions})),before,'popup compatibility click must not change any checkbox');
   assert.equal((await counts()).snapOptions,1);
   assert(await p.evaluate(q=>snapPanel.contains(document.elementFromPoint(q.x,q.y)),q),'popup actually covers the release point');
   await leftTap();assert.deepEqual(await counts(),{snapOptions:1});
   await reset();await focus('extend');await tap(type,await point('extend'));
   assert.deepEqual(await counts(),{extend:1});await leftTap();
   await focus('extend');await tap(type,await point('extend'));
   assert.deepEqual(await counts(),{extend:2},'second independent gesture invokes once');
   console.log(`PASS ${type}: popup safety, first follow-up touch, exactly 1 invocation per tap (2 taps = 2)`);
  }

  await reset();await pending('snapOptions');
  // Deliberately retarget this same gesture's compatibility click into the popup.
  const popup=await p.evaluate(()=>{
   const input=snapPanel.querySelector('input[type="checkbox"]'),before=input.checked;
   const allowed=input.dispatchEvent(new PointerEvent('click',{bubbles:true,cancelable:true,detail:1,pointerId:73,pointerType:'touch'}));
   return {before,after:input.checked,allowed};
  });
  assert.equal(popup.allowed,false);assert.equal(popup.after,popup.before);
  assert.equal(await compatGrid(73),true,'token consumed once');
  assert.deepEqual(await counts(),{snapOptions:1,grid:1});

  await reset();await pending('extend');
  assert.equal(await compatGrid(74),true,'a different pointer ID is not the activating gesture');
  assert.equal(await compatGrid(73),false,'same pending gesture remains blocked once');
  assert.deepEqual(await counts(),{extend:1,grid:1});
  await reset();await pending('extend');await leftTap();
  assert.equal(await compatGrid(73),true,'new LEFT pointerdown retires the old token before LEFT stops propagation');
  console.log('PASS pending token: pointer identity, popup retarget, consume once, early new-pointer cleanup');

  for(const lifecycle of ['close','blur','destroy']){
   await reset();await pending('extend');
   await p.evaluate(lifecycle=>{
    if(lifecycle==='close')rightCommandMenu.close();
    if(lifecycle==='blur')window.dispatchEvent(new Event('blur'));
    if(lifecycle==='destroy'){rightCommandMenu.destroy();rightCommandMenu=null;mountRightCommandMenu()}
   },lifecycle);
   await focus('extend');
   assert.equal(await compatGrid(73),true,lifecycle+' clears pending compatibility token');
   await tap('touch',await point('extend'));assert.deepEqual(await counts(),{extend:2,grid:1});await leftTap();
  }
  console.log('PASS close/reopen, blur, destroy/remount: first interaction works');

  await reset();await focus('extend');
  await p.evaluate(()=>{rightCommandSource('extend').disabled=true;rightCommandMenu.refresh()});await settled(p);
  for(const type of ['mouse','pen','touch'])await tap(type,await point('extend'));
  for(const key of ['Enter','Space']){
   await p.locator('.semicircle-right-menu [data-demo-id="extend"]').evaluate(e=>{e.setAttribute('tabindex','0');e.focus()});
   await p.keyboard.press(key);
  }
  assert.deepEqual(await counts(),{});assert.equal(await compatGrid(73),true);
  await p.evaluate(()=>{rightCommandSource('extend').disabled=false;rightCommandMenu.refresh()});
  assert.deepEqual(errors,[]);console.log('PASS disabled controls: 0 activations, no suppression');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
