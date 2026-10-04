const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const children=['diagramM','diagramQ','diagramN','positive','negative'];
const l4=['dim','text','person','section','rigidRegion','hatch','joint','diagram'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const root=p.locator('.semicircle-left-menu'),sector=id=>root.locator(`[data-demo-id="${id}"]`);
  const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,second,selected,rotation:currentMomentRotation,support:$('support').value}));
  const documentState=async()=>{const {mode,first,second,selected,rotation,support,...doc}=await snapshot();return doc};
  const memory=()=>p.evaluate(()=>leftDrawingMenu.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset})));
  const contextIds=()=>root.locator('[data-context-action]').evaluateAll(es=>es.map(e=>e.dataset.contextAction));
  const point=id=>p.evaluate(id=>{
   const m=leftDrawingMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));
   return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon;
  },id);
  const tapMain=async id=>{const q=await point(id);await p.touchscreen.tap(q.x,q.y);await settled()};
  const open=async()=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await sector('hub').dispatchEvent('click');await settled()};
  const focus=async id=>{
   await open();const centered=await p.evaluate(id=>{const r=leftDrawingMenu.state.rings.find(r=>r.entries.some(e=>e.id===id));return r.entries[r.activeIndex].id===id},id);
   if(!centered)await tapMain(id);
   else if(id==='diagram')await tapMain(id);
   else if(await p.evaluate(id=>leftDrawingMenu.state.focusedEntry?.id!==id,id)){
    const next=await p.evaluate(id=>{const r=leftDrawingMenu.state.rings.find(r=>r.entries.some(e=>e.id===id));return r.entries[(r.activeIndex+1)%r.entries.length].id},id);
    await tapMain(next);await tapMain(id);
   }
  };
  const reset=async()=>{await p.evaluate(()=>{document.activeElement?.blur();cancelToSelection();selected=null;multiSelection.clear();closeSecondaryTools();closeMomentPalette();leftDrawingMenu.close();rightCommandMenu.close();window.diagramCalls={}});await settled()};
  const out=path.resolve('.test-tools/semicircle-diagram-context');fs.mkdirSync(out,{recursive:true});
  const shot=async name=>{await p.waitForTimeout(600);await settled();await p.screenshot({path:path.join(out,name+'.png')})};
  const activate=async(id,type='touch',ending='up',drag=false)=>{
   const q=await p.evaluate(id=>{const entries=leftContextEntries(leftDrawingMenu.state.focusedEntry);return leftDrawingMenu.layout.contextRing.middle[entries.length][entries.findIndex(e=>e.id===id)].icon},id);
   if(type==='Enter'||type==='Space'){await sector(id).focus();await p.keyboard.press(type);await settled();return}
   const cdp=await p.context().newCDPSession(p);let {x,y}=q;
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',buttons:1,clickCount:1,pointerType:type});
   if(drag){x+=80;y+=60;if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y,button:'left',buttons:1,pointerType:type})}
   if(ending==='blur'||ending==='resize')await p.evaluate(type=>window.dispatchEvent(new Event(type)),ending);
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:ending==='cancel'?'touchCancel':'touchEnd',touchPoints:[]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',buttons:0,clickCount:1,pointerType:type});
   await cdp.detach();await settled();
  };
  assert.deepEqual(await p.evaluate(()=>leftDrawingRings[3].entries.map(e=>e.id)),l4);
  assert.equal(await p.evaluate(()=>leftDrawingRings[3].defaultTool),'dim');
  assert.equal(await p.evaluate(()=>leftDiagramParent.source??null),null);
  assert.equal(await p.locator('#tools button[data-mode="diagram"]').count(),0);
  assert.equal(await p.evaluate(()=>Object.hasOwn(modes,'diagram')),false);
  for(const id of children)assert.equal(await p.locator(`#tools button[data-mode="${id}"]`).count(),1);
  await p.evaluate(()=>{window.diagramCalls={};for(const entry of leftDrawingGroups.flatMap(g=>g.children))entry.source.addEventListener('click',()=>diagramCalls[entry.id]=(diagramCalls[entry.id]||0)+1)});

  // Geometry is generic: all counts, small/large ring configurations, both sides,
  // same envelope, deterministic order, mirrored sectors and full 44px disks.
  const geometry=await p.evaluate(()=>{
   const E=semicircleEngine,fail=[],check=(ok,label)=>{if(!ok)fail.push(label)},measurements=[];
   const disk=s=>{for(let a=0;a<2*Math.PI;a+=Math.PI/72)if(!E.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)))return false;return true};
   for(const rings of [[{id:'one',count:1}],leftDrawingRings.map(r=>({id:r.id,count:r.entries.length})),rightCommandMenu.state.rings.map(r=>({id:r.id,count:r.entries.length}))]){
    const bounds={left:0,right:1280,top:52,bottom:784};
    for(const side of ['left','right']){
     const l=E.solveConcentricRingLayout({side,rings,bounds,fixedOuter:true}),c=l.contextRing;
     const opposite=E.solveConcentricRingLayout({side:side==='left'?'right':'left',rings,bounds,fixedOuter:true}),mirror=E.mirrorSemicircleLayout(l);
     check(c.middle.length===6,'counts 0–5');check(JSON.stringify(mirror.contextRing)===JSON.stringify(opposite.contextRing),'mirror');
     check(c.sectors.slice(0,2).every(s=>s.a1<0)&&c.sectors.slice(2).every(s=>s.a0>0),'top/bottom order');
     check(c.sectors.every(disk),'fixed 44px disks');
     for(let count=0;count<=5;count++){
      const slots=c.middle[count],all=[...c.sectors.slice(0,2),...slots,...c.sectors.slice(2)];
      check(slots.length===count,'count');check(all.every(s=>s.r0===c.r0&&s.r1===c.r1),'same annulus');
      check(all.every(disk),'44px disk');check(all.every((s,i)=>!i||s.a0>all[i-1].a1),'no overlap/order');
      check(slots.every((s,i)=>!i||s.icon.y>slots[i-1].icon.y),'visual order');
      check(all.every(s=>s.a0>=-Math.PI/2&&s.a1<=Math.PI/2),'inside semicircle');
      const repeat=E.solveConcentricRingLayout({side,rings,bounds,fixedOuter:true});
      check(repeat.radius===l.radius&&JSON.stringify(repeat.contextRing.middle[count])===JSON.stringify(slots),'stable/deterministic');
     }
     if(rings.length===4)measurements.push({side,radius:l.radius,fixedTarget:Math.min(...c.sectors.map(s=>2*((s.r0+s.r1)/2)*Math.sin((s.a1-s.a0)/2))),fiveTarget:Math.min(...c.middle[5].map(s=>2*((s.r0+s.r1)/2)*Math.sin((s.a1-s.a0)/2))),thickness:c.r1-c.r0});
    }
   }
   const compact=leftDrawingRings.map(r=>({id:r.id,count:r.entries.length})),before=compact.map(r=>r.id==='L4'?{...r,count:12}:r);
   const old=E.solveConcentricRingLayout({rings:before,bounds:{left:0,right:1280,top:52,bottom:784},fixedOuter:true}),next=leftDrawingMenu.layout;
   check(next.radius<=old.radius,'no radius increase');check(next.rings[3].step>old.rings[3].step,'larger L4 angular targets');
   return {fail,measurements,l4StepBefore:old.rings[3].step,l4StepAfter:next.rings[3].step};
  });assert.deepEqual(geometry.fail,[]);console.log('GEOMETRY',JSON.stringify(geometry));

  // Prove navigationOnly is independent of the Diagram ID and works with the
  // generic rings API. Render every context count through the same layer.
  await reset();const genericBefore=await snapshot();
  await p.evaluate(()=>{
   leftDrawingMenu.host.style.visibility='hidden';rightCommandMenu.host.style.visibility='hidden';window.genericActions=0;window.genericCount=0;
   window.genericMenu=semicircleEngine.createMenu({side:'left',rings:[{id:'generic',entries:[{id:'normal',label:'Normal',icon:'bar'},{id:'options',label:'Options',icon:'diagramM',navigationOnly:true}]}],activateCentered:true,outerActions:sharedOuterActions,getContextEntries:()=>leftContextOptions.diagram.slice(0,genericCount),getBounds:()=>({left:0,right:innerWidth,top:52,bottom:innerHeight-16}),onAction:()=>genericActions++});
   genericMenu.host.querySelector('[data-demo-id="hub"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));
  });
  const generic=p.locator('.semicircle-prototype.semicircle-multi-roller'),options=generic.locator('[data-demo-id="options"]');
  await options.focus();await p.keyboard.press('Enter');await p.keyboard.press('Enter');await p.keyboard.press('Space');
  assert.equal(await p.evaluate(()=>genericActions),0);assert.equal(await p.evaluate(()=>genericMenu.state.open),true);
  const reserved=await p.evaluate(()=>genericMenu.layout.radius);
  for(let count=0;count<=5;count++){await p.evaluate(count=>{genericCount=count;genericMenu.refresh()},count);assert.equal(await generic.locator('[data-context-action]').count(),count);assert.equal(await p.evaluate(()=>genericMenu.layout.radius),reserved)}
  assert.deepEqual(await snapshot(),genericBefore);assert.deepEqual(await p.evaluate(()=>diagramCalls),{});
  await p.evaluate(()=>{genericMenu.destroy();leftDrawingMenu.host.style.visibility='';rightCommandMenu.host.style.visibility=''});

  await reset();await focus('dim');await shot('l4-default');
  const before=await snapshot();await focus('diagram');assert.deepEqual(await contextIds(),children);
  assert.deepEqual(await snapshot(),before);assert.deepEqual(await p.evaluate(()=>diagramCalls),{});
  assert.equal(await sector('diagram').getAttribute('aria-label'),'Biểu đồ nội lực');
  assert.equal(await sector('diagram').locator('title').textContent(),'Biểu đồ nội lực');
  assert.equal(await root.locator('[data-context-action][aria-pressed="true"]').count(),0);
  for(const kind of ['touch','Enter','Space']){
   if(kind==='touch')await tapMain('diagram');else{await sector('diagram').focus();await p.keyboard.press(kind);await settled()}
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),true);assert.deepEqual(await snapshot(),before);assert.deepEqual(await p.evaluate(()=>diagramCalls),{});assert.deepEqual(await contextIds(),children);
  }
  await p.evaluate(()=>document.activeElement.blur());await shot('diagram-empty');
  assert.equal(await root.locator('[data-roller-ring="L4"]').count(),8);
  assert.equal(await root.locator('[data-roller-ring="L4"][data-demo-id="diagram"]').count(),1);
  for(const id of children)assert.equal(await root.locator(`[data-roller-ring][data-demo-id="${id}"]`).count(),0);

  // Every child uses its real source once, closes the menu, and reopens under
  // the logical parent with exactly that child selected and other memories intact.
  for(const [index,id]of children.entries()){
   await reset();await focus('diagram');const doc=await documentState();
   await activate(id,['touch','pen','mouse','Enter','Space'][index]);
   assert.equal(await p.evaluate(id=>diagramCalls[id],id),1);assert.equal(await p.evaluate(()=>mode),id);
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await documentState(),doc);
   const remembered=await memory();await p.evaluate(()=>{const r=leftDrawingMenu.state.rings[3];r.offset=r.activeIndex=0});await open();
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[3].entries[leftDrawingMenu.state.rings[3].activeIndex].id),'diagram');
   assert.deepEqual((await memory()).slice(0,3),remembered.slice(0,3));assert.deepEqual(await contextIds(),children);
   assert.equal(await root.locator('[data-context-action][aria-pressed="true"]').count(),1);assert.equal(await sector(id).getAttribute('aria-pressed'),'true');
   assert((await sector('diagram').getAttribute('class')).includes('has-active-child'));
   assert(!await sector('diagram').getAttribute('aria-pressed'));assert.equal(await p.evaluate(()=>Object.hasOwn(modes,'diagram')),false);
   await p.evaluate(()=>document.activeElement.blur());await shot('diagram-'+id);
  }
  for(const key of ['Enter','Space'])for(const id of children){await reset();await focus('diagram');const doc=await documentState();await activate(id,key);assert.deepEqual(await p.evaluate(()=>diagramCalls),{[id]:1});assert.equal(await p.evaluate(()=>mode),id);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await documentState(),doc)}
  // Q -> N switches directly between existing modes, with no parent activation.
  await reset();await p.evaluate(()=>setMode('diagramQ'));await open();await activate('diagramN');assert.equal(await p.evaluate(()=>mode),'diagramN');assert.deepEqual(await p.evaluate(()=>diagramCalls),{diagramN:1});
  // Source changes refresh child and parent styling without a close/reopen.
  await open();await p.evaluate(()=>document.querySelector('button[data-mode="positive"]').click());await settled();
  assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),true);assert.equal(await sector('positive').getAttribute('aria-pressed'),'true');assert.equal(await sector('diagramN').getAttribute('aria-pressed'),'false');
  await p.evaluate(()=>setMode('select'));await settled();assert.equal(await root.locator('[data-context-action][aria-pressed="true"]').count(),0);assert(!(await sector('diagram').getAttribute('class')).includes('has-active-child'));
  await focus('thin');const remembered=await memory();await sector('hub').dispatchEvent('click');await open();assert.deepEqual(await memory(),remembered);
  await tapMain('diagram');assert.deepEqual(await contextIds(),children);

  // Real roller motion updates context at the detent before pointer-up, without
  // mode/source activation. Other ring memory and the outer paths remain fixed.
  const dragL4=async(steps,expected)=>{
   const saved=await snapshot(),old=await memory(),fixed=await p.evaluate(()=>leftDrawingMenu.layout.contextRing.sectors.map(s=>s.path));
   const q=await p.evaluate(()=>{const m=leftDrawingMenu,r=m.state.rings[3],l=m.layout.rings[3],s=l.sectors[r.activeIndex];return{x:s.icon.x,y:s.icon.y,cx:m.layout.cx,cy:m.layout.cy,r:(s.r0+s.r1)/2,step:l.step}});
   await p.mouse.move(q.x,q.y);await p.mouse.down();for(let i=1;i<=12;i++){const a=-q.step*steps*i/12;await p.mouse.move(q.cx+q.r*Math.cos(a),q.cy+q.r*Math.sin(a))}
   assert.deepEqual(await contextIds(),expected);await p.mouse.up();await p.waitForTimeout(210);
   assert.deepEqual(await snapshot(),saved);assert.deepEqual((await memory()).slice(0,3),old.slice(0,3));assert.deepEqual(await p.evaluate(()=>leftDrawingMenu.layout.contextRing.sectors.map(s=>s.path)),fixed);
  };
  await reset();await focus('text');await dragL4(-2,children);await dragL4(4,[]);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.focusedEntry.id),'section');await shot('section-empty');assert.deepEqual(await p.evaluate(()=>diagramCalls),{});

  await focus('diagram');const hoverDoc=await snapshot(),hoverMemory=await memory();
  for(const id of children){await sector(id).dispatchEvent('pointermove',{pointerType:'pen',pointerId:777,clientX:200,clientY:300});for(const type of ['mouse','pen','touch']){await activate(id,type,'up',true);assert.deepEqual(await snapshot(),hoverDoc,id+' '+type+' drag')}}
  for(const ending of ['cancel','blur','resize']){await activate('diagramQ','touch',ending);assert.deepEqual(await snapshot(),hoverDoc,ending)}
  assert.deepEqual(await snapshot(),hoverDoc);assert.deepEqual(await memory(),hoverMemory);assert.deepEqual(await p.evaluate(()=>diagramCalls),{});assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),true);
  // Source disabled state still blocks pointer and keyboard activation.
  await p.evaluate(()=>document.querySelector('button[data-mode="diagramQ"]').disabled=true);await settled();
  assert.equal(await sector('diagramQ').getAttribute('aria-disabled'),'true');assert.equal(await sector('diagramQ').getAttribute('tabindex'),'-1');await sector('diagramQ').dispatchEvent('click');assert.deepEqual(await p.evaluate(()=>diagramCalls),{});
  await p.evaluate(()=>document.querySelector('button[data-mode="diagramQ"]').disabled=false);await settled();
  await focus('moment');assert.deepEqual(await contextIds(),['moment-cw','moment-ccw']);await shot('moment-regression');
  await focus('pin');assert.deepEqual(await contextIds(),['pin-plain']);await shot('pin-regression');
  await focus('roller');assert.deepEqual(await contextIds(),['roller-plain']);

  const bounds=()=>p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>({side:m.state.side,radius:m.layout.radius,fits:m.layout.fits,bounds:m.layout.bounds})));
  await reset();await focus('diagram');await shot('left-landscape');const landscape=await bounds();
  assert.deepEqual(landscape.map(g=>g.radius),[304.04759747124507,248.81914748738225]);
  await p.setViewportSize({width:800,height:1280});await settled();await open();assert.deepEqual((await bounds()).map(g=>g.radius),landscape.map(g=>g.radius));await shot('left-portrait');
  await p.setViewportSize({width:800,height:784});await p.waitForFunction(()=>rightCommandMenu.layout.bounds.bottom===716&&document.body.dataset.radialPrimary==='true');await open();await shot('boundary-fit');console.log('BOUNDARY FIT',JSON.stringify(await bounds()));
  await p.setViewportSize({width:800,height:766});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='false');await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close()});
  for(const id of children){const source=p.locator(`#tools button[data-mode="${id}"]`);if(!await source.isVisible())await p.locator('#toggleTools').tap();await source.tap();assert.equal(await p.evaluate(()=>mode),id)}
  // Keep all original options accessible in the fallback palette.
  if(!await p.locator('#toolPanel').isVisible())await p.locator('#toggleTools').tap();await p.locator('#tools button[data-mode="diagramM"]').scrollIntoViewIfNeeded();await shot('fallback');console.log('BOUNDARY FALLBACK',JSON.stringify(await bounds()));
  await p.setViewportSize({width:1280,height:800});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');await p.evaluate(()=>{cancelToSelection();rightCommandMenu.close()});await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');assert.equal(await p.locator('.semicircle-right-menu [data-context-action]').count(),0);await shot('right-unchanged');
  assert.deepEqual(errors,[]);console.log('PASS compact L4, generic navigation-only/context 0–5, real child sources/parent sync, keyboard, hover/drag/cancel, regressions, targets and safe fit; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
