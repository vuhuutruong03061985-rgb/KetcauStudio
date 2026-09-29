const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1500,height:1100},acceptDownloads:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 async function click(x,y){const q=await screen(x,y);await p.mouse.click(q.x,q.y)}
 const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,future:future.length,mode,points:copy(rigidPoints)}));
 const shape=()=>p.locator('[data-rigid-outline]').first().getAttribute('d');
 async function reset(){await p.evaluate(()=>{setMode('select');items=[];past=[];future=[];selected=null;snapEnabled=false;render()})}
 // UI creation, invalid completion and one checkpoint, including cyclic 3-point case.
 for(const n of [3,4,5,8]){
  await reset();await p.locator('[data-mode="rigidRegion"]').click();
  for(let i=0;i<n;i++){
   if(i<3){assert(await p.locator('#finishRigidRegion').isDisabled());await p.evaluate(()=>finishRigidRegion());assert.equal((await state()).items.length,0)}
   const a=i*2*Math.PI/n;await click(450+160*Math.cos(a),330+140*Math.sin(a));
  }
  const preview=await shape();assert(preview.endsWith(' Z'));assert.equal((preview.match(/ C/g)||[]).length,n);
  assert.equal((await state()).past,0);assert.equal((await state()).items.length,0);
  assert(await p.locator('#finishRigidRegion').isEnabled());await p.locator('#finishRigidRegion').click();
  const s=await state();assert.equal(s.items.length,1);assert.equal(s.items[0].points.length,n);assert.equal(s.past,1);assert.equal(s.mode,'select');
  assert.equal(await p.locator('[data-rigid-point]').count(),n);
  await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,0);await p.evaluate(()=>actions.redo[1]());
  const geometry=await p.evaluate(()=>{const o=items[0],a=o.points;return {a,d:generateRigidRegionPath(a),again:generateRigidRegionPath(a)}});
  assert.equal(geometry.d,geometry.again);
  const nums=geometry.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number),segments=[];
  for(let i=0;i<n;i++)segments.push(nums.slice(2+6*i,8+6*i));
  for(let i=0;i<n;i++){
   const a=geometry.a[i],next=geometry.a[(i+1)%n],prev=segments[(i+n-1)%n],seg=segments[i];
   assert.deepEqual(seg.slice(4),[next.x,next.y]);
   assert(Math.abs((a.x-prev[2])-(seg[0]-a.x))<1e-8);assert(Math.abs((a.y-prev[3])-(seg[1]-a.y))<1e-8);
  }
 }
 await reset();await p.locator('[data-mode="rigidRegion"]').click();await click(300,300);await p.locator('#cancelRigidRegion').click();assert.equal((await state()).past,0);assert.equal((await state()).items.length,0);
 await p.locator('[data-mode="rigidRegion"]').click();await click(300,300);await p.evaluate(()=>setMode('bar'));assert.deepEqual((await state()).points,[]);
 await reset();await p.locator('[data-mode="rigidRegion"]').click();for(const q of [[300,250],[550,250],[450,500]])await click(...q);await p.keyboard.press('Enter');
 const id=(await state()).items[0].id;
 // Style changes leave geometry intact and participate in history.
 const original=(await state()).items[0],outline=await shape();
 for(const fill of ['color','none','hatch']){
  await p.locator('[data-mode="rigidRegion"]').click();await p.locator('#rigid-fillMode').selectOption(fill);
  assert.deepEqual((await state()).items[0].points,original.points);assert.equal(await shape(),outline);
  assert.equal((await state()).items[0].fillMode,fill);
  await p.evaluate(()=>actions.undo[1]());await p.evaluate(()=>actions.redo[1]());assert.equal((await state()).items[0].fillMode,fill);
  await p.evaluate(id=>{selected=id;render()},id);
 }
 await p.locator('[data-mode="rigidRegion"]').click();await p.locator('#rigid-hatchStyle').selectOption('cross');
 await p.locator('#rigid-fillColor').fill('#123456');await p.locator('#rigid-fillColor').dispatchEvent('change');
 await p.locator('#rigid-fillOpacity').fill('0.4');await p.locator('#rigid-fillOpacity').dispatchEvent('change');
 await p.evaluate(()=>closeSecondaryTools());
 // Live point edits: same path for outline, hatch boundary and hit area, single undo.
 let before=await state(),oldPath=await shape();let q=await screen(550,250);await p.mouse.move(q.x,q.y);await p.mouse.down();
 q=await screen(590,210);await p.mouse.move(q.x,q.y,{steps:4});
 let live=await state();assert.equal(live.past,before.past);assert.notEqual(await shape(),oldPath);
 assert.deepEqual(live.items[0].points[0],before.items[0].points[0]);assert.deepEqual(live.items[0].points[2],before.items[0].points[2]);
 assert.equal(await p.locator(`[data-id="${id}"] [data-hit-area]`).getAttribute('d'),await shape());
 await p.mouse.up();assert.equal((await state()).past,before.past+1);const changedPath=await shape();
 await p.evaluate(()=>actions.undo[1]());assert.equal(await shape(),oldPath);await p.evaluate(()=>actions.redo[1]());assert.equal(await shape(),changedPath);
 await p.evaluate(id=>{selected=id;render()},id);
 // Cancellation rolls back points without an undo entry.
 before=await state();q=await screen(590,210);await p.mouse.move(q.x,q.y);await p.mouse.down();q=await screen(620,180);await p.mouse.move(q.x,q.y);
 await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:rigidDrag.pointerId,pointerType:'mouse'})));await p.mouse.up();
 assert.deepEqual((await state()).items,before.items);assert.equal((await state()).past,before.past);
 // Legacy grid state does not round authoritative control points.
 await p.evaluate(()=>{snapEnabled=true;for(const k of Object.keys(snapOptions))snapOptions[k]=false;render()});
 q=await screen(590,210);await p.mouse.move(q.x,q.y);await p.mouse.down();q=await screen(603,223);await p.mouse.move(q.x,q.y);await p.mouse.up();
 const unrounded=await p.evaluate(()=>({x:items[0].x+items[0].points[1].x,y:items[0].y+items[0].points[1].y}));assert(Math.abs(unrounded.x-603)<.001);assert(Math.abs(unrounded.y-223)<.001);
 await p.evaluate(()=>{snapEnabled=false;render()});
 before=await state();const anchor=await p.locator('[data-move-anchor]').boundingBox();await p.mouse.move(anchor.x+anchor.width/2,anchor.y+anchor.height/2);await p.mouse.down();await p.mouse.move(anchor.x+anchor.width/2+40,anchor.y+anchor.height/2+30);await p.mouse.up();
 assert.deepEqual((await state()).items[0].points,before.items[0].points);assert.notEqual((await state()).items[0].x,before.items[0].x);
 // Copy and mirror use the existing generic relative-point transformations.
 await p.locator('#copyObjects').click();await click(200,200);await p.locator('#pasteObjects').click();await click(700,200);
 let s=await state();assert.equal(s.items.length,2);assert.deepEqual(s.items[1].points,s.items[0].points);assert.equal(s.items[1].hatchStyle,'cross');
 assert(await p.evaluate(()=>{const old=items[0].points[0].x;items[1].points[0].x+=1;return items[0].points[0].x===old}));
 assert(await p.evaluate(()=>{const o=items[0],m=mirroredObjects([o],{x:0,y:0},{x:0,y:100})[0];validate({format:'ket-cau-studio',version:1,items:[m]});return m.x===-o.x&&m.points.every((p,i)=>p.x===-o.points[i].x&&p.y===o.points[i].y)&&m.fillColor===o.fillColor}));
 // No structural joint coupling, even if region origin coincides with the moved joint.
 assert(await p.evaluate(()=>{const o=items[0],result=deformJoint([o,make('bar',o.x,o.y,o.x+100,o.y)],{x:o.x,y:o.y},{x:o.x+20,y:o.y+30},new Map());return JSON.stringify(result[0])===JSON.stringify(o)}));
 // JSON validation, safety, defaults, round trip and legacy objects.
 const validation=await p.evaluate(()=>{
  const doc=()=>({format:'ket-cau-studio',version:1,items:copy(items)}),round=validate(JSON.parse(documentText()));
  const rejected=[];for(const points of [[],[{}],[{x:0,y:0},{x:1,y:1}],null,Array.from({length:257},()=>({x:0,y:0})),[{x:NaN,y:0},{x:1,y:1},{x:2,y:2}],[{x:10001,y:0},{x:1,y:1},{x:2,y:2}]]){const d=doc();d.items[0].points=points;try{validate(d);rejected.push(false)}catch{rejected.push(true)}}
  for(const [key,value]of [['fillMode','evil'],['fillColor','url(evil)'],['fillOpacity',2],['spacing',0]]){const d=doc();d.items[0][key]=value;try{validate(d);rejected.push(false)}catch{rejected.push(true)}}
  const d=doc();for(const k of Object.keys(rigidDefaults))delete d.items[0][k];validate(d);
  return {rejected,round,defaults:d.items[0],legacy:validate({format:'ket-cau-studio',version:1,items:[make('bar',0,0,100,0),make('curve',0,0,undefined,undefined,{curvePoints:[{x:50,y:50},{x:100,y:0}]}),make('hatch',0,0,undefined,undefined,{points:[{x:0,y:0},{x:100,y:0},{x:0,y:100}],spacing:8})]}).length};
 });assert(validation.rejected.every(Boolean));assert.equal(validation.legacy,3);assert.equal(validation.defaults.fillMode,'hatch');assert.deepEqual(validation.round,(await state()).items);
 for(const mode of ['hatch','color','none']){
  const out=await p.evaluate(mode=>{items=[items[0]];items[0].fillMode=mode;selected=items[0].id;render();const path=generateRigidRegionPath(items[0].points);const out=exportSVG();return {path,out,json:documentText()}},mode);
  assert(out.out.includes(out.path));assert(!/data-rigid-point|data-hit-area|data-rigid-preview|data-move-anchor/.test(out.out));
  assert(!/splinePath|bezierPoints|hatchBoundary|fillPolygon|hitGeometry/.test(out.json));
  if(mode==='hatch')assert.match(out.out,/<pattern/);if(mode==='color')assert.match(out.out,/fill="#123456" fill-opacity="0.4"/);if(mode==='none')assert.match(out.out,/fill="none" fill-opacity="1"/);
 }
 await p.evaluate(()=>{setMode('rigidRegion');rigidPoints=[{x:50,y:50},{x:80,y:50},{x:60,y:80}];render()});assert(!/data-rigid-preview/.test(await p.evaluate(()=>exportSVG())));
 const downloadPromise=p.waitForEvent('download');await p.locator('#png').click();const dl=await downloadPromise,stream=await dl.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);const png=Buffer.concat(chunks);assert.equal(png.readUInt32BE(16),3300);assert.equal(png.readUInt32BE(20),2160);
 await p.evaluate(()=>{setMode('select');selected=items[0].id;render()});await p.keyboard.press('Delete');assert.equal((await state()).items.length,0);await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,1);
 assert.deepEqual(errors,[]);console.log('PASS rigidRegion mouse, geometry, live fill/hatch, styles, history, validation, transforms and SVG/PNG');
 // Real browser-generated touch events through CDP, sharing the same geometry and edit handlers.
 const context=await browser.newContext({viewport:{width:1100,height:1000},hasTouch:true,isMobile:true});const t=await context.newPage();t.on('pageerror',e=>errors.push(e.message));await t.goto(pathToFileURL(path.resolve('index.html')).href);await t.waitForFunction(()=>items.length>0);
 await t.evaluate(()=>{items=[];past=[];future=[];snapEnabled=false;setMode('rigidRegion')});
 const xy=(x,y)=>t.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 for(const a of [[250,250],[550,250],[400,500]]){const q=await xy(...a);await t.touchscreen.tap(q.x,q.y)}
 await t.locator('#finishRigidRegion').tap();assert.equal(await t.evaluate(()=>items.length),1);
 const cdp=await context.newCDPSession(t),touch=(type,ps)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:ps.map(([id,p])=>({id,x:p.x,y:p.y,radiusX:4,radiusY:4}))});
 const old=await t.evaluate(()=>JSON.stringify(items)),a=await xy(550,250),b=await xy(590,210);
 await touch('touchStart',[[0,a]]);await touch('touchMove',[[0,b]]);assert.notEqual(await t.evaluate(()=>JSON.stringify(items)),old);
 assert.equal(await t.locator('[data-rigid-outline]').getAttribute('d'),await t.locator('[data-id] [data-hit-area]').first().getAttribute('d'));
 await touch('touchEnd',[]);assert.equal(await t.evaluate(()=>past.length),2);
 await t.evaluate(()=>actions.undo[1]());assert.equal(await t.evaluate(()=>JSON.stringify(items)),old);
 await t.evaluate(()=>{selected=items[0].id;render()});
 await touch('touchStart',[[0,a]]);await touch('touchMove',[[0,b]]);await touch('touchCancel',[]);assert.equal(await t.evaluate(()=>JSON.stringify(items)),old);
 // Pinch rolls back the first finger's temporary creation point.
 await t.evaluate(()=>setMode('rigidRegion'));await touch('touchStart',[[0,a]]);await touch('touchStart',[[0,a],[1,await xy(700,300)]]);await touch('touchEnd',[]);assert.equal(await t.evaluate(()=>rigidPoints.length),0);
 await t.locator('#cancelRigidRegion').tap();assert.equal(await t.evaluate(()=>mode),'select');
 assert.deepEqual(errors,[]);console.log('PASS rigidRegion emulated touch creation/edit/cancel and pinch rollback (physical Android not tested)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
