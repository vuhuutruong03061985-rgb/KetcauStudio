const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const geometry=await p.evaluate(()=>{
   const E=semicircleEngine,fail=[],check=(ok,label)=>{if(!ok)fail.push(label)};
   for(const bounds of [{left:0,right:1280,top:60,bottom:780},{left:12,right:788,top:60,bottom:1260}]){
    for(const count of [1,2,4])for(const side of ['left','right']){
     const rings=Array.from({length:count},(_,i)=>({id:'ring-'+i,count:[7,5,3,6][i]}));
     const l=E.solveConcentricRingLayout({side,rings,bounds,centerY:-999}),mirror=E.mirrorSemicircleLayout(l);
     const opposite=E.solveConcentricRingLayout({side:side==='left'?'right':'left',rings,bounds,centerY:-999});
     check(l.fits&&l.rings.length===count,'fit/count');check(l.radius===l.rings.at(-1).r1,'outer envelope');
     check(l.cy-l.radius>=bounds.top-1e-8&&l.cy+l.radius<=bounds.bottom+1e-8,'safe vertical');
     for(const [i,r]of l.rings.entries()){
      check(r.cx===l.cx&&r.cy===l.cy,'shared center');check(r.r1-r.r0>=44,'thickness');
      check(r.r0>=(i?l.rings[i-1].r1:l.hubRadius)+3-1e-8,'radial separation');
      check(r.step>0&&r.step<=Math.PI/4,'own step');
      r.sectors.forEach((s,j)=>{
       check(mirror.rings[i].sectors[j].path===opposite.rings[i].sectors[j].path,'mirror');
       const shape=document.createElementNS(NS,'path');shape.setAttribute('d',s.path);check(shape.getTotalLength()>0&&!/NaN|Infinity/.test(s.path),'valid path');
       for(let a=0;a<Math.PI*2;a+=Math.PI/36)check(E.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)),'44px disk');
      });
     }
     const changed=E.solveConcentricRingLayout({side,rings:rings.map(r=>({...r,offset:999,activeIndex:2})),bounds,centerY:-999});
     check(changed.fits===l.fits&&changed.radius===l.radius,'offset-independent fit');
    }
   }
   const small=E.solveConcentricRingLayout({rings:[{id:'a',count:7},{id:'b',count:7},{id:'c',count:7},{id:'d',count:7}],bounds:{left:0,right:100,top:0,bottom:200}});
   check(!small.fits&&small.rings.every(r=>r.r1-r.r0>=44),'impossible fit preserves targets');
   for(const rings of [[],[{id:'a',count:0}],[{id:'a',count:1},{id:'a',count:2}],[{id:'a',count:13}]]){let threw=false;try{E.solveConcentricRingLayout({rings,bounds:{left:0,right:800,top:0,bottom:1000}})}catch{threw=true}check(threw,'invalid rejected')}
   check(E.shortestAngleDelta(179*Math.PI/180,-179*Math.PI/180)>0&&E.shortestAngleDelta(-179*Math.PI/180,179*Math.PI/180)<0,'angle crossing');
   for(const count of [3,5,6,7]){
    check(E.snapGroupIndex(count,count)===0&&E.snapGroupIndex(-1,count)===count-1,'per-ring wrap');
    let offset=0;const step=Math.min(Math.PI/4,Math.PI/(count%2?count:count+1));for(let i=0;i<100000;i++)offset-=E.rollerDelta(0,-step,'left')/step;
    check(E.snapGroupIndex(offset,count)===100000%count,'drift');
   }
   return fail;
  });assert.deepEqual(geometry,[]);console.log('PASS concentric layout, centers, 44px disks, envelopes, mirrors, portrait/landscape, wrap/drift');
  await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close();leftDrawingMenu.host.style.visibility='hidden';rightCommandMenu.host.style.visibility='hidden';window.multiActions=0;window.multiSourceClicks=0;momentButton.addEventListener('click',()=>multiSourceClicks++);});
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),items:JSON.stringify(items),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,dirty:documentText()!==savedDocument,geometryScale,internalForceScale,mode,camera:JSON.stringify(camera)}));
  const before=await snapshot();
  const mount=async(side='left',count=3)=>p.evaluate(({side,count})=>{
   window.multiMenu?.destroy();
   const icons=[['bar','thin','dashed','curve','extend','hinge','text'],['force','udl','dim','text','person'],['moment','text','person'],['snapToggle','drawingScalesToggle','panView','open','save','zoomIn']];
   const rings=Array.from({length:count},(_,r)=>({id:'ring-'+r,activeIndex:[0,2,1,0][r],tint:['#edf2f6','#edf3ef','#f3f0e9','#eef0f6'][r],entries:Array.from({length:[7,5,3,6][r]},(_,i)=>({id:'entry-'+i,label:`Ring ${r+1}, item ${i+1}`,icon:icons[r][i],...(r===2&&i===0?{source:momentButton}:{})}))}));
   window.multiMenu=semicircleEngine.createMenu({side,rings,getBounds:()=>({left:0,right:innerWidth,top:document.querySelector('header').getBoundingClientRect().bottom+12,bottom:innerHeight-16}),onAction:()=>multiActions++});
   multiMenu.host.querySelector('[data-demo-id="hub"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  },{side,count});
  const states=()=>p.evaluate(()=>multiMenu.state.rings.map(r=>({id:r.id,activeIndex:r.activeIndex,offset:r.offset,pointerId:r.pointerId,dragging:r.dragging,snapFrame:r.snapFrame})));
  const ringDOM=()=>p.evaluate(()=>multiMenu.state.rings.map(r=>JSON.stringify([...r.controls.values()].map(g=>({path:g.querySelector('.semicircle-hit').getAttribute('d'),art:g.querySelector('.roller-artwork').getAttribute('transform')})))));
  const point=async(r,index=null)=>p.evaluate(({r,index})=>{const m=multiMenu,state=m.state.rings[r],s=m.layout.rings[r].sectors[index??state.activeIndex];return {x:s.icon.x,y:s.icon.y,cx:m.layout.cx,cy:m.layout.cy,step:m.layout.rings[r].step,angle:Math.atan2(s.icon.y-m.layout.cy,s.icon.x-m.layout.cx),radius:(s.r0+s.r1)/2,side:m.state.side}}, {r,index});
  const synthetic=async(r,type='pen',ending='pointerup',distance=null)=>{
   const q=await point(r),old=await states(),oldDOM=await ringDOM();
   await p.evaluate(({q,r,type,ending,distance})=>{
    const ring=multiMenu.state.rings[r],g=ring.controls.get(ring.activeIndex),id=90+r;
    g.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:type,button:0,clientX:q.x,clientY:q.y}));
    const sign=q.side==='left'?1:-1,delta=distance===null?q.step:distance/q.radius;
    const a=q.angle-sign*delta,x=q.cx+q.radius*Math.cos(a),y=q.cy+q.radius*Math.sin(a);
    multiMenu.host.querySelector('svg').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:id,pointerType:type,clientX:x,clientY:y}));
    window.gestureWasDrag=ring.dragging;
    multiMenu.host.querySelector('svg').dispatchEvent(new PointerEvent(ending,{bubbles:true,pointerId:id,pointerType:type,clientX:x,clientY:y}));
    // Even a release-click landing on a different ring belongs to this gesture.
    if(ending==='pointerup')multiMenu.state.rings[(r+1)%multiMenu.state.rings.length].controls.get(0).dispatchEvent(new PointerEvent('click',{bubbles:true,pointerId:id,pointerType:type,detail:1}));
   },{q,r,type,ending,distance});await p.waitForTimeout(210);
   const next=await states(),nextDOM=await ringDOM();
   for(let i=0;i<old.length;i++)if(i!==r){assert.deepEqual(next[i],old[i]);assert.equal(nextDOM[i],oldDOM[i])}
   assert.equal(next[r].activeIndex,ending==='pointerup'&&distance===null?(old[r].activeIndex+1)%(await p.evaluate(r=>multiMenu.state.rings[r].entries.length,r)):old[r].activeIndex);
   assert.equal(next[r].pointerId,null);assert.equal(next[r].dragging,false);assert.equal(next[r].snapFrame,0);
   assert.equal(await p.evaluate(()=>multiActions+multiSourceClicks),0);
  };
  await mount();const hovered=await states();
  await p.evaluate(()=>{for(let i=0;i<50;i++)multiMenu.host.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:500,pointerType:'pen',clientX:i*8,clientY:i*11}))});assert.deepEqual(await states(),hovered);
  await synthetic(0,'mouse');await synthetic(1,'touch');await synthetic(2,'pen');await synthetic(1,'pen','pointercancel');await synthetic(1,'pen','lostpointercapture');
  await synthetic(1,'touch','pointerup',8);assert.equal(await p.evaluate(()=>gestureWasDrag),false);
  await synthetic(1,'pen','pointerup',10);assert.equal(await p.evaluate(()=>gestureWasDrag),true);
  // Duplicate item IDs route by ring identity. Taps/keyboard select without invoking sources.
  const tap=await point(2,0);await p.touchscreen.tap(tap.x,tap.y);assert.equal((await states())[2].activeIndex,0);
  await p.locator('.semicircle-multi-roller [data-roller-ring="ring-1"][data-roller-index="4"]').focus();await p.keyboard.press('Space');assert.equal((await states())[1].activeIndex,4);
  await synthetic(1);assert.equal((await states())[1].activeIndex,0);
  const saved=await states();await p.evaluate(()=>multiMenu.close());await p.locator('.semicircle-multi-roller [data-demo-id="hub"]').focus();await p.keyboard.press('Enter');assert.deepEqual(await states(),saved);
  // Two pointers own separate rings; cancellation of B must leave A active.
  await p.evaluate(()=>{
   const m=multiMenu;
   for(const [i,id]of [[0,301],[1,302]]){const r=m.state.rings[i],s=m.layout.rings[i].sectors[r.activeIndex];r.controls.get(r.activeIndex).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:'pen',button:0,clientX:s.icon.x,clientY:s.icon.y}))}
   m.host.querySelector('svg').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:302,pointerType:'pen'}));
  });assert.equal((await states())[0].pointerId,301);assert.equal((await states())[1].pointerId,null);
  await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert((await states()).every(r=>r.pointerId===null&&!r.dragging&&r.snapFrame===0));
  const parallelBefore=await states();
  await p.evaluate(()=>{
   const m=multiMenu,surface=m.host.querySelector('svg');
   for(const [i,id]of [[0,401],[1,402]]){
    const r=m.state.rings[i],l=m.layout.rings[i],s=l.sectors[r.activeIndex];
    r.controls.get(r.activeIndex).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:id,pointerType:'touch',button:0,clientX:s.icon.x,clientY:s.icon.y}));
    const radius=(s.r0+s.r1)/2;surface.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:id,pointerType:'touch',clientX:m.layout.cx+radius*Math.cos(-l.step),clientY:m.layout.cy+radius*Math.sin(-l.step)}));
   }
   surface.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:402,pointerType:'touch'}));
  });assert.equal((await states())[0].pointerId,401);assert.equal((await states())[0].dragging,true);
  await p.evaluate(()=>multiMenu.host.querySelector('svg').dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:401,pointerType:'touch'})));await p.waitForTimeout(210);
  const parallelAfter=await states();assert.equal(parallelAfter[0].activeIndex,(parallelBefore[0].activeIndex+1)%7);assert.equal(parallelAfter[1].activeIndex,parallelBefore[1].activeIndex);assert.deepEqual(parallelAfter[2],parallelBefore[2]);
  // Real browser contact/capture paths, including mirrored RIGHT angular wrap.
  for(const side of ['left','right'])for(const type of ['mouse','pen','touch']){
   await mount(side);for(const ringIndex of [0,1]){const q=await point(ringIndex),old=await states(),oldDOM=await ringDOM(),cdp=await p.context().newCDPSession(p);
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:q.x,y:q.y}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:q.x,y:q.y,button:'left',buttons:1,clickCount:1,pointerType:type});
   assert(await p.evaluate(r=>multiMenu.host.querySelector('svg').hasPointerCapture(multiMenu.state.rings[r].pointerId),ringIndex));
   for(const i of [0,1,2])if(i!==ringIndex)assert.equal((await states())[i].pointerId,null);
   const sign=side==='left'?1:-1;let x=q.x,y=q.y;
   for(let i=1;i<=8;i++){const a=q.angle-sign*q.step*i/8;x=q.cx+q.radius*Math.cos(a);y=q.cy+q.radius*Math.sin(a);
    if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
    else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1,pointerType:type});
   }
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1,pointerType:type});
   await p.waitForTimeout(210);const next=await states(),dom=await ringDOM();assert.equal(next[ringIndex].activeIndex,ringIndex===0?1:3);
   for(const i of [0,1,2])if(i!==ringIndex){assert.deepEqual(next[i],old[i]);assert.equal(dom[i],oldDOM[i])}
   assert.equal(await p.evaluate(()=>multiActions+multiSourceClicks),0);await cdp.detach();
   console.log('PASS independent captured contact/reused pointer ID',side,type,ringIndex);}
  }
  assert.deepEqual(await snapshot(),before);
  const out=path.resolve('.test-tools/semicircle-multi-roller');fs.mkdirSync(out,{recursive:true});
  for(const [side,count,name,viewport]of [['left',3,'left-3',{width:1280,height:800}],['left',4,'left-4-landscape',{width:1280,height:800}],['right',3,'right-3',{width:1280,height:800}],['left',4,'portrait-safe-fit',{width:800,height:1280}],['right',4,'landscape-safe-fit',{width:1366,height:900}]]){
   await p.setViewportSize(viewport);await mount(side,count);
   assert(await p.evaluate(()=>multiMenu.layout.fits));
   assert(await p.evaluate(()=>multiMenu.state.rings.every(r=>{
    const l=multiMenu.layout.rings.find(l=>l.id===r.id),s=l.sectors[r.activeIndex];return Math.abs((s.a0+s.a1)/2)<1e-10&&Math.abs(s.icon.y-multiMenu.layout.cy)<1e-10&&[...r.controls.values()].every(g=>!g.querySelector('.roller-artwork').getAttribute('transform').includes('rotate'));
   })));
   await p.screenshot({path:path.join(out,name+'.png')});
   if(name==='left-3'){await synthetic(1);await p.screenshot({path:path.join(out,'middle-rotated.png')})}
  }
  await p.evaluate(()=>multiMenu.destroy());assert.equal(await p.locator('.semicircle-multi-roller').count(),0);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(errors,[]);
  console.log('PASS per-ring tap/drag/threshold/cancel/loss/blur/memory, independent states/DOM, source/document isolation; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
