const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const pointer of ['mouse','touch','pen']){
  const tablet=pointer!=='mouse',p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof toggleCanvasPan==='function');const cdp=await p.context().newCDPSession(p);
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const contact=async(type,q)=>{if(pointer==='mouse'){await p.mouse.move(q.x,q.y);if(type==='down')await p.mouse.down();else if(type==='up')await p.mouse.up()}
   else if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:type==='down'?'touchStart':type==='up'?'touchEnd':'touchMove',touchPoints:type==='up'?[]:[{...q,id:1}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:type==='down'?'mousePressed':type==='up'?'mouseReleased':'mouseMoved',...q,button:'left',buttons:type==='up'?0:1,clickCount:1,pointerType:'pen'});
  };
  const tap=async q=>{if(pointer==='mouse')await p.mouse.click(q.x,q.y);else if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else{await contact('down',q);await contact('up',q)}await settle(p)};
  const open=async()=>{if(!await p.evaluate(()=>rightCommandMenu.state.open)){
   // Locator tapping waits for the real SVG target, without source clicks or menu state edits.
   if(pointer==='touch')await p.locator('.semicircle-right-menu [data-demo-id="hub"]').tap();
   else{const q=await p.locator('.semicircle-right-menu [data-demo-id="hub"]').boundingBox();await tap({x:q.x+q.width/2,y:q.y+q.height/2})}
   await p.waitForFunction(()=>rightCommandMenu.state.open,null,{timeout:1500});
  }};
  const action=async id=>{if(!tablet){await p.locator('#'+id).click();await settle(p);return}
   // Retain legacy ownership state-machine checks; new tablet Pivot has no Move/Base sectors.
   if(['moveObjects','moveBasePoint'].includes(id)){assert(await p.locator('#'+id).isHidden());await p.evaluate(id=>document.getElementById(id).click(),id);await settle(p);return}
   await open();const q=await p.evaluate(id=>{const m=rightCommandMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return r?m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon:null},id);assert(q,id+' available through radial proxy');await tap(q)};
  // Switch/capture unit scenarios use authoritative source actions; the full
  // native command sequence above and post-drag radial suite test presentation separately.
  const source=async id=>{await p.evaluate(id=>document.getElementById(id).click(),id);await settle(p)};
  const bubble=async action=>{const q=await p.locator('[data-pen-connection-action="'+action+'"]').boundingBox();assert(q);assert(q.width>=44&&q.height>=44);await tap({x:q.x+q.width/2,y:q.y+q.height/2})};
  const seed=async(ids=['A'])=>{await p.evaluate(ids=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();items=[make('bar',200,250,500,250,{id:'A',strokeColor:'#123456'}),make('bar',800,450,950,450,{id:'T'}),make('thin',320,100,320,400,{id:'X'})];past=[];future=[];updateSelection(ids,ids[0]);render()},ids);await settle(p)};
  const state=()=>p.evaluate(()=>({pan:panEnabled,panPressed:panButton.getAttribute('aria-pressed'),gesture:gesture?.kind||null,contacts:contacts.size,snapshot:!!touchSnapshot,suppressed:suppressTouch,mode,session:smartMoveSession?{state:smartMoveSession.state,base:smartMoveSession.base,pending:smartMoveSession.pending?.kind,pointerId:smartMoveSession.pointerId}:null,
   bubble:penConnectionPlacement?.type||null,preview:!!svg.querySelector('[data-move-preview]'),movePressed:moveObjects.getAttribute('aria-pressed'),baseDisabled:moveBasePoint.disabled,items:copy(items),past:past.length,future:future.length,camera:{...camera}}));
  const unchanged=async original=>{const s=await state();assert.deepEqual(s.items,original);assert.equal(s.past,0);assert.equal(s.future,0)};
  await seed();const original=(await state()).items;
  assert.deepEqual(await p.evaluate(()=>[panButton,moveObjects,moveBasePoint].map(e=>e.getAttribute('aria-label'))),['Di chuyển trang','Di chuyển đối tượng','Chọn điểm gốc']);
  assert.equal(await p.evaluate(()=>new Set([toolIconPaths.panView,toolIconPaths.moveObjects,toolIconPaths.moveBasePoint]).size),3);
  assert.deepEqual(await p.evaluate(()=>[moveObjects,moveBasePoint].map(e=>e.dataset.toolbarIcon)),['moveObjects','moveBasePoint']);
  if(tablet){await open();assert.deepEqual(await p.evaluate(()=>rightCommandMenu.state.rings.flatMap(r=>r.entries.filter(e=>['panView','moveObjects','moveBasePoint'].includes(e.id)).map(e=>[r.id,e.id,e.source.id]))),[['R2','panView','panView']]);await p.evaluate(()=>rightCommandMenu.close())}
  // Pan is retired before Move starts; valid Base availability and source/destination ownership.
  await action('panView');assert((await state()).pan);await action('moveObjects');let s=await state();assert(!s.pan);assert.equal(s.panPressed,'false');assert(!s.gesture);assert(!s.baseDisabled);await unchanged(original);
  await action('moveBasePoint');assert.equal((await state()).session.state,'SELECT_BASE_POINT');await tap(await screen(200,250));
  if(tablet){assert.equal((await state()).session.state,'CONFIRM_BASE_POINT');await bubble('confirm')}
  assert.equal((await state()).session.state,'MOVE_WITH_BASE_POINT');await unchanged(original);
  await tap(await screen(801,451));if(tablet){assert.equal((await state()).session.state,'CONFIRM_MOVE_WITH_BASE_POINT');await unchanged(original);await bubble('confirm')}
  s=await state();assert.equal(s.past,1);assert.equal(s.items[0].x,800);assert.equal(s.items[0].y,450);assert(!s.pan&&!s.session);assert.equal(s.panPressed,'false');
  if(tablet){await p.locator('#undo').tap();assert.deepEqual((await state()).items,original);await p.locator('#redo').tap()}else{await p.keyboard.press('Control+z');assert.deepEqual((await state()).items,original);await p.keyboard.press('Control+Shift+z')}
  assert.equal((await state()).past,1);
  // Switch to Pan in every transient Base phase, restoring Bubble presentation.
  for(const phase of ['automatic','select','candidate','frozen','destination']){
   await seed();const labels=await p.evaluate(()=>[penConnectionBubble,...penConnectionBubble.querySelectorAll('button')].map(e=>[e.getAttribute('aria-label'),e.getAttribute('title')]));await source('moveObjects');
   if(phase!=='automatic'){await source('moveBasePoint');if(!['select'].includes(phase)){await tap(await screen(200,250));if(tablet&&phase!=='candidate')await bubble('confirm');if(phase==='destination'){if(tablet)await tap(await screen(801,451));else{const q=await screen(801,451);await p.mouse.move(q.x,q.y)}}}}
   await source('panView');s=await state();assert(s.pan);assert.equal(s.session,null);assert.equal(s.mode,'select');assert(!s.preview&&!s.bubble&&s.baseDisabled);assert.equal(s.movePressed,'false');await unchanged(original);
   assert.deepEqual(await p.evaluate(()=>[penConnectionBubble,...penConnectionBubble.querySelectorAll('button')].map(e=>[e.getAttribute('aria-label'),e.getAttribute('title')])),labels);
   const before=s.camera,a=await screen(600,500),b=await screen(640,530);await contact('down',a);await contact('move',b);await contact('up',b);assert.notDeepEqual((await state()).camera,before);await unchanged(original);
   await action('moveObjects');assert(!(await state()).pan);assert(!(await state()).baseDisabled);await action('moveBasePoint');assert.equal((await state()).session.state,'SELECT_BASE_POINT');await unchanged(original);
  }
  // Held-contact transfer uses the authoritative controls; capture must retire immediately.
  await seed();await source('panView');const a=await screen(600,500),b=await screen(640,530);await contact('down',a);await contact('move',b);
  const panId=await p.evaluate(()=>gesture.id);assert(await p.evaluate(id=>svg.hasPointerCapture(id),panId));await p.evaluate(()=>moveObjects.click());s=await state();assert(!s.pan&&!s.gesture&&!s.contacts&&!s.snapshot&&!s.suppressed);assert(!await p.evaluate(id=>svg.hasPointerCapture(id),panId));await contact('up',b);await unchanged(original);
  await seed();await source('moveObjects');await contact('down',await screen(240,250));const moveId=await p.evaluate(()=>smartMoveSession.pointerId);assert(await p.evaluate(id=>svg.hasPointerCapture(id),moveId));await p.evaluate(()=>panButton.click());assert(!await p.evaluate(id=>svg.hasPointerCapture(id),moveId));assert.equal((await state()).session,null);await contact('up',await screen(240,250));await unchanged(original);
  // Base entry also releases an existing command's held anchor contact.
  await seed();await source('moveObjects');await contact('down',await screen(240,250));const baseId=await p.evaluate(()=>smartMoveSession.pointerId);await p.evaluate(()=>moveBasePoint.click());assert(!await p.evaluate(id=>svg.hasPointerCapture(id),baseId));assert.equal((await state()).session.state,'SELECT_BASE_POINT');await contact('up',await screen(240,250));await unchanged(original);
  if(!tablet){
   await seed();await action('moveObjects');await action('moveBasePoint');await tap(await screen(200,250));const before=(await state()).camera;await p.keyboard.down('Control');await p.keyboard.down('Alt');await contact('down',await screen(600,500));assert.equal((await state()).session,null);await unchanged(original);
   await contact('move',await screen(640,530));await contact('up',await screen(640,530));assert.notDeepEqual((await state()).camera,before);await p.keyboard.up('Alt');await p.keyboard.up('Control');assert.equal((await state()).panPressed,'false');assert(!(await state()).pan);await unchanged(original);
  }
  // Eligibility remains authoritative even while Pan is active.
  for(const ids of [[],['A','X'],['X']]){await seed(ids);await p.evaluate(()=>{items.find(o=>o.id==='X').type='force';render()});await source('panView');assert.equal(await p.evaluate(()=>beginSmartMove()),false);s=await state();assert(s.pan&&!s.session&&s.baseDisabled)}
  assert.deepEqual(errors,[]);await p.close();console.log('PASS Pan/Move '+pointer+': radial ownership, all transient cancellations, capture retirement, exact commit/Undo/Redo, labels/icons and eligibility');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
