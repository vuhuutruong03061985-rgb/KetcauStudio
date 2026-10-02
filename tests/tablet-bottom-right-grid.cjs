const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const cdp=await context.newCDPSession(p),out=path.resolve('.test-tools/tablet-bottom-right-grid');fs.mkdirSync(out,{recursive:true});
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const ready=async v=>{await p.waitForFunction(v=>document.body.dataset.radialPrimary===String(v),v);await settle()};
  const shot=async name=>{await settle();await p.screenshot({path:path.join(out,name+'.png')})};
  const tap=async selector=>{await p.locator(selector).scrollIntoViewIfNeeded();await settle();const r=await p.locator(selector).boundingBox();assert(r,selector);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle()};
  const ids=['gridToggle','snapToggle','drawingScalesToggle'];
  await p.evaluate(()=>{
   window.gridSource=gridButton;window.gridHandler=gridButton.onclick;window.gridHomeOrder=[...$('viewTools').children];
   window.gridCanvasDowns=0;window.gridCommandKeys=[];svg.addEventListener('pointerdown',()=>gridCanvasDowns++);
   window.addEventListener('keydown',e=>{if(['Enter','Escape'].includes(e.key))gridCommandKeys.push(e.key)},true);
  });
  const identity=async restored=>{
   assert(await p.evaluate(restored=>gridButton===gridSource&&$('gridToggle')===gridSource&&gridSource.onclick===gridHandler&&gridSource.parentElement.id===(restored?'viewTools':'tabletBottomView'),restored));
   if(restored)assert(await p.evaluate(()=>[...$('viewTools').children].every((e,i)=>e===gridHomeOrder[i])&&$('viewTools').children.length===gridHomeOrder.length));
   for(const id of ids)assert.equal(await p.locator('#'+id).count(),1);
  };
  await identity(true);await shot('15-desktop');await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await ready(true);await identity(false);
  assert.deepEqual(await p.locator('#tabletBottomView button').evaluateAll(es=>es.map(e=>e.id)),ids);
  const geometry=()=>p.evaluate(()=>({size:[tabletBottomRightBar.getBoundingClientRect().width,tabletBottomRightBar.getBoundingClientRect().height],
   targets:[gridButton,snapButton,drawingScalesButton].map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height]),
   bottoms:[leftDrawingBounds().bottom,rightCommandBounds().bottom],radii:[leftDrawingMenu.layout.radius,rightCommandMenu.layout.radius]}));
  const measured=await geometry();assert.deepEqual(measured,{size:[208,48],targets:[[44,44],[44,44],[44,44]],bottoms:[732,732],radii:[304.04759747124507,248.81914748738225]});
  const mapping=await p.evaluate(()=>rightCommandRings.map(r=>r.ids));assert.deepEqual(mapping,[['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],['panView','snapOptions','openCalculator']]);
  await shot('01-grid-off-landscape');await tap('#gridToggle');assert(await p.evaluate(()=>gridVisible));await shot('02-grid-on-landscape');await shot('11-three-bottom-right-controls');
  await p.setViewportSize({width:800,height:1280});await ready(true);await shot('03-grid-on-portrait');await p.setViewportSize({width:1280,height:800});await ready(true);
  if(await p.evaluate(()=>snapEnabled))await tap('#snapToggle');await shot('04-grid-on-snap-off');await tap('#snapToggle');await p.evaluate(()=>snapPanel.open=false);await shot('05-grid-on-snap-on');
  await p.evaluate(()=>zoomAt(2));await shot('06-zoom-in');await p.evaluate(()=>zoomAt(.25));await shot('07-zoom-out');
  await p.evaluate(()=>{camera.x=-1600;camera.y=1800;applyCamera()});await shot('08-pan-away-origin');
  await p.evaluate(()=>{camera={x:300,y:260,w:CAMERA_MIN_WIDTH,h:CAMERA_MIN_WIDTH/CAMERA_ASPECT};applyCamera()});await shot('16-min-camera-width');
  await p.evaluate(()=>{camera={x:-1000,y:-500,w:CAMERA_MAX_WIDTH,h:CAMERA_MAX_WIDTH/CAMERA_ASPECT};applyCamera()});await shot('17-max-camera-width');
  await p.evaluate(()=>{camera={x:0,y:0,w:1100,h:720};applyCamera()});await shot('09-objects-over-grid');
  await p.evaluate(()=>{setMode('bar');first={x:300,y:300};hover={x:450,y:350};render()});
  const pending=()=>p.evaluate(()=>({mode,drawing:JSON.stringify(captureDrawing()),doc:documentText(),saved:savedDocument,scales:[geometryScale,internalForceScale]}));
  const before=await pending();await tap('#gridToggle');await tap('#gridToggle');assert.deepEqual(await pending(),before);await shot('10-active-bar-grid-toggle');
  await p.evaluate(()=>cancelToSelection());
  for(const side of ['right','left']){await p.locator('.semicircle-'+side+'-menu [data-demo-id="hub"]').dispatchEvent('click');await shot(side==='right'?'12-right-radial-grid':'13-left-radial-grid');await p.evaluate(side=>(side==='right'?rightCommandMenu:leftDrawingMenu).close(),side)}
  const evidence=[];
  for(const viewport of [{width:1280,height:800},{width:800,height:1280},{width:800,height:784},{width:800,height:783},{width:800,height:777},{width:800,height:776}]){
   await p.setViewportSize(viewport);await ready(viewport.height!==776);await identity(viewport.height===776);
   const sides=await p.evaluate(()=>{const top=tabletChromeBottom(true),bounds=[leftDrawingBounds(top,tabletLeftChromeTop(true)),rightCommandBounds(top,tabletRightChromeTop(true))];return [leftDrawingMenu,rightCommandMenu].map((m,i)=>semicircleEngine.solveConcentricRingLayout({side:m.state.side,rings:m.state.rings.map(r=>({id:r.id,count:r.entries.length})),bounds:bounds[i],fixedOuter:true}).fits)});
   assert.deepEqual(sides,viewport.height===776?[false,true]:[true,true]);assert(await p.evaluate(()=>gridVisible));
   evidence.push({viewport,left:sides[0],right:sides[1],joint:sides.every(Boolean)});
   if(viewport.height===776){if(!(await p.locator('#gridToggle').isVisible()))await tap('#ribbonToggle');await shot('14-tablet-fallback');await tap('#gridToggle');assert(!(await p.evaluate(()=>gridVisible)));await tap('#gridToggle')}
  }
  await p.setViewportSize({width:1280,height:800});await ready(true);await identity(false);assert.deepEqual(await geometry(),measured);
  await p.evaluate(()=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:false});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches:false,media:floatingToolsMedia.media}))});await ready(false);await identity(true);assert(await p.evaluate(()=>gridVisible));
  if(!(await p.locator('#gridToggle').isVisible()))await p.locator('#ribbonToggle').click();await p.locator('#gridToggle').click();assert(!(await p.evaluate(()=>gridVisible)));await p.locator('#gridToggle').click();await shot('18-desktop-grid-on');
  assert.equal(await p.evaluate(()=>gridCanvasDowns),0);assert.deepEqual(await p.evaluate(()=>gridCommandKeys),[]);assert.deepEqual(await p.evaluate(()=>rightCommandRings.map(r=>r.ids)),mapping);assert.deepEqual(errors,[]);
  const report={measured,before:[96,48],jointMinimum:777,viewports:evidence,screenshots:fs.readdirSync(out).filter(n=>n.endsWith('.png')),input:'Edge headless, CDP touch emulation; no physical Android evidence'};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(report,null,2));console.log('PASS Grid same-source ownership/handler, 208x48 strip, touch isolation, pending Bar, restored state, unchanged radii/bounds and joint threshold',JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
