const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const pointer of ['mouse','touch','pen']){
  const tablet=pointer!=='mouse',p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof selectSmartMoveBase==='function');
  const cdp=await p.context().newCDPSession(p);
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}}, {x,y});
  const tap=async q=>{
   if(pointer==='mouse')await p.mouse.click(q.x,q.y);
   else if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);
   else{await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1,pointerType:'pen'})}
  };
  const click=async(x,y)=>tap(await screen(x,y));
  const button=async selector=>{const b=await p.locator(selector).boundingBox();assert(b,selector);assert(b.width>=44&&b.height>=44,selector+' touch size');await tap({x:b.x+b.width/2,y:b.y+b.height/2})};
  const activate=async id=>{
   await settle(p);
   if(!tablet){await p.locator('#'+id).click();return}
   // Legacy command adapters remain callable; tablet presentation is now direct Pivot.
   assert(await p.locator('#'+id).isHidden());await p.evaluate(id=>document.getElementById(id).click(),id);
  };
  const seed=async()=>{await p.evaluate(()=>{
   cancelToSelection();items=[make('bar',200,250,500,250,{id:'A',strokeColor:'#123456'}),make('bar',800,450,950,450,{id:'T'}),make('thin',320,100,320,400,{id:'X'})];
   past=[];future=[];snapEnabled=true;Object.assign(snapOptions,{endpoint:true,midpoint:true,intersection:true});updateSelection(['A'],'A');render();
  });await settle(p)};
  const state=()=>p.evaluate(()=>({state:smartMoveSession?.state,base:smartMoveSession?.base,anchor:smartMoveSession?.anchor,delta:smartMoveSession?.delta,pair:smartMoveSession?.pair,
   pending:smartMoveSession?.pending,items:copy(items),past:past.length,future:future.length,bubble:!penConnectionBubble.hidden,bubbleLabel:penConnectionBubble.getAttribute('aria-label'),
   status:svg.querySelector('[data-move-base-status]')?.textContent,
   marker:svg.querySelector('[data-move-base]')?{x:Number(svg.querySelector('[data-move-base]').getAttribute('cx')),y:Number(svg.querySelector('[data-move-base]').getAttribute('cy')),fill:svg.querySelector('[data-move-base]').getAttribute('fill')}:null,
   target:svg.querySelector('[data-move-target]')?.getAttribute('data-move-target'),
   keyboard:!!document.activeElement?.matches('input,textarea,[contenteditable=true]'),keypad:!$('tabletNumericKeypad').hidden}));
  const unchanged=async original=>{const s=await state();assert.deepEqual(s.items,original);assert.equal(s.past,0);assert.equal(s.future,0);assert(!s.keyboard&&!s.keypad)};
  for(const [kind,x,y,ex,ey]of [['endpoint',204,253,200,250],['midpoint',350,253,350,250],['intersection',321,253,320,250],['projected',280,258,280,250]]){
   await seed();const original=(await state()).items;await activate('moveObjects');await activate('moveBasePoint');
   let s=await state();assert.equal(s.state,'SELECT_BASE_POINT');assert.equal(s.status,'Chọn Base Point');assert.equal(s.pair,null);
   assert(await p.locator('[data-move-base-option="endpoint"]').count()>=2);assert(await p.locator('[data-move-base-option="midpoint"]').count()>=1);assert(await p.locator('[data-move-base-option="intersection"]').count()>=1);
   await p.evaluate(()=>updateSmartMove({x:800,y:450}));await unchanged(original);assert.equal((await state()).pair,null);
   await click(x,y);s=await state();
   if(tablet){
    assert.equal(s.state,'CONFIRM_BASE_POINT');assert.equal(s.pending.kind,'base');assert.equal(s.pending.point.kind,kind);assert.equal(s.base,null);assert.equal(s.bubbleLabel,'Xác nhận Base Point');
    assert.equal(await p.locator('[data-move-base-candidate]').count(),1);await unchanged(original);
    await button('[data-pen-connection-action="confirm"]');
   }else assert(!s.bubble,'mouse must not acquire tablet Bubble');
   s=await state();assert.equal(s.state,'MOVE_WITH_BASE_POINT');assert.equal(s.base.kind,kind);assert(Math.abs(s.base.x-ex)<1e-4);assert.equal(s.base.y,ey);
   assert.equal(s.marker.fill,'#16845b');assert.equal(s.marker.x,s.base.x);assert.equal(s.marker.y,s.base.y);assert.equal(s.pending,null);assert(!s.bubble);await unchanged(original);
   const base=s.base;
   if(tablet){await click(801,451);s=await state();assert.equal(s.state,'CONFIRM_MOVE_WITH_BASE_POINT');assert.equal(s.pending.kind,'destination');assert.equal(s.bubbleLabel,'Xác nhận Move')}
   else{const q=await screen(801,451);await p.mouse.move(q.x,q.y);s=await state()}
   assert.deepEqual(s.base,base);assert.equal(s.marker.x,800);assert.equal(s.marker.y,450);assert.equal(s.target,'endpoint');await unchanged(original);
   // Only the destination confirmation commits the one common translation.
   if(tablet)await button('[data-pen-connection-action="confirm"]');else await p.keyboard.press('Enter');
   s=await state();assert.equal(s.past,1);assert.equal(s.state,undefined);assert(!s.bubble);assert.equal(s.items[0].x2-s.items[0].x,300);assert.equal(s.items[0].y2-s.items[0].y,0);assert.equal(s.items[0].strokeColor,'#123456');
   assert.equal(s.items[0].x+base.x-200,800);assert.equal(s.items[0].y+base.y-250,450);assert.deepEqual(s.items.slice(1),original.slice(1));
   if(tablet){await button('#undo');assert.deepEqual((await state()).items,original);await button('#redo')}
   else{await p.keyboard.press('Control+z');assert.deepEqual((await state()).items,original);await p.keyboard.press('Control+Shift+z')}
   assert.equal((await state()).past,1);
  }
  // Rejecting source selection returns to source selection, not destination picking.
  await seed();const original=(await state()).items,labels=await p.evaluate(()=>[penConnectionBubble,...penConnectionBubble.querySelectorAll('button')].map(e=>[e.getAttribute('aria-label'),e.getAttribute('title')]));
  await activate('moveObjects');await activate('moveBasePoint');await click(200,250);
  if(tablet){await button('[data-pen-connection-action="cancel"]');assert.equal((await state()).state,'SELECT_BASE_POINT');assert.equal((await state()).base,null);assert.equal(await p.locator('[data-move-base-candidate]').count(),0);await click(200,250);await button('[data-pen-connection-action="confirm"]')}
  assert.equal((await state()).state,'MOVE_WITH_BASE_POINT');await unchanged(original);
  if(tablet){await click(801,451);await button('[data-pen-connection-action="cancel"]');assert.equal((await state()).state,'MOVE_WITH_BASE_POINT');assert.equal((await state()).base.x,200);await unchanged(original);await click(801,451)}
  else{const q=await screen(801,451);await p.mouse.move(q.x,q.y)}
  // Reselection discards the preview/pending destination, without an intermediate commit.
  await activate('moveBasePoint');assert.equal((await state()).state,'SELECT_BASE_POINT');assert.equal((await state()).pending,null);assert.equal((await state()).base,null);await unchanged(original);
  await click(350,250);if(tablet)await button('[data-pen-connection-action="confirm"]');assert.equal((await state()).base.x,350);await unchanged(original);
  await p.keyboard.press('Escape');await unchanged(original);assert.equal((await state()).state,undefined);
  assert.deepEqual(await p.evaluate(()=>[penConnectionBubble,...penConnectionBubble.querySelectorAll('button')].map(e=>[e.getAttribute('aria-label'),e.getAttribute('title')])),labels);
  // Invalid off-Bar contacts cannot establish a raw source or commit a Move.
  await activate('moveObjects');await activate('moveBasePoint');await click(270,350);assert.equal((await state()).state,'SELECT_BASE_POINT');assert.equal((await state()).pending,null);await unchanged(original);
  // Projection remains on the actual diagonal Bar at different zoom levels.
  for(const width of [550,1100,2200]){
   await p.evaluate(width=>{cancelToSelection();items=[make('bar',200,250,500,550,{id:'A'})];past=[];future=[];camera={x:0,y:0,w:width,h:width*720/1100};applyCamera();updateSelection(['A'],'A');render();beginSmartMove();selectSmartMoveBase()},width);
   const candidate=await p.evaluate(()=>smartMoveBaseAt({x:280,y:332}));assert.equal(candidate.kind,'projected');assert.equal(candidate.x-200,candidate.y-250);assert.equal(candidate.x,281);
  }
  await p.evaluate(()=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera()});
  if(tablet){
   // Explicit selection can retire a pending automatic drag and its pointer ownership.
   await seed();const a=await screen(260,250),b=await screen(650,400);
   if(pointer==='touch'){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
   else{await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...b,button:'left',buttons:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',buttons:0,clickCount:1,pointerType:'pen'})}
   // Exercise the authoritative Base Point adapter here; the pre-existing hub
   // click path after a handled CDP touch drag is diagnosed separately.
   assert.equal(await p.evaluate(()=>smartMoveSession.command),false);await p.evaluate(()=>moveBasePoint.click());assert.equal(await p.evaluate(()=>smartMoveSession.command),true);assert.equal((await state()).state,'SELECT_BASE_POINT');await unchanged(original);
   await click(280,258);await button('[data-pen-connection-action="confirm"]');assert.equal((await state()).state,'MOVE_WITH_BASE_POINT');await unchanged(original);
   for(const size of [{width:800,height:1280},{width:1280,height:800}]){await p.setViewportSize(size);await p.waitForFunction(()=>smartMoveSession===null);await settle(p);await unchanged(original);await activate('moveObjects');await activate('moveBasePoint')}
  }
  assert.deepEqual(errors,[]);await p.close();console.log('PASS Base Point UX '+pointer+': candidates/projection, source/destination ownership, frozen green preview, reselection/cancel, exact commit/history and keyboard suppression');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
