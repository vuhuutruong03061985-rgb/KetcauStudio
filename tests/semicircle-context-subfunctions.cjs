const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const {focusRadialEntry}=require('./radial-focus.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const root=p.locator('.semicircle-left-menu'),context=id=>root.locator(`[data-context-action="${id}"]`);
  const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const open=async()=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await root.locator('[data-demo-id="hub"]').dispatchEvent('click');await settled()};
  const point=id=>p.evaluate(id=>{const m=leftDrawingMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon},id);
  const tapMain=async id=>{const q=await point(id);await p.touchscreen.tap(q.x,q.y);await settled()};
  const focus=async id=>{await open();const category=await p.evaluate(id=>leftDrawingCategories.find(c=>c.entries.some(e=>e.id===id)).id,id);if(await p.evaluate(()=>leftCategoryId)!==category)await tapMain(category);await focusRadialEntry(p,'left',id)};
  const contextIds=()=>root.locator('[data-context-action]').evaluateAll(es=>es.map(e=>e.dataset.contextAction));
  const doc=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,dirty:documentText()!==savedDocument}));
  const state=()=>p.evaluate(()=>({mode,support:$('support').value,rotation:currentMomentRotation,first,second}));
  const memory=()=>p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>m.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset,pointer:r.pointerId,dragging:r.dragging}))));
  const bounds=()=>p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>({side:m.state.side,radius:m.layout.radius,fits:m.layout.fits,bounds:m.layout.bounds})));
  const reset=async()=>{await p.evaluate(()=>{document.activeElement?.blur();cancelToSelection();selected=null;multiSelection.clear();closeSecondaryTools();closeMomentPalette();leftDrawingMenu.close();rightCommandMenu.close();window.contextCalls={}});await settled()};
  await p.evaluate(()=>{window.contextCalls={};for(const entry of Object.values(leftContextOptions).flat())entry.source.addEventListener('click',()=>contextCalls[entry.id]=(contextCalls[entry.id]||0)+1)});
  const activate=async(id,type='touch',drag=false,cancel=false)=>{
   const q=await p.evaluate(id=>{const entries=leftContextEntries(leftDrawingMenu.state.focusedEntry);return leftDrawingMenu.layout.contextRing.sectors[[...leftDrawingMenu.host.querySelectorAll('[data-fixed-action]')].findIndex(e=>e.dataset.fixedAction===id)].icon},id),cdp=await p.context().newCDPSession(p);
   let {x,y}=q;
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:type});
   if(drag){x+=80;y+=60;if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1,pointerType:type})}
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1,pointerType:type});
   await cdp.detach();await settled();
  };
  const out=path.resolve('.test-tools/semicircle-context-subfunctions');fs.mkdirSync(out,{recursive:true});const shot=async name=>{await p.waitForTimeout(600);await settled();await p.screenshot({path:path.join(out,name+'.png')})};
  await reset();const originalDoc=await doc(),originalState=await state();
  for(const [id,expected]of [['force',[]],['moment',['moment-cw','moment-ccw']],['udl',[]],['pin',['pin-plain']],['roller',['roller-plain']],['fixed',[]],['hinge',[]],['linkBar',[]],['weld',[]],['text',[]]]){await focus(id);assert.deepEqual(await contextIds(),expected,id);assert.deepEqual(await doc(),originalDoc);assert.deepEqual(await state(),originalState)}
  // Real angular drag, including live detent changes, exposes context without activation.
  await focus('force');const before=await state(),fixedBefore=await p.evaluate(()=>leftDrawingMenu.layout.rings.map(r=>r.sectors.map(s=>s.path)));
  const dragRing=async (index,interrupt)=>{
   const q=await p.evaluate(index=>{const m=leftDrawingMenu,r=m.state.rings[index],l=m.layout.rings[index],s=l.sectors[r.activeIndex];return{x:s.icon.x,y:s.icon.y,cx:m.layout.cx,cy:m.layout.cy,r:(s.r0+s.r1)/2,angle:(s.a0+s.a1)/2,step:l.step}},index);
   await p.mouse.move(q.x,q.y);await p.mouse.down();for(let i=1;i<=8;i++){const a=q.angle+q.step*i/8;await p.mouse.move(q.cx+q.r*Math.cos(a),q.cy+q.r*Math.sin(a))}if(interrupt)await p.evaluate(type=>window.dispatchEvent(new Event(type)),interrupt);await p.mouse.up();await p.waitForTimeout(210);
  };
  await dragRing(1);assert.deepEqual(await contextIds(),['moment-cw','moment-ccw']);assert.deepEqual(await state(),before);assert.deepEqual(await doc(),originalDoc);assert.deepEqual(await p.evaluate(()=>contextCalls),{});assert.deepEqual(await p.evaluate(()=>leftDrawingMenu.layout.rings.map(r=>r.sectors.map(s=>s.path))),fixedBefore);
  const geometry=await p.evaluate(()=>{const m=leftDrawingMenu,c=m.layout.contextRing,E=semicircleEngine;return {radius:m.layout.radius,same:c.sectors.every(s=>s.r0===c.r0&&s.r1===c.r1),targets:c.sectors.every(s=>{for(let a=0;a<2*Math.PI;a+=Math.PI/36)if(!E.hitTestRadialSector(s,s.icon.x+21.99999*Math.cos(a),s.icon.y+21.99999*Math.sin(a)))return false;return true}),noOverlap:c.sectors[0].a1===c.sectors[1].a0&&c.r0===m.layout.rings[1].r1+3}});
  assert(geometry.same&&geometry.targets&&geometry.noOverlap);assert(Math.abs(geometry.radius-202.04759747124507)<1e-8);
  await dragRing(1);assert.deepEqual(await contextIds(),[]);assert.deepEqual(await state(),before);assert.deepEqual(await doc(),originalDoc);
  for(const interruption of ['blur','resize']){await focus('force');await dragRing(1,interruption);assert.deepEqual(await contextIds(),[],interruption);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.focusedEntry.id),'force');assert.deepEqual(await state(),before);assert.deepEqual(await doc(),originalDoc)}
  // Source radios own direction, mode, palette closure and activation exactly once.
  for(const [rotation,type]of [['ccw','touch'],['cw','pen']]){
   await reset();await focus('moment');const saved=await doc();await activate('moment-'+rotation,type);assert.equal(await p.evaluate(rotation=>contextCalls['moment-'+rotation],rotation),1);assert.equal(await p.evaluate(()=>currentMomentRotation),rotation);assert.equal(await p.evaluate(()=>$('rotation').value),rotation);assert.equal(await p.evaluate(()=>mode),'moment');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await doc(),saved);await open();assert.equal(await context('moment-'+rotation).getAttribute('aria-pressed'),'true');assert((await context('moment-'+rotation).getAttribute('class')).includes('active'));await shot('moment-'+rotation);
  }
  await p.evaluate(()=>momentChoices.querySelector('input[value="ccw"]').click());await settled();assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),true);assert.equal(await context('moment-ccw').getAttribute('aria-pressed'),'true');assert.equal(await context('moment-cw').getAttribute('aria-pressed'),'false');
  // Legacy right-click, ArrowDown and real touch/pen holds remain available.
  for(const kind of ['contextmenu','ArrowDown','touch','pen']){
   await focus('moment');const q=await point('moment');
   if(kind==='contextmenu')await p.mouse.click(q.x,q.y,{button:'right'});
   else if(kind==='ArrowDown'){await root.locator('[data-demo-id="moment"]').focus();await p.keyboard.press('ArrowDown')}
   else{const cdp=await p.context().newCDPSession(p);if(kind==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[q]});else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await p.waitForTimeout(550);if(kind==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1,pointerType:'pen'});await cdp.detach()}
   assert.equal(await p.evaluate(()=>momentPalette.open),true,kind);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);await p.locator('#momentDirectionPalette input[value="cw"]').click();assert.equal(await p.evaluate(()=>currentMomentRotation),'cw');await settled();
  }
  for(const [parent,type]of [['pin','mouse'],['roller','touch']]){
   await reset();await p.evaluate(parent=>document.querySelector(`button[data-support-type="${parent}"]`).click(),parent);await reset();await focus(parent);assert.equal(await context(parent+'-plain').getAttribute('aria-pressed'),'false');if(parent==='pin')await shot('pin-normal');const saved=await doc();await activate(parent+'-plain',type);assert.equal(await p.evaluate(parent=>contextCalls[parent+'-plain'],parent),1);assert.equal(await p.evaluate(()=>$('support').value),parent+'-plain');assert.equal(await p.evaluate(()=>mode),'support');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await doc(),saved);
   // Perturb remembered L2 to prove reopen synchronizes the plain variant's parent.
   await p.evaluate(()=>{const r=leftDrawingMenu.state.rings[1];r.offset=r.activeIndex=5});await open();assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].entries[leftDrawingMenu.state.rings[1].activeIndex].id),parent);assert.deepEqual(await contextIds(),[parent+'-plain']);assert.equal(await context(parent+'-plain').getAttribute('aria-pressed'),'true');await shot(parent+'-plain');await tapMain(parent);assert.equal(await p.evaluate(()=>$('support').value),parent);assert.deepEqual(await doc(),saved);
  }
  // Selected-support editing must have exactly the same source semantics as the
  // existing buttons (it edits the object and remains Select, without adding one).
  await reset();await p.evaluate(()=>{window.supportFixture=make('support',400,300,undefined,undefined,{support:'pin'});window.prepareSupport=()=>{leftDrawingMenu.close();cancelToSelection();items=[copy(supportFixture)];past=[];future=[];selected=items[0].id;render()};prepareSupport();document.querySelector('button[data-support-type="pin-plain"]').click()});const sourceResult=await doc();const sourceMode=await state();await p.evaluate(()=>{prepareSupport();contextCalls={}});await focus('pin');await activate('pin-plain');assert.deepEqual(await doc(),sourceResult);assert.deepEqual(await state(),sourceMode);assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>contextCalls['pin-plain']),1);
  // Support select changes refresh the selected marker even while another mode
  // owns drawing and all support buttons are inactive.
  await reset();await focus('pin');await p.evaluate(()=>{$('support').value='pin';$('support').dispatchEvent(new Event('change',{bubbles:true}))});await settled();assert.equal(await context('pin-plain').getAttribute('aria-pressed'),'false');await p.evaluate(()=>{$('support').value='pin-plain';$('support').dispatchEvent(new Event('change',{bubbles:true}))});await settled();assert.equal(await context('pin-plain').getAttribute('aria-pressed'),'true');
  await reset();await focus('moment');const hoverMemory=await memory(),hoverState=await state(),hoverDoc=await doc();await context('moment-cw').dispatchEvent('pointermove',{pointerType:'pen',pointerId:777,clientX:200,clientY:300});assert.deepEqual(await memory(),hoverMemory);assert.deepEqual(await state(),hoverState);assert.deepEqual(await doc(),hoverDoc);assert.deepEqual(await p.evaluate(()=>contextCalls),{});
  for(const type of ['mouse','pen','touch']){await activate('moment-ccw',type,true);assert.deepEqual(await memory(),hoverMemory);assert.deepEqual(await state(),hoverState);assert.deepEqual(await doc(),hoverDoc);assert.deepEqual(await p.evaluate(()=>contextCalls),{})}await activate('moment-cw','touch',false,true);assert.deepEqual(await p.evaluate(()=>contextCalls),{});
  assert.equal(await root.locator('[data-roller-ring][data-demo-id="pin-plain"],[data-roller-ring][data-demo-id="roller-plain"],[data-roller-ring][data-demo-id="moment-cw"],[data-roller-ring][data-demo-id="moment-ccw"]').count(),0);
  await focus('force');await shot('force-empty');await focus('fixed');await shot('fixed-empty');await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');assert.equal(await p.locator('.semicircle-right-menu [data-context-action]').count(),0);await shot('right-empty');
  await reset();await focus('moment');await shot('landscape');const landscape=await bounds();await p.setViewportSize({width:800,height:1280});await settled();await open();await shot('portrait');assert.deepEqual((await bounds()).map(g=>g.radius),landscape.map(g=>g.radius));
  await p.setViewportSize({width:800,height:784});await p.waitForFunction(()=>rightCommandMenu.layout.bounds.bottom===716&&document.body.dataset.radialPrimary==='true');await open();await focus('moment');await shot('boundary-fit');assert.deepEqual((await bounds()).map(g=>g.radius),landscape.map(g=>g.radius));console.log('BOUNDARY FIT',await bounds());
  await p.setViewportSize({width:800,height:557});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='false');await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close()});await p.locator('#toggleTools').tap();await p.locator('button[data-support-type="roller-plain"]').tap();assert.equal(await p.evaluate(()=>$('support').value),'roller-plain');await p.locator('#toggleTools').tap();await p.locator('button[data-mode="moment"]').dispatchEvent('contextmenu');assert.equal(await p.evaluate(()=>momentPalette.open),true);await shot('fallback-legacy');await p.locator('#momentDirectionPalette input[value="ccw"]').click();assert.equal(await p.evaluate(()=>currentMomentRotation),'ccw');console.log('BOUNDARY FALLBACK',await bounds());
  assert.deepEqual(errors,[]);console.log('PASS focus-only context, real source activation/selected support parity, logical parents, legacy Moment routes, fixed geometry/targets, hover/drag/cancel, unchanged envelopes; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
