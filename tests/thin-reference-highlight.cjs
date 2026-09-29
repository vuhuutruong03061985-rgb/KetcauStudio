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
  const count=()=>p.locator('.thin-reference-highlight').count();
  const seed=async(n=2)=>{await p.evaluate(n=>{document.activeElement.blur();setMode('select');items=[{...make('bar',100,300,500,300),id:'h'},...(n===2?[{...make('bar',300,100,300,500),id:'v'}]:[])];past=[];future=[];camera={x:0,y:0,w:1100,h:720};applyCamera();setMode('thin');savedDocument=documentText()},n);assert.equal(await count(),0);await click(300,300)};
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:copy(past),future:copy(future),selected,first:copy(first),saved:savedDocument}));
  const check=async id=>{
   assert.equal(await count(),1);
   const r=await p.evaluate(id=>{const l=svg.querySelector('.thin-reference-highlight'),bar=items.find(o=>o.id===id),g=svg.querySelector(`[data-id="${id}"]`),css=getComputedStyle(l);return {actual:['x1','y1','x2','y2'].map(k=>Number(l.getAttribute(k))),expected:[bar.x,bar.y,bar.x2,bar.y2],pointer:css.pointerEvents,opacity:css.strokeOpacity,width:css.strokeWidth,before:!!(l.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_FOLLOWING),itemId:l.getAttribute('data-id')}},id);
   r.actual.forEach((v,i)=>near(v,r.expected[i]));assert.equal(r.pointer,'none');assert.equal(r.itemId,null);assert(r.before);assert.equal(r.width,'7px');assert.equal(r.opacity,'0.3');
  };
  await seed(1);await check('h');const before=await snapshot();await p.evaluate(()=>{render();render()});await check('h');assert.deepEqual(await snapshot(),before);
  const exportResult=await p.evaluate(()=>{const clean=exportSVG();render(true);const cleanCount=svg.querySelectorAll('.thin-reference-highlight').length;render();return {clean,cleanCount,json:documentText()}});
  assert(!exportResult.clean.includes('thin-reference-highlight'));assert.equal(exportResult.cleanCount,0);assert(!exportResult.json.includes('thin-reference'));await check('h');assert.deepEqual(await snapshot(),before);
  await seed();assert.equal(await count(),0);await move(320,380);await check('h');const beforeOverride=await snapshot();
  const target=await p.evaluate(()=>{const s=Math.abs(svg.getScreenCTM().a);return {x:300,y:300+30/s}});await click(target.x,target.y);await check('v');assert.deepEqual(await snapshot(),beforeOverride);
  const targetIsOverlay=await p.evaluate(()=>{const q=new DOMPoint(300,330).matrixTransform(svg.getScreenCTM());return document.elementFromPoint(q.x,q.y)?.classList.contains('thin-reference-highlight')});assert.equal(targetIsOverlay,false);
  // Every render takes fresh geometry from the current object rather than a cached reference.
  await p.evaluate(()=>{items=items.map(o=>o.id==='v'?{...o,y:80,y2:520}:o);render()});await check('v');
  for(const invalid of ['deleted','type','geometry']){
   await seed(1);await p.evaluate(invalid=>{if(invalid==='deleted')items=[];else if(invalid==='type')items[0].type='thin';else items[0].x2=NaN;render()},invalid);assert.equal(await count(),0);
  }
  for(const action of ['escape','tool','undo','redo','new','open','rollback']){
   await seed();await p.evaluate(()=>{window.highlightSnapshot=captureDrawing()});await move(320,380);await check('h');
   if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(async action=>{if(action==='tool')setMode('bar');if(action==='undo'){past.push([]);actions.undo[1]()}if(action==='redo'){future.push([]);actions.redo[1]()}if(action==='new')newDocument();if(action==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'highlight.json'));if(action==='rollback')restoreDrawing(window.highlightSnapshot)},action);
   assert.equal(await count(),0,action);
  }
  for(const action of ['undo','redo']){await seed(1);await p.evaluate(action=>actions[action][1](),action);assert.equal(await count(),0)}
  await seed(1);await click(380,380);assert.equal(await count(),0);assert.equal(await p.evaluate(()=>items.filter(o=>o.type==='thin').length),1);
  // A chained endpoint on another member immediately highlights the new reference.
  await seed();await click(300,360);await check('v');assert.equal(await p.evaluate(()=>items.filter(o=>o.type==='thin').length),1);
  if(touch){
   await seed();await move(320,380);await check('h');const old=await snapshot(),a=await coords(240,240),b=await coords(180,200),cdp=await context.newCDPSession(p);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:1},{x:b.x,y:b.y,id:2}]});
   assert.equal(await count(),0);assert.deepEqual(await snapshot(),old);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS reference highlight ${touch?'touch (emulated)':'mouse'}: single/auto/override, exact fresh geometry, behind member/pointer safety, no items/history, clean export, cleanup/stale/chaining/rollback`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
