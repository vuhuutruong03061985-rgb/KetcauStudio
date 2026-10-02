const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const expected=[['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],['panView','snapOptions','openCalculator']];
const removed=['snapToggle','drawingScalesToggle','clear','open','save','saveAs','svg','png','insertWord','zoomOut','zoomIn','fitView','undo','redo'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const out=path.resolve('.test-tools/semicircle-right-compact');fs.mkdirSync(out,{recursive:true});
  const settled=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const shot=async name=>{await settled();await p.screenshot({path:path.join(out,name+'.png')})};
  const open=async()=>{if(!await p.evaluate(()=>rightCommandMenu.state.open))await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await settled()};
  const sector=id=>p.locator('.semicircle-right-menu [data-roller-ring][data-demo-id="'+id+'"]');
  const focus=async id=>{await open();if(!await p.evaluate(id=>{const r=rightCommandMenu.state.rings.find(r=>r.entries.some(e=>e.id===id));return r.entries[r.activeIndex].id===id},id))await sector(id).dispatchEvent('click');await settled()};
  const memory=()=>p.evaluate(()=>rightCommandMenu.state.rings.map(r=>({id:r.id,focus:r.entries[r.activeIndex].id,offset:r.offset,index:r.activeIndex})));
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),saved:savedDocument,past:JSON.stringify(past),future:JSON.stringify(future),scales:[geometryScale,internalForceScale],mode,snapEnabled,panEnabled}));
  const mapping=()=>p.evaluate(()=>({config:rightCommandRings.map(r=>r.ids),ids:rightCommandMenu.state.rings.map(r=>r.id),entries:rightCommandMenu.state.rings.map(r=>r.entries.map(e=>e.id||e.dataset.toolbarIcon)),real:rightCommandRings.flatMap(r=>r.entries).every(e=>e.source===rightCommandSource(e.id)),defaults:rightCommandRings.map(r=>r.defaultTool),snapShared:rightCommandRings[1].entries.find(e=>e.id==='snapOptions').source===snapButton}));
  let map=await mapping();assert.deepEqual(map.config,expected);assert.deepEqual(map.ids,['R1','R2']);assert.deepEqual(map.defaults,['resetView','panView']);assert(map.real&&map.snapShared);assert.deepEqual(map.entries,[expected[0],expected[1].slice(0,2)]);
  await open();assert.equal(await p.locator('.semicircle-right-menu .semicircle-roller-ring').count(),2);
  for(const id of removed)assert.equal(await sector(id).count(),0,id+' has no keyboard-reachable roller sector');
  assert.deepEqual(await p.evaluate(()=>sharedOuterActions.map(e=>e.id)),['commandCancel','commandFinish','undo','redo']);
  assert.deepEqual(await p.locator('#tabletTopBar button').evaluateAll(es=>es.map(e=>e.id||e.dataset.toolbarIcon)),['clear','open','save','saveAs','svg','png','insertWord']);
  assert.deepEqual(await p.locator('#tabletBottomZoom').evaluate(e=>[...e.children].map(c=>c.id)),['zoomOut','zoomLevel','zoomIn','fitView']);
  assert.deepEqual(await p.locator('#tabletBottomView').evaluate(e=>[...e.children].map(c=>c.id)),['gridToggle','gridSizeControl','snapToggle','drawingScalesToggle']);
  const left=await p.evaluate(()=>leftDrawingRings.map(r=>r.entries.map(e=>e.id||e.dataset.toolbarIcon)));
  assert.deepEqual(left,[['bar','thin','dashed','curve'],['hinge','linkBar','weld','pin','roller','fixed'],['force','moment','udl'],['dim','text','person','section','rigidRegion','hatch','joint','diagram']]);
  assert.deepEqual(await p.evaluate(()=>[leftDrawingMenu.layout.radius,rightCommandMenu.layout.radius]),[304.04759747124507,248.81914748738225]);
  assert(await p.evaluate(()=>rightCommandMenu.layout.radius<333.608041374721));
  const targets=()=>p.evaluate(()=>{const m=rightCommandMenu,l=m.layout;return l.rings.every((r,i)=>Math.abs(r.sectors[m.state.rings[i].activeIndex].icon.y-l.cy)<1e-8)&&l.rings.flatMap(r=>r.sectors).every(s=>{for(let a=0;a<2*Math.PI;a+=Math.PI/36)if(!semicircleEngine.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)))return false;return true})});
  assert(await targets());await shot('01-right-landscape');await shot('03-r1-select-default');await shot('05-r2-pan');await shot('11-all-chrome-compact-right');
  await p.evaluate(()=>{snapEnabled=false;updateSnapControls();snapPanel.open=false});const initial=await snapshot();await focus('editSelected');assert.deepEqual(await snapshot(),initial);await shot('04-r1-edit-focused');
  await p.locator('#snapToggle').tap();await settled();await shot('06-bottom-snap-enabled');assert(await p.evaluate(()=>snapEnabled));await p.locator('header strong').tap();
  await focus('snapOptions');await sector('snapOptions').focus();await p.keyboard.press('Enter');assert(await p.evaluate(()=>snapPanel.open));assert.equal(await p.evaluate(()=>document.activeElement.id),'snap-endpoint');await shot('07-snap-options-open');await p.locator('header strong').tap();
  await p.locator('#drawingScalesToggle').focus();await p.keyboard.press('Space');await settled();assert(await p.locator('#drawingScales').isVisible());await shot('08b-scale-open');await p.locator('header strong').tap();
  // Entry state memory and source synchronization stay independent after removed
  // source states/zoom changes; no file/zoom source is in a ring or observer list.
  await p.evaluate(()=>{snapEnabled=false;updateSnapControls();panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');snapPanel.open=false;closeDrawingScales();drawingScalesButton.setAttribute('aria-expanded','false')});
  await p.evaluate(()=>setMode('bar'));await focus('copyObjects');await focus('panView');const remembered=await memory();
  await p.evaluate(()=>{rightCommandMenu.close();for(const id of ['save','open','zoomIn'])$(id).setAttribute('aria-pressed','true');$('zoomIn').click();$('zoomOut').click()});await open();assert.deepEqual(await memory(),remembered);
  await p.evaluate(()=>{for(const id of ['save','open','zoomIn'])$(id).removeAttribute('aria-pressed')});
  // Count real handlers for both keyboard activation keys. First click only focuses.
  await p.evaluate(()=>{window.compactCalls=0;panButton.addEventListener('click',()=>compactCalls++)});await focus('panView');assert.equal(await p.evaluate(()=>compactCalls),0);
  for(const key of ['Enter','Space']){await focus('panView');await sector('panView').focus();await p.keyboard.press(key)}assert.equal(await p.evaluate(()=>compactCalls),2);
  // Verify normal Tab traversal remains inside the real sector order until it
  // leaves the menu; removed controls cannot be traversed within RIGHT.
  await open();await sector('resetView').focus();let visits=0;
  for(let i=0;i<20;i++){const active=await p.evaluate(()=>{const a=document.activeElement;return a.closest('.semicircle-right-menu')?{id:a.dataset.demoId,ring:a.dataset.rollerRing}:null});if(active){visits++;if(active.ring)assert(!removed.includes(active.id))}await p.keyboard.press('Tab')}assert(visits>2);
  assert.equal(await p.evaluate(()=>rightCommandSource('openCalculator')),null);
  await open();await shot('10-calculator-unavailable');
  // Explicit capability fixture only: this build has no installed calculator.
  // It exercises existing conditional routing, never creates a production command.
  await p.evaluate(()=>{const source=document.createElement('button');source.id='openCalculator';source.title='Calculator capability fixture';source.hidden=true;source.onclick=()=>window.calculatorFixtureCalls=(window.calculatorFixtureCalls||0)+1;$('viewTools').append(source);refreshRightCommandEntries();rightCommandMenu.refresh()});
  assert.deepEqual((await mapping()).entries,[expected[0],expected[1].slice(0,2)]);
  await p.evaluate(()=>{$('openCalculator').hidden=false;refreshRightCommandEntries();rightCommandMenu.refresh()});assert.deepEqual((await mapping()).entries,expected);assert((await mapping()).real);assert(await targets());
  await focus('openCalculator');await shot('09-calculator-available-fixture');await sector('openCalculator').dispatchEvent('click');assert.equal(await p.evaluate(()=>calculatorFixtureCalls),1);
  await p.evaluate(()=>{$('openCalculator').hidden=true;refreshRightCommandEntries();rightCommandMenu.refresh()});assert.deepEqual((await mapping()).entries,[expected[0],expected[1].slice(0,2)]);assert.equal(await sector('openCalculator').count(),0);await open();await shot('10b-calculator-hidden-fixture');
  await p.evaluate(()=>{$('openCalculator').remove();refreshRightCommandEntries();rightCommandMenu.refresh()});
  const projected=()=>p.evaluate(()=>{const top=tabletChromeBottom(true),bounds=[leftDrawingBounds(top,tabletLeftChromeTop(true)),rightCommandBounds(top,tabletRightChromeTop(true))];return [leftDrawingMenu,rightCommandMenu].map((m,i)=>({radius:m.layout.radius,bounds:bounds[i],fits:semicircleEngine.solveConcentricRingLayout({side:m.state.side,rings:m.state.rings.map(r=>({id:r.id,count:r.entries.length})),bounds:bounds[i],fixedOuter:true}).fits}))});
  const evidence=[];
  for(const viewport of [{width:1280,height:800},{width:800,height:1280},{width:800,height:784},{width:800,height:783},{width:800,height:777},{width:800,height:776},{width:800,height:666},{width:800,height:665}]){
   await p.setViewportSize(viewport);await settled();const sides=await projected();await p.waitForFunction(value=>document.body.dataset.radialPrimary===String(value),sides.every(s=>s.fits));evidence.push({viewport,left:sides[0].fits,right:sides[1].fits,joint:sides.every(s=>s.fits)});
   if(viewport.height>=777){await open();assert(await targets())}
   if(viewport.height===1280)await shot('02-right-portrait');
  }
  assert.deepEqual(evidence.map(e=>[e.left,e.right,e.joint]),[[true,true,true],[true,true,true],[true,true,true],[true,true,true],[true,true,true],[false,true,false],[false,true,false],[false,false,false]]);
  // Search every possible height against unchanged hypothetical chrome bounds,
  // independently of fallback hiding those chrome nodes.
  const minima=await p.evaluate(()=>{const b=[leftDrawingBounds(tabletChromeBottom(true),tabletLeftChromeTop(true)),rightCommandBounds(tabletChromeBottom(true),tabletRightChromeTop(true))];return [leftDrawingMenu,rightCommandMenu].map((m,i)=>{for(let h=1;h<=900;h++){const bounds={...b[i],bottom:b[i].bottom+h-innerHeight};if(bounds.bottom>bounds.top&&semicircleEngine.solveConcentricRingLayout({side:m.state.side,rings:m.state.rings.map(r=>({id:r.id,count:r.entries.length})),bounds,fixedOuter:true}).fits)return h}return null})});
  assert.deepEqual(minima,[777,666]);
  await p.setViewportSize({width:1280,height:800});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');await shot('12-left-regression');
  assert.deepEqual(await p.evaluate(()=>leftDrawingRings.map(r=>r.entries.map(e=>e.id||e.dataset.toolbarIcon))),left);assert.deepEqual(errors,[]);
  const report={before:333.608041374721,after:248.81914748738225,leftRadius:304.04759747124507,minima:{left:777,right:666,joint:777},evidence,calculator:'native source absent; conditional available/hidden adapter tested with explicit fixture',screenshots:fs.readdirSync(out).filter(n=>n.endsWith('.png'))};fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(report,null,2));console.log('PASS compact RIGHT sources/mapping/memory/keyboard/44px targets/chrome/fit thresholds',JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
