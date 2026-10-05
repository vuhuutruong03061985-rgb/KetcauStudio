const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');
const baseline=execFileSync('git',['show','c8e2288:assets/tablet.js'],{encoding:'utf8'});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const out=path.resolve('.test-tools/semicircle-left-dynamic-context');fs.mkdirSync(out,{recursive:true});
  const p=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),ref=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),errors=[],evidence=[];
  p.on('pageerror',e=>errors.push(e.message));await ref.route('**/assets/tablet.js',r=>r.fulfill({contentType:'application/javascript',body:baseline}));
  for(const page of [p,ref])await page.goto(pathToFileURL(path.resolve('index.html')).href);
  const root=p.locator('.semicircle-left-menu');
  const snapshot=page=>page.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),mode,first,second,saved:savedDocument,dirty:documentText()!==savedDocument,rotation:currentMomentRotation,support:$('support').value,sectionPoints,hatchPoints,rigidPoints,dynamic:dynamicInput.hidden,fields:barNumericSession?.state,capture:dynamicNumericCapture,camera,gridVisible,gridSize,snapEnabled,snapOptions}));
  const reset=async(page=p)=>{await page.evaluate(()=>{document.activeElement?.blur();cancelToSelection();window.b3id=0;crypto.randomUUID=()=> 'b3-'+(++b3id);items=[make('bar',100,200,500,200)];past=[];future=[];selected=null;multiSelection.clear();leftDrawingMenu.close();rightCommandMenu.close();updateCommandControls();window.b3calls={};render()});await settled(page)};
  const open=async()=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await root.locator('[data-demo-id="hub"]').dispatchEvent('click');await settled(p)};
  const focus=async id=>{await open();await p.evaluate(id=>{const category=leftDrawingCategories.find(c=>c.entries.some(e=>e.id===id));selectLeftCategory(category.id,id);leftDrawingMenu.refresh()},id);await settled(p)};
  const ids=()=>root.locator('[data-fixed-action]').evaluateAll(es=>es.map(e=>e.dataset.fixedAction));
  const shot=async name=>{await settled(p);await p.screenshot({path:path.join(out,name+'.png')})};
  const shape=page=>page.evaluate(()=>leftDrawingMenu.layout.rings.map(r=>({r0:r.r0,r1:r.r1,step:r.step,sectors:r.sectors.map(s=>[s.a0,s.a1])})));
  const right=page=>page.evaluate(()=>({layout:rightCommandMenu.layout,mapping:rightCommandMenu.state.rings.map(r=>r.entries.map(e=>e.id))}));
  const geometry=async expected=>{
   assert.deepEqual(await ids(),expected);
   const g=await p.evaluate(()=>{const m=leftDrawingMenu,c=m.layout.contextRing;return {radius:m.layout.radius,profile:m.layout.profile,cx:m.layout.cx,cy:m.layout.cy,tool:m.layout.rings[1].r1,c:c&&{r0:c.r0,r1:c.r1,safe:c.targets.safe,width:c.targets.minimumWidth,sectors:c.sectors.map(s=>({a0:s.a0,a1:s.a1,path:s.path,hit:document.elementFromPoint(s.icon.x,s.icon.y)?.closest('[data-fixed-action]')?.dataset.fixedAction,disk:Array.from({length:72},(_,i)=>i*Math.PI/36).every(a=>semicircleEngine.hitTestRadialSector(s,s.icon.x+21.99999*Math.cos(a),s.icon.y+21.99999*Math.sin(a))) }))},controls:m.host.querySelectorAll('[data-fixed-action]').length}});
   assert.equal(g.controls,expected.length);
   if(!expected.length){assert.equal(g.c,null);assert.equal(g.radius,g.tool);assert.equal(await root.locator('.semicircle-outer-context').count(),0)}
   else{assert(g.c.safe&&g.c.width>=44);assert.equal(g.c.r0-g.tool,g.profile==='compact'?1:3);assert.equal(g.c.r1-g.c.r0,g.profile==='compact'?44:48);assert.equal(g.radius,g.c.r1);assert.equal(g.c.sectors.length,expected.length);assert.equal(g.c.sectors[0].a0,-Math.PI/2);assert.equal(g.c.sectors.at(-1).a1,Math.PI/2);for(const [i,s]of g.c.sectors.entries()){assert(s.disk);assert.equal(s.hit,expected[i]);assert(Math.abs(s.a1-s.a0-Math.PI/expected.length)<1e-12);if(i)assert.equal(s.a0,g.c.sectors[i-1].a1)}}
   return g;
  };
  await p.evaluate(()=>{window.b3sources=[...sharedOuterActions,...Object.values(leftContextOptions).flat()].map(entry=>({entry,node:entry.source,handler:entry.source.onclick}));for(const e of [...sharedOuterActions,...Object.values(leftContextOptions).flat()])e.source.addEventListener('click',()=>b3calls[e.id]=(b3calls[e.id]||0)+1)});
  for(const [width,height,active]of [[1376,1032,true],[1280,800,true],[1152,720,true],[1152,584,true],[1032,1376,true],[800,1280,true],[800,776,true],[800,600,true],[800,390,false],[432,800,true],[431,800,false],[390,800,false]]){
   for(const page of [p,ref]){await reset(page);await page.setViewportSize({width,height});await ownership(page,active)}
   assert.deepEqual(await right(p),await right(ref),'RIGHT exact baseline parity');
   if(!active){if(width===800)await shot('800x390-fallback');continue}
   await shot(width+'x'+height+'-closed');if([1152,1280,1376].includes(width))await ref.screenshot({path:path.join(out,'baseline-'+width+'x'+height+'-closed.png')});await focus('bar');const noContext=await geometry([]),functional=await shape(p);const profile=await p.evaluate(()=>leftDrawingMenu.layout.profile);const b2Shape=await ref.evaluate(profile=>{const E=semicircleEngine,l=E.solveConcentricRingLayout({rings:[{id:'category',count:4},{id:'tool',count:6}],bounds:{left:0,right:1376,top:0,bottom:1376},profile});return l.rings.map((r,i)=>({r0:r.r0,r1:r.r1,step:Math.PI/4,sectors:E.computeRadialSectors({itemCount:4,startAngle:-Math.PI/2,endAngle:Math.PI/2,innerRadius:r.r0,outerRadius:r.r1}).map(s=>[s.startAngle,s.endAngle])}))},profile);assert.deepEqual(functional,b2Shape,'B2 Category/Tool geometry within profile');
   const idle=await snapshot(p);
   for(const [tool,expected]of [['moment',['moment-cw','moment-ccw']],['diagram',['diagramM','diagramQ','diagramN','positive','negative']],['pin',['pin-plain']],['roller',['roller-plain']],['bar',[]]]){
    await focus(tool);const g=await geometry(expected);assert.deepEqual(await snapshot(p),idle);assert.equal(g.cx,noContext.cx);assert.equal(g.cy,noContext.cy);if(tool==='bar')assert.deepEqual(await shape(p),functional);
    if(width===1152&&height===584){await shot('1152x584-'+tool);await ref.evaluate(tool=>{selectLeftCategory(leftDrawingCategories.find(c=>c.entries.some(e=>e.id===tool)).id,tool);leftDrawingMenu.state.open=true;leftDrawingMenu.refresh()},tool);await settled(ref);await ref.screenshot({path:path.join(out,'baseline-1152x584-'+tool+'.png')})}
   }
   await p.evaluate(()=>{setMode('hatch');hatchPoints=[{x:300,y:300},{x:500,y:300},{x:450,y:450}];render();updateCommandControls()});await settled(p);await focus('diagram');
   const pending=await snapshot(p),largest=await geometry(['commandCancel','commandFinish','diagramM','diagramQ','diagramN','positive','negative']);assert.deepEqual(await snapshot(p),pending);
   await ref.evaluate(()=>{setMode('hatch');hatchPoints=[{x:300,y:300},{x:500,y:300},{x:450,y:450}];render();updateCommandControls()});await settled(ref);assert.deepEqual(await right(p),await right(ref),'RIGHT pending parity');
   await ref.evaluate(()=>{leftDrawingMenu.state.open=true;selectLeftCategory('annotation','diagram');leftDrawingMenu.refresh()});await settled(ref);if([1152,1280,1376].includes(width))await ref.screenshot({path:path.join(out,'baseline-'+width+'x'+height+'-largest-context.png')});evidence.push({width,height,noContext,largest,baselineRadius:await ref.evaluate(()=>leftDrawingMenu.layout.radius)});
   if([1152,1280,1376].includes(width))await shot(width+'x'+height+'-largest-context');
  }
  await p.setViewportSize({width:1152,height:584});await ownership(p,true);await reset();await focus('bar');await shot('1152x584-no-context');
  // N=1 / N=2 actual command controls, no reserved Finish when unavailable.
  await p.evaluate(()=>{setMode('hatch');hatchPoints=[{x:300,y:300}];render();updateCommandControls()});await settled(p);await focus('hatch');await geometry(['commandCancel']);
  await p.evaluate(()=>{hatchPoints.push({x:500,y:300},{x:450,y:450});render();updateCommandControls()});await settled(p);await geometry(['commandCancel','commandFinish']);await shot('1152x584-command');
  // Pointer drag and pointer cancellation do not invoke a command or move boundaries.
  const before=await snapshot(p),paths=await root.locator('[data-fixed-action] .semicircle-hit').evaluateAll(es=>es.map(e=>e.getAttribute('d')));
  const q=await p.evaluate(()=>leftDrawingMenu.layout.contextRing.sectors[0].icon);await p.mouse.move(q.x,q.y);await p.mouse.down();await p.mouse.move(q.x+60,q.y+50,{steps:5});await p.mouse.up();await settled(p);assert.deepEqual(await snapshot(p),before);assert.deepEqual(await p.evaluate(()=>b3calls),{});assert.deepEqual(await root.locator('[data-fixed-action] .semicircle-hit').evaluateAll(es=>es.map(e=>e.getAttribute('d'))),paths);
  // Compare real-command and radial-command results, including history/cleanup.
  for(const id of ['commandFinish','commandCancel']){
   for(const page of [p,ref]){await reset(page);await page.evaluate(()=>{setMode('hatch');$('hatchMethod').value='points';hatchPoints=[{x:300,y:300},{x:500,y:300},{x:450,y:450}];render();updateCommandControls()});await settled(page)}
   await focus('hatch');await ref.evaluate(id=>$(id).click(),id);const q=await p.evaluate(id=>{const m=leftDrawingMenu,i=[...m.host.querySelectorAll('[data-fixed-action]')].findIndex(n=>n.dataset.fixedAction===id);return m.layout.contextRing.sectors[i].icon},id);await p.touchscreen.tap(q.x,q.y);await settled(p);await settled(ref);
   assert.equal(await p.evaluate(id=>b3calls[id],id),1);assert.deepEqual(await snapshot(p),await snapshot(ref));
  }
  for(const [tool,id]of [['moment','moment-ccw'],['diagram','diagramQ'],['pin','pin-plain'],['roller','roller-plain']]){
   await reset();await focus(tool);const q=await p.evaluate(id=>{const m=leftDrawingMenu,i=[...m.host.querySelectorAll('[data-fixed-action]')].findIndex(n=>n.dataset.fixedAction===id);return m.layout.contextRing.sectors[i].icon},id);await p.touchscreen.tap(q.x,q.y);await settled(p);assert.equal(await p.evaluate(id=>b3calls[id],id),1);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
   if(tool==='moment')assert.equal(await p.evaluate(()=>currentMomentRotation),'ccw');else if(tool==='diagram')assert.equal(await p.evaluate(()=>mode),id);else assert.equal(await p.evaluate(()=>$('support').value),id);
  }
  await reset();await p.evaluate(()=>{setMode('bar');first={x:600,y:300};render();beginBarNumericInput({clientX:550,clientY:400,pointerType:'touch'});window.b3first=first;window.b3capture=dynamicNumericCapture});await p.locator('#dynamicInputValue').focus();await settled(p);const numeric=await snapshot(p);await focus('bar');await geometry([]);assert.deepEqual(await snapshot(p),numeric);assert(await p.evaluate(()=>first===b3first&&dynamicNumericCapture===b3capture));
  await p.locator('#dynamicInputValue').fill('5.5');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');const locked=await snapshot(p);await focus('diagram');assert.deepEqual(await snapshot(p),locked);assert(await p.evaluate(()=>first===b3first&&dynamicNumericCapture===b3capture));
  assert(await p.evaluate(()=>['undo','redo'].every(id=>tabletTopBar.contains($(id))&&document.querySelectorAll('#'+id).length===1)));
  assert(await p.evaluate(()=>b3sources.every(({entry,node,handler})=>entry.source===node&&node.isConnected&&node.onclick===handler)));
  await reset();const gridBefore=await snapshot(p);for(const id of ['gridToggle','snapToggle']){const key=id==='gridToggle'?'gridVisible':'snapEnabled',old=await p.evaluate(key=>key==='gridVisible'?gridVisible:snapEnabled,key);await p.locator('#'+id).tap();assert.equal(await p.evaluate(key=>key==='gridVisible'?gridVisible:snapEnabled,key),!old);await p.locator('#'+id).tap();assert.equal(await p.evaluate(key=>key==='gridVisible'?gridVisible:snapEnabled,key),old)}const gridAfter=await snapshot(p);for(const key of ['doc','past','future','mode','first','second','saved','dirty','camera','gridSize'])assert.deepEqual(gridAfter[key],gridBefore[key]);
  const profiles=await p.evaluate(()=>['normal','compact'].map(profile=>semicircleEngine.solveLeftDynamicContextLayout({rings:[{id:'category',count:4},{id:'tool',count:8}],contextCount:7,bounds:{left:0,right:1152,top:52,bottom:516},profile})));for(const l of profiles)assert(l.fits&&l.contextRing.targets.safe);
  await reset();await p.setViewportSize({width:800,height:558});await ownership(p,true);await focus('force');const start=await p.evaluate(()=>leftDrawingMenu.layout.rings[1].sectors[0].icon),end=await p.evaluate(()=>leftDrawingMenu.layout.rings[1].sectors[1].icon);await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y,{steps:8});await p.mouse.up();await settled(p);assert.equal(await p.evaluate(()=>leftDrawingMenu.layout.profile),'compact');await geometry(['moment-cw','moment-ccw']);assert(await p.evaluate(()=>leftDrawingMenu.state.rings.every(r=>r.entries.every((e,i)=>r.controls.get(i).querySelector('.semicircle-hit').getAttribute('d')===leftDrawingMenu.layout.rings.find(l=>l.id===r.id).sectors[i].path))));assert.deepEqual(await p.evaluate(()=>b3calls),{});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({evidence,profiles},null,2));console.log('PASS LEFT dynamic context N=0/1/2/5/7, full arc/44px disks, B2 functional annuli, RIGHT parity, source delegation, drag, cleanup/history, Dynamic Input; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
