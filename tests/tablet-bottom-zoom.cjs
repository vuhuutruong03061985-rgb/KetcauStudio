const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const ids=['zoomOut','zoomLevel','zoomIn','fitView'];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.waitForFunction(()=>typeof tabletBottomLeftBar!=='undefined');
  const cdp=await p.context().newCDPSession(p),bar=p.locator('#tabletBottomLeftBar');
  const out=path.resolve('.test-tools/tablet-bottom-zoom');fs.mkdirSync(out,{recursive:true});
  const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const ready=async value=>{await p.waitForFunction(value=>document.body.dataset.radialPrimary===String(value),value);await settled()};
  const shot=async name=>{await settled();await p.screenshot({path:path.join(out,name+'.png')})};
  const touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:4,radiusY:4}))});
  const tap=async locator=>{await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();await touch('touchStart',[[0,r.x+r.width/2,r.y+r.height/2]]);await touch('touchEnd',[]);await settled()};
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),mode,first,second,selected,multi:[...multiSelection],name:documentName,saved:savedDocument}));
  const view=()=>p.evaluate(()=>({...camera}));
  const output=async()=>assert.equal(await p.locator('#zoomLevel').textContent(),Math.round(1100/(await view()).w*100)+'%');
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  await p.evaluate(()=>{
   window.zoomSources=['zoomOut','zoomLevel','zoomIn','fitView'].map(id=>$(id));window.zoomHandlers=zoomSources.map(e=>e.onclick);
   window.zoomAttrs=zoomSources.map(e=>({title:e.title,label:e.getAttribute('aria-label'),icon:e.style.getPropertyValue('--tool-icon')}));
   window.zoomOriginalOrder=[...$('viewTools').children];window.zoomCalls={zoomOut:0,zoomIn:0};
   for(const id of ['zoomOut','zoomIn'])$(id).addEventListener('click',()=>zoomCalls[id]++);
   window.zoomCanvasDowns=0;window.zoomEscapes=0;svg.addEventListener('pointerdown',()=>zoomCanvasDowns++);
   window.addEventListener('keydown',e=>{if(e.key==='Escape')zoomEscapes++},true);
  });
  const identity=async restored=>{
   assert(await p.evaluate(restored=>zoomSources.every((e,i)=>e===$(['zoomOut','zoomLevel','zoomIn','fitView'][i])&&e.onclick===zoomHandlers[i]&&e.title===zoomAttrs[i].title&&e.getAttribute('aria-label')===zoomAttrs[i].label&&e.style.getPropertyValue('--tool-icon')===zoomAttrs[i].icon&&e.parentElement.id===(restored?'viewTools':'tabletBottomZoom')),restored));
   if(restored)assert(await p.evaluate(()=>[...$('viewTools').children].every((e,i)=>e===zoomOriginalOrder[i])&&$('viewTools').children.length===zoomOriginalOrder.length));
   for(const id of ids)assert.equal(await p.locator('#'+id).count(),1);
  };
  assert(await bar.isHidden());await identity(true);await shot('desktop');
  const desktopState=await snapshot(),desktopCamera=await view();
  await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await ready(true);await identity(false);
  assert.deepEqual(await snapshot(),desktopState);assert.deepEqual(await view(),desktopCamera);
  assert.deepEqual(await p.locator('#tabletBottomZoom').evaluate(e=>[...e.children].map(c=>c.id)),ids);
  assert.equal(await bar.locator('button').count(),3);assert.equal(await bar.locator('output').count(),1);
  assert.equal(await p.locator('#zoomLevel').evaluate(e=>e.tagName),'OUTPUT');assert.equal(await p.locator('#zoomLevel').evaluate(e=>e.onclick),null);
  const geometry=()=>p.evaluate(()=>{
   const r=tabletBottomLeftBar.getBoundingClientRect(),top=tabletTopBar.getBoundingClientRect();
   return {viewport:{width:innerWidth,height:innerHeight},bar:{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height},topHeight:top.height,
    controls:[...tabletBottomZoom.children].map(e=>{const q=e.getBoundingClientRect();return {id:e.id,width:q.width,height:q.height,top:q.top,bottom:q.bottom}}),
    menus:[leftDrawingMenu,rightCommandMenu].map(m=>({radius:m.layout.radius,fits:m.layout.fits,bounds:m.layout.bounds,top:m.layout.cy-m.layout.radius,bottom:m.layout.cy+m.layout.radius}))};
  });
  const checkGeometry=async()=>{
   await settled();const g=await geometry();assert.equal(g.bar.height,48);assert.equal(g.bar.left,12);assert.equal(g.bar.bottom,g.viewport.height-12);assert.equal(g.bar.width,200);
   assert.equal(g.topHeight,48);assert(g.controls.every(c=>c.width>=44&&c.height>=44&&c.top>=g.bar.top&&c.bottom<=g.bar.bottom));
   assert.equal(g.menus[0].bounds.bottom,g.bar.top-8);assert.equal(g.menus[1].bounds.bottom,await p.evaluate(()=>tabletBottomRightBar.getBoundingClientRect().top-8));
   assert(g.menus.every(m=>m.fits&&m.top>=100));assert(g.menus[0].bottom<=g.bar.top-8);
   assert.deepEqual(g.menus.map(m=>m.radius),[304.04759747124507,248.81914748738225]);return g;
  };
  console.log('LANDSCAPE',JSON.stringify(await checkGeometry()));await output();await shot('landscape');await shot('zoom-100');await shot('top-and-bottom');
  const topCommands=()=>p.locator('#tabletTopCommands button:not([hidden])').evaluateAll(es=>es.map(e=>e.id||e.dataset.toolbarIcon));
  assert.deepEqual(await topCommands(),['clear','open','save','saveAs','svg','png']);
  // The existing source handlers run once. A pending drawing point and roller
  // positions survive; strip taps never enter the canvas or synthesize Escape.
  await p.evaluate(()=>{setMode('bar');first={x:300,y:300};render()});const pending=await snapshot();
  for(const [id,factor,side,shotName]of [['zoomIn',1.25,'left','zoom-above-100'],['zoomOut',1/1.25,'right','zoom-below-100']]){
   if(id==='zoomOut')await p.evaluate(()=>zoomAt(1/1.25));
   await p.locator(`.semicircle-${side}-menu [data-demo-id="hub"]`).dispatchEvent('click');
   const memory=await p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>m.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset,pointer:r.pointerId,dragging:r.dragging}))));
   const before=await view(),calls=await p.evaluate(id=>zoomCalls[id],id);await tap(p.locator('#'+id));
   assert.equal(await p.evaluate(id=>zoomCalls[id],id),calls+1);assert.equal((await view()).w,before.w/factor);await output();assert.deepEqual(await snapshot(),pending);
   assert.deepEqual(await p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>m.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset,pointer:r.pointerId,dragging:r.dragging})))),memory);
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open||rightCommandMenu.state.open),false);await shot(shotName);
  }
  const beforeOutput=await view();await tap(p.locator('#zoomLevel'));assert.deepEqual(await view(),beforeOutput);assert.deepEqual(await snapshot(),pending);
  await p.evaluate(()=>{$('zoomIn').disabled=true});const disabledCalls=await p.evaluate(()=>zoomCalls.zoomIn);await tap(p.locator('#zoomIn'));assert.equal(await p.evaluate(()=>zoomCalls.zoomIn),disabledCalls);assert.deepEqual(await view(),beforeOutput);
  await p.evaluate(()=>{$('zoomIn').disabled=false});assert.equal(await p.evaluate(()=>zoomCanvasDowns+zoomEscapes),0);
  // Camera limits and direct applyCamera updates retain the same output node.
  for(const w of [137.5,4400,1100]){await p.evaluate(w=>{camera={x:0,y:0,w,h:w*720/1100};applyCamera()},w);await output();await checkGeometry();await identity(false)}
  // Real emulated touch pinch uses the unchanged capture/rollback pipeline.
  await p.evaluate(()=>{cancelToSelection();setMode('bar');render()});const beforePinch=await snapshot(),box=await p.locator('#drawing').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await touch('touchStart',[[0,x-40,y]]);await touch('touchStart',[[0,x-40,y],[1,x+40,y]]);await touch('touchMove',[[0,x-80,y+20],[1,x+80,y+20]]);await touch('touchEnd',[[1,x+80,y+20]]);await touch('touchEnd',[]);await settled();
  assert.deepEqual(await snapshot(),beforePinch);assert.equal((await view()).w,550);await output();assert(await bar.isVisible());await checkGeometry();
  // Both modifier wheel routes update the live output through the real listener.
  for(const modifier of ['ctrlKey','metaKey']){const before=await view();await p.locator('#drawing').dispatchEvent('wheel',{[modifier]:true,deltaY:-60,clientX:x,clientY:y});assert(Math.abs((await view()).w-before.w/Math.exp(.18))<1e-8);await output();assert.deepEqual(await snapshot(),beforePinch)}
  // A normal one-finger drawing sequence after pinch still creates one object.
  const count=await p.evaluate(()=>items.length);await touch('touchStart',[[0,x-30,y-35]]);await touch('touchEnd',[]);await touch('touchStart',[[0,x+30,y-35]]);await touch('touchEnd',[]);assert.equal(await p.evaluate(()=>items.length),count+1);
  // Pen Pointer Events remain on the shared drawing route.
  await p.evaluate(()=>{cancelToSelection();setMode('bar')});const penCount=await p.evaluate(()=>items.length);
  for(const [a,b]of [[700,500],[800,530]]){const q=await screen(a,b);for(const type of ['pointerdown','pointerup'])await p.locator('#drawing').dispatchEvent(type,{pointerType:'pen',pointerId:9,isPrimary:true,button:0,buttons:type==='pointerdown'?1:0,clientX:q.x,clientY:q.y,bubbles:true})}
  assert.equal(await p.evaluate(()=>items.length),penCount+1);
  await p.evaluate(()=>{cancelToSelection();panButton.click()});const panState=await snapshot(),panCamera=await view();
  await touch('touchStart',[[0,x,y]]);await touch('touchMove',[[0,x+35,y+25]]);await touch('touchEnd',[]);assert.deepEqual(await snapshot(),panState);assert.notDeepEqual(await view(),panCamera);await output();await checkGeometry();
  await p.evaluate(()=>{panButton.click();camera={x:0,y:0,w:1100,h:720};applyCamera()});
  // Strip position and safe bounds follow measured bottom/left inset changes.
  await p.evaluate(()=>{tabletBottomLeftBar.style.left='24px';tabletBottomLeftBar.style.bottom='32px';leftDrawingMenu.refresh()});await settled();
  assert.equal(await bar.evaluate(e=>e.getBoundingClientRect().left),24);assert.equal(await p.evaluate(()=>leftDrawingBounds().bottom),await bar.evaluate(e=>e.getBoundingClientRect().top-8));assert.equal(await p.evaluate(()=>rightCommandBounds().bottom),732);
  await p.evaluate(()=>{tabletBottomLeftBar.style.removeProperty('left');tabletBottomLeftBar.style.removeProperty('bottom');leftDrawingMenu.refresh()});await ready(true);await checkGeometry();
  for(const side of ['left','right']){await p.locator(`.semicircle-${side}-menu [data-demo-id="hub"]`).dispatchEvent('click');assert(await bar.isVisible());await checkGeometry();await shot(side+'-open')}
  assert.deepEqual(await p.evaluate(()=>rightCommandRings[1].entries.map(e=>e.id)),['panView','snapOptions']);
  await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close();ribbonCollapsed=true;localStorage.setItem('ket-cau-ribbon-collapsed','true');paintCommandRibbon()});assert(await bar.isVisible());
  await p.setViewportSize({width:800,height:1280});await ready(true);console.log('PORTRAIT',JSON.stringify(await checkGeometry()));await shot('portrait');
  // Separate projected fan thresholds from joint admission. In fallback both
  // bars hide; hypothetical DOM measurements keep admission stable and truthful.
  const thresholds={left:null,right:null};
  for(let height=600;height<=790;height++){
   await p.setViewportSize({width:800,height});await settled();await p.waitForFunction(()=>rightCommandMenu.layout.bounds.bottom===rightCommandBounds().bottom);
   const projected=await p.evaluate(()=>{
    const top=tabletChromeBottom(true),bounds=[leftDrawingBounds(top,tabletLeftChromeTop(true)),rightCommandBounds(top,tabletRightChromeTop(true))];
    return [leftDrawingMenu,rightCommandMenu].map((m,i)=>semicircleEngine.solveConcentricRingLayout({side:m.state.side,rings:m.state.rings.map(r=>({id:r.id,count:r.entries.length})),bounds:bounds[i],fixedOuter:true}).fits);
   });
   for(const [i,side]of ['left','right'].entries())if(projected[i]&&thresholds[side]===null)thresholds[side]=height;
   await ready(projected.every(Boolean));
  }
  assert.deepEqual(thresholds,{left:767,right:661});console.log('PROJECTED THRESHOLDS',JSON.stringify(thresholds));
  await p.setViewportSize({width:800,height:784});await ready(true);await p.waitForFunction(()=>rightCommandMenu.layout.bounds.bottom===716);await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');console.log('JOINT BOUNDARY FIT',JSON.stringify(await checkGeometry()));await shot('boundary-fit');
  const stable=await snapshot(),stableCamera=await view();await p.setViewportSize({width:800,height:766});await ready(false);await identity(true);assert(await bar.isHidden());assert(await p.locator('#tabletTopBar').isHidden());assert.equal(await p.evaluate(()=>leftDrawingBounds().bottom),698);assert.equal(await p.evaluate(()=>rightCommandBounds().bottom),698);
  for(let i=0;i<6;i++){await p.evaluate(()=>{leftDrawingMenu.refresh();rightCommandMenu.refresh()});await settled();assert.equal(await p.evaluate(()=>document.body.dataset.radialPrimary),'false')}
  await tap(p.locator('#ribbonToggle'));assert(await p.locator('#zoomIn').isVisible());assert(await p.locator('#zoomOut').isVisible());assert(await p.locator('#zoomLevel').isVisible());await p.locator('#zoomIn').scrollIntoViewIfNeeded();await shot('fallback-ribbon');
  const fallbackWidth=(await view()).w;await tap(p.locator('#zoomIn'));assert.equal((await view()).w,fallbackWidth/1.25);await output();await tap(p.locator('#zoomOut'));assert.equal((await view()).w,fallbackWidth);
  await tap(p.locator('#ribbonToggle'));await p.setViewportSize({width:1280,height:800});await ready(true);assert(await bar.isVisible());await identity(false);assert.deepEqual(await snapshot(),stable);assert.deepEqual(await view(),stableCamera);
  // Simulated MediaQueryList changes exercise same-node restoration without
  // reload; the opening desktop screenshot uses actual fine-pointer media.
  for(const matches of [false,true,false,true]){await p.evaluate(matches=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:matches});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches,media:floatingToolsMedia.media}))},matches);await ready(matches);await identity(!matches);assert.deepEqual(await snapshot(),stable);assert.deepEqual(await view(),stableCamera);assert.equal(await bar.isVisible(),matches)}
  // The spacing input widens RIGHT chrome: restore sources when the rows overlap.
  await p.setViewportSize({width:390,height:784});await ready(false);await identity(true);assert(await bar.isHidden());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.setViewportSize({width:440,height:784});await ready(true);await checkGeometry();
  // RIGHT's low fixed sectors also stay clear on a narrow admitted viewport.
  await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');assert(await p.evaluate(()=>{const b=tabletBottomLeftBar.getBoundingClientRect(),controls=[...rightCommandMenu.host.querySelectorAll('.semicircle-control')].filter(e=>e.getBoundingClientRect().width);return controls.length>0&&controls.every(e=>{const r=e.getBoundingClientRect();return r.right<=b.left||r.left>=b.right||r.bottom<=b.top||r.top>=b.bottom})}));
  assert.deepEqual(await topCommands(),['clear','open','save','saveAs','svg','png']);assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('bottom-zoom'))),false);assert.deepEqual(errors,[]);
  console.log('PASS same zoom nodes/handlers/output, live buttons/pinch/wheel/pan, touch/pen drawing, no click-through, restore/fallback, LEFT reservation and unchanged RIGHT/top bar; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
