const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const ids=['zoomOut','zoomLevel','zoomIn','fitView'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.waitForFunction(()=>typeof fitDrawingView==='function');
  const fit=p.locator('#fitView'),bar=p.locator('#tabletBottomLeftBar'),cdp=await p.context().newCDPSession(p);
  const out=path.resolve('.test-tools/tablet-fit-view');fs.mkdirSync(out,{recursive:true});
  const close=(a,b,tolerance=1e-7)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
  const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const ready=async value=>{await p.waitForFunction(value=>document.body.dataset.radialPrimary===String(value),value);await settled()};
  const shot=async name=>{await settled();await p.screenshot({path:path.join(out,name+'.png')})};
  const tap=async locator=>{await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:b.x+b.width/2,y:b.y+b.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled()};
  const snapshot=()=>p.evaluate(()=>({items:JSON.stringify(items),doc:documentText(),saved:savedDocument,dirty:documentText()!==savedDocument,name:documentName,handle:documentHandle?.name,
   past:JSON.stringify(past),future:JSON.stringify(future),selected,multi:[...multiSelection],mode,first,second,hatchPoints,rigidPoints,rigidPivot,loadPlacement,
   thinReference:JSON.stringify(thinReferenceSession),barNumeric:JSON.stringify(barNumericSession),panEnabled,geometryScale,internalForceScale,snapEnabled,snap:JSON.stringify(snapOptions)}));
  const bounds=()=>p.evaluate(()=>getDrawingVisualBounds());
  const cameraState=()=>p.evaluate(()=>({...camera}));
  await p.evaluate(()=>{
   window.fitInitialItems=copy(items);window.fitSource=$('fitView');window.fitHandler=fitSource.onclick;window.fitOrder=[...$('viewTools').children];window.fitNodes=['zoomOut','zoomLevel','zoomIn','fitView'].map(id=>$(id));
   window.fitCalls=0;fitSource.addEventListener('click',()=>fitCalls++);window.fitApplies=0;const originalApply=applyCamera;applyCamera=()=>{fitApplies++;originalApply()};
   window.fitCanvasDowns=0;svg.addEventListener('pointerdown',()=>fitCanvasDowns++);window.fitKeys=0;window.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Enter')fitKeys++},true);
  });
  const identity=async restored=>{
   assert(await p.evaluate(restored=>fitNodes.every((e,i)=>e===$(['zoomOut','zoomLevel','zoomIn','fitView'][i])&&e.parentElement.id===(restored?'viewTools':'tabletBottomZoom'))&&fitSource===$('fitView')&&fitSource.onclick===fitHandler,restored));
   if(restored)assert(await p.evaluate(()=>[...$('viewTools').children].length===fitOrder.length&&[...$('viewTools').children].every((e,i)=>e===fitOrder[i])));
   for(const id of ids)assert.equal(await p.locator('#'+id).count(),1);
  };
  assert.equal(await fit.count(),1);assert.equal(await fit.evaluate(e=>e.tagName),'BUTTON');assert.equal(await fit.getAttribute('aria-label'),'Vừa khung bản vẽ');assert.equal(await fit.getAttribute('title'),'Vừa khung bản vẽ');
  assert(await fit.evaluate(e=>e.classList.contains('icon-button')&&e.style.getPropertyValue('--tool-icon').includes('svg')));assert(await bar.isHidden());await identity(true);await shot('desktop-fit');
  const invoke=async(touch=true)=>{
   const before=await snapshot(),counts=await p.evaluate(()=>({calls:fitCalls,applies:fitApplies}));
   if(touch)await tap(fit);else await fit.click();
   assert.deepEqual(await snapshot(),before);assert.equal(await p.evaluate(()=>fitCalls),counts.calls+1);assert.equal(await p.evaluate(()=>fitApplies),counts.applies+1);
   const c=await cameraState();assert([c.x,c.y,c.w,c.h].every(Number.isFinite));assert(c.w>=137.5&&c.w<=4400);close(c.w/c.h,1100/720);
   assert.equal(await p.locator('#drawing').getAttribute('viewBox'),`${c.x} ${c.y} ${c.w} ${c.h}`);assert.equal(await p.locator('#zoomLevel').textContent(),Math.round(1100/c.w*100)+'%');return c;
  };
  // Known committed SVG line bounds test the native desktop button first.
  await p.evaluate(()=>{cancelToSelection();items=[make('thin',1200,-400,1600,-100)];past=[];future=[];render();savedDocument=documentText();updateFileStatus()});
  assert.deepEqual(await bounds(),{left:1200,top:-400,right:1600,bottom:-100});const simple=await invoke(false);close(simple.x+simple.w/2,1400);close(simple.y+simple.h/2,-250);close(simple.w,356*1100/720);
  await p.evaluate(()=>zoomAt(.6));assert.deepEqual(await invoke(false),simple);
  const keyboardState=await snapshot(),keyboardCalls=await p.evaluate(()=>fitCalls);await fit.focus();await p.keyboard.press('Space');await settled();assert.equal(await p.evaluate(()=>fitCalls),keyboardCalls+1);assert.deepEqual(await snapshot(),keyboardState);assert.deepEqual(await cameraState(),simple);
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await ready(true);await identity(false);
  assert.deepEqual(await p.locator('#tabletBottomZoom').evaluate(e=>[...e.children].map(c=>c.id)),ids);
  assert.equal(await p.locator('#zoomLevel').evaluate(e=>e.tagName),'OUTPUT');assert.equal(await p.locator('#zoomLevel').evaluate(e=>e.onclick),null);
  const geometry=async()=>{
   await settled();const g=await p.evaluate(()=>{const b=tabletBottomLeftBar.getBoundingClientRect();return {width:b.width,height:b.height,top:b.top,fit:{w:fitButton.getBoundingClientRect().width,h:fitButton.getBoundingClientRect().height},left:leftDrawingMenu.layout.bounds,right:rightCommandMenu.layout.bounds,radii:[leftDrawingMenu.layout.radius,rightCommandMenu.layout.radius]}});
   assert.equal(g.width,200);assert.equal(g.height,48);assert.deepEqual(g.fit,{w:44,h:44});assert.equal(g.left.bottom,g.top-8);assert.equal(g.right.bottom,await p.evaluate(()=>tabletBottomRightBar.getBoundingClientRect().top-8));assert.equal(g.left.top,100);assert.equal(g.right.top,100);
   assert.deepEqual(g.radii,[151.04759747124507,248.81914748738225]);return g;
  };
  await p.evaluate(()=>{items=copy(fitInitialItems);render();camera={x:0,y:0,w:1100,h:720};applyCamera()});console.log('STRIP / SAFE BOUNDS',JSON.stringify(await geometry()));await shot('final-strip');await shot('fit-icon-100');
  const contained=async b=>{
   const c=await cameraState(),pad=Math.max(24,.07*Math.max(b.right-b.left,b.bottom-b.top));
   close(c.x+c.w/2,(b.left+b.right)/2);close(c.y+c.h/2,(b.top+b.bottom)/2);
   assert(c.x<=b.left-pad+1e-7&&c.y<=b.top-pad+1e-7&&c.x+c.w>=b.right+pad-1e-7&&c.y+c.h>=b.bottom+pad-1e-7);
  };
  const seed=async kind=>p.evaluate(kind=>{
   cancelToSelection();items=[];past=[];future=[];
   if(kind==='wide')items=[make('bar',-600,200,1500,200),make('support',-600,200),make('support',1500,200,undefined,undefined,{support:'roller'}),make('text',300,180,undefined,undefined,{label:'Wide frame'})];
   if(kind==='tall')items=[make('bar',500,-650,500,1400),make('support',500,1400),make('text',525,350,undefined,undefined,{label:'Tall frame'})];
   if(kind==='small')items=[make('thin',2500,-1000,2501,-999)];
   if(kind==='horizontal')items=[make('thin',300,200,900,200)];
   if(kind==='vertical')items=[make('thin',400,-100,400,500)];
   if(kind==='point')items=[make('thin',400,500,400,500)];
   if(kind==='large')items=[make('thin',-9000,-500,9000,1500)];
   camera={x:0,y:0,w:1100,h:720};applyCamera();render();savedDocument=documentText();updateFileStatus();
  },kind);
  // Allow sub-unit native SVG font hinting variation across camera scales.
  for(const kind of ['wide','tall']){await seed(kind);await shot(kind+'-before');const b=await bounds();await invoke();await contained(b);await shot(kind+'-after');const repeat=await cameraState();await p.evaluate(()=>zoomAt(.6));await invoke();const again=await cameraState();for(const key of ['x','y','w','h'])close(again[key],repeat[key],.5)}
  await seed('small');const small=await invoke();assert.equal(small.w,137.5);await contained(await bounds());await shot('small-after');
  for(const kind of ['horizontal','vertical','point']){await seed(kind);const b=await bounds();await invoke();await contained(b)}
  await seed('large');const large=await invoke(),largeBounds=await bounds();assert.equal(large.w,4400);close(large.x+large.w/2,0);close(large.y+large.h/2,500);assert(largeBounds.right-largeBounds.left>large.w);console.log('LARGE DRAWING: centered at current 4400 maximum; complete extents cannot fit without increasing the existing limit.');
  await seed('empty');await p.evaluate(()=>{camera={x:123,y:-456,w:300,h:300*720/1100};applyCamera();el('circle',{cx:9000,cy:-9000,r:800,'data-insertion-preview':'true'})});assert.equal(await bounds(),null);assert.deepEqual(await invoke(),{x:0,y:0,w:1100,h:720});await shot('empty-after');
  // A distant object's rendered text extends beyond its raw coordinate. Fit all
  // committed groups, including transformed symbols, independently of selection.
  await seed('wide');await p.evaluate(()=>{items.push(make('text',2200,-300,undefined,undefined,{label:'Rendered label extends the drawing bounds'}));items.push(make('person',-750,900));render()});const allBounds=await bounds();assert(allBounds.right>2200&&allBounds.bottom>900);
  await invoke();await contained(allBounds);
  await p.evaluate(()=>{cancelToSelection();items=[make('thin',1500,1000,1900,1050),make('thin',2500,1200,2600,1300)];render()});const selectionBounds=await bounds();
  await p.evaluate(()=>{updateSelection([items[0].id],items[0].id);render()});assert.deepEqual(await bounds(),selectionBounds);assert(await p.locator('#drawing [data-move-anchor]').count()>0);
  const beforeMarkup=await p.locator('#drawing').evaluate(e=>e.innerHTML);assert.deepEqual(await bounds(),selectionBounds);assert.equal(await p.locator('#drawing').evaluate(e=>e.innerHTML),beforeMarkup);
  await invoke();await contained(selectionBounds);
  await p.evaluate(()=>{updateSelection(items.slice(0,2).map(o=>o.id),items[1].id);render()});assert.deepEqual(await bounds(),selectionBounds);await invoke();await contained(selectionBounds);
  // Both invisible objects and unavailable/invalid boxes are skipped safely.
  await seed('horizontal');const validBounds=await bounds();
  await p.evaluate(()=>{
   for(const [i,bad]of ['nan','infinity','negative','throws','display','visibility','opacity'].entries()){
    const o=make('thin',6000+i*100,6000,6500+i*100,6500);items.push(o);
   }render();
   for(const [i,bad]of ['nan','infinity','negative','throws','display','visibility','opacity'].entries()){
    const g=svg.querySelector(`g[data-id="${items[i+1].id}"]`);
    if(bad==='display')g.style.display='none';else if(bad==='visibility')g.style.visibility='hidden';else if(bad==='opacity')g.style.opacity='0';
    else{const decoration=el('rect',{x:0,y:0,width:10,height:10,'data-selection-decoration':'true'},g);decoration.setAttribute('style','fill: red; display: inline;');g.getBBox=()=>{if(bad==='throws')throw Error('unavailable bbox');return {x:bad==='nan'?NaN:bad==='infinity'?Infinity:6000,y:6000,width:bad==='negative'?-10:20,height:20}}}
   }
   const orphan=el('g',{'data-id':'uncommitted'});el('rect',{x:-9000,y:-9000,width:500,height:500},orphan);
  });
  const invalidMarkup=await p.locator('#drawing').evaluate(e=>e.innerHTML);assert.deepEqual(await bounds(),validBounds);assert.equal(await p.locator('#drawing').evaluate(e=>e.innerHTML),invalidMarkup);await invoke();await contained(validBounds);
  await p.evaluate(()=>{svg.querySelector('g[data-id]').getBBox=()=>({x:NaN,y:0,width:0,height:0});camera={x:17,y:29,w:300,h:300*720/1100};applyCamera()});assert.equal(await bounds(),null);assert.deepEqual(await invoke(),{x:0,y:0,w:1100,h:720});
  // Native Fit leaves a real pending bar command intact and ignores its preview.
  await seed('horizontal');await p.evaluate(()=>{setMode('bar');render()});const committedBounds=await bounds();
  const q=await p.evaluate(()=>{const p=new DOMPoint(650,450).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:q.x,y:q.y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled();
  assert(await p.evaluate(()=>first!==null&&mode==='bar'));await p.evaluate(()=>{hover={x:9000,y:9000};render();fitKeys=0;fitCanvasDowns=0});assert.deepEqual(await bounds(),committedBounds);const pending=await snapshot();await invoke();assert.deepEqual(await snapshot(),pending);await contained(committedBounds);assert.equal(await p.evaluate(()=>fitKeys+fitCanvasDowns),0);
  await p.evaluate(()=>{cancelToSelection();panButton.click()});assert.equal(await p.evaluate(()=>panEnabled),true);await invoke();assert.equal(await p.evaluate(()=>panEnabled),true);await p.evaluate(()=>panButton.click());
  // Fit remains usable through the existing top/bottom pointer exemption while
  // radial navigation is open, without changing ring positions or commands.
  await seed('wide');await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');await geometry();await shot('left-open');await invoke();assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
  await p.setViewportSize({width:800,height:1280});await ready(true);await invoke();await geometry();await shot('portrait');
  const stable=await snapshot();await p.setViewportSize({width:800,height:557});await ready(false);await identity(true);assert(await bar.isHidden());assert(await fit.isVisible());await fit.scrollIntoViewIfNeeded();await shot('fallback-fit');await invoke();assert.deepEqual(await snapshot(),stable);
  await p.setViewportSize({width:1280,height:800});await ready(true);await identity(false);await geometry();
  // MQL injection checks runtime restore; initial desktop used actual fine CSS.
  for(const matches of [false,true,false,true]){await p.evaluate(matches=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:matches});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches,media:floatingToolsMedia.media}))},matches);await ready(matches);await identity(!matches);assert.equal(await bar.isVisible(),matches);assert.deepEqual(await snapshot(),stable)}
  assert.deepEqual(await p.evaluate(()=>rightCommandRings[1].entries.map(e=>e.id)),['panView','snapOptions']);
  assert.deepEqual(await p.locator('#tabletTopCommands button:not([hidden])').evaluateAll(es=>es.map(e=>e.id||e.dataset.toolbarIcon)),['clear','open','save','saveAs','svg','png','undo','redo']);
  const outputCamera=await cameraState();await tap(p.locator('#zoomLevel'));assert.deepEqual(await cameraState(),outputCamera);assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('fit-view'))),false);assert.deepEqual(errors,[]);
  console.log('PASS authoritative Fit source/ownership, committed rendered bounds/padding/aspect/clamps, empty/degenerate/hidden/invalid, selection and active command preservation, same safe bounds; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
