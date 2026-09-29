const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
const nearPoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
const h={x:100,y:300,x2:500,y2:300},v={x:300,y:100,x2:300,y2:500},d={x:100,y:100,x2:500,y2:500};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.waitForFunction(()=>typeof resolveThinConstrainedGeometry==='function');
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {clientX:q.x,clientY:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.clientX,q.clientY);else await p.mouse.click(q.clientX,q.clientY)};
  const move=async(x,y)=>p.locator('#drawing').dispatchEvent('pointermove',{...await coords(x,y),pointerType:touch?'touch':'mouse'});
  const tapWithoutMove=async(x,y)=>{const q=await coords(x,y);for(const type of ['pointerdown','pointerup'])await p.locator('#drawing').dispatchEvent(type,{...q,button:0,pointerId:71,pointerType:touch?'touch':'mouse'})};
  const start=async(bars=[h],width=1100,at={x:300,y:300})=>{
   await p.evaluate(({bars,width})=>{document.activeElement.blur();setMode('select');items=bars.map((b,i)=>({...make('bar',b.x,b.y,b.x2,b.y2),id:'bar'+i}));past=[];future=[];camera={x:0,y:0,w:width,h:width*720/1100};applyCamera();internalForceScale=10;geometryScale=100;setMode('thin');savedDocument=documentText()},{bars,width});
   await click(at.x,at.y);return p.evaluate(()=>({anchor:{...first},scale:Math.abs(svg.getScreenCTM().a)}));
  };
  const preview=()=>p.evaluate(()=>{const l=svg.querySelector('[data-thin-preview] line');return {line:l?{x:Number(l.getAttribute('x1')),y:Number(l.getAttribute('y1')),x2:Number(l.getAttribute('x2')),y2:Number(l.getAttribute('y2'))}:null,value:thinNumericSession?.value,first:{...first},geometry:getThinReferenceBar()?getThinConstrainedGeometry(getThinReferenceBar()):null}});
  const lock=async(value=110)=>{await p.locator('#dynamicInputValue').fill(String(value));await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'locked')};
  const frame=bar=>{const len=Math.hypot(bar.x2-bar.x,bar.y2-bar.y),t={x:(bar.x2-bar.x)/len,y:(bar.y2-bar.y)/len};return {t,n:{x:-t.y,y:t.x}}};
  function expected(anchor,bar,along,normalDistance,scale,length){const {t,n}=frame(bar),side=Math.abs(along*scale)<=10?0:Math.sign(along),start={x:anchor.x+t.x*side*3/scale,y:anchor.y+t.y*side*3/scale};return {start,end:{x:start.x+n.x*length,y:start.y+n.y*length},side,cursor:{x:anchor.x+t.x*along+n.x*normalDistance,y:anchor.y+t.y*along+n.y*normalDistance}}}
  function checkPreview(r,e,anchor,value){assert(r.line);nearPoint({x:r.line.x,y:r.line.y},e.start);nearPoint({x:r.line.x2,y:r.line.y2},e.end);nearPoint(r.first,anchor);near(r.value,value);assert.equal(r.geometry.sectionSide,e.side)}

  for(const bar of [h,v,d])for(const along of [-35,0,35])for(const distance of [-40,40]){
   const {anchor,scale}=await start([bar]),e=expected(anchor,bar,along,distance,scale,distance);
   await move(e.cursor.x,e.cursor.y);checkPreview(await preview(),e,anchor,400);
  }
  // Section dead zone uses strict >, including both exact boundaries in the shared adaptor.
  const boundaries=await p.evaluate(()=>[-1,1].flatMap(sign=>[9.999,10,10.001].map(px=>resolveThinConstrainedGeometry({anchorPoint:{x:0,y:0},referenceBar:{x:0,y:0,x2:100,y2:0},rawCursorPoint:{x:sign*px/2,y:20},screenScale:2,valueMode:'live'}).sectionSide)));
  assert.deepEqual(boundaries,[0,0,-1,0,0,1]);
  for(const px of [-10.01,-9.99,9.99,10.01]){const {anchor,scale}=await start(),e=expected(anchor,h,px/scale,25,scale,25);await move(e.cursor.x,e.cursor.y);checkPreview(await preview(),e,anchor,250)}
  let initial=await start();await move(350,300);let r=await preview();assert(r.line);near(Math.hypot(r.line.x2-r.line.x,r.line.y2-r.line.y),0);near(r.value,0);await tapWithoutMove(350,300);assert.equal(await p.evaluate(()=>past.length),0);
  // Force an unrelated snapped hover: geometry and LIVE numeric value still follow raw cursor.
  initial=await start();await p.evaluate(()=>{window.oldDrawingPoint=drawingPoint;drawingPoint=()=>({x:450,y:450})});
  const rawExpected=expected(initial.anchor,h,30,40,initial.scale,40);await move(rawExpected.cursor.x,rawExpected.cursor.y);checkPreview(await preview(),rawExpected,initial.anchor,400);
  await p.evaluate(()=>{drawingPoint=window.oldDrawingPoint;delete window.oldDrawingPoint});

  for(const bar of [h,v,d]){
   const {anchor,scale}=await start([bar]);await move(340,360);await lock();
   for(const side of [-1,1]){const e=expected(anchor,bar,35,side*50,scale,side*11);await move(e.cursor.x,e.cursor.y);checkPreview(await preview(),e,anchor,110)}
   const {t}=frame(bar);await move(anchor.x+30*t.x,anchor.y+30*t.y);assert.equal((await preview()).line,null);
   await tapWithoutMove(anchor.x+30*t.x,anchor.y+30*t.y);assert.equal(await p.evaluate(()=>past.length),0);
  }
  // Commit recalculates fresh section side/direction even when the old preview points elsewhere.
  for(const valueMode of ['live','locked'])for(const bar of [h,v,d]){
   const {anchor,scale}=await start([bar]);await move(340,360);if(valueMode==='locked')await lock();
   const e=expected(anchor,bar,-35,-40,scale,valueMode==='locked'?-11:-40);
   await p.evaluate(()=>{window.previousReference=thinReferenceSession});await tapWithoutMove(e.cursor.x,e.cursor.y);
   const result=await p.evaluate(()=>({o:items.at(-1),first,anchor:thinReferenceSession.anchorPoint,fresh:thinReferenceSession!==window.previousReference,mode:thinNumericSession.valueMode}));
   nearPoint(result.o,e.start);nearPoint({x:result.o.x2,y:result.o.y2},e.end);nearPoint(result.first,e.end);nearPoint(result.anchor,e.end);assert(result.fresh);assert.equal(result.mode,'live');
   for(const key of ['referenceBarId','anchorPoint','sectionSide','normal'])assert(!(key in result.o));
   const json=await p.evaluate(()=>documentText());await p.evaluate(async json=>loadDocument(new File([json],'thin.json')),json);assert.deepEqual(await p.evaluate(()=>items.at(-1)),result.o);
  }
  // Resolve a multiple-reference node from the tap itself, with no preceding cursor move.
  initial=await start([h,v]);await tapWithoutMove(306,350);let object=await p.evaluate(()=>items.at(-1));near(object.x,300);near(object.x2,300);near(object.y2,350);
  // Initial lock and direct first tap -> commit also work without a preview cache.
  initial=await start([d]);let e=expected(initial.anchor,d,30,40,initial.scale,40);await tapWithoutMove(e.cursor.x,e.cursor.y);object=await p.evaluate(()=>items.at(-1));nearPoint(object,e.start);nearPoint({x:object.x2,y:object.y2},e.end);
  // Endpoint anchors allow both section sides, including outside the member.
  for(const side of [-1,1]){initial=await start([h],1100,{x:100,y:300});e=expected(initial.anchor,h,side*30,40,initial.scale,40);await move(e.cursor.x,e.cursor.y);checkPreview(await preview(),e,initial.anchor,400)}

  for(const width of [550,1100]){initial=await start([d],width);e=expected(initial.anchor,d,20/initial.scale,30/initial.scale,initial.scale,30/initial.scale);await move(e.cursor.x,e.cursor.y);r=await preview();checkPreview(r,e,initial.anchor,300/initial.scale);near(Math.hypot(r.line.x-initial.anchor.x,r.line.y-initial.anchor.y)*initial.scale,3)}
  // Reversing endpoints flips both projections and leaves physical preview unchanged.
  for(const valueMode of ['live','locked']){const results=[];for(const bar of [d,{x:d.x2,y:d.y2,x2:d.x,y2:d.y}]){await start([bar]);await move(340,370);if(valueMode==='locked')await lock();results.push((await preview()).line)}for(const key of ['x','y','x2','y2'])near(results[0][key],results[1][key])}

  for(const kind of ['none','unresolved','invalid'])for(const valueMode of ['live','locked']){
   await start(kind==='none'?[]:kind==='unresolved'?[h,v]:[h]);if(kind==='invalid')await p.evaluate(()=>{items=[];render()});
   const cursor={x:360,y:360};await move(cursor.x,cursor.y);if(valueMode==='locked')await lock();
   const expectedOld=await p.evaluate(()=>{const end=thinNumericSession.valueMode==='locked'?solveThinEndpointFromValue({startPoint:first,candidatePoint:hover,internalForceValue:110,internalForceScale}):hover;return {first:{...first},end,value:thinNumericSession.valueMode==='locked'?110:Math.hypot(hover.x-first.x,hover.y-first.y)*internalForceScale}});
   r=await preview();assert(r.line);nearPoint(r.line,expectedOld.first);nearPoint({x:r.line.x2,y:r.line.y2},expectedOld.end);near(r.value,expectedOld.value);
   await tapWithoutMove(cursor.x,cursor.y);object=await p.evaluate(()=>items.at(-1));nearPoint(object,expectedOld.first);nearPoint({x:object.x2,y:object.y2},expectedOld.end);
  }
  // A segment ending away from bars must chain from its actual endpoint with free-drawing fallback.
  initial=await start();e=expected(initial.anchor,h,40,80,initial.scale,80);await tapWithoutMove(e.cursor.x,e.cursor.y);assert.equal(await p.evaluate(()=>thinReferenceSession.referenceBarLocked),false);
  await tapWithoutMove(e.end.x+40,e.end.y+30);object=await p.evaluate(()=>items.at(-1));nearPoint(object,e.end);near(object.x2,e.end.x+40);near(object.y2,e.end.y+30);
  // Existing keyboard Enter / touch Done lifecycle remains shared with the commit path.
  initial=await start();e=expected(initial.anchor,h,30,40,initial.scale,11);await move(e.cursor.x,e.cursor.y);await p.locator('#dynamicInputValue').fill('110');
  if(touch){await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>past.length),0);await tapWithoutMove(e.cursor.x,e.cursor.y)}else await p.keyboard.press('Enter');
  object=await p.evaluate(()=>items.at(-1));nearPoint(object,e.start);nearPoint({x:object.x2,y:object.y2},e.end);
  await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.filter(o=>o.type==='thin').length),0);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items.at(-1)),object);
  assert(await p.evaluate(()=>[undefined,null,{}].every(value=>resolveThinConstrainedGeometry(value)===null)));
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS perpendicular runtime ${touch?'touch (emulated)':'mouse'}: cardinal/diagonal/mixed/raw LIVE, section dead zone/offset, LOCKED/no-side, fresh tap geometry, fallback, chaining, zoom/reversal, endpoint anchors, JSON and numeric lifecycle`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
