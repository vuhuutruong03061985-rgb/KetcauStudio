const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginSmartMove==='function');
 const seed=async(extra=[],ids=['A'])=>p.evaluate(({extra,ids})=>{cancelToSelection();items=[make('bar',200,250,300,250,{id:'A',strokeColor:'#123456'}),...extra];past=[];future=[];snapEnabled=true;Object.assign(snapOptions,{endpoint:true,midpoint:true,intersection:true});updateSelection(ids,ids[0]);render()}, {extra,ids});
 const bar=(id,x,y,x2,y2)=>({id,type:'bar',x,y,x2,y2,label:'',support:'pin',direction:'down',rotation:'cw'});
 const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,future:future.length,delta:smartMoveSession?.delta,pair:smartMoveSession?.pair,anchor:smartMoveSession?.anchor,base:smartMoveSession?.base,pending:smartMoveSession?.pending,mode,preview:!!svg.querySelector('[data-move-preview]')}));
 const screen=(x,y)=>p.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}}, {x,y});
 const close=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
 const move=async(x,y)=>p.evaluate(({x,y})=>{updateSmartMove({x,y});render()}, {x,y});
 const start=()=>p.evaluate(()=>beginSmartMove({x:250,y:250},{pointerId:1,clientX:0,clientY:0}));
 await seed([bar('T',500,350,600,350)]);const original=(await state()).items;await start();await move(449,348);
 let s=await state();assert.equal(s.pair.target.kind,'endpoint');close(s.delta.x,200);close(s.delta.y,100);assert.deepEqual(s.items,original);assert(s.preview);
 await p.keyboard.press('Enter');s=await state();assert.equal(s.past,1);close(s.items[0].x2,500);assert.equal(s.items[0].strokeColor,'#123456');assert(!s.preview);
 await p.locator('#undo').click();assert.deepEqual((await state()).items,original);await p.locator('#redo').click();close((await state()).items[0].x2,500);
 // Free movement and release use the drag vector, not continuous nearest snapping.
 await seed([bar('T',500,350,600,350)]);await start();await move(410,410);s=await state();assert.equal(s.pair,null);close(s.delta.x,160);close(s.delta.y,160);
 await move(449,348);assert((await state()).pair);await move(410,310);assert.equal((await state()).pair,null);close((await state()).delta.x,160);
 await p.keyboard.press('Escape');assert.deepEqual((await state()).items,original);assert.equal((await state()).past,0);
 // A slightly closer competing endpoint does not oscillate the acquired pair.
 await seed([bar('T',500,350,600,350),bar('U',508,350,650,400)]);await start();await move(450,350);const key=(await state()).pair.target.key;await move(454.5,350);assert.equal((await state()).pair.target.key,key);await move(458,350);assert.notEqual((await state()).pair.target.key,key);
 // Distance wins over kind when candidates are not comparable.
 await seed([bar('T',400,350,800,350),bar('U',610,350,710,400)]);await start();await move(550,350);assert.equal((await state()).pair.target.kind,'midpoint');close((await state()).delta.x,300);
 // Valid bounded intersections; parallel and extended-only crossings are excluded.
 await seed([bar('T',500,250,800,550),bar('U',500,450,800,150)]);await start();await move(550,350);assert.equal((await state()).pair.target.kind,'intersection');close((await state()).delta.x,300);
 assert.equal(await p.evaluate(()=>segmentIntersectionPoint({x:0,y:0,x2:10,y2:0},{x:20,y:-10,x2:20,y2:10})),null);
 // Group sources, target exclusion and a common translation preserve relative geometry.
 await seed([bar('B',250,300,350,300),bar('T',500,400,650,400)],['A','B']);const groupOriginal=(await state()).items;await start();await move(400,350);s=await state();assert(s.pair.target.key.startsWith('T:'));assert.deepEqual(s.items,groupOriginal);await p.keyboard.press('Enter');s=await state();assert.equal(s.past,1);close(s.items[1].x-s.items[0].x,50);close(s.items[1].y-s.items[0].y,50);close(s.items[1].x2-s.items[1].x,100);
 await seed([bar('B',250,300,350,300)],['A','B']);await start();await move(260,260);assert.equal((await state()).pair,null);
 // Acquisition uses the existing 14/12 pixel radii across zoom levels.
 for(const width of [550,1100,2200]){
  await seed([{id:'T',type:'hinge',x:500,y:350}]);await p.evaluate(width=>{camera.w=width;camera.h=width*720/1100;applyCamera()},width);await start();await p.evaluate(()=>smartMoveSession.base={x:300,y:250,key:'A:e1',kind:'endpoint'});
  const scale=await p.evaluate(()=>Math.abs(svg.getScreenCTM().a));await move(450+10/scale,350);assert((await state()).pair);await move(450+25/scale,350);assert.equal((await state()).pair,null);
 }
 await p.evaluate(()=>{camera={x:0,y:0,w:1100,h:720};applyCamera()});
 // Explicit command/control: base stays exact while the pointer changes.
 await seed([bar('T',500,350,600,350)]);await p.locator('#moveObjects').click();await p.locator('#moveBasePoint').click();let q=await screen(200,250);await p.mouse.click(q.x,q.y);assert.equal((await state()).base.x,200);
 q=await screen(499,349);await p.mouse.move(q.x,q.y);close((await state()).delta.x,300);assert.equal((await state()).base.x,200);await p.mouse.click(q.x,q.y);s=await state();close(s.items[0].x,500);assert.equal(s.past,1);
 // Native mouse drag preview does not mutate model; release commits once.
 await seed([bar('T',500,350,600,350)]);q=await screen(240,250);await p.mouse.move(q.x,q.y);await p.mouse.down();let r=await screen(439,349);await p.mouse.move(r.x,r.y);assert.deepEqual((await state()).items,original);await p.mouse.up();assert.equal((await state()).past,1);
 // Endpoint resizing, other types, PC numeric inputs and clean export stay independent.
 await seed();q=await screen(200,250);await p.mouse.move(q.x,q.y);await p.mouse.down();r=await screen(180,230);await p.mouse.move(r.x,r.y);await p.mouse.up();close((await state()).items[0].x,180);close((await state()).items[0].x2,300);
 await seed();await start();await move(400,400);assert.equal(await p.evaluate(()=>exportSVG().includes('data-move-preview')),false);assert.equal((await state()).past,0);
 await p.evaluate(()=>setMode('thin'));assert.equal(await p.evaluate(()=>smartMoveSession),null);
 // Cancellation on pointercancel/document replacement leaves no transaction or stale mode.
 await seed();await p.evaluate(()=>beginSmartMove());q=await screen(240,250);await p.mouse.click(q.x,q.y);await move(400,400);await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));assert.equal(await p.evaluate(()=>smartMoveSession),null);assert.equal((await state()).mode,'select');assert.equal((await state()).past,0);
 await seed();await start();await move(400,400);await p.evaluate(()=>{items=[make('bar',100,100,200,100)];render()});assert.equal(await p.evaluate(()=>smartMoveSession),null);assert(!await p.evaluate(()=>svg.querySelector('[data-move-preview]')));
 await seed([bar('B',200,400,300,400)],['A','B']);q=await screen(240,250);await p.mouse.click(q.x,q.y);assert.deepEqual(await p.evaluate(()=>[...selectedObjectIds()]),['A']);
 assert.deepEqual(errors,[]);await p.close();
 // Actual touch contacts and CDP pen events, including frozen Bubble ownership.
 for(const pointer of ['touch','pen']){
  const page=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true});await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.waitForFunction(()=>typeof beginSmartMove==='function');const cdp=await page.context().newCDPSession(page);
  const screen=async(x,y)=>page.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}}, {x,y});
  const tap=async q=>{if(pointer==='touch')await page.touchscreen.tap(q.x,q.y);else{await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1,pointerType:'pen'})}};
  const activate=async id=>{
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   // Preserve legacy transaction coverage; native tablet Pivot interaction has its own suite.
   assert(await page.locator('#'+id).isHidden());await page.evaluate(id=>document.getElementById(id).click(),id);
  };
  await page.evaluate(()=>{items=[make('bar',200,250,300,250,{id:'A'}),make('bar',500,350,600,350,{id:'T'})];past=[];future=[];updateSelection(['A'],'A');render()});
  // Use the authoritative controls, then contact-only anchor/destination picking.
  await activate('moveObjects');await tap(await screen(240,250));assert(Math.abs(await page.evaluate(()=>smartMoveSession.anchor.x)-240)<1e-4);
  await tap(await screen(439,349));assert.equal(await page.evaluate(()=>past.length),0);assert.equal(await page.evaluate(()=>items[0].x),200);assert.equal(await page.locator('#tabletNumericKeypad').isVisible(),false);
  const frozen=await page.evaluate(()=>copy(smartMoveSession.delta));await page.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'pen',clientX:50,clientY:50})));assert.deepEqual(await page.evaluate(()=>smartMoveSession.delta),frozen);
  let box=await page.locator('[data-pen-connection-action="confirm"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>past.length),1);close(await page.evaluate(()=>items[0].x2),500);assert.equal(await page.locator('#penConnectionBubble').isVisible(),false);
  // Base pick uses contact and Bubble, remains frozen and can be explicitly reselected.
  await activate('moveObjects');await activate('moveBasePoint');await tap(await screen(400,350));assert.equal(await page.evaluate(()=>smartMoveSession.pending.kind),'base');box=await page.locator('[data-pen-connection-action="confirm"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>smartMoveSession.base.x),400);
  await tap(await screen(599,349));assert.equal(await page.evaluate(()=>smartMoveSession.base.x),400);box=await page.locator('[data-pen-connection-action="cancel"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>past.length),1);assert.equal(await page.evaluate(()=>smartMoveSession.base.x),400);
  await activate('moveBasePoint');await tap(await screen(500,350));box=await page.locator('[data-pen-connection-action="confirm"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>smartMoveSession.base.x),500);
  await tap(await screen(599,349));box=await page.locator('[data-pen-connection-action="confirm"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>past.length),2);close(await page.evaluate(()=>items[0].x2),600);
  // Compatibility clicks following a pen confirmation cannot create another checkpoint.
  await page.evaluate(()=>document.querySelector('[data-pen-connection-action="confirm"]').dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal(await page.evaluate(()=>past.length),2);
  await page.evaluate(()=>beginSmartMove());await tap(await screen(400,450));await tap(await screen(600,500));box=await page.locator('[data-pen-connection-action="cancel"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>past.length),2);
  await page.setViewportSize({width:800,height:1280});await page.waitForFunction(()=>smartMoveSession===null);await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));assert.equal(await page.evaluate(()=>items.length),2);
  await page.evaluate(()=>{items=[make('bar',200,250,300,250,{id:'A'}),make('bar',500,350,600,350,{id:'T'})];past=[];future=[];updateSelection(['A'],'A');render()});
  // Pick the body outside the new midpoint Pivot hit area; keep the same translation.
  const dragBefore=await page.evaluate(()=>copy(items)),a=await screen(220,250),b=await screen(419,349);
  if(pointer==='touch'){
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});
  }else{
   await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...b,button:'left',buttons:1,pointerType:'pen'});
  }
  assert.deepEqual(await page.evaluate(()=>items),dragBefore);assert(await page.evaluate(()=>!!svg.querySelector('[data-move-preview]')));
  if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',buttons:0,clickCount:1,pointerType:'pen'});
  assert.equal(await page.evaluate(()=>past.length),0);box=await page.locator('[data-pen-connection-action="confirm"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2});assert.equal(await page.evaluate(()=>past.length),1,pointer+' direct drag confirmation');close(await page.evaluate(()=>items[0].x2),500);
  if(pointer==='touch'){
   const beforePinch=await page.evaluate(()=>copy(items)),a=await screen(430,350),b={x:a.x+40,y:a.y+30},second={x:a.x+130,y:a.y+100};
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...b,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...b,id:1},{...second,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.deepEqual(await page.evaluate(()=>items),beforePinch);assert.equal(await page.evaluate(()=>smartMoveSession),null);assert.equal(await page.evaluate(()=>past.length),1);assert.equal(await page.locator('#penConnectionBubble').isVisible(),false);
  }
  await page.close();
 }
 console.log('Move Smart Snap: explicit/automatic, free/release/hysteresis, priorities/intersections, zoom/group/history/nonmutation, mouse/keyboard, touch/pen and orientation passed');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
