'use strict';
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('../.test-tools/node_modules/playwright');
const near=(a,b,eps=1e-6)=>assert(Math.abs(a-b)<=eps,`${a} != ${b}`);
(async()=>{const out=path.resolve(process.env.XLINE_OUTPUT||'.test-tools/xline-regression-'+Date.now());fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'msedge',headless:true});let drawingCases=0;
try{
 const geometry=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];geometry.on('pageerror',e=>errors.push(e.message));await geometry.goto(pathToFileURL(path.resolve('index.html')).href);await geometry.waitForFunction(()=>typeof clipXLine==='function');
 const results=await geometry.evaluate(()=>{
  const b={left:0,top:0,right:100,bottom:100},cases=[[10,20,30,20],[25,10,25,40],[0,0,10,10],[50,0,50+1e-8,100],[200,0,200,100],[0,0,0,0]];
  const clips=cases.map(p=>clipXLine({x:p[0],y:p[1],x2:p[2],y2:p[3]},b));
  const a={x:0,y:20,x2:10,y2:20};
  return {clips,cross:xlineIntersection(a,{x:50,y:0,x2:50,y2:10}),bar:xlineIntersection(a,{x:50,y:0,x2:50,y2:10},true),barInside:xlineIntersection(a,{x:50,y:0,x2:50,y2:40},true),parallel:xlineIntersection(a,{x:0,y:40,x2:100,y2:40}),coincident:xlineIntersection(a,{x:100,y:20,x2:200,y2:20}),degenerate:xlineIntersection(a,{x:0,y:0,x2:0,y2:0})};
 });
 assert.deepEqual(results.clips[0],[{x:0,y:20},{x:100,y:20}]);assert.deepEqual(results.clips[1],[{x:25,y:0},{x:25,y:100}]);assert.deepEqual(results.clips[2],[{x:0,y:0},{x:100,y:100}]);near(results.clips[3][0].y,0);near(results.clips[3][1].y,100);assert.equal(results.clips[4],null);assert.equal(results.clips[5],null);assert.deepEqual(results.cross,{x:50,y:20});assert.equal(results.bar,null);assert.deepEqual(results.barInside,{x:50,y:20});for(const k of ['parallel','coincident','degenerate'])assert.equal(results[k],null);
 const validation=await geometry.evaluate(()=>{
  const valid=make('xline',10,20,30,40,{id:'XL'}),doc={format:'ket-cau-studio',version:1,items:[valid]};
  const variants=[{...valid,x2:10,y2:20},{...valid,x:NaN},{...valid,y:Infinity},{...valid,x2:10001},{...valid,x2:undefined},{...valid,pivot:{along:0,normal:0}},{...valid,thinOffset:{}},{...valid,support:'pin'}];
  return {valid,accepted:validate(doc),rejected:variants.map(o=>{try{validate({...doc,items:[o]});return false}catch{return true}}),old:validate({...doc,items:[make('bar',0,0,100,0)]}).length};
 });assert.deepEqual(Object.keys(validation.valid).sort(),['id','type','x','x2','y','y2']);assert(validation.rejected.every(Boolean));assert.equal(validation.old,1);assert.deepEqual(validation.accepted,[validation.valid]);
 // Infinite intersections enter existing acquisition; defining points are not endpoints.
 const snaps=await geometry.evaluate(()=>{
  items=[make('xline',10,20,30,20,{id:'A'}),make('xline',50,0,50,10,{id:'B'})];snapEnabled=true;for(const k in snapOptions)snapOptions[k]=k==='intersection'||k==='endpoint';xlinesVisible=true;
  const crossing=geometricSnap({x:51,y:21}),far=geometricSnap({x:200,y:200}),fakeEnd=endpointSnap({x:10,y:20});
  items=[items[0],make('bar',50,0,50,10,{id:'bar'})];const extension=geometricSnap({x:50,y:20});
  items[1]=make('bar',50,-200,50,200,{id:'bar'});const finite=geometricSnap({x:51,y:21});
  items.push(make('bar',52,22,70,60,{id:'near-end'}));const endpoint=geometricSnap({x:52,y:22});
  items=items.filter(o=>o.id!=='near-end');xlinesVisible=false;const hidden=geometricSnap({x:51,y:21});xlinesVisible=true;
  const old=xlineIntersection;let calls=0;xlineIntersection=(...args)=>{calls++;return old(...args)};
  for(let i=0;i<100;i++)items.push(make('xline',0,1000+i,100,1000+i,{id:'far'+i}));xlineIntersectionSnap({x:50,y:20});xlineIntersection=old;
  return {crossing,far,fakeEnd,extension,finite,endpoint,hidden,calls};
 });assert.equal(snaps.crossing.kind,'intersection');assert.deepEqual(snaps.crossing.point,{x:50,y:20});assert.equal(snaps.far,null);assert.equal(snaps.fakeEnd,null);assert.notEqual(snaps.extension?.kind,'intersection');assert.equal(snaps.finite.kind,'intersection');assert.equal(snaps.endpoint.kind,'endpoint');assert.notEqual(snaps.hidden?.kind,'intersection');assert(snaps.calls<=1,'distant lines must not enter pair search');
 await geometry.evaluate(()=>{items=[make('bar',200,300,600,300),make('xline',10,20,30,20,{id:'XL'})];past=[];future=[];setMode('select');xlinesVisible=true;render()});
 const before=await geometry.evaluate(()=>({json:documentText(),scales:[geometryScale,internalForceScale],bounds:getDrawingVisualBounds(),clip:clipXLine(items[1],xlineViewBounds())}));
 for(const camera of [{x:200,y:100,w:550,h:360},{x:-500,y:-400,w:2200,h:1440},{x:0,y:500,w:1100,h:720},{x:0,y:0,w:1100,h:720}]){
  const state=await geometry.evaluate(c=>{camera=c;applyCamera();const o=items[1],node=svg.querySelector('[data-id="XL"] [data-xline-stroke]');return {clip:clipXLine(o,xlineViewBounds()),line:node&&['x1','y1','x2','y2'].map(k=>Number(node.getAttribute(k))),json:documentText()}},camera);assert.equal(state.json,before.json);if(state.clip)for(const [i,v]of [state.clip[0].x,state.clip[0].y,state.clip[1].x,state.clip[1].y].entries())near(state.line[i],v);else assert.equal(state.line,null);
 }
 for(const viewport of [{width:800,height:1280},{width:1280,height:800}]){
  await geometry.setViewportSize(viewport);await geometry.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const r=await geometry.evaluate(()=>({expected:clipXLine(items[1],xlineViewBounds()).flatMap(p=>[p.x,p.y]),actual:[...svg.querySelector('[data-id="XL"] [data-xline-stroke]').attributes].filter(a=>['x1','y1','x2','y2'].includes(a.name)).map(a=>Number(a.value)),json:documentText()}));
  r.actual.forEach((n,i)=>near(n,r.expected[i]));assert.equal(r.json,before.json);
 }
 const exportState=await geometry.evaluate(()=>{const svgText=exportSVG(),bounds=getDrawingVisualBounds(),json=documentText(),history=past.length;document.querySelector('#xlineVisibility').click();const hidden={count:svg.querySelectorAll('[data-xline]').length,json:documentText(),history:past.length};document.querySelector('#xlineVisibility').click();return {svgText,bounds,json,history,hidden,visible:svg.querySelectorAll('[data-xline]').length}});
 assert(!exportState.svgText.includes('data-xline'));assert.deepEqual(exportState.bounds,before.bounds);assert.equal(exportState.hidden.count,0);assert.equal(exportState.hidden.json,exportState.json);assert.equal(exportState.hidden.history,exportState.history);assert.equal(exportState.visible,1);assert.deepEqual(errors,[]);await geometry.close();
 for(const pointer of ['mouse','pen','touch'])for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){
  const p=await browser.newPage({viewport,hasTouch:pointer!=='mouse',isMobile:pointer!=='mouse'}),pageErrors=[];p.on('pageerror',e=>pageErrors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof handleXLinePlacement==='function');const cdp=await p.context().newCDPSession(p),tablet=pointer!=='mouse';await p.evaluate(()=>{window.xlineEvents=[];for(const t of ['click','pointerdown','pointerup','pointercancel'])window.addEventListener(t,e=>xlineEvents.push({type:t,pointer:e.pointerType,target:e.target.outerHTML?.slice(0,100)}),true)});
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const send=async(type,q)=>{if(pointer==='mouse'){await p.mouse.move(q.x,q.y);if(type==='down')await p.mouse.down();if(type==='up')await p.mouse.up()}else if(pointer==='touch'&&type==='move')await p.locator('#drawing').dispatchEvent('pointermove',{...q,pointerType:'touch',pointerId:1});else if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[type],touchPoints:['up','cancel'].includes(type)?[]:[{...q,id:1}]});else await cdp.send('Input.dispatchMouseEvent',{type:{down:'mousePressed',move:'mouseMoved',up:'mouseReleased'}[type],...q,pointerType:'pen',button:type==='move'?'none':'left',buttons:type==='down'?1:0,clickCount:type==='move'?0:1});await settle()};
  const at=q=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
  const pick=async q=>{q=await at(q);await send('down',q);if(pointer==='touch'&&await p.evaluate(()=>mode==='xline'))await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:q.x+30,y:q.y+20,id:1}]});await send('up',q)};
  const tap=async selector=>{const r=await p.locator(selector).boundingBox();assert(r,selector);await send('down',{x:r.x+r.width/2,y:r.y+r.height/2});await send('up',{x:r.x+r.width/2,y:r.y+r.height/2})};
  const state=()=>p.evaluate(()=>({mode,first:xlineFirst&&{...xlineFirst},hover:xlineHover&&{...xlineHover},pending:penConnectionPlacement&&{type:penConnectionPlacement.type,point:{...penConnectionPlacement.lockedCandidate}},items:copy(items),history:past.length,primary:document.body.dataset.radialPrimary}));
  const noNumeric=async()=>{assert(await p.locator('#tabletNumericKeypad').isHidden());assert(await p.locator('#dynamicInput').isHidden());assert.equal(await p.locator('#penConnectionBubble').count(),1);if(tablet)assert.equal((await state()).primary,'true')};
  await p.evaluate(()=>{cancelToSelection();items=[];past=[];future=[];snapEnabled=false;setMode('xline')});if(pointer==='mouse')await p.locator('button[data-mode=xline]').click();await noNumeric();await p.keyboard.press('Escape');assert.equal((await state()).mode,'select');await p.evaluate(()=>setMode('xline'));
  if(tablet){
   await pick({x:300,y:300});assert.equal((await state()).first,null);assert.equal((await state()).history,0);const pending=(await state()).pending;await send('move',await at({x:500,y:500}));assert.deepEqual((await state()).pending,pending);await tap('[data-pen-connection-action=cancel]');if((await state()).pending)console.log(pointer,await p.evaluate(()=>({events:xlineEvents.slice(-12),contacts:[...contacts],gesture,blocked:!!penConnectionPlacementBlocked({}),bubble:penConnectionBubble.getBoundingClientRect().toJSON()})));assert.equal((await state()).first,null);assert.equal((await state()).pending,null);
  }
  // Observe every Bubble style/class change, including a transient show that a
  // post-click assertion alone could miss. Mouse must never enter that workflow.
  if(!tablet)await p.evaluate(()=>{window.mouseBubbleShows=[];const bubble=document.querySelector('#penConnectionBubble');window.mouseBubbleObserver=new MutationObserver(records=>{for(const record of records)if(record.attributeName==='style'&&record.oldValue&&!/display:\s*none/.test(record.oldValue))mouseBubbleShows.push(record.oldValue);if(getComputedStyle(bubble).display!=='none')mouseBubbleShows.push(bubble.getAttribute('style'))});mouseBubbleObserver.observe(bubble,{attributes:true,attributeOldValue:true,attributeFilter:['style','class']})});
  for(const [a,b]of [[{x:300,y:300},{x:600,y:300}],[{x:350,y:220},{x:350,y:500}],[{x:250,y:250},{x:500,y:420}]]){
   const count=(await state()).items.length;await pick(a);if(tablet){assert.equal((await state()).items.length,count);await tap('[data-pen-connection-action=confirm]')}
   const first=(await state()).first;near(first.x,a.x,.001);near(first.y,a.y,.001);await noNumeric();
   await p.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'pen',pointerId:999})));assert.deepEqual((await state()).first,first);
   await pick(a);assert.equal((await state()).pending,null);assert.deepEqual((await state()).first,first);
   await send('move',await at(b));
   if(!tablet){assert.equal((await state()).items.length,count);assert.equal((await state()).pending,null);assert(await p.locator('#penConnectionBubble').isHidden());const preview=await p.locator('[data-xline-preview] [data-xline-stroke]').evaluate(el=>['x1','y1','x2','y2'].map(k=>Number(el.getAttribute(k))));assert(Math.hypot(preview[2]-preview[0],preview[3]-preview[1])>Math.hypot(b.x-a.x,b.y-a.y));}
   await pick(b);let expectedStroke=null;
   if(tablet){const owned=await state(),q=await at({x:650,y:550});await p.mouse.click(q.x,q.y);await settle();assert.deepEqual(await state(),owned,'Mouse cannot accept or replace a tablet-owned pending P2');assert(await p.locator('#penConnectionBubble').isVisible());}
   if(tablet){const frozen=await p.locator('[data-xline-preview]').innerHTML();await send('move',await at({x:650,y:550}));assert.equal(await p.locator('[data-xline-preview]').innerHTML(),frozen);await tap('[data-pen-connection-action=cancel]');assert.deepEqual((await state()).first,first);assert.equal((await state()).items.length,count);await pick(b);expectedStroke=await p.locator('[data-xline-preview] [data-xline-stroke]').evaluate(el=>el.outerHTML);if(count===0)await p.screenshot({path:path.join(out,pointer+'-frozen-P2-'+viewport.width+'.png')});await tap('[data-pen-connection-action=confirm]')}
   let s=await state();assert.equal(s.items.length,count+1);assert.equal(s.history,count+1);assert.equal(s.mode,'xline');assert.equal(s.first,null);assert.equal(s.pending,null);assert(await p.locator('#penConnectionBubble').isHidden());assert.equal(await p.locator('[data-xline-preview]').count(),0);await noNumeric();
   const object=s.items.at(-1);if(expectedStroke)assert.equal(await p.locator('[data-id="'+object.id+'"] [data-xline-stroke]').evaluate(el=>el.outerHTML),expectedStroke);assert.deepEqual(Object.keys(object).sort(),['id','type','x','x2','y','y2']);assert.equal(object.type,'xline');near(object.x,a.x,.001);near(object.y,a.y,.001);near(object.x2,b.x,.001);near(object.y2,b.y,.001);
   await p.evaluate(()=>{for(const type of ['mousedown','mouseup','click'])svg.dispatchEvent(new MouseEvent(type,{bubbles:true,button:0}));activatePenConnectionButton('confirm',{})});assert.equal((await state()).items.length,count+1);drawingCases++;
  }
  if(!tablet){assert.deepEqual(await p.evaluate(()=>mouseBubbleShows),[]);await p.evaluate(()=>mouseBubbleObserver.disconnect())}
  await pick({x:400,y:400});if(tablet)await tap('[data-pen-connection-action=confirm]');assert((await state()).first);await p.keyboard.press('Escape');assert.equal((await state()).mode,'select');assert.equal((await state()).first,null);assert.equal((await state()).items.length,3);
  // Pick the visible clipped line, never a defining-point/transform handle.
  const defaults=await p.evaluate(()=>props());await pick({x:700,y:300});assert.deepEqual(await p.evaluate(()=>props()),defaults);assert.equal(await p.evaluate(()=>items.find(o=>o.id===selected)?.type),'xline');assert.equal(await p.locator('[data-move-anchor],[data-endpoint],[data-bar-pivot],[data-bar-rotation-handle]').count(),0);assert.equal(await p.locator('#lineStyle').isDisabled(),true);assert.equal(await p.evaluate(()=>transformableLine(items.find(o=>o.id===selected))),false);assert.equal(await p.evaluate(()=>{const bar=make('bar',10,10,100,100);return validate({format:'ket-cau-studio',version:1,items:[bar]}).length}),1);
  const json=await p.evaluate(()=>documentText());await p.evaluate(async json=>loadDocument(new File([json],'xline.json')),json);assert.equal(await p.evaluate(()=>items.length),3);assert.equal(await p.evaluate(()=>documentText()),json);
  await pick({x:700,y:300});await p.keyboard.press('Delete');assert.equal((await state()).items.length,2);await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,3);await p.evaluate(()=>actions.redo[1]());assert.equal((await state()).items.length,2);
  if(tablet){await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close()});const hub=await p.evaluate(()=>({x:leftDrawingMenu.layout.cx+13,y:leftDrawingMenu.layout.cy}));await send('down',hub);await send('up',hub);const x=await p.evaluate(()=>{const m=leftDrawingMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id==='xline')),entry=m.layout.rings.find(x=>x.id===r.id);return entry.sectors[r.entries.findIndex(e=>e.id==='xline')].icon});await send('down',x);await send('up',x);assert.equal((await state()).mode,'xline');await noNumeric();assert(await p.evaluate(()=>rightCommandMenu.state.rings.some(r=>r.entries.some(e=>e.id==='xlineVisibility'))))}
  if(tablet){
   const beforeToggle=await p.evaluate(()=>({json:documentText(),history:past.length})),hub=await p.evaluate(()=>({x:rightCommandMenu.layout.cx-13,y:rightCommandMenu.layout.cy}));await send('down',hub);await send('up',hub);
   for(const visible of [false,true]){if(!await p.evaluate(()=>rightCommandMenu.state.open)){await send('down',hub);await send('up',hub)}const q=await p.evaluate(()=>{const m=rightCommandMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id==='xlineVisibility'));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id==='xlineVisibility')].icon});await send('down',q);await send('up',q);assert.equal(await p.evaluate(()=>xlinesVisible),visible);assert.deepEqual(await p.evaluate(()=>({json:documentText(),history:past.length})),beforeToggle)}
   await p.evaluate(()=>rightCommandMenu.close());
  }
  // Actual acquisition for Bar consumes an infinite XLine intersection; the
  // pending Bar's existing Bubble commits its point using the unchanged solver.
  await p.evaluate(()=>{cancelToSelection();items=[make('xline',100,300,200,300),make('xline',500,100,500,200)];past=[];future=[];snapEnabled=true;for(const k in snapOptions)snapOptions[k]=k==='intersection'||k==='endpoint';setMode('bar')});
  await pick({x:503,y:302});if(tablet)await tap('[data-pen-connection-action=confirm]');if(!await p.evaluate(()=>!!first))console.log('Bar snap state',pointer,viewport,await state());near(await p.evaluate(()=>first.x),500,.001);near(await p.evaluate(()=>first.y),300,.001);await p.keyboard.press('Escape');
  if(tablet){
   // An owned interruption rejects only the pending P2, never its confirmed P1.
   await p.evaluate(()=>{items=[];past=[];snapEnabled=false;setMode('xline')});await pick({x:300,y:300});await tap('[data-pen-connection-action=confirm]');const anchor=(await state()).first;
   const q=await at({x:500,y:400});await send('down',q);assert((await state()).pending);
   await p.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'pen',pointerId:999})));assert((await state()).pending);
   if(pointer==='touch')await send('cancel',q);else{await p.evaluate(()=>document.body.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'pen',pointerId:penConnectionPlacement.pointerId})));await send('up',q)}
   assert.equal((await state()).pending,null);assert.deepEqual((await state()).first,anchor);assert.equal((await state()).items.length,0);
   await pick({x:500,y:400});const transient=await p.evaluate(()=>exportSVG());assert(!transient.includes('data-xline'));assert((await state()).pending);assert.deepEqual((await state()).first,anchor);
   const r=await p.locator('[data-pen-connection-action=confirm]').boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settle();assert((await state()).pending);assert.deepEqual((await state()).first,anchor);assert.equal(await p.evaluate(()=>xlineBubbleTouch),null);assert.equal((await state()).items.length,0);
   await tap('[data-pen-connection-action=cancel]');assert.deepEqual((await state()).first,anchor);
  }
  await p.screenshot({path:path.join(out,pointer+'-'+viewport.width+'.png')});assert.deepEqual(pageErrors,[]);await p.close();
 }
 console.log('PASS XLine Phase 1: geometry/clipping/intersections/validation/export/hide; '+drawingCases+' horizontal/vertical/inclined mouse/pen/touch commits, frozen two-point Bubble, P2 retry, dedup, history/JSON, selection/delete, menus and no numeric UI');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
