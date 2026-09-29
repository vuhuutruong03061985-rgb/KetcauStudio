const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`),length=o=>Math.hypot(o.x2-o.x,o.y2-o.y);
async function run(type='linkBar'){
 const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
  const screen=q=>p.evaluate(q=>{const v=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:v.x,y:v.y}},q);
  const tap=async(x,y)=>{const q=await screen({x,y});if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const cdp=await context.newCDPSession(p),send=(event,points)=>cdp.send('Input.dispatchTouchEvent',{type:event,touchPoints:points.map(([id,q])=>({id,x:q.x,y:q.y,radiusX:4,radiusY:4}))});
  async function gesture(a,b,cancel){
   if(touch){await send('touchStart',[[0,a]]);await send('touchMove',[[0,b]]);if(cancel==='pinch'){await send('touchStart',[[0,b],[1,{x:b.x+80,y:b.y}]]);await send('touchEnd',[])}else if(cancel==='pointercancel')await send('touchCancel',[]);else{if(cancel==='mode')await p.evaluate(()=>setMode('bar'));if(cancel==='escape')await p.keyboard.press('Escape');await send('touchEnd',[])}}
   else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:4});if(cancel==='mode')await p.evaluate(()=>setMode('bar'));else if(cancel==='escape')await p.keyboard.press('Escape');else if(cancel==='pointercancel')await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));await p.mouse.up()}
  }
  const center=async selector=>{const b=await p.locator(selector).boundingBox();return {x:b.x+b.width/2,y:b.y+b.height/2}};
  const seed=()=>p.evaluate(type=>{setMode('select');items=[make(type,300,300,...(type==='linkBar'?[500,300]:[]))];selected=items[0].id;past=[];future=[];snapEnabled=false;render();return copy(items[0])},type);
  await p.evaluate(()=>{items=[];past=[];future=[];snapEnabled=false;render()});await p.locator(`[data-mode="${type}"]`).click();await tap(300,300);
  if(type==='linkBar'){assert.equal(await p.evaluate(()=>items.length),0);await tap(300,300);assert.equal(await p.evaluate(()=>items.length),0);await tap(500,300)}
  assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);near(await p.evaluate(()=>items[0].x),300);
  if(type==='linkBar'){assert.equal(await p.evaluate(()=>first),null);await tap(600,400);assert.equal(await p.evaluate(()=>items.length),1);await p.keyboard.press('Escape')}
  let original=await seed();
  assert(await p.locator(`.support-choices [data-mode="${type}"].icon-button`).count());
  for(const q of type==='linkBar'?[{x:300,y:300},{x:500,y:300},{x:350,y:300}]:[{x:295,y:295},{x:305,y:305}]){
   await p.evaluate(()=>{selected=null;render()});await tap(q.x,q.y);assert.equal(await p.evaluate(()=>selected),original.id);
  }
  assert(await p.evaluate(()=>{const o=items[0],g=svg.querySelector(`[data-id="${o.id}"]`);return o.type==='linkBar'?g.getAttribute('stroke')==='black':g.querySelector('rect[stroke="none"]').getAttribute('fill')==='black'}));
  // Creation snaps both ways through the canonical discrete-target provider.
  await p.evaluate(type=>{setMode(type);snapEnabled=true;items=[make(type==='linkBar'?'weld':'linkBar',300,300,...(type==='weld'?[500,300]:[])),make('hinge',600,400)];past=[];render()},type);
  await tap(301,301);if(type==='linkBar')await tap(601,401);
  assert(await p.evaluate(()=>{const o=items.at(-1);return o.x===300&&o.y===300&&(o.type!=='linkBar'||o.x2===600&&o.y2===400)}));
  await seed();
  if(type==='linkBar'){
   for(const [end,x,y]of [['start',250,250],['end',620,360]]){
    original=await seed();await gesture(await center(`[data-endpoint="${end}"]`),await screen({x,y}));const o=await p.evaluate(()=>copy(items[0]));
    if(end==='start'){near(o.x,x);near(o.y,y);assert.equal(o.x2,original.x2);assert.equal(o.y2,original.y2)}else{near(o.x2,x);near(o.y2,y);assert.equal(o.x,original.x);assert.equal(o.y,original.y)}
    assert.notEqual(length(o),length(original));assert.equal(await p.evaluate(()=>past.length),1);await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),original);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),o);
   }
   await seed();await gesture(await center('[data-endpoint="end"]'),await screen({x:300,y:300}));assert(await p.evaluate(()=>Math.hypot(items[0].x2-items[0].x,items[0].y2-items[0].y)>=1));
   // Very short links retain two spatially separate handles; no inflated minimum length.
   await p.evaluate(()=>{items[0].x2=items[0].x+2;render()});const a=await center('[data-endpoint="start"]'),b=await center('[data-endpoint="end"]');assert(Math.hypot(a.x-b.x,a.y-b.y)>44);
  }
  original=await seed();const a=await screen(type==='linkBar'?{x:350,y:300}:{x:304,y:304}),b={x:a.x+45,y:a.y+35};await gesture(a,b);let moved=await p.evaluate(()=>copy(items[0]));assert.equal(await p.evaluate(()=>past.length),1);
  if(type==='linkBar'){near(moved.x-original.x,moved.x2-original.x2);near(moved.y-original.y,moved.y2-original.y2);near(length(moved),length(original));near(Math.atan2(moved.y2-moved.y,moved.x2-moved.x),0)}
  for(const cancel of ['pointercancel','mode','escape',...(touch?['pinch']:[])]){
   for(const selector of type==='linkBar'?['[data-move-anchor]','[data-endpoint="start"]','[data-endpoint="end"]']:['[data-move-anchor]']){
    original=await seed();const start=await center(selector);await gesture(start,{x:start.x+40,y:start.y+30},cancel);assert.deepEqual(await p.evaluate(()=>items[0]),original);assert.equal(await p.evaluate(()=>past.length),0);
   }
  }
  // Releasing unchanged geometry adds no history.
  await seed();const same=await center('[data-move-anchor]');await gesture(same,same);assert.equal(await p.evaluate(()=>past.length),0);
  await seed();await p.evaluate(type=>{snapEnabled=true;items.push(make(type==='linkBar'?'weld':'linkBar',650,400,...(type==='weld'?[800,400]:[])));render()},type);
  const start=await center(type==='linkBar'?'[data-endpoint="end"]':'[data-move-anchor]');await gesture(start,await screen({x:651,y:401}));
  const snapped=await p.evaluate(()=>copy(items));near(type==='linkBar'?snapped[0].x2:snapped[0].x,650);near(type==='linkBar'?snapped[0].y2:snapped[0].y,400);
  assert(await p.evaluate(()=>geometricSnap(geometricPoints(items[1])[0],items[1].id).kind==='endpoint'));
  await p.evaluate(()=>{snapEnabled=false;selected=items[0].id;render()});const targetBefore=await p.evaluate(()=>copy(items[1]));const from=await center('[data-move-anchor]');await gesture(from,{x:from.x+30,y:from.y+20});assert.deepEqual(await p.evaluate(()=>items[1]),targetBefore);
  assert(await p.evaluate(()=>{const originals=copy(items),out=deformJoint(items,{x:items[0].x,y:items[0].y},{x:400,y:500},new Map());return JSON.stringify(out)===JSON.stringify(originals)}));
  await seed();assert(await p.evaluate(()=>{snapEnabled=true;const o=items[0];return geometricSnap({x:o.x,y:o.y},o.id)===null&&geometricPoints(o).length===(o.type==='linkBar'?2:1)}));
  // Body snapping uses the model's points, not the pointer's offset within the hit area.
  await seed();await p.evaluate(()=>{snapEnabled=true;items.push(make('hinge',620,440));render()});const body=await screen(type==='linkBar'?{x:350,y:300}:{x:304,y:304}),offset=type==='linkBar'?{x:170,y:140}:{x:320,y:140};await gesture(body,await screen(type==='linkBar'?{x:470,y:440}:{x:624,y:444}));
  assert(await p.evaluate(()=>geometricPoints(items[0]).some(q=>Math.hypot(q.x-620,q.y-440)<1e-6)));
  await seed();await p.evaluate(()=>{items[0].strokeColor='#1976d2';render()});
  const model=await p.evaluate(()=>copy(items[0]));assert(await p.evaluate(()=>JSON.stringify(validate(JSON.parse(documentText())))===JSON.stringify(items)));
  assert(await p.evaluate(()=>{const old=make('bar',100,100,200,100);return validate({format:'ket-cau-studio',version:1,items:[old]})[0].type==='bar'}));
  assert(await p.evaluate(()=>{const o=items[0];try{validate({format:'ket-cau-studio',version:1,items:[{...o,strokeColor:'red'}]});return false}catch{return true}}));
  assert(await p.evaluate(()=>{const o=items[0];return [NaN,Infinity,10001].every(x=>{try{validate({format:'ket-cau-studio',version:1,items:[{...o,x}]});return false}catch{return true}})}));
  if(type==='linkBar')assert(await p.evaluate(()=>{const o=items[0];try{validate({format:'ket-cau-studio',version:1,items:[{...o,x2:o.x+.5,y2:o.y}]});return false}catch{return true}}));
  assert(await p.evaluate(()=>{const o=items[0];for(const [a,b]of [[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:0,y:1}],[{x:20,y:30},{x:120,y:80}]]){const m=mirroredObjects([o],a,b)[0],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;for(const [q,r]of geometricPoints(o).map((q,i)=>[q,geometricPoints(m)[i]])){const t=((q.x-a.x)*dx+(q.y-a.y)*dy)/l;if(Math.hypot(r.x-(2*(a.x+t*dx)-q.x),r.y-(2*(a.y+t*dy)-q.y))>1e-7)return false}}return true}));
  await p.evaluate(()=>{selected=items[0].id;copySelection();objectClipboard=copy(pendingCopy);clipboardBase={x:0,y:0};placeClipboard({x:80,y:50})});const cloned=await p.evaluate(()=>copy(items[1]));near(cloned.x,model.x+80);if(type==='linkBar'){near(length(cloned),length(model));near(cloned.x2,model.x2+80)}assert.equal(cloned.strokeColor,model.strokeColor);
  assert(await p.evaluate(()=>{const d=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');return !d.querySelector('[data-hit-area],[data-endpoint],[data-move-anchor]')}));
  const geometry=await p.evaluate(()=>{render();const g=svg.querySelector(`[data-id="${items[0].id}"]`);return {circles:[...g.querySelectorAll(':scope > circle')].map(c=>[c.getAttribute('r'),c.getAttribute('fill')]),square:g.querySelector(':scope > rect[stroke="none"]')?.outerHTML}});
  if(type==='linkBar')assert.deepEqual(geometry.circles,[['6','white'],['6','white']]);else assert.match(geometry.square,/width="12" height="12" fill="#1976d2"/);
  await p.evaluate(()=>{items=items.slice(0,1);selected=items[0].id;render();window.output=null;download=async blob=>{const im=await createImageBitmap(blob),c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);window.output=[...ctx.getImageData(items[0].type==='linkBar'?400*3:300*3,300*3,1,1).data];im.close()}});await p.locator('#png').click();await p.waitForFunction(()=>output);assert.deepEqual(await p.evaluate(()=>output),[25,118,210,255]);
  if(type==='linkBar'){
   await p.evaluate(()=>{snapEnabled=false;selected=items[0].id;render()});await gesture(await center('[data-endpoint="end"]'),await screen({x:600,y:450}));
   await p.evaluate(()=>{window.output=null;download=async blob=>{const im=await createImageBitmap(blob),c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);window.output=[...ctx.getImageData(450*3,375*3,1,1).data];im.close()}});
   await p.locator('#png').click();await p.waitForFunction(()=>output);assert.deepEqual(await p.evaluate(()=>output),[25,118,210,255]);
   assert(await p.evaluate(()=>{const doc=new DOMParser().parseFromString(exportSVG(),'image/svg+xml'),line=doc.querySelector('[data-id] line');return Math.abs(Number(line.getAttribute('x2'))-600)<.001&&Math.abs(Number(line.getAttribute('y2'))-450)<.001}));
   await p.evaluate(()=>{copySelection();objectClipboard=copy(pendingCopy);clipboardBase={x:0,y:0};placeClipboard({x:20,y:30})});assert(await p.evaluate(()=>Math.abs(Math.hypot(items[0].x2-items[0].x,items[0].y2-items[0].y)-Math.hypot(items[1].x2-items[1].x,items[1].y2-items[1].y))<1e-8));
  }
  const beforeDelete=await p.evaluate(()=>copy(items));await p.keyboard.press('Delete');assert.equal(await p.evaluate(()=>items.length),beforeDelete.length-1);await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>items),beforeDelete);
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${type} ${touch?'touch':'mouse'}: creation/edit/move/snap, cancel/pinch/history, color, copy/mirror/JSON/SVG/PNG`);
 }
 }finally{await browser.close()}
}
module.exports=run;if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
