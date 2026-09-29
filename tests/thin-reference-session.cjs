const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.waitForFunction(()=>typeof beginThinReferenceSession==='function');
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {clientX:q.x,clientY:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.clientX,q.clientY);else await p.mouse.click(q.clientX,q.clientY)};
  const move=async(x,y)=>p.locator('#drawing').dispatchEvent('pointermove',{...await coords(x,y),pointerType:touch?'touch':'mouse'});
  const state=()=>p.evaluate(()=>thinReferenceSession&&({anchor:thinReferenceSession.anchorPoint,ids:thinReferenceSession.candidates.map(c=>c.barId),id:thinReferenceSession.referenceBarId,locked:thinReferenceSession.referenceBarLocked}));
  const seed=async(kind='node',width=1100)=>p.evaluate(({kind,width})=>{
   document.activeElement.blur();setMode('select');items=[];past=[];future=[];
   camera={x:0,y:0,w:width,h:width*720/1100};applyCamera();
   if(kind!=='none')items.push({...make('bar',100,300,500,300),id:'h'});
   if(kind==='node')items.push({...make('bar',300,100,300,500),id:'v'});
   selected=kind==='node'?'v':null;internalForceScale=10;setMode('thin');savedDocument=documentText();
  },{kind,width});
  const start=async(kind='node')=>{await seed(kind);await click(300,300)};
  await start('one');let s=await state();assert.equal(s.id,'h');assert(s.locked);near(s.anchor.x,300);near(s.anchor.y,300);
  assert(await p.evaluate(()=>thinReferenceSession.anchorPoint!==first&&thinReferenceSession.segmentFirst===first));
  const before=await p.evaluate(()=>({doc:documentText(),history:past.length}));await move(360,350);
  assert.deepEqual(await p.evaluate(()=>({doc:documentText(),history:past.length})),before);
  assert.equal((await state()).id,'h');

  await start();s=await state();assert.deepEqual(s.ids,['h','v']);assert.equal(s.id,null);assert.equal(s.locked,false);
  const scale=await p.evaluate(()=>Math.abs(svg.getScreenCTM().a));await move(300,300+5/scale);assert.equal((await state()).id,null);
  await move(300,340);assert.equal((await state()).id,'h');await move(340,300);assert.equal((await state()).id,'h');
  // A contradictory snapped hover must not override raw cursor intent.
  await start();await p.evaluate(()=>{window.referenceOriginalDrawingPoint=drawingPoint;drawingPoint=()=>({x:400,y:300})});
  await move(300,340);assert.equal((await state()).id,'h');assert.equal(await p.evaluate(()=>hover.x),400);
  await p.evaluate(()=>{drawingPoint=window.referenceOriginalDrawingPoint;delete window.referenceOriginalDrawingPoint});
  await start();await move(340,340);assert.equal((await state()).id,null);await move(340,300);assert.equal((await state()).id,'v');

  // Observe the ending session at the real checkpoint, before the next segment replaces it.
  for(const [cursor,expectedId] of [[{x:300,y:340},'h'],[{x:340,y:300},'v'],[{x:340,y:340},null]]){
   await start();await p.evaluate(()=>{window.referenceOldSession=thinReferenceSession;window.referenceOriginalCheckpoint=checkpoint;checkpoint=function(){window.referenceAtCommit={id:thinReferenceSession.referenceBarId,locked:thinReferenceSession.referenceBarLocked};return window.referenceOriginalCheckpoint()}});
   const q=await coords(cursor.x,cursor.y),expected=await p.evaluate(q=>drawingPoint(q),q);
   // Dispatch down/up directly: deliberately no pointermove before commit.
   await p.locator('#drawing').dispatchEvent('pointerdown',{...q,button:0,pointerId:91,pointerType:touch?'touch':'mouse'});
   await p.locator('#drawing').dispatchEvent('pointerup',{...q,button:0,pointerId:91,pointerType:touch?'touch':'mouse'});
   const result=await p.evaluate(()=>({observed:window.referenceAtCommit,o:items.at(-1),fresh:thinReferenceSession!==window.referenceOldSession,first,anchor:thinReferenceSession.anchorPoint,history:past.length}));
   assert.equal(result.observed.id,expectedId);assert.equal(result.observed.locked,expectedId!==null);assert(result.fresh);assert.equal(result.o.type,'thin');near(result.o.x2,expected.x);near(result.o.y2,expected.y);assert.deepEqual(result.anchor,result.first);assert.equal(result.history,1);
   if(expectedId==='h')assert.equal((await state()).id,'v');if(expectedId==='v')assert.equal((await state()).id,'h');if(expectedId===null)assert.equal((await state()).ids.length,0);
   await p.evaluate(()=>{checkpoint=window.referenceOriginalCheckpoint;delete window.referenceOriginalCheckpoint;delete window.referenceAtCommit;delete window.referenceOldSession});
  }
  await start('none');assert.equal((await state()).ids.length,0);await click(400,400);assert.equal((await state()).id,null);

  for(const change of ['deleted','type','geometry']){
   await start('one');const stale=await p.evaluate(change=>{const bar=items[0];if(change==='deleted')items=[];if(change==='type')bar.type='thin';if(change==='geometry')bar.x2=NaN;return getThinReferenceBar()},change);
   assert.equal(stale,null);s=await state();assert.equal(s.id,null);assert.equal(s.locked,false);await move(340,340);assert.equal((await state()).id,null);
  }
  await start('one');assert(await p.evaluate(()=>{items[0]={...items[0]};return getThinReferenceBar()===items[0]}));
  await start();await p.evaluate(()=>{items=items.filter(o=>o.id==='h')});await move(340,300);assert.equal((await state()).id,'h');

  for(const action of ['tool','escape','undo','redo','new','open']){
   await start('one');await p.evaluate(action=>{if(action==='undo')past.push([]);if(action==='redo')future.push([])},action);
   if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(async action=>{
    if(action==='tool')setMode('bar');if(action==='undo')actions.undo[1]();if(action==='redo')actions.redo[1]();if(action==='new')newDocument();
    if(action==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'reference.json'));
   },action);
   assert.equal(await state(),null,action);
  }
  for(const action of ['undo','redo']){await start('one');await p.evaluate(action=>actions[action][1](),action);assert.equal(await state(),null)}
  // Pinch rollback restores the previous first and rebuilds candidates without carrying its old lock.
  await start();await move(300,340);
  const snapshot=await p.evaluate(()=>{window.referenceSnapshot=captureDrawing();return {doc:documentText(),first:{...first}}});
  await click(340,340);await p.evaluate(()=>restoreDrawing(window.referenceSnapshot));
  assert.equal(await p.evaluate(()=>documentText()),snapshot.doc);s=await state();assert.equal(s.id,null);near(s.anchor.x,snapshot.first.x);near(s.anchor.y,snapshot.first.y);
  await move(340,300);assert.equal((await state()).id,'v');
  await seed();await p.evaluate(()=>{window.referenceSnapshot=captureDrawing()});await click(300,300);await p.evaluate(()=>restoreDrawing(window.referenceSnapshot));assert.equal(await state(),null);

  // Real browser touch events exercise document capture, second-finger rollback and cancellation.
  if(touch){
   await start();await move(300,340);const oldDoc=await p.evaluate(()=>documentText());
   const cdp=await context.newCDPSession(p),a=await coords(340,340),b=await coords(430,400);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.clientX,y:a.clientY,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.clientX,y:a.clientY,id:1},{x:b.clientX,y:b.clientY,id:2}]});
   assert.equal(await p.evaluate(()=>documentText()),oldDoc);assert.equal((await state()).id,null);near((await state()).anchor.x,300);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await seed();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.clientX,y:a.clientY,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await state(),null);await cdp.detach();
  }
  // Tolerance comes from screen pixels, independently of engineering scales and camera zoom.
  for(const width of [550,1100])for(const px of [9,11]){
   await seed('one',width);const r=await p.evaluate(px=>{const scale=Math.abs(svg.getScreenCTM().a);first={x:300,y:300+px/scale};geometryScale=999;internalForceScale=.01;beginThinReferenceSession();return thinReferenceSession.candidates.length},px);
   assert.equal(r,px<=10?1:0);
  }
  await p.evaluate(()=>{saveDraft()});const serialized=await p.evaluate(()=>documentText()+localStorage.getItem(draftKey));
  for(const key of ['thinReferenceSession','referenceBarId','referenceBarLocked','segmentFirst'])assert(!serialized.includes(key));
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS thin reference session ${touch?'touch (emulated)':'mouse'}: candidates/raw intent/lock/commit without move/ambiguity/stale lookup/cleanup/chaining/rollback/zoom/serialization; legacy endpoints unchanged`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
