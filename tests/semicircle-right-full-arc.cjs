'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');
const baseline=execFileSync('git',['show','13a3f73:assets/tablet.js'],{encoding:'utf8'});
const R1=['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],R2=['panView','snapOptions'];
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const out=path.resolve('.test-tools/semicircle-right-full-arc');fs.mkdirSync(out,{recursive:true});
  const p=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),ref=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),errors=[],evidence=[];
  for(const page of [p,ref])page.on('pageerror',e=>errors.push(e.message));
  await ref.route('**/assets/tablet.js',r=>r.fulfill({contentType:'application/javascript',body:baseline}));
  for(const page of [p,ref])await page.goto(pathToFileURL(path.resolve('index.html')).href);
  const root=p.locator('.semicircle-right-menu'),sector=id=>root.locator(`[data-demo-id="${id}"]`);
  const reset=async(page=p)=>{await page.evaluate(()=>{document.activeElement?.blur();cancelToSelection();window.b4id=0;crypto.randomUUID=()=> 'b4-'+(++b4id);items=[make('bar',100,200,500,200)];past=[];future=[];selected=null;multiSelection.clear();panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');snapEnabled=false;updateSnapControls();snapPanel.open=false;leftDrawingMenu.close();rightCommandMenu.close();window.b4calls={};render();updateCommandControls()});await settled(page)};
  const open=async()=>{if(!await p.evaluate(()=>rightCommandMenu.state.open))await root.locator('[data-demo-id="hub"]').dispatchEvent('click');await settled(p)};
  const point=id=>p.evaluate(id=>{const m=rightCommandMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon},id);
  const focus=async id=>{await open();if(!await p.evaluate(id=>rightCommandMenu.state.rings.find(r=>r.entries.some(e=>e.id===id)).focusedId===id,id)){const q=await point(id);await p.touchscreen.tap(q.x,q.y);await settled(p)}};
  const snapshot=page=>page.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,second,selected,multi:[...multiSelection],camera,panEnabled,snapEnabled,snapOptions,gridVisible,gridSize,dynamic:dynamicInput.hidden,fields:barNumericSession?.state}));
  const left=page=>page.evaluate(()=>({layout:leftDrawingMenu.layout,mapping:leftDrawingMenu.state.rings.map(r=>r.entries.map(e=>e.id)),categories:leftDrawingCategories.map(c=>c.entries.map(e=>e.id)),category:leftCategoryId}));
  const rightEnvelope=page=>page.evaluate(()=>{const l=rightCommandMenu.layout;return {radius:l.radius,profile:l.profile,cx:l.cx,cy:l.cy,bounds:l.bounds,fits:l.fits,context:l.contextRing,rings:l.rings.map(r=>({id:r.id,r0:r.r0,r1:r.r1}))}});
  const chrome=page=>page.evaluate(()=>({primary:document.body.dataset.radialPrimary,bars:[tabletTopBar,tabletBottomLeftBar,tabletBottomRightBar].map(e=>({rect:e.getBoundingClientRect().toJSON(),hidden:getComputedStyle(e).display==='none',ids:[...e.querySelectorAll('button,input,output')].map(n=>n.id||n.dataset.toolbarIcon)}))}));
  const paths=()=>root.locator('[data-roller-ring] .semicircle-hit').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
  const geometry=async(expected=[R1,R2])=>{
   const g=await p.evaluate(()=>{const m=rightCommandMenu;return {profile:m.layout.profile,radius:m.layout.radius,rings:m.layout.rings.map((r,i)=>({id:r.id,count:r.count,r0:r.r0,r1:r.r1,step:r.step,targets:r.targets,ids:[...m.host.querySelectorAll(`[data-roller-ring="${r.id}"]`)].map(e=>e.dataset.demoId),sectors:r.sectors.map(s=>({a0:s.a0,a1:s.a1,path:s.path,x:s.icon.x,y:s.icon.y,hit:document.elementFromPoint(s.icon.x,s.icon.y)?.closest('[data-demo-id]')?.dataset.demoId,disk:Array.from({length:72},(_,j)=>j*Math.PI/36).every(a=>semicircleEngine.hitTestRadialSector(s,s.icon.x+21.99999*Math.cos(a),s.icon.y+21.99999*Math.sin(a)))}))})),upright:[...m.host.querySelectorAll('.semicircle-icon,.roller-artwork')].every(e=>!e.getAttribute('transform')?.includes('rotate')),slots:m.host.querySelectorAll('.roller-slot').length}});
   assert(g.upright);assert.equal(g.slots,0);
   for(const [i,r]of g.rings.entries()){
    const n=expected[i].length;assert.deepEqual(r.ids,expected[i]);assert.equal(r.count,n);assert.equal(r.sectors.length,n);near(r.step,Math.PI/n);assert(r.targets.safe&&r.targets.minimumWidth>=44);assert(r.r1-r.r0>=44);
    assert.equal(r.sectors[0].a0,-Math.PI/2);assert.equal(r.sectors.at(-1).a1,Math.PI/2);
    for(const [j,s]of r.sectors.entries()){near(s.a0,-Math.PI/2+Math.PI*j/n);near(s.a1,-Math.PI/2+Math.PI*(j+1)/n);if(j)assert.equal(s.a0,r.sectors[j-1].a1);assert(s.disk);assert.equal(s.hit,expected[i][j])}
    if(n%2===0){assert.equal(r.sectors[n/2-1].a1,0);assert.equal(r.sectors[n/2].a0,0);assert(r.sectors.every(s=>Math.abs(s.y-awaitCenter(g))>1e-8))}
   }
   return g;
  };
  // The nominal center is the common midpoint of the first/last icon positions.
  const awaitCenter=g=>(g.rings[0].sectors[0].y+g.rings[0].sectors.at(-1).y)/2;
  await p.evaluate(()=>{window.b4sources=rightCommandRings.flatMap(r=>r.entries).map(e=>({id:e.id,node:e.source,handler:e.source.onclick}));for(const e of rightCommandRings.flatMap(r=>r.entries))e.source.addEventListener(e.id==='snapOptions'?'keydown':'click',event=>{if(e.id!=='snapOptions'||event.key==='ArrowDown')b4calls[e.id]=(b4calls[e.id]||0)+1})});
  for(const [width,height,active]of [[1376,1032,true],[1280,800,true],[1152,720,true],[1152,584,true],[1032,1376,true],[800,1280,true],[800,776,true],[800,600,true],[800,390,false],[432,800,true],[431,800,false],[390,800,false]]){
   for(const page of [p,ref]){await reset(page);await page.setViewportSize({width,height});await ownership(page,active)}
   assert.deepEqual(await left(p),await left(ref),'LEFT exact geometry/mapping parity');assert.deepEqual(await chrome(p),await chrome(ref),'chrome/admission unchanged');assert.deepEqual(await rightEnvelope(p),await rightEnvelope(ref),'RIGHT annuli/context/envelope unchanged');
   if(!active){if(width===800)await p.screenshot({path:path.join(out,'800x390-fallback.png')});continue}
   if([1152,1280,1376].includes(width))await p.screenshot({path:path.join(out,width+'x'+height+'-right-closed.png')});
   await open();const g=await geometry();evidence.push({width,height,profile:g.profile,radius:g.radius});
   if([1152,1280,1376].includes(width))await p.screenshot({path:path.join(out,width+'x'+height+'-right-open.png')});
   const stable=await paths();await focus('copyObjects');assert.deepEqual(await paths(),stable);await p.evaluate(()=>rightCommandMenu.refresh());assert.deepEqual(await paths(),stable);await p.evaluate(()=>rightCommandMenu.close());await open();assert.deepEqual(await paths(),stable);
   for(const tool of ['bar','moment','diagram','pin','roller']){
    for(const page of [p,ref]){await page.evaluate(tool=>{selectLeftCategory(leftDrawingCategories.find(c=>c.entries.some(e=>e.id===tool)).id,tool);leftDrawingMenu.state.open=true;leftDrawingMenu.refresh()},tool);await settled(page)}
    assert.deepEqual(await left(p),await left(ref),'LEFT focused context parity');
   }
   for(const page of [p,ref]){await page.evaluate(()=>{setMode('hatch');hatchPoints=[{x:300,y:300},{x:500,y:300},{x:450,y:450}];render();updateCommandControls()});await settled(page)}
   assert.deepEqual(await left(p),await left(ref));assert.deepEqual(await rightEnvelope(p),await rightEnvelope(ref),'RIGHT Cancel/Finish context parity');
  }
  await p.setViewportSize({width:1152,height:584});await ownership(p,true);await reset();await open();await geometry();await p.screenshot({path:path.join(out,'1152x584-r2-without-calculator.png')});
  // Both profiles and both R2 sets retain the baseline annuli, with literal safety oracles.
  for(const profile of ['normal','compact'])for(const n of [2,3]){
   const pair=await p.evaluate(({profile,n})=>{const rings=[{id:'R1',count:6},{id:'R2',count:n}],getProfileBounds=()=>({left:0,right:1152,top:0,bottom:profile==='compact'?480:1000});return semicircleEngine.solveAdaptiveConcentricRingLayout({side:'right',rings,fullArcRings:rings,fixedOuter:true,getProfileBounds,bounds:getProfileBounds()})},{profile,n});
   assert.equal(pair.profile,profile);const expected=profile==='normal'?[[81.60804137472095,129.60804137472095],[132.60804137472095,180.60804137472095]]:[[83.60804137472095,127.60804137472095],[128.60804137472095,172.60804137472095]];
   for(const [i,r]of pair.rings.entries()){near(r.r0,expected[i][0]);near(r.r1,expected[i][1]);assert.equal(r.sectors.length,i===0?6:n);assert(r.targets.safe);for(const t of r.targets.sectors){assert(t.thickness>=44&&t.tangentialWidth>=44)}}
  }
  // Calculator fixture exercises the existing source adapter, not a production handler.
  await p.evaluate(()=>{const b=document.createElement('button');b.id='openCalculator';b.title='Calculator capability fixture';b.hidden=true;b.onclick=()=>b4calls.openCalculator=(b4calls.openCalculator||0)+1;$('viewTools').append(b);window.b4calculator=b;refreshRightCommandEntries();rightCommandMenu.refresh()});await geometry();
  await p.evaluate(()=>{b4calculator.hidden=false;refreshRightCommandEntries();rightCommandMenu.refresh()});await settled(p);await geometry([R1,[...R2,'openCalculator']]);await focus('openCalculator');await p.screenshot({path:path.join(out,'1152x584-r2-with-calculator.png')});const cq=await point('openCalculator');await p.touchscreen.tap(cq.x,cq.y);await settled(p);assert.equal(await p.evaluate(()=>b4calls.openCalculator),1);
  await open();await p.evaluate(()=>{b4calculator.hidden=true;refreshRightCommandEntries();rightCommandMenu.refresh()});await settled(p);await geometry();assert.equal(await sector('openCalculator').count(),0);assert.equal(await p.evaluate(()=>rightCommandMenu.state.rings[1].focusedId),'panView');await p.evaluate(()=>{b4calculator.remove();refreshRightCommandEntries();rightCommandMenu.refresh()});await geometry();
  // Captured mouse/pen/touch choose absolute sectors; release/cancel never executes.
  for(const index of [0,1])for(const type of ['mouse','pen','touch'])for(const cancel of [false,true]){
   await reset();await open();const ids=index===0?R1:R2;await focus(ids[0]);const saved=await snapshot(p),stable=await paths(),a=await point(ids[0]),b=await point(ids[1]),cdp=await p.context().newCDPSession(p);
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',buttons:1,clickCount:1,pointerType:type});
   for(let j=1;j<=8;j++){const q={x:a.x+(b.x-a.x)*j/8,y:a.y+(b.y-a.y)*j/8};if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[q]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...q,button:'left',buttons:1,pointerType:type})}
   assert.equal(await p.evaluate(index=>rightCommandMenu.state.rings[index].focusedId,index),ids[1]);assert.deepEqual(await paths(),stable);
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else{if(cancel)await p.evaluate(({index,type})=>rightCommandMenu.host.querySelector('svg').dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:type,pointerId:rightCommandMenu.state.rings[index].pointerId})),{index,type});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',buttons:0,clickCount:1,pointerType:type})}
   await cdp.detach();await settled(p);assert.equal(await p.evaluate(index=>rightCommandMenu.state.rings[index].focusedId,index),ids[cancel?0:1]);assert.deepEqual(await snapshot(p),saved);assert.deepEqual(await p.evaluate(()=>b4calls),{});assert.deepEqual(await paths(),stable);
  }
  // Every real action is delegated once; compare with the baseline real source route.
  for(const id of [...R1,...R2]){
   for(const page of [p,ref]){await reset(page);await page.setViewportSize({width:1152,height:584});await page.evaluate(()=>{snapEnabled=true;updateSnapControls();render()});await settled(page)}
   await focus(id);assert.deepEqual(await p.evaluate(()=>b4calls),{});await ref.evaluate(id=>{const s=rightCommandSource(id);if(id==='snapOptions')s.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown'}));else s.click()},id);const q=await point(id);await p.touchscreen.tap(q.x,q.y);await settled(p);await settled(ref);assert.equal(await p.evaluate(id=>b4calls[id],id),1,id);assert.deepEqual(await snapshot(p),await snapshot(ref),id+' real source parity');
  }
  await reset();await open();await p.evaluate(()=>{rightCommandSource('extend').disabled=true;rightCommandMenu.refresh()});await settled(p);assert.equal(await sector('extend').getAttribute('aria-disabled'),'true');const disabledBefore=await snapshot(p);const dq=await point('extend');await p.touchscreen.tap(dq.x,dq.y);await sector('extend').dispatchEvent('click');assert.deepEqual(await snapshot(p),disabledBefore);assert.deepEqual(await p.evaluate(()=>b4calls),{});await p.evaluate(()=>{rightCommandSource('extend').disabled=false;rightCommandMenu.refresh()});
  for(const key of ['Enter','Space']){await reset();await focus('extend');await sector('extend').focus();await p.keyboard.press(key);await settled(p);assert.equal(await p.evaluate(()=>b4calls.extend),1);assert.equal(await p.evaluate(()=>mode),'extend')}
  assert(await p.evaluate(()=>b4sources.every(({id,node,handler})=>rightCommandSource(id)===node&&node.onclick===handler&&node.isConnected)));
  await reset();await focus('copyObjects');await p.screenshot({path:path.join(out,'1152x584-focused-r1.png')});await focus('panView');await p.screenshot({path:path.join(out,'1152x584-focused-r2.png')});
  for(const page of [p,ref]){await reset(page);await page.evaluate(()=>{rightCommandMenu.close();leftDrawingMenu.state.open=true;leftDrawingMenu.refresh()});await settled(page)}assert.deepEqual(await left(p),await left(ref));await p.screenshot({path:path.join(out,'1152x584-left-parity.png')});await ref.screenshot({path:path.join(out,'baseline-1152x584-left-parity.png')});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({evidence,physical:'Physical Xiaomi validation pending'},null,2));console.log('PASS RIGHT full arc N=6/2/3, normal/compact 44px targets, fixed paths, captured mouse/pen/touch, cancellation, source/keyboard/disabled parity, calculator transitions, LEFT/context/chrome parity; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
