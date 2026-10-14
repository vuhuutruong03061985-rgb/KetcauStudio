const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
// Native screen-to-SVG conversion uses float matrices; exact snap targets are checked separately.
const near=(a,b)=>assert(Math.abs(a-b)<1e-4,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const pointer of ['touch','pen']){
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof objectPivot==='function'&&typeof beginBarPivot==='function');const cdp=await p.context().newCDPSession(p);
  const seed=()=>p.evaluate(()=>{cancelToSelection();items=[make('bar',200,250,500,250,{id:'A'}),make('bar',700,300,900,300,{id:'B'})];past=[];future=[];snapEnabled=true;Object.assign(snapOptions,{endpoint:true,midpoint:true,intersection:true,member:true});updateSelection(['A'],'A');render()});
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const contact=async(type,q)=>{if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:type==='down'?'touchStart':type==='up'?'touchEnd':type==='cancel'?'touchCancel':'touchMove',touchPoints:['up','cancel'].includes(type)?[]:[{...q,id:1}]});else await cdp.send('Input.dispatchMouseEvent',{type:type==='down'?'mousePressed':type==='up'?'mouseReleased':'mouseMoved',...q,button:'left',buttons:type==='up'?0:1,clickCount:1,pointerType:'pen'})};
  const tap=async q=>{await contact('down',q);await contact('up',q)};
  const adjust=async(x,y)=>{const a=await p.evaluate(()=>selectionPivot());await contact('down',await screen(a.x,a.y));await contact('move',await screen(x,y));await contact('up',await screen(x,y));assert.equal(await p.evaluate(()=>smartMoveSession?.pending?.kind),'pivot')};
  const confirm=async action=>{const box=await p.locator('[data-pen-connection-action="'+action+'"]').boundingBox();await tap({x:box.x+box.width/2,y:box.y+box.height/2})};
  const geometry=()=>p.evaluate(()=>items.map(({id,x,y,x2,y2})=>({id,x,y,x2,y2})));
  await seed();const original=await geometry();assert.deepEqual(await p.evaluate(()=>objectPivot(items[0])),{x:350,y:250});assert.equal(await p.locator('[data-bar-pivot]').count(),1);assert.equal(await p.locator('[data-move-anchor]').count(),0);
  const hit=await p.locator('[data-pivot-hit]').boundingBox();assert(hit.width>=43.99&&hit.height>=43.99);assert.equal(await p.evaluate(()=>past.length),0);
  // Endpoints, projected arbitrary on-Bar and off-Bar positions; only metadata changes.
  for(const [x,y,expected]of [[201,251,{x:200,y:250}],[317,253,{x:317,y:250}],[737,303,{x:737,y:300}],[380,410,{x:380,y:410}]]){
   await seed();await adjust(x,y);assert.deepEqual(await geometry(),original);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.locator('[data-bar-pivot]').count(),1);
   await confirm('confirm');const q=await p.evaluate(()=>objectPivot(items[0]));near(q.x,expected.x);near(q.y,expected.y);assert.deepEqual(await geometry(),original);assert.equal(await p.evaluate(()=>past.length),1,'metadata-only Undo entry');
   await p.evaluate(()=>{updateSelection([]);render();updateSelection(['A'],'A');render()});assert.deepEqual(await p.evaluate(()=>objectPivot(items[0])),q);
   await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>objectPivot(items[0])),{x:350,y:250});await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>objectPivot(items[0])),q);
   await p.evaluate(()=>{const saved=JSON.stringify({format:'ket-cau-studio',version:1,items});setMode('select');items=validate(JSON.parse(saved));updateSelection(['A'],'A');render()});assert.deepEqual(await p.evaluate(()=>objectPivot(items[0])),q);
  }
  await seed();await adjust(380,410);await confirm('cancel');assert.deepEqual(await geometry(),original);assert.equal(await p.evaluate(()=>items[0].pivot),undefined);assert.equal(await p.evaluate(()=>past.length),0);
  await seed();const a=await screen(350,250),z=await screen(380,410);await contact('down',a);await contact('move',z);await p.evaluate(()=>panButton.click());await contact('up',z);assert.equal(await p.evaluate(()=>smartMoveSession),null);assert.equal(await p.evaluate(()=>past.length),0);assert.deepEqual(await geometry(),original);await p.evaluate(()=>deactivateCanvasPan());
  // Existing endpoint center keeps ownership when Pivot is placed at that endpoint.
  await seed();await adjust(200,250);await confirm('confirm');const endpoint=await screen(200,250);
  assert(await p.evaluate(q=>!!document.elementFromPoint(q.x,q.y).closest('[data-endpoint]'),endpoint));
  const edge={x:endpoint.x-20,y:endpoint.y};assert(await p.evaluate(q=>!!document.elementFromPoint(q.x,q.y).closest('[data-bar-pivot]'),edge),'Pivot outer ring remains available');
  await contact('down',edge);await contact('move',await screen(380,410));await contact('up',await screen(380,410));await confirm('cancel');assert.deepEqual(await geometry(),original);
  await contact('down',endpoint);assert.equal(await p.evaluate(()=>drag?.endpoint),'start');assert.equal(await p.evaluate(()=>smartMoveSession),null);await contact('up',endpoint);
  // Group center is bounds-center, temporary editing has no document checkpoint.
  await seed();await p.evaluate(()=>{updateSelection(['A','B'],'A');render()});assert.deepEqual(await p.evaluate(()=>selectionPivot()),{x:550,y:275});assert.equal(await p.locator('[data-bar-pivot]').count(),1);
  await adjust(560,430);await confirm('confirm');assert.equal(await p.evaluate(()=>past.length),0);assert.deepEqual(await geometry(),original);near((await p.evaluate(()=>selectionPivot())).y,430);
  await p.evaluate(()=>{updateSelection([]);render();updateSelection(['A','B'],'A');render()});assert.deepEqual(await p.evaluate(()=>selectionPivot()),{x:550,y:275});
  // All persistent transport uses one model; copy/translation/rotation-frame/mirror preserve Pivot.
  const model=await p.evaluate(()=>{const o=make('bar',200,250,500,250,{pivot:{along:30,normal:70}}),q=objectPivot(o),translated={...o,x:o.x+70,y:o.y-40,x2:o.x2+70,y2:o.y2-40};const mirrored=mirroredObjects([o],{x:0,y:0},{x:0,y:1})[0];return {q,t:objectPivot(translated),r:objectPivot({...o,x:250,y:200,x2:250,y2:500}),m:objectPivot(mirrored),old:objectPivot(validate({format:'ket-cau-studio',version:1,items:[make('bar',200,250,500,250)]})[0])}});
  assert.deepEqual(model,{q:{x:380,y:320},t:{x:450,y:280},r:{x:180,y:380},m:{x:-380,y:320},old:{x:350,y:250}});
  for(const pivot of [null,{},[],{along:'1',normal:0},{along:Infinity,normal:0},{along:0,normal:NaN},{along:30001,normal:0}])assert(await p.evaluate(pivot=>{try{validate({format:'ket-cau-studio',version:1,items:[make('bar',0,0,200,0,{pivot})]});return false}catch{return true}},pivot));
  for(const type of ['thin','dashed'])assert.deepEqual(await p.evaluate(type=>objectPivot({type,x:0,y:0,x2:100,y2:0}),type),{x:50,y:0});
  for(const type of ['force','support','text','rigidRegion'])assert.equal(await p.evaluate(type=>objectPivot({type,x:0,y:0,x2:100,y2:0}),type),null);
  await seed();assert.equal(await p.evaluate(()=>exportSVG().includes('data-bar-pivot')),false);
  for(const width of [550,2200]){await p.evaluate(width=>{camera.w=width;camera.h=width*720/1100;applyCamera();render()},width);const b=await p.locator('[data-pivot-hit]').boundingBox();assert(b.width>=43.99&&b.height>=43.99);assert.deepEqual(await geometry(),original)}
  assert.deepEqual(errors,[]);await p.close();console.log('PASS Pivot P1 '+pointer+': metadata, confirmation/cancel, persistence/history, group, projection, endpoint priority, transforms and clean export');
 }
 const p=await browser.newPage({viewport:{width:1280,height:800}});await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof objectPivot==='function');await p.evaluate(()=>{items=[make('bar',200,250,500,250)];updateSelection([items[0].id],items[0].id);render()});assert.equal(await p.locator('[data-bar-pivot]').count(),0);assert.equal(await p.locator('[data-move-anchor]').count(),1);assert(await p.locator('#moveObjects').isVisible());await p.close();console.log('PASS Pivot P1 PC retains original controls/handles');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
