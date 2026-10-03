const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`),nearPoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve('.test-tools/grid-snap-translation');fs.mkdirSync(out,{recursive:true});
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const cdp=await context.newCDPSession(p),settled=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const screen=q=>p.evaluate(q=>{const r=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:r.x,y:r.y}},q);
  const send=(type,q)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:q?[{id:0,...q}]:[]});
  const down=async q=>{const a=await screen(q);if(touch)await send('touchStart',a);else{await p.mouse.move(a.x,a.y);await p.mouse.down()}};
  const move=async q=>{const a=await screen(q);if(touch)await send('touchMove',a);else await p.mouse.move(a.x,a.y,{steps:3})};
  const up=async()=>touch?send('touchEnd'):p.mouse.up();
  const cancel=async()=>{if(touch)await send('touchCancel');else{await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));await p.mouse.up()}};
  const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,future:future.length}));
  const shot=async name=>{if(touch){await settled();await p.screenshot({path:path.join(out,name+'.png')})}};
  const seed=async(kind='bar',condition={enabled:true,visible:true,option:true})=>p.evaluate(({kind,condition})=>{
   document.activeElement.blur();cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();
   snapEnabled=condition.enabled;gridVisible=condition.visible;gridSize=50;for(const k in snapOptions)snapOptions[k]=k==='grid'&&condition.option;
   items=kind==='person'?[make('person',400,400)]:[make(kind==='groupConnection'?'linkBar':'bar',400,400,700,400)];items[0].id='moving';
   if(['group','sectionGroup','personGroup','groupConnection'].includes(kind)){
    items.push(kind==='personGroup'?make('person',730,510):make('thin',400,500,700,500));items[1].id='second';
    if(kind==='sectionGroup')items.forEach(o=>o.sectionGroup='translation-grid');else multiSelection=new Set(items.map(o=>o.id));
   }
   selected=items[0].id;past=[];future=[];savedDocument=documentText();render();return copy(items);
  },{kind,condition});
  const grab={x:473,y:400},destination={x:496.4,y:437.6},evidence=[];
  // The grabbed point, rather than a rounded delta, lands on the destination lattice.
  let before=await seed();await shot('01-normal-before');await down(grab);assert.deepEqual((await state()).items,before);assert.equal((await state()).past,0);
  nearPoint(await p.evaluate(()=>drag.p),grab);await move(destination);assert.equal((await state()).past,0);await up();let after=await state();
  nearPoint(after.items[0],{x:427,y:450});nearPoint({x:after.items[0].x+(grab.x-before[0].x),y:after.items[0].y+(grab.y-before[0].y)},{x:500,y:450});
  near(after.items[0].x2-after.items[0].x,300);near(after.items[0].y2-after.items[0].y,0);assert.equal(after.past,1);await shot('02-normal-grid-snapped');
  await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,before);await p.evaluate(()=>actions.redo[1]());assert.deepEqual((await state()).items,after.items);
  for(const enabled of [false,true])for(const visible of [false,true])for(const option of [false,true]){
   const condition={enabled,visible,option};before=await seed('bar',condition);await down(grab);assert.deepEqual((await state()).items,before);await move(destination);await up();after=await state();
   nearPoint(after.items[0],enabled&&visible&&option?{x:427,y:450}:{x:423.4,y:437.6});assert.equal(after.past,1);evidence.push({condition,result:after.items[0]});
   if(enabled&&visible&&!option)await shot('08-grid-option-off');if(enabled&&!visible&&option)await shot('09-grid-hidden');
  }
  for(const kind of ['group','sectionGroup']){
   before=await seed(kind);await shot('06-'+kind+'-before');await down(grab);assert.deepEqual((await state()).items,before);nearPoint(await p.evaluate(()=>groupDrag.start),grab);
   await move(destination);assert.equal((await state()).past,0);await up();after=await state();assert.equal(after.past,1);
   for(let i=0;i<2;i++){near(after.items[i].x-before[i].x,27);near(after.items[i].y-before[i].y,50);near(after.items[i].x2-after.items[i].x,before[i].x2-before[i].x)}
   near(after.items[1].y-after.items[0].y,100);await shot('06-'+kind+'-after');await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,before);
  }
  for(const kind of ['person','personGroup']){
   before=await seed(kind);const a=kind==='person'?{x:400,y:400}:grab,b={x:a.x+23.4,y:a.y+37.6};await down(a);assert.deepEqual((await state()).items,before);
   if(kind==='personGroup')assert.equal(await p.evaluate(()=>groupDrag.freeMove),true);await move(b);await up();after=await state();assert.equal(after.past,1);
   for(let i=0;i<before.length;i++){near(after.items[i].x-before[i].x,23.4);near(after.items[i].y-before[i].y,37.6)}await shot('07-'+kind+'-free-move');await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,before);
  }
  // A geometric destination beats a closer Grid point for ordinary and group movement.
  for(const kind of ['bar','group']){
   await seed(kind);await p.evaluate(()=>{items.push(make('hinge',507,457));snapOptions.endpoint=true;render()});before=(await state()).items;
   await down(grab);await move({x:502,y:452});await up();after=await state();nearPoint(after.items[0],{x:434,y:457});await shot('05-geometric-over-grid-'+kind);
   if(kind==='group'){near(after.items[1].x-before[1].x,34);near(after.items[1].y-before[1].y,57)}
  }
  // Reuse live gridSize for decimal spacing and a negative-coordinate camera.
  await seed();await p.evaluate(()=>gridSize=12.5);await down(grab);await move(destination);await up();nearPoint((await state()).items[0],{x:427,y:437.5});
  await seed();await p.evaluate(()=>{items=[make('bar',-400,-400,-100,-400)];selected=items[0].id;camera={x:-800,y:-800,w:1100,h:720};applyCamera();render()});
  await down({x:-327,y:-400});await move({x:-303.6,y:-362.4});await up();nearPoint((await state()).items[0],{x:-373,y:-350});await shot('negative-normal-grid');
  // A bounded cursor alone cannot keep a translated far endpoint inside the model.
  for(const kind of ['bar','group','groupRigid'])for(const sign of [-1,1]){
   await seed(kind);before=await p.evaluate(({kind,sign})=>{
    camera={x:sign===1?9500:-10500,y:sign===1?9500:-10500,w:1100,h:720};applyCamera();
    items=[make('bar',sign*9890,sign*9800,sign*(kind==='groupRigid'?9945:9995),sign*9800)];if(kind==='group')items.push(make('thin',sign*9890,sign*9900,sign*9995,sign*9900));if(kind==='groupRigid')items.push(make('rigidRegion',sign*9890,sign*9900,undefined,undefined,{...rigidDefaults,points:[{x:0,y:0},{x:sign*105,y:sign*11},{x:sign*50,y:sign*60}]}));
    selected=null;multiSelection=new Set(kind!=='bar'?items.map(o=>o.id):[]);render();return copy(items);
   },{kind,sign});
   await down({x:sign*9930,y:sign*9800});assert.deepEqual((await state()).items,before);await move({x:sign*9931,y:sign*9800});await up();assert.deepEqual(await state(),{items:before,past:0,future:0});
  }
  // Transactional cancellation: connection-containing group and every touch group restore.
  for(const kind of touch?['group','sectionGroup','personGroup','groupConnection']:['groupConnection']){
   before=await seed(kind);await down(grab);await move(destination);assert.notDeepEqual((await state()).items,before);assert.equal((await state()).past,0);await cancel();assert.deepEqual(await state(),{items:before,past:0,future:0});assert.equal(await p.evaluate(()=>groupDrag),null);
  }
  // Mouse ordinary-group pointercancel retains its existing commit behavior.
  if(!touch){before=await seed('group');await down(grab);await move(destination);const live=(await state()).items;await cancel();assert.deepEqual((await state()).items,live);assert.equal((await state()).past,1);await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,before)}
  before=await seed();await p.locator('header strong').focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('Shift+ArrowDown');after=await state();nearPoint(after.items[0],{x:401,y:405});assert.equal(after.past,2);
  // C1 explicit endpoint and move-anchor editing still snaps through point().
  await seed();await down({x:700,y:400});await move({x:723,y:537});await up();nearPoint(await p.evaluate(()=>({x:items[0].x2,y:items[0].y2})),{x:700,y:550});
  await seed();await down({x:550,y:400});await move(destination);await up();nearPoint((await state()).items[0],{x:350,y:450});
  const document=await p.evaluate(()=>JSON.parse(documentText()));assert.equal(document.version,1);for(const key of ['gridSnap','snapOptions','gridVisible','gridSize'])assert(!(key in document));
  if(touch){
   await seed();await p.setViewportSize({width:1280,height:800});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');await settled();await shot('12-tablet-overall-1280x800');
   assert.deepEqual(await p.locator('#tabletBottomView').evaluate(e=>[...e.children].map(n=>n.id)),['gridToggle','gridSizeControl','snapToggle','drawingScalesToggle']);
   const b=await p.locator('#tabletBottomRightBar').boundingBox();assert.equal(b.width,208);assert.equal(b.height,48);await shot('10-bottom-right-unchanged');
   await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await shot('11-right-radial-unchanged');
   assert.deepEqual(await p.evaluate(()=>rightCommandRings.map(r=>r.ids)),[['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],['panView','snapOptions','openCalculator']]);
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,touch?'touch-evidence.json':'desktop-evidence.json'),JSON.stringify(evidence,null,2));await context.close();
 }
 console.log('PASS normal/group/section translation, non-grid start/no jump, conditions, geometric priority, decimals/negatives, Person exclusion, history/cancel, nudge, C1 edits and unchanged tablet UI (desktop + emulated touch)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
