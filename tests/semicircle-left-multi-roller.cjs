const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.evaluate(()=>{cancelToSelection();window.leftCalls={};for(const e of leftDrawingRings.flatMap(r=>r.entries))e.source.addEventListener('click',()=>leftCalls[e.id]=(leftCalls[e.id]||0)+1)});
  const expected={L1:['bar','thin','dashed','curve'],L2:['hinge','linkBar','weld','pin','roller','fixed'],L3:['force','moment','udl'],L4:['dim','text','person','section','rigidRegion','hatch','joint','positive','negative','diagramM','diagramQ','diagramN']};
  assert.deepEqual(await p.evaluate(()=>Object.fromEntries(leftDrawingRings.map(r=>[r.id,r.entries.map(e=>e.id)]))),expected);
  assert.equal(await p.evaluate(()=>new Set(leftDrawingRings.flatMap(r=>r.entries.map(e=>e.source))).size),25);
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),items:JSON.stringify(items),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,dirty:documentText()!==savedDocument,geometryScale,internalForceScale,mode,first,rotation:currentMomentRotation}));
  const rings=()=>p.evaluate(()=>leftDrawingMenu.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset,pointer:r.pointerId,dragging:r.dragging,focused:r.entries[r.activeIndex].id})));
  const point=id=>p.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return{x:m.layout.cx+13,y:m.layout.cy};const r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon},id);
  const tap=async(id,type='touch')=>{const q=await point(id);if(type==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const open=async()=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await tap('hub')};
  const focus=async id=>{await open();if(!await p.evaluate(id=>{const r=leftDrawingMenu.state.rings.find(r=>r.entries.some(e=>e.id===id));return r.entries[r.activeIndex].id===id},id))await tap(id)};
  const before=await snapshot();await open();assert.deepEqual((await rings()).map(r=>r.focused),['bar','pin','force','dim']);
  const hub=await p.locator('.semicircle-left-menu [data-demo-id="hub"] .semicircle-hit').getAttribute('d');
  for(const id of ['thin','fixed','moment','text'])await focus(id);
  assert.deepEqual((await rings()).map(r=>r.focused),['thin','fixed','moment','text']);assert.deepEqual(await snapshot(),before);assert.deepEqual(await p.evaluate(()=>leftCalls),{});
  const remembered=await rings();await tap('hub');await open();assert.deepEqual(await rings(),remembered);
  // An active source centers only its own ring, leaving the other three memories intact.
  await p.evaluate(()=>setMode('force'));await tap('hub');await open();assert.deepEqual((await rings()).map(r=>r.focused),['thin','fixed','force','text']);
  await p.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();for(const [i,index]of [0,3,0,0].entries())leftDrawingMenu.state.rings[i].offset=leftDrawingMenu.state.rings[i].activeIndex=index;leftCalls={}});await open();
  const navigation=await snapshot();await tap('thin');assert.equal((await rings())[0].focused,'thin');assert.deepEqual(await p.evaluate(()=>leftCalls),{});assert.deepEqual(await snapshot(),navigation);
  await tap('thin');assert.equal(await p.evaluate(()=>leftCalls.thin),1);assert.equal(await p.evaluate(()=>mode),'thin');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
  await open();await focus('bar');assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="thin"]').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="bar"]').getAttribute('aria-pressed'),'false');assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="bar"]').getAttribute('data-focused'),'true');
  const toolState=await snapshot();await focus('moment');assert.deepEqual(await snapshot(),toolState);assert.equal(await p.evaluate(()=>leftCalls.moment||0),0);await tap('moment');assert.equal(await p.evaluate(()=>leftCalls.moment),1);assert.equal(await p.evaluate(()=>mode),'moment');assert.equal(await p.evaluate(()=>currentMomentRotation),toolState.rotation);
  const drag=async(index,type='touch',cancel=false,steps=1)=>{
   await open();const old=await rings(),saved=await snapshot();
   const q=await p.evaluate(index=>{const m=leftDrawingMenu,r=m.state.rings[index],l=m.layout.rings[index],s=l.sectors[r.activeIndex];return{x:s.icon.x,y:s.icon.y,cx:m.layout.cx,cy:m.layout.cy,radius:(s.r0+s.r1)/2,step:l.step,count:r.entries.length}},index);
   const cdp=await p.context().newCDPSession(p);let x=q.x,y=q.y;
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:type});
   assert(await p.evaluate(index=>leftDrawingMenu.host.querySelector('svg').hasPointerCapture(leftDrawingMenu.state.rings[index].pointerId),index));
   for(let i=1;i<=12;i++){const a=-q.step*steps*i/12;x=q.cx+q.radius*Math.cos(a);y=q.cy+q.radius*Math.sin(a);
    if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1,pointerType:type});
   }
   assert.equal(await p.evaluate(()=>document.body.dataset.radialPrimary),'true');
   if(cancel){await p.evaluate(index=>leftDrawingMenu.host.querySelector('svg').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:leftDrawingMenu.state.rings[index].pointerId,pointerType:'pen'})),index)}
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1,pointerType:type});
   await p.waitForTimeout(210);const next=await rings();assert.equal(next[index].index,cancel?old[index].index:(old[index].index+steps)%q.count);
   for(let i=0;i<4;i++)if(i!==index)assert.deepEqual(next[i],old[i]);assert.equal(next[index].pointer,null);assert.equal(next[index].dragging,false);assert.deepEqual(await snapshot(),saved);await cdp.detach();
   assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="hub"] .semicircle-hit').getAttribute('d'),hub);
  };
  await p.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();for(const [i,index]of [0,3,0,0].entries())leftDrawingMenu.state.rings[i].offset=leftDrawingMenu.state.rings[i].activeIndex=index;leftCalls={}});await open();
  await drag(2,'touch');assert.deepEqual((await rings()).map(r=>r.focused),['bar','pin','moment','dim']);await drag(0,'mouse');assert.deepEqual((await rings()).map(r=>r.focused),['thin','pin','moment','dim']);
  await drag(1,'pen');await drag(3,'touch',false,3);await drag(3,'pen',true);assert.deepEqual(await p.evaluate(()=>leftCalls),{});
  const hoverBefore=await rings();await p.evaluate(()=>{for(let i=0;i<40;i++)leftDrawingMenu.host.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:998,pointerType:'pen',clientX:i*7,clientY:i*13}))});assert.deepEqual(await rings(),hoverBefore);
  // A centered Moment contact becomes a drag and cancels its existing hold timer.
  await focus('moment');await drag(2,'pen');await p.waitForTimeout(550);assert.equal(await p.evaluate(()=>momentPalette.open),false);assert.deepEqual(await p.evaluate(()=>leftCalls),{});
  // Mutual dismissal still uses the real production instances.
  await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);await open();assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);
  const out=path.resolve('.test-tools/semicircle-left-multi-roller');fs.mkdirSync(out,{recursive:true});const shot=async name=>p.screenshot({path:path.join(out,name+'.png')});
  await p.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();for(const [i,index]of [0,3,0,0].entries())leftDrawingMenu.state.rings[i].offset=leftDrawingMenu.state.rings[i].activeIndex=index});await shot('closed');await open();await shot('defaults');
  for(const id of ['thin','fixed','moment','text']){await focus(id);await shot('focused-'+id)}
  await shot('landscape');await p.setViewportSize({width:800,height:1280});await open();await shot('portrait');
  await p.setViewportSize({width:800,height:600});await open();assert.equal(await p.evaluate(()=>leftDrawingMenu.layout.fits),true);await shot('boundary-safe-fit');
  await p.setViewportSize({width:800,height:540});await p.waitForFunction(()=>!leftDrawingMenu.layout.fits);const failed=await p.evaluate(()=>({viewport:[innerWidth,innerHeight],bounds:leftDrawingMenu.layout.bounds,radius:leftDrawingMenu.layout.radius,fits:leftDrawingMenu.layout.fits}));assert.equal(failed.fits,false);assert(await p.locator('#toggleTools').isVisible());assert(await p.locator('#commandRibbon').isVisible());console.log('EXPECTED fallback geometry',failed);
  await p.setViewportSize({width:1280,height:800});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');
  await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await shot('right-unchanged');
  assert.equal(await p.locator('.semicircle-right-menu .semicircle-roller-ring').count(),4);assert.deepEqual(errors,[]);
  console.log('PASS exact production mapping/defaults, focus vs activation, independent memory/active source, 4-ring capture/pen hover/cancel, no model/history changes, screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
