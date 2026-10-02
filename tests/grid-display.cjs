const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1400,height:900}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.addInitScript(()=>{localStorage.setItem('ket-cau-grid','true');localStorage.setItem('ket-cau-grid-size','20')});
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const grid=p.locator('#gridToggle'),layer=p.locator('[data-grid-layer]');
  assert.deepEqual(await p.evaluate(()=>[gridVisible,gridSize,defaultGridSize]),[false,50,50]);
  assert.equal(await grid.getAttribute('aria-pressed'),'false');assert.equal(await layer.count(),0);
  await p.evaluate(()=>{
   items=[make('bar',400,400,700,400)];past=[copy(items)];future=[copy(items)];selected=items[0].id;multiSelection=new Set([selected]);
   savedDocument=documentText();documentName='grid-test.json';render();saveDraft();
  });
  const state=()=>p.evaluate(()=>({document:documentText(),saved:savedDocument,title:document.title,file:$('headerFileName')?.textContent,
   drawing:JSON.stringify(captureDrawing()),mode,camera:JSON.stringify(camera),scales:[geometryScale,internalForceScale],snap:[snapEnabled,JSON.stringify(snapOptions)],
   storage:Object.fromEntries(Object.keys(localStorage).map(k=>[k,localStorage.getItem(k)]))}));
  const initial=await state();await grid.click();assert.deepEqual(await state(),initial);
  assert.equal(await grid.getAttribute('aria-pressed'),'true');assert(await grid.evaluate(e=>e.classList.contains('active')&&e.title===e.textContent&&e.getAttribute('aria-label')===e.textContent));
  assert(await grid.evaluate(e=>e.classList.contains('icon-button')&&!!e.style.getPropertyValue('--tool-icon')));
  assert.equal(await layer.count(),1);assert.equal(await p.locator('#drawingGridPattern').count(),1);
  const pattern=()=>p.locator('#drawingGridPattern').evaluate(e=>e.outerHTML);
  const definition=await pattern();
  assert.deepEqual(await p.locator('#drawingGridPattern').evaluate(e=>['x','y','width','height','patternUnits','patternContentUnits'].map(k=>e.getAttribute(k))),['0','0','50','50','userSpaceOnUse','userSpaceOnUse']);
  assert.equal(await p.locator('#drawingGridPattern path').count(),1);
  assert.deepEqual(await layer.evaluate(e=>['x','y','width','height','pointer-events','data-id','aria-hidden'].map(k=>e.getAttribute(k))),['-10000','-10000','20000','20000','none',null,'true']);
  assert(await layer.evaluate(e=>!e.closest('g[data-id]')&&e.previousElementSibling.getAttribute('fill')==='white'&&!!(e.compareDocumentPosition(document.querySelector('#drawing g[data-id]'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  const committed=await p.locator('#drawing g[data-id]:not([data-move-anchor],[data-endpoint],[data-extend-end],[data-rigid-point],[data-rigid-action])').evaluateAll(es=>es.map(e=>e.dataset.id));
  await p.evaluate(()=>render(true));assert.equal(await layer.count(),0);assert.equal(await p.locator('#drawingGridPattern').count(),0);assert.deepEqual(await p.locator('#drawing g[data-id]').evaluateAll(es=>es.map(e=>e.dataset.id)),committed);
  await p.evaluate(()=>render());assert.equal(await layer.count(),1);
  // The same model origin/spacing survives camera changes; no screen-space grid.
  for(const next of [{x:-1700,y:2200,w:4400,h:2880},{x:350,y:300,w:137.5,h:90},{x:-200,y:-100,w:1100,h:720}]){
   await p.evaluate(next=>{camera=next;applyCamera();render()},next);assert.equal(await pattern(),definition);
  }
  const fit=await p.evaluate(()=>{fitDrawingView();return {camera:{...camera},bounds:getDrawingVisualBounds()}});
  await grid.click();assert.deepEqual(await p.evaluate(()=>{fitDrawingView();return {camera:{...camera},bounds:getDrawingVisualBounds()}}),fit);
  assert.equal(await layer.count(),0);assert.equal(await grid.getAttribute('aria-pressed'),'false');assert(!(await grid.evaluate(e=>e.classList.contains('active'))));
  // Toggle the authoritative sources, exercising all four independent states.
  for(const visible of [false,true])for(const enabled of [false,true]){
   if(await p.evaluate(()=>gridVisible)!==visible)await grid.click();
   if(await p.evaluate(()=>snapEnabled)!==enabled)await p.locator('#snapToggle').click();
   assert.deepEqual(await p.evaluate(()=>[gridVisible,snapEnabled]),[visible,enabled]);
   assert.equal(await grid.getAttribute('aria-pressed'),String(visible));assert.equal(await p.locator('#snapToggle').getAttribute('aria-pressed'),String(enabled));
   const raw=await p.evaluate(()=>{
    const target=new DOMPoint(149.3,101.7).matrixTransform(svg.getScreenCTM()),e={clientX:target.x,clientY:target.y};
    return {raw:rawPoint(e),resolved:point(e)};
   });
   assert(Math.abs(raw.resolved.x-149.3)<1e-6&&Math.abs(raw.resolved.y-101.7)<1e-6);assert.deepEqual(raw.resolved,{x:raw.raw.x,y:raw.raw.y});
  }
  // Pending geometry, selection, history, filenames, dirty state and metadata survive.
  for(const m of ['bar','thin','dashed','curve','pin','force','moment','udl','dim']){
   await p.evaluate(m=>{setMode(m);first={x:400,y:400};if(m==='curve'||m==='dim')second={x:550,y:350};hover={x:580,y:400};render();saveDraft()},m);
   const before=await state();await grid.click();assert.deepEqual(await state(),before,m);await grid.click();assert.deepEqual(await state(),before,m);
  }
  await p.evaluate(()=>{cancelToSelection();geometryScale=250;internalForceScale=2.5;syncDrawingScaleControls();render()});
  assert.equal(await p.evaluate(()=>gridSize),50);assert.equal(await pattern(),definition);
  const exported=await p.evaluate(()=>exportSVG()),preview=await p.evaluate(()=>decodeURIComponent(previewDrawing(JSON.parse(documentText())).split(',').slice(1).join(',')));
  for(const output of [exported,preview]){assert(!/drawingGridPattern|data-grid-layer/.test(output));assert(/data-id/.test(output))}
  assert.equal(await layer.count(),1);
  const png=async()=>{const download=p.waitForEvent('download');await p.evaluate(()=>$('png').click());return fs.readFileSync(await (await download).path())};
  const gridOnPNG=await png();assert(gridOnPNG.length>1000);await grid.click();assert.equal(await p.evaluate(()=>exportSVG()),exported);assert.deepEqual(await png(),gridOnPNG);
  await grid.click();const doc=await p.evaluate(()=>JSON.parse(documentText()));assert(!Object.keys(doc).some(k=>/^grid/i.test(k)));
  await p.evaluate(async data=>loadDocument(new File([JSON.stringify({...data,grid:true,gridVisible:false,gridSize:20})],'legacy-grid.json')),doc);
  assert.deepEqual(await p.evaluate(()=>[gridVisible,gridSize]),[true,50]);assert(!Object.keys(await p.evaluate(()=>JSON.parse(documentText()))).some(k=>/^grid/i.test(k)));
  await p.reload();assert.deepEqual(await p.evaluate(()=>[gridVisible,gridSize]),[false,50]);assert.equal(await layer.count(),0);assert.deepEqual(errors,[]);
  console.log('PASS fixed model-space Grid, default/reload OFF, inert layer/order, clean SVG/PNG/preview, camera/Fit, all Grid/Snap states, no Grid Snap, pending commands/history/JSON/persistence');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
