const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const math=await p.evaluate(()=>{
   const E=semicircleEngine,rad=d=>d*Math.PI/180,fail=[],check=(ok,name)=>{if(!ok)fail.push(name)};
   check(Math.abs(E.shortestAngleDelta(rad(10),rad(30))-rad(20))<1e-12,'normal');
   check(Math.abs(E.shortestAngleDelta(rad(179),rad(-179))-rad(2))<1e-12,'positive wrap');
   check(Math.abs(E.shortestAngleDelta(rad(-179),rad(179))+rad(2))<1e-12,'negative wrap');
   check(E.rollerDelta(0,.3,'left')===-E.rollerDelta(0,.3,'right'),'mirror');
   check(E.snapGroupIndex(2.49,7)===2&&E.snapGroupIndex(2.51,7)===3,'nearest');
   for(let i=-10000;i<=10000;i++)check(E.snapGroupIndex(i,7)===((i%7)+7)%7,'stable integer/wrap');
   check(E.snapGroupIndex(7,7)===0&&E.snapGroupIndex(-1,7)===6,'wrap neighbors');
   check(!E.classifyTapVsDrag(8.9)&&E.classifyTapVsDrag(9),'threshold');
   for(let i=0;i<7;i++)check(E.snapGroupIndex(i+1,7)===(i+1)%7,'one step');
   const step=Math.PI/7;
   for(const side of ['left','right']){const sign=side==='left'?1:-1;check(Math.abs(-E.rollerDelta(0,-sign*step,side)/step-1)<1e-12,'angular neighbor step')}
   let offset=0;for(let i=0;i<100000;i++)offset-=E.rollerDelta(0,-step,'left')/step;
   check(E.snapGroupIndex(offset,7)===100000%7,'repeated angular drift');
   check(E.snapGroupIndex(2.51,7)===E.snapGroupIndex(2.51,7),'deterministic');return fail;
  });assert.deepEqual(math,[]);console.log('PASS roller pure math');
  const snapshot=()=>p.evaluate(()=>({items:JSON.stringify(items),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,doc:documentText(),dirty:documentText()!==savedDocument,geometryScale,internalForceScale,mode}));
  await p.evaluate(()=>{selected=null;multiSelection.clear();render();window.rollerClicks=0;for(const c of [...leftDrawingGroups,...rightCommandGroups].flatMap(g=>g.children))c.source.addEventListener('click',()=>rollerClicks++);});
  const before=await snapshot();
  const open=side=>p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;if(!m.state.open)m.host.querySelector('[data-demo-id="hub"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))},side);
  const group=(side,id)=>p.evaluate(({side,id})=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;{id=(side==='left'?{geometry:'bar',loads:'moment',annotation:'text',connections:'fixed'}:{edit:'delete',file:'open',view:'panView',snap:'snapToggle'})[id]||id;const r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));if(r.entries[r.activeIndex].id===id)return}m.host.querySelector(`[data-demo-id="${id}"]`).dispatchEvent(new MouseEvent('click',{bubbles:true}))},{side,id});
  const drag=async(side,type,cancel=false)=>{
   const start=await p.evaluate(({side,type})=>{
    const m=side==='left'?leftDrawingMenu:rightCommandMenu,s=m.layout.rings[0].sectors.find(s=>Math.abs((s.a0+s.a1)/2)<1e-8),id=61;
    const g=document.elementFromPoint(s.icon.x,s.icon.y),angle=Math.atan2(s.icon.y-m.layout.cy,s.icon.x-m.layout.cx),r=(s.r0+s.r1)/2;
    window.rollerTest={m,g,id,angle,r,step:m.layout.rings[0].step};g.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:type,button:0,clientX:s.icon.x,clientY:s.icon.y}));
    return {offset:m.state.roller.offset,hub:JSON.stringify(m.host.querySelector('[data-demo-id="hub"] .semicircle-hit').getAttribute('d'))};
   },{side,type});
   await p.evaluate(({side,type,cancel})=>{
    const {m,id,angle,r,step}=rollerTest,sign=side==='left'?1:-1;
    for(let i=1;i<=8;i++){const a=angle-sign*step*i/8;m.host.querySelector('svg').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:id,pointerType:type,clientX:m.layout.cx+r*Math.cos(a),clientY:m.layout.cy+r*Math.sin(a)}))}
    m.host.querySelector('svg').dispatchEvent(new PointerEvent(cancel?'pointercancel':'pointerup',{bubbles:true,pointerId:id,pointerType:type}));
   },{side,type,cancel});
   await p.waitForTimeout(210);
   const end=await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;return {offset:m.state.roller.offset,pointer:m.state.roller.pointerId,dragging:m.state.roller.dragging,hub:JSON.stringify(m.host.querySelector('[data-demo-id="hub"] .semicircle-hit').getAttribute('d')),clicks:rollerClicks}},side);
   assert.equal(end.offset,cancel?start.offset:(start.offset+1)%(side==='left'?4:8));assert.equal(end.hub,start.hub);assert.equal(end.pointer,null);assert.equal(end.dragging,false);assert.equal(end.clicks,0);
  };
  await open('left');
  await p.evaluate(()=>{window.hoverBefore=JSON.stringify(leftDrawingMenu.state.roller);for(let i=0;i<30;i++)leftDrawingMenu.host.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:77,pointerType:'pen',clientX:i*20,clientY:i*10}));});
  assert(await p.evaluate(()=>hoverBefore===JSON.stringify(leftDrawingMenu.state.roller)));assert.deepEqual(await snapshot(),before);
  for(const type of ['touch','pen','mouse'])await drag('left',type);
  await drag('left','pen',true);assert.deepEqual(await snapshot(),before);
  // Real browser pointer lifecycle verifies capture and click suppression.
  for(const type of ['mouse','pen','touch']){
   const q=await p.evaluate(()=>{const m=leftDrawingMenu,s=m.layout.rings[0].sectors.find(s=>Math.abs((s.a0+s.a1)/2)<1e-8);return {x:s.icon.x,y:s.icon.y,cx:m.layout.cx,cy:m.layout.cy,r:(s.r0+s.r1)/2,index:m.state.roller.offset,step:m.layout.rings[0].step}});
   const cdp=await p.context().newCDPSession(p);
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x,y:q.y}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:q.x,y:q.y,button:'left',buttons:1,clickCount:1,pointerType:type});
   assert(await p.evaluate(()=>leftDrawingMenu.host.querySelector('svg').hasPointerCapture(leftDrawingMenu.state.roller.pointerId)));
   for(let i=1;i<=8;i++){const a=-q.step*i/8,x=q.cx+q.r*Math.cos(a),y=q.cy+q.r*Math.sin(a);
    if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
    else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1,pointerType:type});
   }
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:q.cx+q.r*Math.cos(-q.step),y:q.cy+q.r*Math.sin(-q.step),button:'left',buttons:0,clickCount:1,pointerType:type});
   await p.waitForTimeout(210);console.log('PASS captured browser drag',type);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.roller.offset),(q.index+1)%4);assert.equal(await p.evaluate(()=>rollerClicks),0);await cdp.detach();
  }
  assert.deepEqual(await snapshot(),before);
  await open('right');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);await drag('right','touch');
  await p.evaluate(()=>{$('delete').disabled=true;rightCommandMenu.refresh()});await group('right','edit');assert.equal(await p.locator('.semicircle-right-menu [data-demo-id="delete"]').getAttribute('aria-disabled'),'true');
  await open('left');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);
  await group('left','annotation');await p.evaluate(()=>leftDrawingMenu.close());await open('left');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[3].entries[leftDrawingMenu.state.rings[3].activeIndex].id),'text');
  await group('left','loads');await p.locator('.semicircle-left-menu [data-demo-id="thin"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[0].entries[leftDrawingMenu.state.rings[0].activeIndex].id),'thin');
  const q=await p.evaluate(()=>leftDrawingMenu.layout.rings[2].sectors[2].icon);await p.touchscreen.tap(q.x,q.y);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[2].entries[leftDrawingMenu.state.rings[2].activeIndex].id),'udl');
  assert.deepEqual(await snapshot(),before);
  await group('left','geometry');const child=await p.evaluate(()=>leftDrawingMenu.layout.rings[0].sectors[0].icon);await p.touchscreen.tap(child.x,child.y);assert.equal(await p.evaluate(()=>rollerClicks),1);assert.equal(await p.evaluate(()=>mode),'bar');
  await open('left');assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="bar"]').getAttribute('aria-pressed'),'true');
  const out=path.resolve('.test-tools/semicircle-roller');fs.mkdirSync(out,{recursive:true});
  const shot=async name=>{await p.screenshot({path:path.join(out,name+'.png')});};
  await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close()});await shot('closed');
  for(const [side,id,name]of [['left','geometry','left-thanh'],['left','loads','left-loads'],['left','annotation','left-annotation'],['right','file','right-file'],['right','view','right-view'],['right','snap','right-snap']]){await open(side);await group(side,id);await shot(name)}
  for(const side of ['left','right']){await p.setViewportSize({width:800,height:1280});await open(side);await group(side,side==='left'?'connections':'file');await shot('portrait-'+side);assert.equal(await p.evaluate(()=>document.body.dataset.radialPrimary),'true')}
  await p.setViewportSize({width:1280,height:800});await open('left');await group('left','geometry');
  await p.evaluate(()=>{leftDrawingMenu.host.style.visibility='hidden';rightCommandMenu.close()});
  for(const center of [-100,10000]){await p.evaluate(center=>{window.boundMenu=semicircleEngine.createMenu({side:'left',production:true,items:leftDrawingGroups,getBounds:leftDrawingBounds,centerY:center});boundMenu.host.querySelector('[data-demo-id="hub"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))},center);assert(await p.evaluate(()=>boundMenu.layout.cy-boundMenu.layout.radius>=boundMenu.layout.bounds.top&&boundMenu.layout.cy+boundMenu.layout.radius<=boundMenu.layout.bounds.bottom));await shot(center<0?'safe-top':'safe-bottom');await p.evaluate(()=>boundMenu.destroy())}
  await p.evaluate(()=>leftDrawingMenu.host.style.visibility='');
  assert.deepEqual(errors,[]);console.log('PASS mouse/touch/pen contact/cancel/hover, delegation, memory, isolation, keyboard, disabled, screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
