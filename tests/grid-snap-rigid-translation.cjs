const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`),nearPoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve('.test-tools/grid-snap-rigid-translation');fs.mkdirSync(out,{recursive:true});
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
  const center=()=>p.locator('[data-move-anchor]').evaluate(e=>{const b=e.getBoundingClientRect(),q=new DOMPoint(b.x+b.width/2,b.y+b.height/2).matrixTransform(svg.getScreenCTM().inverse());return {x:q.x,y:q.y}});
  const seed=async(kind='linkBar',condition={enabled:true,visible:true,option:true},size=50,negative=false)=>p.evaluate(({kind,condition,size,negative})=>{
   document.activeElement.blur();cancelToSelection();camera={x:negative?-800:0,y:negative?-800:0,w:1100,h:720};applyCamera();snapEnabled=condition.enabled;gridVisible=condition.visible;gridSize=size;for(const k in snapOptions)snapOptions[k]=k==='grid'&&condition.option;
   const x=negative?-410:410,y=negative?-403:403;
   const o=kind==='rigidRegion'?make(kind,x,y,undefined,undefined,{...rigidDefaults,rigidAngle:37,points:[{x:0,y:0},{x:173,y:11},{x:83,y:137}]}):make(kind,x,y,...(kind==='linkBar'?[x+173,y+11]:[]));
   o.id='moving';items=[o];selected=o.id;past=[];future=[];savedDocument=documentText();render();return copy(o);
  },{kind,condition,size,negative});
  const delta={x:23.4,y:37.6},evidence=[];
  const expected=()=>p.evaluate(delta=>{
   const o=items[0],sources=geometricPoints(o).map(q=>({x:q.x+delta.x,y:q.y+delta.y}));
   const candidates=sources.map(source=>({source,point:gridSnap(source)})).filter(c=>c.point).map(c=>({...c,distance:Math.hypot(c.point.x-c.source.x,c.point.y-c.source.y)}));
   const hit=translationSnap(sources,o.id);return {sources,candidates,hit,x:o.x+delta.x+(hit?hit.point.x-hit.source.x:0),y:o.y+delta.y+(hit?hit.point.y-hit.source.y:0)};
  },delta);
  for(const kind of ['linkBar','weld','rigidRegion']){
   let before=await seed(kind),target=await expected(),a=await center();assert(target.hit);assert.equal(target.hit.kind,'grid');assert(target.candidates.every(c=>target.hit.distance<=c.distance));
   if(kind==='linkBar'){near(target.x,427);near(target.y,439);assert.deepEqual(target.hit.source,target.sources[1])}
   if(kind==='weld'){near(target.x,450);near(target.y,450)}
   await down(a);assert.deepEqual((await state()).items,[before]);assert.equal((await state()).past,0);nearPoint(await p.evaluate(()=>drag.p),a);
   await move({x:a.x+delta.x,y:a.y+delta.y});assert.equal((await state()).past,0);if(kind==='rigidRegion')assert.equal(await p.evaluate(()=>rigidSnapHint?.kind),'grid');await up();let after=await state();
   nearPoint(after.items[0],target);assert.equal(after.past,1);assert.equal(await p.evaluate(()=>rigidSnapHint),null);
   if(kind==='linkBar'){near(after.items[0].x2-after.items[0].x,173);near(after.items[0].y2-after.items[0].y,11);await shot('03-connection-grid-snapped')}
   if(kind==='rigidRegion'){assert.deepEqual(after.items[0].points,before.points);assert.equal(after.items[0].rigidAngle,37);await shot('04-rigid-grid-snapped')}
   assert(await p.evaluate(()=>geometricPoints(items[0]).some(q=>Math.hypot(q.x-gridSnap(q).x,q.y-gridSnap(q).y)<1e-7)));
   await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,[before]);await p.evaluate(()=>actions.redo[1]());assert.deepEqual((await state()).items,after.items);
   before=await seed(kind);a=await center();await down(a);await move({x:a.x+delta.x,y:a.y+delta.y});assert.notDeepEqual((await state()).items,[before]);await cancel();assert.deepEqual(await state(),{items:[before],past:0,future:0});assert(await p.evaluate(()=>drag===null&&rigidSnapHint===null));
   for(const condition of [{enabled:false,visible:true,option:true},{enabled:true,visible:false,option:true},{enabled:true,visible:true,option:false},{enabled:true,visible:true,option:true}]){
    before=await seed(kind,condition);target=await expected();a=await center();await down(a);await move({x:a.x+delta.x,y:a.y+delta.y});await up();after=await state();nearPoint(after.items[0],target);
    if(!condition.enabled||!condition.visible||!condition.option){assert.equal(target.hit,null);nearPoint(after.items[0],{x:before.x+delta.x,y:before.y+delta.y})}
    evidence.push({kind,condition,target,result:after.items[0]});
   }
   for(const [size,negative]of [[12.5,false],[12.3,true]]){
    before=await seed(kind,undefined,size,negative);target=await expected();a=await center();await down(a);await move({x:a.x+delta.x,y:a.y+delta.y});await up();after=await state();nearPoint(after.items[0],target);
    assert(target.hit);assert(target.candidates.every(c=>target.hit.distance<=c.distance));if(kind==='rigidRegion'){assert.deepEqual(after.items[0].points,before.points);assert.equal(after.items[0].rigidAngle,37)}
    evidence.push({kind,size,negative,target,result:after.items[0]});
   }
  }
  // Every geometric source is inspected before the fallback; exact Grid ties keep source order.
  const priority=await p.evaluate(()=>{
   cancelToSelection();snapEnabled=true;gridVisible=true;gridSize=50;for(const k in snapOptions)snapOptions[k]=['grid','endpoint'].includes(k);items=[make('hinge',407,407)];
   const earlyGrid={x:251,y:251},lateGeometry={x:402,y:402},allSources=translationSnap([earlyGrid,lateGeometry],'moving');
   snapOptions.intersection=true;items=[make('bar',407,407,607,407),make('bar',707,807,907,807),make('bar',807,707,807,907)];
   const ranked=translationSnap([{x:406,y:406},{x:802,y:802}],'moving');
   for(const k in snapOptions)snapOptions[k]=k==='grid';items=[];
   const a={x:401,y:402},b={x:451,y:452},tie=translationSnap([a,b],'moving');
   const invalid=translationSnap([{x:NaN,y:0},{x:Infinity,y:0}],'moving'),zero=translationSnap([{x:-.01,y:-.01}],'moving');
   return {allSources,ranked,tie,identity:tie.source===a,invalid,zero,negativeZero:Object.is(zero.point.x,-0)||Object.is(zero.point.y,-0)};
  });
  assert.equal(priority.allSources.kind,'endpoint');assert.deepEqual(priority.allSources.source,{x:402,y:402});assert.deepEqual(priority.allSources.point,{x:407,y:407});
  assert.equal(priority.ranked.kind,'intersection');assert.deepEqual(priority.ranked.source,{x:802,y:802});assert.deepEqual(priority.ranked.point,{x:807,y:807});
  assert.equal(priority.tie.kind,'grid');assert(priority.identity);assert.equal(priority.invalid,null);assert.deepEqual(priority.zero.point,{x:0,y:0});assert(!priority.negativeZero);
  for(const kind of ['linkBar','rigidRegion']){
   const before=await seed(kind),target=await expected();assert(target.hit);
   await p.evaluate(({kind,source})=>{snapOptions.endpoint=true;items.push(make('hinge',source.x+5,source.y+5));render()},{kind,source:target.sources[1]});
   const a=await center();await down(a);await move({x:a.x+delta.x,y:a.y+delta.y});if(kind==='rigidRegion')assert.equal(await p.evaluate(()=>rigidSnapHint?.kind),'endpoint');await up();const after=(await state()).items[0];nearPoint(after,{x:before.x+delta.x+5,y:before.y+delta.y+5});
   if(kind==='rigidRegion'){assert.deepEqual(after.points,before.points);assert.equal(after.rigidAngle,before.rigidAngle)}await shot('05-geometric-over-grid-'+kind);
  }
  // Grid can align a source at the boundary, but the entire translated shape must validate.
  for(const kind of ['linkBar','rigidRegion'])for(const sign of [-1,1]){
   await seed(kind);const before=await p.evaluate(({kind,sign})=>{
    camera={x:sign===1?9500:-10500,y:sign===1?9500:-10500,w:1100,h:720};applyCamera();
    const o=kind==='linkBar'?make(kind,sign*9890,sign*9800,sign*9995,sign*9811):make(kind,sign*9890,sign*9800,undefined,undefined,{...rigidDefaults,rigidAngle:0,points:[{x:0,y:0},{x:sign*105,y:sign*11},{x:sign*50,y:sign*100}]});
    o.id='moving';items=[o];selected=o.id;render();return copy(o);
   },{kind,sign});
   const a=await center();await down(a);await move({x:a.x+sign,y:a.y});await up();assert.deepEqual(await state(),{items:[before],past:0,future:0});assert.equal(await p.evaluate(()=>rigidSnapHint),null);
   assert(await p.evaluate(()=>geometricPoints(items[0]).every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&Math.abs(q.x)<=10000&&Math.abs(q.y)<=10000)));
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,touch?'touch-evidence.json':'desktop-evidence.json'),JSON.stringify({priority,evidence},null,2));await context.close();
 }
 console.log('PASS connection/rotated rigid translation, smallest-source Grid correction/ties, all-source geometry priority, conditions, decimals/negatives/bounds, no start jump, geometry/history and pointercancel (desktop + emulated touch)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
