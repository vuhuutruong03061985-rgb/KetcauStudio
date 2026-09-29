const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<1e-3,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 const reset=()=>p.evaluate(()=>{setMode('select');snapEnabled=false;items=[make('rigidRegion',300,300,undefined,undefined,{...rigidDefaults,points:[{x:0,y:0},{x:160,y:0},{x:80,y:120}],strokeColor:'#123456'})];selected=items[0].id;past=[];future=[];render();return copy(items[0])});
 const screen=(q)=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
 async function dragHandle(selector,target,cancel=false){const b=await p.locator(selector).boundingBox(),q=await screen(target);await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(q.x,q.y,{steps:5});if(cancel)await p.keyboard.press('Escape');await p.mouse.up()}
 const original=await reset();assert.deepEqual(await p.evaluate(()=>({x:rigidPivot.x,y:rigidPivot.y})),{x:380,y:340});
 await dragHandle('[data-rigid-action="pivot"]',{x:240,y:240});assert.deepEqual(await p.evaluate(()=>copy(items[0])),original);assert.equal(await p.evaluate(()=>past.length),0);
 const pivot=await p.evaluate(()=>copy(rigidPivot));near(pivot.x,240);near(pivot.y,240);
 const handle=await p.locator('[data-rigid-action="rotate"]').boundingBox(),start=await p.evaluate(b=>{const q=new DOMPoint(b.x+b.width/2,b.y+b.height/2).matrixTransform(svg.getScreenCTM().inverse());return {x:q.x,y:q.y}},handle);
 const dest={x:pivot.x-(start.y-pivot.y),y:pivot.y+(start.x-pivot.x)};await dragHandle('[data-rigid-action="rotate"]',dest);
 const rotated=await p.evaluate(()=>copy(items[0]));near(rotated.rigidAngle,90);near(rotated.x,180);near(rotated.y,300);assert.deepEqual(rotated.points,original.points);assert.equal(await p.evaluate(()=>past.length),1);
 assert.deepEqual(await p.evaluate(()=>rigidPivot),pivot);
 await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items[0])),original);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>copy(items[0])),rotated);
 await p.evaluate(()=>{selected=items[0].id;render()});await dragHandle('[data-rigid-action="rotate"]',{x:600,y:500},true);assert.deepEqual(await p.evaluate(()=>copy(items[0])),rotated);
 // Same source snapshot each time; world/local inversion and arbitrary-axis mirror.
 assert(await p.evaluate(()=>{const o=items[0],c={x:72,y:81},once=rotatedRigid(o,c,.7);for(let i=0;i<100;i++)if(JSON.stringify(rotatedRigid(o,c,.7))!==JSON.stringify(once))return false;return o.points.every(q=>{const r=rigidLocal(o,rigidWorld(o,q));return Math.hypot(r.x-q.x,r.y-q.y)<1e-8})}));
 assert(await p.evaluate(()=>{const o=items[0],a={x:20,y:40},b={x:120,y:90},m=mirroredObjects([o],a,b)[0],u={x:b.x-a.x,y:b.y-a.y},l=u.x*u.x+u.y*u.y;return o.points.every((q,i)=>{const w=rigidWorld(o,q),t=((w.x-a.x)*u.x+(w.y-a.y)*u.y)/l,r=rigidWorld(m,m.points[i]);return Math.hypot(r.x-(2*(a.x+t*u.x)-w.x),r.y-(2*(a.y+t*u.y)-w.y))<1e-7})}));
 await reset();await p.evaluate(()=>{snapEnabled=true;items.push(make('hinge',600,400));render()});
 await dragHandle('[data-rigid-point="1"]',{x:601,y:400});assert.deepEqual(await p.evaluate(()=>rigidWorld(items[0],items[0].points[1])),{x:600,y:400});assert.equal(await p.evaluate(()=>past.length),1);
 await dragHandle('[data-rigid-action="pivot"]',{x:601,y:400});near((await p.evaluate(()=>rigidPivot)).x,600);assert.equal(await p.evaluate(()=>past.length),1);
 const results=await p.evaluate(()=>{
  const o=items[0];items=[o,make('support',700,450),make('bar',500,200,700,200),make('rigidRegion',800,300,undefined,undefined,{...rigidDefaults,rigidAngle:90,points:[{x:0,y:0},{x:100,y:0},{x:50,y:80}]})];
  const endpoint=endpointSnap({x:800,y:400},o.id),support=endpointSnap({x:700,y:450},o.id),self=endpointSnap(rigidWorld(o,o.points[0]),o.id);
  snapOptions.tangent=true;const line=tangentSnap({x:610,y:202},o.id),priority=geometricSnap({x:501,y:201},o.id);
  items=[make('curve',100,100,undefined,undefined,{curvePoints:[{x:100,y:-50},{x:200,y:0}]})];const curve=tangentSnap({x:200,y:52});
  items=[o];const own=tangentSnap(rigidWorld(o,o.points[0]),o.id),far=tangentSnap({x:-5000,y:-5000});
  const controls=rigidSegments(o.points)[0].map(q=>rigidWorld(o,q)),t=.37,at=(k)=>(1-t)**3*controls[0][k]+3*(1-t)**2*t*controls[1][k]+3*(1-t)*t*t*controls[2][k]+t**3*controls[3][k],c=cubicContact({x:at('x'),y:at('y')},controls);
  const r={endpoint,support,self,line,priority,curve,own,far,c};
  items=[o,make('thin',200,550,800,550)];const moved=translatedRigid(o,{x:0,y:249});r.moved=moved;r.source=copy(o);return r;
 });
 assert.deepEqual(results.endpoint,{x:800,y:400});assert.deepEqual(results.support,{x:700,y:450});assert.equal(results.self,null);near(results.line.point.y,200);near(results.line.tangent.x,1);assert.equal(results.priority.kind,'endpoint');near(results.curve.point.y,50);near(results.curve.tangent.y,0);assert.equal(results.own,null);assert.equal(results.far,null);near(results.c.distance,0);assert.deepEqual(results.moved.points,results.source.points);assert.equal(results.moved.rigidAngle,results.source.rigidAngle);
 await reset();await p.evaluate(()=>{items[0].rigidAngle=35;selected=items[0].id;render()});
 assert(await p.evaluate(()=>{const data=JSON.parse(documentText());return validate(data)[0].rigidAngle===35&&exportSVG().includes('rotate(35)')&&!/data-rigid-action|data-rigid-point|data-rigid-snap/.test(exportSVG())}));
 assert(await p.evaluate(()=>{const o=copy(items[0]);o.rigidAngle=Infinity;try{validateRigidRegion(o);return false}catch{return true}}));

 // Complete the partial test with explicit invariants and gesture lifecycle checks.
 assert(await p.evaluate(()=>{
  const original=items[0];
  for(const angle of [0,90,180,37,-35]){const o={...original,rigidAngle:angle};
   for(const q of o.points){const w=rigidWorld(o,q),back=rigidLocal(o,w);if(Math.hypot(back.x-q.x,back.y-q.y)>1e-8)return false}
   const a=rigidWorld(o,o.points[0]),b=rigidWorld(o,o.points[1]);if(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(o.points[0].x-o.points[1].x,o.points[0].y-o.points[1].y))>1e-8)return false;
   const pivot={x:245,y:275},next=rotatedRigid(o,pivot,.73),fixed=rigidWorld(next,rigidLocal(o,pivot));if(Math.hypot(fixed.x-pivot.x,fixed.y-pivot.y)>1e-8)return false;
   for(const [a,b]of [[{x:0,y:0},{x:100,y:0}],[{x:0,y:0},{x:0,y:100}],[{x:10,y:20},{x:120,y:70}]]){
    const m=mirroredObjects([o],a,b)[0],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
    for(let i=0;i<o.points.length;i++){const w=rigidWorld(o,o.points[i]),t=((w.x-a.x)*dx+(w.y-a.y)*dy)/l,r=rigidWorld(m,m.points[i]);if(Math.hypot(r.x-(2*(a.x+t*dx)-w.x),r.y-(2*(a.y+t*dy)-w.y))>1e-7)return false}
   }
  }return true;
 }));
 await reset();await p.evaluate(()=>{snapEnabled=true;for(const k in snapOptions)snapOptions[k]=k==='endpoint';render()});
 const pivotModel=await p.evaluate(()=>copy(items));await dragHandle('[data-rigid-action="pivot"]',{x:301,y:300});
 near((await p.evaluate(()=>rigidPivot)).x,300);near((await p.evaluate(()=>rigidPivot)).y,300);assert.deepEqual(await p.evaluate(()=>copy(items)),pivotModel);assert.equal(await p.evaluate(()=>past.length),0);
 assert.equal(await p.locator('[data-rigid-snap]').count(),0);
 // Own control points are valid only for pivot placement, never normal point/move snapping.
 assert(await p.evaluate(()=>{const o=items[0],q=rigidWorld(o,o.points[0]);return geometricSnap(q,o.id)===null&&geometricSnap(q,null).kind==='endpoint'}));
 await p.evaluate(()=>{items[0].rigidAngle=90;items.push(make('support',600,400));render()});
 await dragHandle('[data-rigid-point="1"]',{x:601,y:400});
 const local=await p.evaluate(()=>({world:rigidWorld(items[0],items[0].points[1]),angle:items[0].rigidAngle}));near(local.world.x,600);near(local.world.y,400);assert.equal(local.angle,90);
 assert.equal(await p.locator('[data-rigid-snap]').count(),0);
 const snapping=await p.evaluate(()=>{
  const o=make('rigidRegion',300,300,undefined,undefined,{...rigidDefaults,rigidAngle:0,points:[{x:0,y:0},{x:160,y:0},{x:80,y:120}]});items=[o];
  const off=()=>{for(const k in snapOptions)snapOptions[k]=false};off();snapEnabled=true;
  snapOptions.tangent=false;items.push(make('thin',200,350,900,350));const disabled=tangentSnap({x:500,y:351});
  snapOptions.tangent=true;const straight=tangentSnap({x:500,y:351}),outside=tangentSnap({x:500,y:1000}),self=tangentSnap(rigidWorld(o,o.points[1]),o.id);
  off();snapOptions.endpoint=true;items=[o,make('hinge',320,310),make('support',472,310)];const moved=translatedRigid(o,{x:10,y:10}),hint=copy(rigidSnapHint);
  const excluded=endpointSnap({x:300,y:300},o.id);snapEnabled=false;const free=translatedRigid(o,{x:10,y:10});snapEnabled=true;
  off();items=[o];const gridMove=translatedRigid(o,{x:9,y:7});const hiddenGrid=translatedRigid(o,{x:9,y:7});
  off();snapOptions.endpoint=true;snapOptions.tangent=true;items=[o,make('hinge',315,310),make('thin',100,430,900,430)];const priority=translatedRigid(o,{x:10,y:10}),priorityKind=rigidSnapHint.kind;
  return {disabled,straight,outside,self,moved,hint,excluded,free,gridMove,hiddenGrid,priority,priorityKind,source:copy(o)};
 });
 assert.equal(snapping.disabled,null);near(snapping.straight.point.y,350);assert(Number.isFinite(snapping.straight.tangent.x));assert.equal(snapping.outside,null);assert.equal(snapping.self,null);
 near(snapping.moved.x,312);near(snapping.moved.y,310);near(snapping.hint.source.x,470);assert.equal(snapping.excluded,null);
 assert.deepEqual(snapping.moved.points,snapping.source.points);assert.equal(snapping.moved.rigidAngle,0);near(snapping.free.x,310);near(snapping.gridMove.x,309);near(snapping.gridMove.y,307);near(snapping.hiddenGrid.x,309);
 assert.equal(snapping.priorityKind,'endpoint');near(snapping.priority.x,315);
 // Cubic boundary contact is on the rendered spline, with finite derivative direction.
 assert(await p.evaluate(()=>{
  snapEnabled=true;snapOptions.tangent=true;const o={...items[0],rigidAngle:37};items=[o];
  const c=rigidSegments(o.points)[1].map(q=>rigidWorld(o,q)),t=.43,at=k=>(1-t)**3*c[0][k]+3*(1-t)**2*t*c[1][k]+3*(1-t)*t*t*c[2][k]+t**3*c[3][k],point={x:at('x'),y:at('y')};
  const hit=tangentSnap(point);return hit&&Math.hypot(hit.point.x-point.x,hit.point.y-point.y)<1e-6&&Number.isFinite(hit.tangent.x)&&Number.isFinite(hit.tangent.y)&&tangentSnap(point,o.id)===null;
 }));
 // Whole-object dragging ignores legacy grid, records one undo, then clears feedback.
 await reset();await p.evaluate(()=>{snapEnabled=true;for(const k in snapOptions)snapOptions[k]=false;render()});
 const source=await p.evaluate(()=>copy(items[0]));
 const beginMove=async()=>{const b=await p.locator('[data-move-anchor]').boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();return b};
 let move=await beginMove();await p.mouse.move(move.x+move.width/2+25,move.y+move.height/2+20,{steps:4});await p.mouse.up();
 const moved=await p.evaluate(()=>copy(items[0]));assert.deepEqual(moved.points,source.points);assert.equal(moved.rigidAngle,source.rigidAngle);assert.equal(await p.evaluate(()=>past.length),1);assert.equal(await p.locator('[data-rigid-snap]').count(),0);
 const scale=await p.evaluate(()=>Math.abs(svg.getScreenCTM().a));near(moved.x,source.x+25/scale);near(moved.y,source.y+20/scale);
 await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items[0])),source);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>copy(items[0])),moved);
 // Switching mode and pointercancel roll back a whole move, without a new undo.
 for(const cancel of ['mode','pointercancel','escape']){
  const beforeCancel=await reset();move=await beginMove();await p.mouse.move(move.x+move.width/2+50,move.y+move.height/2+30);
  if(cancel==='mode')await p.evaluate(()=>setMode('bar'));
  else if(cancel==='escape')await p.keyboard.press('Escape');
  else await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse'})));
  await p.mouse.up();assert.deepEqual(await p.evaluate(()=>copy(items[0])),beforeCancel);assert.equal(await p.evaluate(()=>past.length),0);assert(await p.evaluate(()=>drag===null&&rigidDrag===null&&rigidSnapHint===null));
 }
 // Snapshot-based rotation, return-to-origin, pointercancel and mode cleanup.
 for(const cancel of ['pointercancel','mode']){
  const beforeCancel=await reset();const b=await p.locator('[data-rigid-action="rotate"]').boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x+b.width/2-80,b.y+b.height/2+80,{steps:6});
  if(cancel==='mode')await p.evaluate(()=>setMode('bar'));else await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:rigidDrag.pointerId,pointerType:'mouse'})));
  await p.mouse.up();assert.deepEqual(await p.evaluate(()=>copy(items[0])),beforeCancel);assert.equal(await p.evaluate(()=>past.length),0);
 }
 // Old JSON defaults, angle safety and copy/paste retain local points and style.
 await reset();assert(await p.evaluate(()=>{const d=JSON.parse(documentText());return d.version===1&&validate(d)[0].rigidAngle===undefined}));
 assert(await p.evaluate(()=>[NaN,Infinity,'90',361].every(rigidAngle=>{try{validateRigidRegion({...items[0],rigidAngle});return false}catch{return true}})));
 await p.evaluate(()=>{items[0].rigidAngle=37;render();copySelection();objectClipboard=copy(pendingCopy);clipboardBase={x:0,y:0};placeClipboard({x:200,y:100})});
 assert(await p.evaluate(()=>items[1].rigidAngle===37&&items[1].x===items[0].x+200&&items[1].y===items[0].y+100&&JSON.stringify(items[1].points)===JSON.stringify(items[0].points)&&items[1].strokeColor===items[0].strokeColor));
 // Existing SVG -> PNG action: a rotated filled region covers a known interior pixel.
 await p.evaluate(()=>{items=[make('rigidRegion',500,300,undefined,undefined,{...rigidDefaults,points:[{x:0,y:0},{x:160,y:0},{x:80,y:120}],rigidAngle:90,fillMode:'color',fillColor:'#1976d2',fillOpacity:1})];selected=items[0].id;render();window.rigidPNG=null;download=async(blob)=>{const image=await createImageBitmap(blob),c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);window.rigidPNG={w:c.width,h:c.height,pixel:[...ctx.getImageData(460*3,380*3,1,1).data]};image.close()}});
 await p.locator('#png').click();await p.waitForFunction(()=>rigidPNG);assert.deepEqual(await p.evaluate(()=>rigidPNG),{w:3300,h:2160,pixel:[25,118,210,255]});
 assert.deepEqual(errors,[]);console.log('PASS rigid transform/snap: angles, arbitrary/own pivot, point/whole/contact priority and no grid fallback, mirror axes, gesture undo/cancel/mode cleanup, JSON/copy and rotated SVG/PNG');


 const context=await browser.newContext({viewport:{width:1280,height:1100},hasTouch:true,isMobile:true}),tab=await context.newPage();tab.on('pageerror',e=>errors.push(e.message));
 await tab.goto(pathToFileURL(path.resolve('index.html')).href);await tab.waitForFunction(()=>items.length>0);
 assert.equal(await tab.evaluate(()=>snapOptions.tangent),false);
 await tab.evaluate(()=>{document.getElementById('snapSettings').open=true;positionSnapChoices()});await tab.locator('#snap-tangent').tap();assert.equal(await tab.evaluate(()=>snapOptions.tangent),true);
 await tab.reload();await tab.waitForFunction(()=>items.length>0);assert.equal(await tab.evaluate(()=>snapOptions.tangent),true);
 const cdp=await context.newCDPSession(tab),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,p])=>({id,x:p.x,y:p.y,radiusX:4,radiusY:4}))});
 const touchReset=()=>tab.evaluate(()=>{cancelRigidDrag();camera={x:0,y:0,w:1100,h:720};applyCamera();setMode('select');snapEnabled=false;items=[make('rigidRegion',300,300,undefined,undefined,{...rigidDefaults,points:[{x:0,y:0},{x:160,y:0},{x:80,y:120}],rigidAngle:25})];selected=items[0].id;past=[];future=[];render();return {items:copy(items),pivot:copy(rigidPivot)}});
 const center=async selector=>{const r=await tab.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2}};
 for(const [kind,selector]of [['rotate','[data-rigid-action="rotate"]'],['pivot','[data-rigid-action="pivot"]'],['point','[data-rigid-point="1"]'],['move','[data-move-anchor]']]){
  // One completed real touch gesture: preserve local shape for rigid movement/rotation.
  let before=await touchReset(),a=await center(selector),b={x:a.x+35,y:a.y+55};await touch('touchStart',[[0,a]]);await touch('touchMove',[[0,b]]);await touch('touchEnd',[]);
  let after=await tab.evaluate(()=>({items:copy(items),pivot:copy(rigidPivot),past:past.length,active:!!rigidDrag||!!drag,hint:rigidSnapHint}));
  assert.equal(after.past,kind==='pivot'?0:1,JSON.stringify({kind,after,a,b}));assert.equal(after.active,false);assert.equal(after.hint,null);
  if(kind==='pivot'){assert.deepEqual(after.items,before.items);assert.notDeepEqual(after.pivot,before.pivot)}
  else{assert.notDeepEqual(after.items,before.items);if(kind!=='point')assert.deepEqual(after.items[0].points,before.items[0].points);if(kind!=='rotate')assert.equal(after.items[0].rigidAngle,25);await tab.evaluate(()=>actions.undo[1]());assert.deepEqual(await tab.evaluate(()=>copy(items)),before.items)}
  // Platform pointercancel and transition to pinch both restore the gesture-start snapshot.
  for(const cancel of ['cancel','pinch']){
   before=await touchReset();a=await center(selector);b={x:a.x+35,y:a.y+55};await touch('touchStart',[[0,a]]);await touch('touchMove',[[0,b]]);
   if(cancel==='cancel')await touch('touchCancel',[]);
   else{const second={x:b.x+90,y:b.y};await touch('touchStart',[[0,b],[1,second]]);await touch('touchMove',[[0,{x:b.x-15,y:b.y}],[1,{x:second.x+15,y:second.y}]]);await touch('touchEnd',[])}
   assert.deepEqual(await tab.evaluate(()=>copy(items)),before.items);assert.deepEqual(await tab.evaluate(()=>copy(rigidPivot)),before.pivot);assert(await tab.evaluate(()=>past.length===0&&rigidDrag===null&&drag===null&&rigidSnapHint===null&&contacts.size===0));
  }
 }
 assert.deepEqual(errors,[]);await context.close();console.log('PASS emulated touch rotate/pivot/point/move, one undo, pointercancel/pinch rollback, tangent toggle persistence (physical Android pending)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
