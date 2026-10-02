const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1400,height:900}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{localStorage.setItem('ket-cau-grid-size','100');localStorage.setItem('ket-cau-grid','true')});
  const url=pathToFileURL(path.resolve('index.html')).href;await p.goto(url);
  const input=p.locator('#gridSize'),grid=p.locator('#gridToggle'),pattern=p.locator('#drawingGridPattern'),layer=p.locator('[data-grid-layer]');
  assert.deepEqual(await p.evaluate(()=>[gridVisible,gridSize,defaultGridSize]),[false,50,50]);assert.equal(await input.inputValue(),'50');
  assert.deepEqual(await input.evaluate(e=>['type','inputmode','step','min','max','aria-label'].map(k=>e.getAttribute(k))),['number','decimal','any','10','1000','Bước lưới']);
  assert.equal(await p.locator('#viewTools #gridSizeControl #gridSize').count(),1);
  await p.evaluate(()=>{
   items=[make('bar',400,400,700,400)];past=[copy(items)];future=[copy(items)];selected=items[0].id;multiSelection=new Set([selected]);
   documentName='spacing-test.json';savedDocument=documentText();render();saveDraft();
   window.spacingRender=render;window.spacingRenders=0;render=(...args)=>{spacingRenders++;return spacingRender(...args)};
  });
  const state=()=>p.evaluate(()=>({drawing:JSON.stringify(captureDrawing()),doc:documentText(),saved:savedDocument,title:document.title,file:headerFileName.textContent,
   mode,scales:[geometryScale,internalForceScale],snap:[snapEnabled,JSON.stringify(snapOptions)],camera:JSON.stringify(camera),
   storage:Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))}));
  const commit=async value=>{await input.fill(String(value));await input.press('Enter');assert.equal(await input.inputValue(),String(value));assert.equal(await p.evaluate(()=>gridSize),value)};
  const initial=await state();await commit(25);assert.deepEqual(await state(),initial);assert.equal(await layer.count(),0);assert.equal(await grid.getAttribute('aria-pressed'),'false');
  await grid.click();assert.equal(await pattern.getAttribute('width'),'25');assert.equal(await pattern.getAttribute('height'),'25');
  for(const value of [25,100,12.5,1000,10]){
   const before=await state();await commit(value);assert.deepEqual(await state(),before);
   assert.equal(await pattern.count(),1);assert.equal(await layer.count(),1);
   assert.deepEqual(await pattern.evaluate(e=>['width','height','x','y','patternUnits'].map(k=>e.getAttribute(k))),[String(value),String(value),'0','0','userSpaceOnUse']);
   assert.equal(await pattern.locator('path').getAttribute('d'),`M${value} 0H0V${value}`);
   assert.deepEqual(await layer.evaluate(e=>['x','y','width','height'].map(k=>e.getAttribute(k))),['-10000','-10000','20000','20000']);
  }
  await commit(25);const valid=await state(),renders=await p.evaluate(()=>spacingRenders);
  for(const value of ['0','-50','9.99','1000.01','']){
   await input.fill(value);assert.equal(await p.evaluate(()=>gridSize),25);assert.equal(await p.evaluate(()=>spacingRenders),renders);
   await input.press('Enter');assert.equal(await input.inputValue(),'25');assert.deepEqual(await state(),valid);assert.equal(await p.evaluate(()=>spacingRenders),renders);
  }
  // Number inputs sanitize NaN/Infinity; commit the resulting empty value too.
  for(const value of ['NaN','Infinity','-Infinity']){await input.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}))},value);assert.equal(await input.inputValue(),'25');assert.deepEqual(await state(),valid)}
  // Typing and unrelated canvas redraws never rewrite a partial number.
  for(const value of ['','-','1.']){
   await input.fill('');if(value)await input.pressSequentially(value);const typed=await input.inputValue();
   assert.equal(await p.evaluate(()=>gridSize),25);await p.evaluate(()=>render());assert.equal(await input.inputValue(),typed);
  }
  await input.blur();assert.equal(await input.inputValue(),'25');
  await input.fill('100');await p.locator('header strong').click();assert.equal(await input.inputValue(),'100');assert.equal(await p.evaluate(()=>gridSize),100);
  await input.fill('0');await input.blur();assert.equal(await input.inputValue(),'100');assert.equal(await p.evaluate(()=>gridSize),100);
  // Near (100,100), with no nearby geometric target: spacing does not snap points.
  await commit(25);
  for(const visible of [false,true])for(const enabled of [false,true]){
   if(await p.evaluate(()=>gridVisible)!==visible)await grid.click();
   if(await p.evaluate(()=>snapEnabled)!==enabled)await p.locator('#snapToggle').click();
   const before=await state();await commit(50);await commit(25);assert.deepEqual(await state(),before);
   assert.deepEqual(await p.evaluate(()=>[gridVisible,snapEnabled]),[visible,enabled]);
   const pointResult=await p.evaluate(()=>{const target=new DOMPoint(99.2,101.3).matrixTransform(svg.getScreenCTM()),e={clientX:target.x,clientY:target.y},raw=rawPoint(e);return {raw:{x:raw.x,y:raw.y},point:point(e)}});
   assert.deepEqual(pointResult.point,pointResult.raw);assert(Math.abs(pointResult.point.x-99.2)<1e-6&&Math.abs(pointResult.point.y-101.3)<1e-6);
  }
  await p.locator('#drawingScalesToggle').click();await p.locator('#geometryScale').fill('250');await p.locator('#geometryScale').press('Tab');
  assert.deepEqual(await p.evaluate(()=>[gridSize,geometryScale]),[25,250]);await p.evaluate(()=>closeDrawingScales());
  const scales=await p.evaluate(()=>[geometryScale,internalForceScale]);await commit(12.5);assert.deepEqual(await p.evaluate(()=>[geometryScale,internalForceScale]),scales);
  for(const m of ['bar','thin','dashed','curve','pin','force','moment','udl','dim']){
   await p.evaluate(m=>{setMode(m);first={x:400,y:400};if(m==='curve'||m==='dim')second={x:500,y:380};hover={x:580,y:400};render();saveDraft()},m);
   const before=await state();await commit(50);await commit(25);assert.deepEqual(await state(),before,m);
  }
  await p.evaluate(()=>cancelToSelection());
  const svg25=await p.evaluate(()=>exportSVG()),preview25=await p.evaluate(()=>previewDrawing(JSON.parse(documentText())));
  const png=async()=>{const pending=p.waitForEvent('download');await p.evaluate(()=>$('png').click());return fs.readFileSync(await (await pending).path())};
  const png25=await png();assert(png25.length>1000);await commit(100);assert.equal(await p.evaluate(()=>exportSVG()),svg25);assert.equal(await p.evaluate(()=>previewDrawing(JSON.parse(documentText()))),preview25);assert.deepEqual(await png(),png25);
  assert(!/drawingGridPattern|data-grid-layer/.test(svg25));assert(!/drawingGridPattern|data-grid-layer/.test(decodeURIComponent(preview25)));
  const bounds=await p.evaluate(()=>{fitDrawingView();return {camera:{...camera},bounds:getDrawingVisualBounds()}});await commit(25);
  assert.deepEqual(await p.evaluate(()=>{fitDrawingView();return {camera:{...camera},bounds:getDrawingVisualBounds()}}),bounds);
  await p.evaluate(()=>{render(true)});assert.equal(await layer.count(),0);assert.equal(await pattern.count(),0);await p.evaluate(()=>render());assert.equal(await layer.count(),1);
  const doc=await p.evaluate(()=>JSON.parse(documentText()));assert.equal(doc.version,1);assert(!Object.keys(doc).some(k=>/^grid/i.test(k)));
  await p.evaluate(async data=>loadDocument(new File([JSON.stringify({...data,gridSize:1000,gridVisible:false})],'legacy.json')),doc);
  assert.deepEqual(await p.evaluate(()=>[gridSize,gridVisible]),[25,true]);assert.equal(await input.inputValue(),'25');
  await p.evaluate(()=>$('clear').click());assert.deepEqual(await p.evaluate(()=>[gridSize,gridVisible]),[25,true]);assert.equal(await input.inputValue(),'25');
  await p.evaluate(()=>saveDraft());assert(!Object.keys(await p.evaluate(()=>JSON.parse(localStorage.getItem(draftKey)))).some(k=>/^grid/i.test(k)));
  await p.reload();assert.deepEqual(await p.evaluate(()=>[gridSize,gridVisible]),[50,false]);assert.equal(await input.inputValue(),'50');assert.deepEqual(errors,[]);
  console.log('PASS spacing range/decimals, invalid rollback, partial typing, Enter/blur, ON/OFF redraw, no Grid Snap, state/history/scale independence, identical SVG/PNG/preview, Fit, New/Open/reload');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
