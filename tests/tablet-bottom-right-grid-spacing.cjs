const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const url=pathToFileURL(path.resolve('index.html')).href;await p.goto(url);
  const cdp=await context.newCDPSession(p),out=path.resolve('.test-tools/tablet-bottom-right-grid-spacing');fs.mkdirSync(out,{recursive:true});
  const ids=['gridToggle','gridSizeControl','snapToggle','drawingScalesToggle'],input=p.locator('#gridSize');
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const ready=async v=>{await p.waitForFunction(v=>document.body.dataset.radialPrimary===String(v),v);await settle()};
  const shot=async name=>{await settle();await p.screenshot({path:path.join(out,name+'.png')})};
  const tap=async selector=>{await p.locator(selector).scrollIntoViewIfNeeded();await settle();const r=await p.locator(selector).boundingBox();assert(r,selector);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle()};
  const edit=async value=>{await input.fill(String(value));await input.press('Enter');assert.equal(await p.evaluate(()=>gridSize),value);assert.equal(await input.inputValue(),String(value))};
  await p.evaluate(()=>{
   window.spacingSources=['gridToggle','gridSizeControl','gridSize','snapToggle','drawingScalesToggle'].map($);window.spacingHomeOrder=[...$('viewTools').children];
   window.spacingCanvasDowns=0;window.spacingSyntheticKeys=[];svg.addEventListener('pointerdown',()=>spacingCanvasDowns++);
   window.addEventListener('keydown',e=>{if(!e.isTrusted&&['Enter','Escape'].includes(e.key))spacingSyntheticKeys.push(e.key)},true);
  });
  const identity=async restored=>{
   assert(await p.evaluate(restored=>spacingSources.every(e=>e===$(e.id)&&e.parentElement.id===(e.id==='gridSize'?'gridSizeControl':restored?'viewTools':'tabletBottomView')),restored));
   for(const id of [...ids,'gridSize'])assert.equal(await p.locator('#'+id).count(),1);
   if(restored)assert(await p.evaluate(()=>[...$('viewTools').children].every((e,i)=>e===spacingHomeOrder[i])&&$('viewTools').children.length===spacingHomeOrder.length));
  };
  await identity(true);await p.locator('#gridToggle').click();await edit(25);await input.blur();await shot('14-desktop');
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await ready(true);await identity(false);
  assert.deepEqual(await p.locator('#tabletBottomView').evaluate(e=>[...e.children].map(e=>e.id)),ids);
  const geometry=()=>p.evaluate(()=>({bar:[tabletBottomRightBar.offsetWidth,tabletBottomRightBar.offsetHeight],
   controls:[gridButton,gridSizeControl,gridSizeInput,snapButton,drawingScalesButton].map(e=>[e.offsetWidth,e.offsetHeight]),
   bottoms:[leftDrawingBounds().bottom,rightCommandBounds().bottom],radii:[leftDrawingMenu.layout.radius,rightCommandMenu.layout.radius]}));
  const measured=await geometry();assert.deepEqual(measured,{bar:[208,48],controls:[[44,44],[60,44],[60,44],[44,44],[44,44]],bottoms:[732,732],radii:[304.04759747124507,248.81914748738225]});
  const state=()=>p.evaluate(()=>({drawing:JSON.stringify(captureDrawing()),doc:documentText(),saved:savedDocument,title:document.title,mode,camera:JSON.stringify(camera),panEnabled,gridVisible,snapEnabled,snap:JSON.stringify(snapOptions),scaleOpen:!drawingScales.hidden,
   rings:[leftDrawingMenu,rightCommandMenu].map(m=>m.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset,pointer:r.pointerId,dragging:r.dragging})))}));
  const original=await state();await tap('#gridSize');await edit(50);assert.deepEqual(await state(),original);await input.blur();await shot('01-grid-50-landscape');
  await edit(25);await input.blur();await shot('02-grid-25-landscape');await edit(100);await input.blur();await shot('03-grid-100-landscape');
  await edit(25);await tap('#gridToggle');await shot('04-grid-off-size-25');assert.equal(await p.locator('[data-grid-layer]').count(),0);await tap('#gridToggle');await shot('06-four-control-row');
  await p.setViewportSize({width:800,height:1280});await ready(true);await shot('05-portrait');await p.setViewportSize({width:1280,height:800});await ready(true);
  // Real pending Bar numeric capture survives unrelated spacing typing and Enter.
  await p.evaluate(()=>{setMode('bar');first={x:300,y:300};hover={x:450,y:350};beginBarNumericInput({clientX:400,clientY:400,pointerType:'touch'});render();window.spacingCapture=dynamicNumericCapture});
  await edit(50);const pending=await state();await tap('#gridSize');await edit(25);assert.deepEqual(await state(),pending);assert(await p.evaluate(()=>dynamicNumericCapture===spacingCapture));
  await shot('08-active-bar-edited-spacing');
  // Moderate and stronger visual-only keyboard shrink move only the focused row.
  const otherChrome=()=>p.evaluate(()=>[tabletTopBar,tabletBottomLeftBar].map(e=>e.getBoundingClientRect().toJSON())),chromeBefore=await otherChrome();
  for(const viewport of [{height:480,top:0},{height:260,top:20}]){
   await p.evaluate(v=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:v.height});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:v.top});visualViewport.dispatchEvent(new Event('resize'))},viewport);await ready(true);
   const field=await input.boundingBox();assert.equal(await p.evaluate(()=>document.activeElement.id),'gridSize');assert(field.y>=viewport.top&&field.y+field.height<=viewport.top+viewport.height);
   assert.deepEqual(await state(),pending);assert.deepEqual(await otherChrome(),chromeBefore);
   await shot(viewport.height===480?'07-focused-keyboard-visual-viewport':'18-strong-keyboard-visual-viewport');
  }
  await edit(12.5);assert(await p.evaluate(()=>dynamicNumericCapture===spacingCapture));
  await p.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'))});await ready(true);
  // Android can resize both layout and visual viewport; focus and source stay put.
  await p.setViewportSize({width:1280,height:480});await ready(true);assert.equal(await input.inputValue(),'12.5');assert((await input.boundingBox()).y+44<=480);await identity(false);await shot('15-focused-keyboard-layout-viewport');
  await p.setViewportSize({width:1280,height:800});await ready(true);await input.blur();await p.evaluate(()=>cancelToSelection());
  await edit(25);await input.blur();await p.evaluate(()=>zoomAt(2));await shot('09-zoom-in-25');await edit(100);await input.blur();await p.evaluate(()=>zoomAt(.25));await shot('10-zoom-out-100');
  await edit(10);await input.blur();await p.evaluate(()=>{camera={x:0,y:0,w:4400,h:2880};applyCamera()});await shot('16-min-spacing-max-zoom-out');
  await edit(25);await input.blur();await p.evaluate(()=>{camera={x:0,y:0,w:1100,h:720};applyCamera()});
  for(const side of ['right','left']){await p.locator('.semicircle-'+side+'-menu [data-demo-id="hub"]').dispatchEvent('click');await shot(side==='right'?'11-right-radial':'12-left-radial');await tap('#gridSize');assert.equal(await p.evaluate(()=>gridSize),25);await input.blur()}
  const evidence=[];
  for(const viewport of [{width:1280,height:800},{width:800,height:1280},{width:800,height:784},{width:800,height:783},{width:800,height:777},{width:800,height:776},{width:390,height:800},{width:431,height:800},{width:432,height:800},{width:440,height:800}]){
   const admitted=viewport.height!==776&&viewport.width>=432;await p.setViewportSize(viewport);await ready(admitted);await identity(!admitted);assert.equal(await input.inputValue(),'25');
   for(let i=0;i<3;i++){await p.evaluate(()=>{leftDrawingMenu.refresh();rightCommandMenu.refresh()});await settle();assert.equal(await p.evaluate(()=>document.body.dataset.radialPrimary),String(admitted))}
   const bars=await p.evaluate(()=>[tabletBottomLeftBar,tabletBottomRightBar].map(e=>e.getBoundingClientRect().toJSON()));
   if(admitted)assert(bars[0].right<=bars[1].left);else assert(bars.every(r=>r.width===0&&r.height===0));
   evidence.push({viewport,admitted,bars});
   if(viewport.width===431||viewport.width===432)await shot(viewport.width===431?'19-narrow-431-fallback':'20-narrow-432-admitted');
   if(viewport.height===776){if(!(await input.isVisible()))await tap('#ribbonToggle');await tap('#gridSize');await shot('13-tablet-fallback');await edit(50);await edit(25);await input.blur()}
  }
  await p.setViewportSize({width:1280,height:800});await ready(true);assert.deepEqual(await geometry(),measured);
  await edit(1000);await shot('17-max-value-focused');await edit(25);await input.blur();
  // Measured strip insets also govern admission, with stable fallback/recovery.
  await p.setViewportSize({width:440,height:800});await ready(true);
  await p.evaluate(()=>{tabletBottomRightBar.style.right='80px';queueRadialPrimaryUpdate()});await ready(false);await identity(true);
  await p.evaluate(()=>{tabletBottomRightBar.style.removeProperty('right');queueRadialPrimaryUpdate()});await ready(true);await identity(false);
  assert.equal(await p.evaluate(()=>spacingCanvasDowns),0);assert.deepEqual(await p.evaluate(()=>spacingSyntheticKeys),[]);
  assert.deepEqual(await p.evaluate(()=>rightCommandRings.map(r=>r.ids)),[['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],['panView','snapOptions','openCalculator']]);
  assert.deepEqual(errors,[]);const report={measured,before:[144,48],viewports:evidence,screenshots:fs.readdirSync(out).filter(n=>n.endsWith('.png')),input:'Headless Edge; CDP touch and simulated visual/layout keyboard viewports, no physical Android keyboard'};
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(report,null,2));console.log('PASS spacing source identity, touch/input isolation, pending Bar/Dynamic Input, keyboard viewports, 208x48 row, measured overlap fallback, unchanged radial geometry/admission',JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
