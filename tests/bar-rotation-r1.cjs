'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
const near=(a,b,t=1e-4)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const pointer of ['mouse','touch','pen']){
  const tablet=pointer!=='mouse',p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarRotation==='function');
  const cdp=await p.context().newCDPSession(p);
  const screen=q=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
  const contact=async(type,q)=>{
   if(pointer==='mouse'){await p.mouse.move(q.x,q.y);if(type==='down')await p.mouse.down();if(type==='up')await p.mouse.up()}
   else if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[type],touchPoints:['up','cancel'].includes(type)?[]:[{...q,id:1}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:{down:'mousePressed',move:'mouseMoved',up:'mouseReleased'}[type],...q,button:'left',buttons:type==='up'?0:1,clickCount:1,pointerType:pointer});
   // CDP touch moves are frame-coalesced; observe each intended angular sample.
   if(pointer==='touch'&&type==='move')await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  };
  const tap=async q=>{await contact('down',q);await contact('up',q)};
  const control=async selector=>{const b=await p.locator(selector).boundingBox();assert(b,selector+' visible');await tap({x:b.x+b.width/2,y:b.y+b.height/2})};
  const seed=async(pivot)=>{await p.evaluate(pivot=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();items=[make('bar',250,310,550,310,{id:'A',label:'A',strokeColor:'#336699',...(pivot?{pivot}: {})}),make('bar',730,520,930,520,{id:'B'})];past=[];future=[];snapEnabled=true;updateSelection(['A'],'A');render()},pivot);await p.waitForFunction(()=>!!svg.querySelector('[data-bar-rotation-handle]'))};
  const state=()=>p.evaluate(()=>({items:copy(items),history:past.length,future:future.length,pivot:objectPivot(items[0]),angle:smartMoveSession?.rotationAngle,preview:smartMoveSession?.rotationPreview,pending:smartMoveSession?.pending?.kind,session:!!smartMoveSession,rotating:smartMoveSession?.rotating,pointer:smartMoveSession?.pointerId,move:!!drag,pivotEditing:smartMoveSession?.pivotEditing,pan:panEnabled,bubble:!penConnectionBubble.hidden,command:!commandControls.hidden}));
  const start=async()=>{const h=await p.locator('[data-rotation-hit]').boundingBox(),s=await state(),center=await screen(s.pivot),a={x:h.x+h.width/2,y:h.y+h.height/2};assert(h.width>=43.99&&h.height>=43.99);await contact('down',a);assert.equal((await state()).rotating,true);return {a,center}};
  const at=(g,degrees)=>{const r=degrees*Math.PI/180,x=g.a.x-g.center.x,y=g.a.y-g.center.y;return {x:g.center.x+x*Math.cos(r)-y*Math.sin(r),y:g.center.y+x*Math.sin(r)+y*Math.cos(r)}};
  const rotate=async degrees=>{const g=await start();await contact('move',at(g,degrees));await contact('up',at(g,degrees));assert.equal((await state()).pending,'rotation');return g};
  const confirm=async action=>{await control(tablet?'[data-pen-connection-action="'+action+'"]':action==='confirm'?'#commandFinish':'#commandCancel')};
  for(const pivot of [undefined,{along:-150,normal:0},{along:30,normal:75}]){
   await seed(pivot);const before=await state(),g=await start();
   await contact('move',at(g,37));let s=await state();assert.deepEqual(s.items,before.items);assert.equal(s.history,0);assert(!s.move&&!s.pivotEditing);near(s.angle,37*Math.PI/180);
   assert.match(await p.locator('[data-rotation-angle]').textContent(),/Δθ = -37\.0°/);
   near(Math.hypot(s.preview.x2-s.preview.x,s.preview.y2-s.preview.y),300,1e-9);
   const pp=await p.evaluate(()=>objectPivot(smartMoveSession.rotationPreview));near(pp.x,before.pivot.x,1e-9);near(pp.y,before.pivot.y,1e-9);
   await contact('up',at(g,37));s=await state();assert.equal(s.pending,'rotation');assert.equal(s.pointer,null);assert.deepEqual(s.items,before.items);assert.equal(s.bubble,tablet);assert.equal(s.command,!tablet);
   await confirm('confirm');s=await state();assert(!s.session&&!s.bubble);assert.equal(s.history,1);assert.deepEqual(s.items[1],before.items[1]);near(s.pivot.x,before.pivot.x);near(s.pivot.y,before.pivot.y);
   near(s.items[0].x,before.pivot.x+(before.items[0].x-before.pivot.x)*Math.cos(37*Math.PI/180)-(before.items[0].y-before.pivot.y)*Math.sin(37*Math.PI/180));
   assert.equal(s.items[0].label,'A');assert.equal(s.items[0].strokeColor,'#336699');assert.deepEqual(s.items[0].pivot,pivot);
   const after=s.items;await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,before.items);await p.evaluate(()=>actions.redo[1]());assert.deepEqual((await state()).items,after);
   await p.evaluate(()=>{items=validate(JSON.parse(JSON.stringify({format:'ket-cau-studio',version:1,items})));render()});assert.deepEqual((await state()).items,after);
   // Stray release/click cannot apply the accepted rotation twice.
   if(pointer!=='touch')await contact('up',at(g,37));
   await p.evaluate(()=>svg.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal((await state()).history,1);
  }
  await seed();let before=await state();await rotate(-45);await confirm('cancel');assert.deepEqual((await state()).items,before.items);assert.equal((await state()).history,0);
  if(tablet){
   await seed();before=await state();await rotate(25);
   assert.equal(await p.locator('#penConnectionBubble').getAttribute('aria-label'),'Xác nhận xoay thanh');
   await tap(await screen({x:820,y:330}));assert.equal((await state()).pending,'rotation');
   assert.deepEqual((await state()).items,before.items);assert.equal((await state()).history,0);await confirm('cancel');
  }
  await seed();await rotate(0);await confirm('confirm');assert.equal((await state()).history,0);
  // Continuous path crosses atan2's discontinuity in both directions, including a full turn.
  for(const sign of [-1,1]){
   await seed();const g=await start();for(const degrees of [70,140,190,260,330,360]){await contact('move',at(g,sign*degrees));near((await state()).angle,sign*degrees*Math.PI/180)}
   await contact('up',at(g,sign*360));await confirm('confirm');assert.equal((await state()).history,0);
  }
  // Existing lifecycle cancellation owns Pan, Move, tool switch, viewport and history actions.
  for(const action of ['pan','move','tool','resize','undo','camera','selection','blur']){
   await seed();before=await state();await rotate(30);
   await p.evaluate(action=>{if(action==='pan')panButton.click();if(action==='move')moveObjects.click();if(action==='tool')setMode('thin');if(action==='undo')actions.undo[1]();if(action==='camera')zoomAt(1.1);if(action==='selection'){updateSelection(['B'],'B');render()}if(action==='blur')window.dispatchEvent(new Event('blur'))},action);
   if(action==='resize')await p.setViewportSize({width:800,height:1000});
   await p.waitForFunction(()=>!smartMoveSession?.rotating);assert.deepEqual((await state()).items,before.items);assert.equal((await state()).history,0);assert(!(await state()).bubble);
   await p.setViewportSize({width:1280,height:800});
  }
  // Pivot, body and endpoint contacts retain their own owners.
  await seed();const e=await screen({x:250,y:310});await contact('down',e);assert.equal(await p.evaluate(()=>drag?.endpoint),'start');assert(!(await state()).session);await contact('up',e);
  await seed();const body=await screen({x:300,y:310});await contact('down',body);assert((await state()).session&&!(await state()).rotating);await contact('up',body);
  if(tablet){await seed();const q=await screen((await state()).pivot);await contact('down',q);assert((await state()).pivotEditing);await contact('up',q)}
  if(!tablet){
   await seed();before=await state();const g=await start();await contact('move',at(g,25));
   await p.mouse.click(at(g,25).x,at(g,25).y,{button:'right'});await contact('up',at(g,25));
   assert(!(await state()).session);assert.deepEqual((await state()).items,before.items);assert.equal((await state()).history,0);
   await seed();await rotate(25);await p.keyboard.press('Enter');assert.equal((await state()).history,1);
   await seed();await rotate(25);await p.keyboard.press('Escape');assert.equal((await state()).history,0);assert(!(await state()).session);
   // Real keyboard modifiers must reach the parent capture handler before Rotation.
   await seed();await rotate(25);const cameraBefore=await p.evaluate(()=>copy(camera));
   await p.evaluate(()=>{window.rotationTestContact=null;window.addEventListener('pointerdown',e=>window.rotationTestContact={ctrl:e.ctrlKey,alt:e.altKey},{capture:true,once:true})});
   await p.keyboard.down('Control');await p.keyboard.down('Alt');const q=await screen({x:800,y:300});await contact('down',q);
   assert.deepEqual(await p.evaluate(()=>window.rotationTestContact),{ctrl:true,alt:true});
   assert.equal(await p.evaluate(()=>gesture?.kind),'pan');assert(!(await state()).session);
   await contact('move',{x:q.x+30,y:q.y+20});await contact('up',{x:q.x+30,y:q.y+20});await p.keyboard.up('Alt');await p.keyboard.up('Control');assert.equal((await state()).history,0);assert(!(await state()).session);
   assert.notDeepEqual(await p.evaluate(()=>camera),cameraBefore);assert.equal(await p.evaluate(()=>gesture),null);
  }
  if(pointer==='touch'){await seed();const g=await start();await contact('move',at(g,25));await contact('cancel',at(g,25));assert(!(await state()).session);assert.equal((await state()).history,0)}
  if(pointer==='touch'){
   await seed();before=await state();const g=await start(),z=at(g,25);await contact('move',z);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...z,id:1},{x:z.x+80,y:z.y,id:2}]});
   assert.equal(await p.evaluate(()=>gesture?.kind),'pinch');assert(!(await state()).session);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.deepEqual((await state()).items,before.items);assert.equal((await state()).history,0);assert(!(await state()).bubble);
  }
  if(pointer==='pen'){
   await seed();before=await state();const g=await start();await contact('move',at(g,25));
   await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:smartMoveSession.pointerId,pointerType:'pen'})));
   await contact('up',at(g,25));assert(!(await state()).session);assert.deepEqual((await state()).items,before.items);assert.equal((await state()).history,0);
  }
  assert.deepEqual(errors,[]);console.log('PASS R1 '+pointer+': native gesture, midpoint/endpoint/off-Bar geometry, signed continuity, preview, confirmation/cancel, history, JSON and ownership');await p.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
