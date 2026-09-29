const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const move=async(x,y)=>{const q=await coords(x,y);await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType:touch?'touch':'mouse'})};
  const px=async(x,y)=>p.evaluate(({x,y})=>{const s=Math.abs(svg.getScreenCTM().a),a=thinReferenceSession.anchorPoint;return {x:a.x+x/s,y:a.y+y/s}},{x,y});
  const tapPx=async(x,y)=>{const q=await px(x,y);await click(q.x,q.y)};
  const seed=async(count=3,width=1100)=>{
   await p.evaluate(({count,width})=>{document.activeElement.blur();setMode('select');items=[{...make('bar',100,300,500,300),id:'h'},...count>=2?[{...make('bar',300,100,300,500),id:'v'}]:[],...count>=3?[{...make('bar',100,100,500,500),id:'d'}]:[]];past=[];future=[];camera={x:0,y:0,w:width,h:width*720/1100};applyCamera();internalForceScale=10;setMode('thin');savedDocument=documentText()},{count,width});
   await click(300,300);
  };
  const start=async(count=3,width=1100)=>{await seed(count,width);await move(320,380);assert.equal(await p.evaluate(()=>thinReferenceSession.referenceBarId),'h')};
  const state=()=>p.evaluate(()=>({id:thinReferenceSession?.referenceBarId,locked:thinReferenceSession?.referenceBarLocked,anchor:thinReferenceSession?.anchorPoint,first,value:thinNumericSession?.value,valueMode:thinNumericSession?.valueMode,raw:thinReferenceSession?.rawCursorPoint,endpoint:thinNumericSession?.endpoint}));
  const documentState=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),saved:savedDocument,draft:localStorage.getItem(draftKey)}));
  const line=()=>p.evaluate(()=>{const l=svg.querySelector('[data-thin-preview] line');return l&&['x1','y1','x2','y2'].map(k=>Number(l.getAttribute(k)))});
  const checkLine=async(id,length)=>{const l=await line();assert(l);near(Math.hypot(l[2]-l[0],l[3]-l[1]),length);if(id==='h')near(l[0],l[2]);if(id==='v')near(l[1],l[3]);if(id==='d')near((l[2]-l[0])+(l[3]-l[1]),0)};
  const lock=async()=>{await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal((await state()).valueMode,'locked')};

  await start();const before=await documentState(),initial=await state();
  await p.evaluate(()=>{window.oldThinCommit=commitThinCandidate;window.overrideCommitCalls=0;commitThinCandidate=function(...args){window.overrideCommitCalls++;return window.oldThinCommit(...args)}});
  // Mouse really approaches the target; touch taps directly without hover.
  if(!touch){const q=await px(0,30),screen=await coords(q.x,q.y);await p.mouse.move(screen.x,screen.y)}
  await tapPx(0,30);let s=await state();assert.equal(s.id,'v');assert(s.locked);assert.deepEqual(s.anchor,initial.anchor);assert.deepEqual(s.first,initial.first);assert.deepEqual(await documentState(),before);assert.equal(await p.evaluate(()=>window.overrideCommitCalls),0);
  near(s.raw.x,initial.raw.x);near(s.raw.y,initial.raw.y);await checkLine('v',20);
  await move(310,380);assert.equal((await state()).id,'v');
  await tapPx(0,30);assert.equal((await state()).id,'v');assert.deepEqual(await documentState(),before);
  await tapPx(-30,0);assert.equal((await state()).id,'h');await checkLine('h',80);
  await tapPx(-22,-22);assert.equal((await state()).id,'d');const diagLength=await p.evaluate(()=>Math.abs(getThinConstrainedGeometry(getThinReferenceBar()).signedNormalDistance));await checkLine('d',diagLength);
  assert.equal(await p.evaluate(()=>window.overrideCommitCalls),0);
  await p.evaluate(()=>{commitThinCandidate=window.oldThinCommit;delete window.oldThinCommit});

  await start();await lock();const lockedBefore=await documentState();
  for(const [id,x,y] of [['v',0,30],['d',-22,-22],['h',-30,0]]){await tapPx(x,y);s=await state();assert.equal(s.id,id);assert.equal(s.valueMode,'locked');assert.equal(s.value,110);await checkLine(id,11);assert.deepEqual(await documentState(),lockedBefore)}
  // Pending input is not confirmed by a reference-selection tap, even when it is invalid.
  await p.locator('#dynamicInputValue').fill('-1');await tapPx(0,30);assert.equal((await state()).id,'v');assert.equal((await state()).value,110);assert.equal(await p.locator('#dynamicInputValue').inputValue(),'-1');assert.deepEqual(await documentState(),lockedBefore);
  await p.locator('#dynamicInputValue').fill('110');
  if(!touch){
   const shown=await line();await p.keyboard.press('Enter');
   const committed=await p.evaluate(()=>items.at(-1));assert.equal(committed.type,'thin');
   [committed.x,committed.y,committed.x2,committed.y2].forEach((v,i)=>near(v,shown[i]));
  }

  // No hover is needed, including an unresolved node: the selected member locks immediately.
  await seed(2);assert.equal((await state()).id,null);await tapPx(0,30);assert.equal((await state()).id,'v');assert.equal(await p.evaluate(()=>past.length),0);
  // A one-member anchor retains its ordinary commit behavior inside the same screen region.
  await seed(1);await tapPx(0,30);assert.equal(await p.evaluate(()=>items.filter(o=>o.type==='thin').length),1);

  // Near-node and geometric ties do not override, independent of candidate order.
  await start(2);const tieBefore=await state();
  for(const [x,y] of [[0,0],[3,4],[8,8],[8,8.5]]){
   const q=await px(x,y),screen=await coords(q.x,q.y);
   assert.equal(await p.evaluate(e=>overrideThinReference(e),{button:0,clientX:screen.x,clientY:screen.y}),false);assert.equal((await state()).id,tieBefore.id);
  }
  const tied=await p.evaluate(()=>{const a={x:0,y:0},bars=[{type:'bar',id:'h',x:-100,y:0,x2:100,y2:0},{type:'bar',id:'v',x:0,y:-100,x2:0,y2:100}];return [bars,[...bars].reverse()].map(bars=>hitThinReferenceOverride({bars,anchorPoint:a,cursorPoint:{x:8,y:8},screenScale:1}))});assert.deepEqual(tied,[null,null]);
  // A tied hit is still an ordinary endpoint event; observe the old reference at commit.
  await p.evaluate(()=>{window.originalThinCommit=commitThinCandidate;commitThinCandidate=function(...args){window.referenceBeforeCommit=thinReferenceSession.referenceBarId;return window.originalThinCommit(...args)}});
  await tapPx(8,8);assert.equal(await p.evaluate(()=>window.referenceBeforeCommit),'h');assert.equal(await p.evaluate(()=>past.length),1);
  await p.evaluate(()=>{commitThinCandidate=window.originalThinCommit});

  // Non-candidate and outside-radius clicks are not consumed; constrained commit continues.
  await start(2);await p.evaluate(()=>{items.push({...make('bar',315,320,335,320),id:'unrelated'});render()});await tapPx(25,20);assert.equal(await p.evaluate(()=>past.length),1);
  await start(2);await tapPx(0,45);assert.equal(await p.evaluate(()=>past.length),1);
  for(const change of ['delete','type','zero','move']){
   await start(2);await p.evaluate(change=>{const b=items.find(o=>o.id==='v');if(change==='delete')items=items.filter(o=>o.id!=='v');if(change==='type')b.type='thin';if(change==='zero'){b.x2=b.x;b.y2=b.y}if(change==='move'){b.x+=100;b.x2+=100}},change);
   const q=await px(0,30),screen=await coords(q.x,q.y);assert.equal(await p.evaluate(e=>overrideThinReference(e),{button:0,clientX:screen.x,clientY:screen.y}),false);assert.equal((await state()).id,'h');
  }
  // Finite segments only: an extension outside a short member's endpoint is not a hit.
  assert.equal(await p.evaluate(()=>hitThinReferenceOverride({bars:[{id:'short',type:'bar',x:0,y:0,x2:5,y2:0}],anchorPoint:{x:0,y:0},cursorPoint:{x:30,y:0},screenScale:1})),null);

  // Screen-space boundaries are independent of zoom and engineering scales.
  for(const width of [550,1100]){
   await start(2,width);await p.evaluate(()=>{geometryScale=777;internalForceScale=123});
   for(const [x,y,winner] of [[0,39,'v'],[0,41,null],[9,30,'v'],[11,30,null]]){
    const q=await px(x,y);assert.equal(await p.evaluate(q=>thinReferenceOverrideAt(q)?.id||null,q),winner);
   }
   await tapPx(9,30);assert.equal((await state()).id,'v');assert.equal(await p.evaluate(()=>past.length),0);
  }
  const exact=await p.evaluate(()=>{const bars=[{id:'v',type:'bar',x:0,y:-100,x2:0,y2:100}],anchorPoint={x:0,y:0};return [{x:0,y:40},{x:10,y:30},{x:10.001,y:30},{x:0,y:10}].map(cursorPoint=>hitThinReferenceOverride({bars,anchorPoint,cursorPoint,screenScale:1})?.id||null)});assert.deepEqual(exact,['v','v',null,null]);

  // Explicit choice belongs only to the ending segment.
  await start(2);await tapPx(0,30);await p.evaluate(()=>{window.oldOverrideSession=thinReferenceSession});await click(400,450);
  const result=await p.evaluate(()=>({fresh:thinReferenceSession!==window.oldOverrideSession,id:thinReferenceSession.referenceBarId,first,o:items.at(-1)}));assert(result.fresh);assert.equal(result.id,'h');near(result.first.x,result.o.x2);near(result.first.y,result.o.y2);
  for(const action of ['escape','tool','undo','redo','new','open','rollback']){
   await start(2);await p.evaluate(()=>{window.overrideSnapshot=captureDrawing()});await tapPx(0,30);
   if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(async action=>{if(action==='tool')setMode('bar');if(action==='undo'){past.push([]);actions.undo[1]()}if(action==='redo'){future.push([]);actions.redo[1]()}if(action==='new')newDocument();if(action==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'override.json'));if(action==='rollback')restoreDrawing(window.overrideSnapshot)},action);
   assert.equal(await p.evaluate(()=>thinReferenceSession?.referenceBarId||null),null,action);
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS reference override ${touch?'touch (emulated)':'mouse'}: default auto, explicit candidate lock, no commit/history, immediate LIVE/LOCKED preview, input preservation, current/noncandidate/stale/finite hits, ambiguity, zoom, chaining and cleanup`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
