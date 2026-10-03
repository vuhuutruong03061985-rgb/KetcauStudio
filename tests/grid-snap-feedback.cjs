const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve('.test-tools/grid-snap-feedback');fs.mkdirSync(out,{recursive:true});
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const cdp=await context.newCDPSession(p),marker=p.locator('[data-rigid-snap="grid"]');
  const settled=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const shot=async n=>{if(touch){await settled();await p.screenshot({path:path.join(out,n+'.png')})}};
  const state=async()=>{await p.evaluate(()=>saveDraft());return p.evaluate(()=>({doc:documentText(),drawing:JSON.stringify(captureDrawing()),title:document.title,saved:savedDocument,storage:JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k!=='ket-cau-snap-settings').sort().map(k=>[k,localStorage.getItem(k)])))}))};
  const start=async()=>{
   await p.evaluate(()=>{document.activeElement.blur();cancelToSelection();items=[make('rigidRegion',400,300,undefined,undefined,{...rigidDefaults,rigidAngle:0,points:[{x:0,y:0},{x:173,y:11},{x:83,y:137}]})];selected=items[0].id;past=[];future=[];snapEnabled=true;gridVisible=true;gridSize=50;for(const k in snapOptions)snapOptions[k]=k==='grid';updateSnapControls();updateGridControls();syncGridSizeControl();render()});
   const b=await p.locator('[data-move-anchor]').boundingBox(),a={x:b.x+b.width/2,y:b.y+b.height/2},z={x:a.x+33,y:a.y+39};
   if(touch){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...a}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,...z}]})}
   else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:3})}
   assert.equal(await marker.count(),1);assert.equal(await p.locator('[data-rigid-snap]').count(),1);return z;
  };
  const end=async cancel=>{if(touch)await cdp.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});else{if(cancel)await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1})));await p.mouse.up()}};
  await start();await shot('01-grid-winning');await shot('11-rigid-grid');
  assert.deepEqual(await marker.evaluate(e=>({pointer:getComputedStyle(e).pointerEvents,hidden:e.getAttribute('aria-hidden'),id:e.hasAttribute('data-id'),color:e.getAttribute('stroke'),text:e.textContent,vector:e.firstElementChild.getAttribute('vector-effect')})),{pointer:'none',hidden:'true',id:false,color:'#087d95',text:'',vector:'non-scaling-stroke'});
  const hint=await p.evaluate(()=>rigidSnapHint);assert.equal(hint.kind,'grid');
  const radius=await marker.locator('circle').evaluate(e=>Number(e.getAttribute('r'))*Math.abs(svg.getScreenCTM().a));assert(Math.abs(radius-6)<1e-6);
  await p.evaluate(()=>{camera.w/=2;camera.h/=2;applyCamera();render()});assert(Math.abs(await marker.locator('circle').evaluate(e=>Number(e.getAttribute('r'))*Math.abs(svg.getScreenCTM().a))-6)<1e-6);await p.evaluate(()=>{camera.w*=2;camera.h*=2;applyCamera();render()});
  const before=await state();await p.evaluate(()=>{window.feedbackScans=0;window.feedbackOldGeometric=geometricSnap;geometricSnap=(...args)=>{feedbackScans++;return feedbackOldGeometric(...args)};render()});assert.equal(await p.evaluate(()=>feedbackScans),0);assert.deepEqual(await state(),before);await p.evaluate(()=>geometricSnap=feedbackOldGeometric);
  for(const [name,action]of [['04-grid-off',()=>{$('gridToggle').click()}],['05-snap-off',()=>{$('snapToggle').click()}],['06-option-off',()=>{$('snap-grid').checked=false;$('snap-grid').dispatchEvent(new Event('change',{bubbles:true}))}],['07-spacing-25',()=>{$('gridSize').value='25';$('gridSize').dispatchEvent(new Event('change',{bubbles:true}))}],['08-spacing-12.5',()=>{$('gridSize').value='12.5';$('gridSize').dispatchEvent(new Event('change',{bubbles:true}))}]]){
   if(name!=='04-grid-off')await start();const before=await state();await p.evaluate(action);assert.equal(await marker.count(),0,name);assert.equal(await p.evaluate(()=>rigidSnapHint),null,name);assert.deepEqual(await state(),before,name);await shot(name);await end();
  }
  // A fresh move computes a current candidate after spacing changes.
  await start();await p.evaluate(()=>{gridSize=12.5;render()});assert.equal(await marker.count(),0);await p.evaluate(()=>{const next=translatedRigid(drag.o,{x:31,y:41});Object.assign(items[0],next);render()});assert.equal(await marker.count(),1);assert.equal(await p.evaluate(()=>rigidSnapGridSize),12.5);await shot('08-current-12.5-candidate');await end();assert.equal(await marker.count(),0);
  // Translation's geometric winner changes the one existing marker; no Grid duplicate.
  await start();await p.evaluate(()=>{const q=rigidWorld(items[0],items[0].points[1]);items.push(make('hinge',q.x+5,q.y+5));snapOptions.endpoint=true;Object.assign(items[0],translatedRigid(items[0],{x:0,y:0}));render()});assert.equal(await marker.count(),0);assert.equal(await p.locator('[data-rigid-snap="endpoint"]').count(),1);await shot('02-geometry-wins');await end();
  for(const kind of ['intersection','endpoint','midpoint','tangent','member']){
   await p.evaluate(kind=>{cancelToSelection();snapEnabled=true;gridVisible=true;gridSize=50;for(const k in snapOptions)snapOptions[k]=k==='grid'||k===kind;
    const o=make('rigidRegion',402,402,undefined,undefined,{...rigidDefaults,rigidAngle:0,points:[{x:0,y:0},{x:173,y:11},{x:83,y:137}]});items=[o];selected=o.id;
    if(kind==='intersection')items.push(make('bar',307,407,607,407),make('bar',407,307,407,607));
    else if(kind==='endpoint')items.push(make('bar',407,407,607,407));
    else if(kind==='midpoint')items.push(make('bar',307,407,507,407));
    else items.push(make(kind==='tangent'?'thin':'bar',307,407,607,407));
    Object.assign(o,translatedRigid(o,{x:0,y:0}));render();
   },kind);assert.equal(await p.evaluate(()=>rigidSnapHint?.kind),kind);assert.equal(await marker.count(),0);assert.equal(await p.locator('[data-rigid-snap]').count(),1);
  }
  for(const reason of ['commit','cancel','mode','nudge']){
   await start();if(reason==='commit')await end();else if(reason==='cancel')await end(true);else if(reason==='mode'){await p.evaluate(()=>setMode('bar'));await end()}else{await p.keyboard.press('ArrowRight');assert.equal(await marker.count(),0);await end()}
   assert.equal(await marker.count(),0,reason);assert.equal(await p.evaluate(()=>rigidSnapHint),null,reason);
  }
  // Same model, with and without editor feedback: SVG, PNG, preview and Word's clean-render input agree.
  await start();const withHint=await state();
  const clean=()=>p.evaluate(()=>{const svgText=exportSVG(),preview=previewDrawing(JSON.parse(documentText()));render(true);const wordInput=svg.outerHTML;render();return {svgText,preview,wordInput}});
  const a=await clean();for(const value of Object.values(a))assert(!/data-rigid-snap|rigidSnapGridSize/.test(decodeURIComponent(value)));
  const png=async()=>{const download=p.waitForEvent('download');await p.evaluate(()=>$('png').click());return fs.readFileSync(await (await download).path())};const pngA=await png();assert(pngA.length>1000);
  await p.evaluate(()=>{rigidSnapHint=null;render()});assert.deepEqual(await clean(),a);assert.deepEqual(await png(),pngA);assert.deepEqual(await state(),withHint);
  const json=await p.evaluate(()=>JSON.parse(documentText()));assert.equal(json.version,1);for(const k of ['gridVisible','gridSize','snapOptions','rigidSnapHint','rigidSnapGridSize'])assert(!(k in json));
  await end();assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS existing winning Grid marker, settings/spacing/nudge cleanup, geometry winner/no duplicate, stable/inert/accessible marker, no added scan, history/JSON/storage isolation and identical clean SVG/PNG/preview/Word input (desktop + emulated touch)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
