const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');
const expected={geometry:['bar','thin','dashed','curve'],supports:['hinge','linkBar','weld','pin','roller','fixed'],loads:['force','moment','udl'],annotation:['dim','text','person','section','rigidRegion','hatch','joint','diagram']};
const baseline=execFileSync('git',['show','59fd5f2:assets/tablet.js'],{encoding:'utf8'});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const out=path.resolve('.test-tools/semicircle-left-hierarchy');fs.mkdirSync(out,{recursive:true});
  const p=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),reference=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await reference.route('**/assets/tablet.js',r=>r.fulfill({contentType:'application/javascript',body:baseline}));
  for(const page of [p,reference])await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.evaluate(()=>{cancelToSelection();saveDraft();window.sources=leftDrawingCategories.flatMap(c=>c.entries).filter(e=>e.source).map(e=>({entry:e,node:e.source,handler:e.source.onclick}));window.calls={};for(const {entry,node}of sources)node.addEventListener('click',()=>calls[entry.id]=(calls[entry.id]||0)+1)});
  const state=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,second,dirty:documentText()!==savedDocument,dynamic:dynamicInput.hidden,capture:JSON.stringify(dynamicNumericCapture),fields:JSON.stringify(barNumericSession?.state),storage:JSON.stringify(localStorage),camera:JSON.stringify(camera),snap:JSON.stringify(snapOptions),snapEnabled,gridSize,gridVisible}));
  const open=async()=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');await settled(p)};
  const tap=async id=>{const q=await p.evaluate(id=>{const m=leftDrawingMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon},id);await p.touchscreen.tap(q.x,q.y);await settled(p)};
  const category=async id=>{await open();await tap(id);assert.equal(await p.evaluate(()=>leftCategoryId),id)};
  const focus=async id=>{await category(Object.keys(expected).find(c=>expected[c].includes(id)));if(!await p.evaluate(id=>leftDrawingMenu.state.rings[1].focusedId===id,id))await tap(id)};
  const shot=async name=>{await p.waitForTimeout(700);await settled(p);await p.screenshot({path:path.join(out,name+'.png')})};
  const context=page=>page.evaluate(()=>({radius:leftDrawingMenu.layout.radius,profile:leftDrawingMenu.layout.profile,cx:leftDrawingMenu.layout.cx,cy:leftDrawingMenu.layout.cy,bounds:leftDrawingMenu.layout.bounds,context:leftDrawingMenu.layout.contextRing}));
  const right=page=>page.evaluate(()=>({layout:rightCommandMenu.layout,mapping:rightCommandMenu.state.rings.map(r=>r.entries.map(e=>e.id))}));
  const geometry=async id=>{
   const value=await p.evaluate(()=>{
    const m=leftDrawingMenu,E=semicircleEngine;
    return {ids:m.state.rings.map(r=>r.entries.map(e=>e.id)),rings:m.layout.rings.map(r=>({r0:r.r0,r1:r.r1,safe:r.targets.safe,sectors:r.sectors.map(s=>({a0:s.a0,a1:s.a1})),disk:r.sectors.every(s=>Array.from({length:72},(_,i)=>i*Math.PI/36).every(a=>E.hitTestRadialSector(s,s.icon.x+21.999999*Math.cos(a),s.icon.y+21.999999*Math.sin(a)))),hits:r.sectors.every(s=>document.elementFromPoint(s.icon.x,s.icon.y)?.closest('[data-roller-ring]')?.dataset.rollerRing===r.id)})),count:m.host.querySelectorAll('.semicircle-roller-ring').length,upright:[...m.host.querySelectorAll('.semicircle-icon')].every(e=>!e.getAttribute('transform')?.includes('rotate')),axis:m.host.querySelectorAll('.roller-slot').length};
   });
   assert.equal(value.count,2);assert.equal(value.axis,0);assert(value.upright);
   assert.deepEqual(value.ids,[Object.keys(expected),expected[id]]);
   for(const r of value.rings){assert(r.safe&&r.disk&&r.hits);assert(r.r1-r.r0>=44);assert.equal(r.sectors[0].a0,-Math.PI/2);assert.equal(r.sectors.at(-1).a1,Math.PI/2);for(const [i,s]of r.sectors.entries()){assert(Math.abs(s.a1-s.a0-Math.PI/r.sectors.length)<1e-12);if(i)assert.equal(s.a0,r.sectors[i-1].a1)}}
   return value.rings.map(r=>({inner:r.r0,outer:r.r1,count:r.sectors.length}));
  };
  const evidence=[];
  for(const [width,height,active]of [[1376,1032,true],[1280,800,true],[1152,720,true],[1152,584,true],[1032,1376,true],[800,1280,true],[800,776,true],[800,600,true],[800,390,false],[432,800,true],[431,800,false],[390,800,false]]){
   await p.evaluate(()=>leftDrawingMenu.close());
   for(const page of [p,reference]){await page.setViewportSize({width,height});await ownership(page,active)}
   assert.deepEqual(await context(p),await context(reference),'exact baseline context including paths, slots and annulus');
   assert.deepEqual(await right(p),await right(reference),'RIGHT geometry/mapping unchanged');
   if([584,800,1032,390].includes(height)&&[1152,1280,1376,800].includes(width))await shot(width+'x'+height+'-closed');
   if(active){
    const before=await state();await open();
    for(const id of Object.keys(expected)){await category(id);evidence.push({width,height,id,geometry:await geometry(id)});assert.deepEqual(await state(),before);if(width===1152&&height===584)await shot('1152x584-'+id)}
    assert.deepEqual(await p.evaluate(()=>calls),{});
    assert(await p.evaluate(()=>sources.every(({entry,node,handler})=>entry.source===node&&node.onclick===handler&&leftDrawingCategories.some(c=>c.entries.includes(entry)))));
    assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="extend"],.semicircle-left-menu [data-demo-id="undo"],.semicircle-left-menu [data-demo-id="redo"]').count(),0);
    assert(await p.evaluate(()=>['undo','redo'].every(id=>tabletTopBar.contains($(id))&&document.querySelectorAll('#'+id).length===1)));
    if(width===1280||width===1376)await shot(width+'x'+height+'-annotation');
   }
  }
  await p.setViewportSize({width:1152,height:584});await ownership(p,true);
  // Stable session category, then authoritative active-tool synchronization.
  await category('annotation');await p.evaluate(()=>leftDrawingMenu.close());await open();assert.equal(await p.evaluate(()=>leftCategoryId),'annotation');
  for(const [mode,cat,tool]of [['bar','geometry','bar'],['force','loads','force'],['diagramQ','annotation','diagram']]){await p.evaluate(mode=>{setMode(mode);leftDrawingMenu.close()},mode);await open();assert.equal(await p.evaluate(()=>leftCategoryId),cat);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].focusedId),tool)}
  await p.evaluate(()=>{cancelToSelection();leftDrawingMenu.close();leftCategoryId=null});await open();assert.equal(await p.evaluate(()=>leftCategoryId),'geometry');
  // First contact focuses, second contact invokes the existing real source once.
  await category('supports');await tap('hinge');assert.deepEqual(await p.evaluate(()=>calls),{});await tap('hinge');assert.deepEqual(await p.evaluate(()=>calls),{hinge:1});assert.equal(await p.evaluate(()=>mode),'hinge');
  await p.evaluate(()=>{cancelToSelection();calls={}});await focus('moment');await shot('1152x584-moment-context');assert.equal(await p.locator('.semicircle-left-menu [data-context-action]').count(),2);
  await focus('diagram');await shot('1152x584-diagram-context');assert.deepEqual(await p.locator('.semicircle-left-menu [data-context-action]').evaluateAll(es=>es.map(e=>e.dataset.contextAction)),['diagramM','diagramQ','diagramN','positive','negative']);
  await category('geometry');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.focusedEntry),null);assert.equal(await p.locator('.semicircle-left-menu [data-context-action]').count(),0);
  // Direct entry replacement must repaint, preserve source objects and clear stale focus.
  await p.evaluate(()=>leftDrawingMenu.setRingEntries('tool',leftDrawingCategories[1].entries,'not-present'));assert.equal(await p.locator('.semicircle-left-menu [data-roller-ring="tool"]').count(),6);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].focusedId),null);
  await p.evaluate(()=>leftDrawingMenu.setRingEntries('tool',leftDrawingCategories[0].entries,'thin'));assert.equal(await p.locator('.semicircle-left-menu [data-roller-ring="tool"]').count(),4);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.focusedEntry.id),'thin');
  // Full-arc navigation changes stable-ID focus without rotating or executing.
  await focus('bar');const idle=await state(),paths=await p.evaluate(()=>leftDrawingMenu.layout.rings.map(r=>r.sectors.map(s=>s.path)));
  const positions=await p.evaluate(()=>leftDrawingMenu.layout.rings[1].sectors.map(s=>s.icon));
  await p.mouse.move(positions[0].x,positions[0].y);await p.mouse.down();await p.mouse.move(positions[1].x,positions[1].y,{steps:8});await p.mouse.up();
  assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].focusedId),'thin');assert.deepEqual(await p.evaluate(()=>calls),{});assert.deepEqual(await state(),idle);assert.deepEqual(await p.evaluate(()=>leftDrawingMenu.layout.rings.map(r=>r.sectors.map(s=>s.path))),paths);
  // Interrupting a drag with no initial tool focus must not invent a first-tool focus.
  for(const interruption of ['blur','resize']){
   await category('geometry');await category('supports');
   const q=await p.evaluate(()=>leftDrawingMenu.layout.rings[1].sectors.slice(0,2).map(s=>s.icon));
   await p.mouse.move(q[0].x,q[0].y);await p.mouse.down();await p.mouse.move(q[1].x,q[1].y,{steps:5});await p.evaluate(type=>window.dispatchEvent(new Event(type)),interruption);await p.mouse.up();
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].focusedId),null);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.focusedEntry),null);assert.deepEqual(await state(),idle);
  }
  // Replacing entries during a captured contact cancels the old gesture completely.
  const contact=await p.evaluate(()=>leftDrawingMenu.layout.rings[1].sectors[0].icon);
  await p.mouse.move(contact.x,contact.y);await p.mouse.down();assert(await p.evaluate(()=>leftDrawingMenu.host.querySelector('svg').hasPointerCapture(leftDrawingMenu.state.rings[1].pointerId)));
  await p.evaluate(()=>selectLeftCategory('annotation'));await p.mouse.up();
  assert(await p.evaluate(()=>{const r=leftDrawingMenu.state.rings[1];return r.pointerId===null&&!r.dragging&&!r.snapFrame&&r.focusedId===null&&r.entries===leftDrawingCategories[3].entries}));
  await geometry('annotation');assert.deepEqual(await p.evaluate(()=>calls),{});assert.deepEqual(await state(),idle);
  // Capability unmount/remount retains the session category with the matching tools.
  for(const matches of [false,true])await p.evaluate(matches=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:matches});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches,media:floatingToolsMedia.media}))},matches);
  await ownership(p,true);await open();assert.equal(await p.evaluate(()=>leftCategoryId),'annotation');await geometry('annotation');
  const keyboardBefore=await state();await p.locator('.semicircle-left-menu [data-demo-id="loads"]').focus();await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.demoId),'loads');assert.equal(await p.evaluate(()=>leftCategoryId),'loads');assert.deepEqual(await state(),keyboardBefore);
  // Numeric capture/first-point identity and LIVE/LOCKED fields survive category browsing.
  await p.evaluate(()=>{document.activeElement?.blur();setMode('bar');first={x:600,y:300};render();beginBarNumericInput({clientX:550,clientY:400,pointerType:'touch'});window.savedFirst=first;window.savedCapture=dynamicNumericCapture});
  await p.locator('#dynamicInputValue').focus();const pending=await state(),value=await p.locator('#dynamicInputValue').inputValue();
  for(const id of Object.keys(expected)){await category(id);assert.deepEqual(await state(),pending);assert(await p.evaluate(()=>first===savedFirst&&dynamicNumericCapture===savedCapture));assert.equal(await p.locator('#dynamicInputValue').inputValue(),value)}
  assert.equal(await p.evaluate(()=>barNumericSession.state.distance.mode),'live');
  await p.locator('#dynamicInputValue').fill('5.5');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');
  assert.deepEqual(await p.evaluate(()=>barNumericSession.state.distance),{mode:'locked',value:5.5});
  const locked=await state();
  for(const id of Object.keys(expected)){await category(id);assert.deepEqual(await state(),locked);assert(await p.evaluate(()=>first===savedFirst&&dynamicNumericCapture===savedCapture))}
  // Actual Cancel/Finish paths are still baseline paths while command UI is available.
  for(const page of [p,reference]){await page.setViewportSize({width:1280,height:800});await page.evaluate(()=>{document.activeElement?.blur();cancelToSelection();setMode('hatch');hatchPoints=[{x:400,y:300},{x:600,y:300},{x:500,y:450}];render();updateCommandControls();leftDrawingMenu.close();leftDrawingMenu.host.querySelector('[data-demo-id="hub"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))});await settled(page)}
  for(const id of ['commandCancel','commandFinish'])assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="'+id+'"] .semicircle-hit').getAttribute('d'),await reference.locator('.semicircle-left-menu [data-demo-id="'+id+'"] .semicircle-hit').getAttribute('d'));
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));
  console.log('PASS LEFT full-arc hierarchy, ordered categories/tools, exact closure/44px disks, same sources, no category side effects, session/active focus, numeric capture, baseline context and RIGHT parity; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
