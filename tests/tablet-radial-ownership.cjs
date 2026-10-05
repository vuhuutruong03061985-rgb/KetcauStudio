const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const settled=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function ownership(p,expected){
 await settled(p);
 const result=await p.evaluate(()=>{
  const visible=e=>!!e&&getComputedStyle(e).visibility==='visible'&&getComputedStyle(e).display!=='none'&&!!e.getClientRects().length;
  const ids=['clear','open','save','saveAs','svg','png','zoomOut','zoomLevel','zoomIn','fitView','gridToggle','gridSizeControl','snapToggle','drawingScalesToggle'];
  return {primary:document.body.dataset.radialPrimary==='true',bars:[tabletTopBar,tabletBottomLeftBar,tabletBottomRightBar].map(e=>({hidden:e.hidden,visible:visible(e)})),ribbon:visible(commandRibbon),ribbonHeight:commandRibbon.getBoundingClientRect().height,handle:visible(toolboxHandle),panel:{visible:visible(toolboxPanel),inert:toolboxPanel.inert},menus:[leftDrawingMenu,rightCommandMenu].map(m=>m?{visible:visible(m.host)&&!m.host.hidden,inert:m.host.inert,open:m.state.open,fits:m.layout.fits,hub:!!m.host.querySelector('[data-demo-id="hub"]')}:null),duplicates:ids.filter(id=>document.querySelectorAll('#'+id).length!==1),sameSources:!window.ownershipSources||ownershipSources.every(e=>document.getElementById(e.id)===e),zoom:[...tabletBottomZoom.children].map(e=>e.id),view:[...tabletBottomView.children].map(e=>e.id)};
 });
 assert.equal(result.primary,expected,JSON.stringify(result));assert.deepEqual(result.duplicates,[]);assert(result.sameSources);
 for(const bar of result.bars)assert.deepEqual(bar,{hidden:!expected,visible:expected});
 if(expected){
  assert(!result.ribbon&&!result.handle&&!result.panel.visible&&result.panel.inert);assert.equal(result.ribbonHeight,0);assert(result.menus.every(m=>m?.visible&&!m.inert&&m.fits&&m.hub));
  assert.deepEqual(result.zoom,['zoomOut','zoomLevel','zoomIn','fitView']);assert.deepEqual(result.view,['gridToggle','gridSizeControl','snapToggle','drawingScalesToggle']);assert(await p.evaluate(()=>tabletTopHomes.every(h=>h.group.parentNode===tabletTopCommands)));
 }else{assert(result.ribbon&&result.handle);assert(result.menus.every(m=>!m||!m.visible&&m.inert&&!m.open));assert(await p.evaluate(()=>[...tabletTopHomes,...tabletZoomHomes,...tabletViewHomes].every(h=>(h.control||h.group).previousSibling===h.anchor)))}
 return result;
}
async function run(){const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({hasTouch:true,viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.evaluate(()=>{window.ownershipSources=['clear','open','save','saveAs','svg','png','zoomOut','zoomLevel','zoomIn','fitView','gridToggle','gridSizeControl','snapToggle','drawingScalesToggle'].map(id=>$(id));saveDraft()});
 const state=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),camera:JSON.stringify(camera),mode,first:JSON.stringify(first),snap:JSON.stringify(snapOptions),gridVisible,gridSize,saved:savedDocument,storage:JSON.stringify(localStorage)}));
 const before=await state();await ownership(p,true);
 // Real painters/source-home restoration must not leave a stale same-value state.
 await p.evaluate(()=>{paintTabletTopBar(false);paintTabletBottomZoom(false);paintTabletBottomView(false);floatingToolsOpen=true;paintFloatingTools();paintCommandRibbon();syncRadialPrimaryPresentation()});await ownership(p,true);assert.deepEqual(await state(),before);
 await p.evaluate(()=>{window.ownershipRefreshes=0;for(const m of [leftDrawingMenu,rightCommandMenu]){const original=m.refresh;m.refresh=()=>{ownershipRefreshes++;return original()}}for(let i=0;i<20;i++)syncRadialPrimaryPresentation()});await settled(p);assert.equal(await p.evaluate(()=>ownershipRefreshes),0,'idempotent sync must not create a repaint loop');
 for(const side of ['left','right']){
  await p.evaluate(side=>{(side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe).style.paddingRight='calc(100vw - 60px)';leftDrawingMenu.refresh();rightCommandMenu.refresh()},side);await ownership(p,false);
  await p.locator('#toggleTools').tap();assert(await p.locator('#toolPanel').isVisible());assert.equal(await p.locator('#toolPanel').evaluate(e=>e.inert),false);
  await p.evaluate(side=>{(side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe).style.removeProperty('padding-right');leftDrawingMenu.refresh();rightCommandMenu.refresh()},side);await ownership(p,true);assert.deepEqual(await state(),before);
 }
 for(const [width,height]of [[390,800],[1376,1032],[1032,1376],[1280,800],[800,1280],[431,800],[432,800],[800,776],[800,767],[800,568],[1280,800]]){await p.setViewportSize({width,height});await ownership(p,width>=432&&height>=558);assert.deepEqual(await state(),before)}
 await p.evaluate(()=>toolboxHandle.focus());assert.notEqual(await p.evaluate(()=>document.activeElement.id),'toggleTools');
 for(const side of ['left','right']){const q=await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;return {x:m.layout.cx+(side==='left'?13:-13),y:m.layout.cy}},side);await p.touchscreen.tap(q.x,q.y);assert(await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.open,side));await p.touchscreen.tap(q.x,q.y);assert.deepEqual(await state(),before)}
 // Keyboard fallback preserves the first point and numeric session identity.
 await p.evaluate(()=>{setMode('bar');first={x:400,y:350};beginBarNumericInput({clientX:550,clientY:400,pointerType:'touch'});window.ownershipFirst=first;window.ownershipCapture=barNumericSession});await p.locator('#dynamicInputValue').focus();const pending=await state();
 await p.setViewportSize({width:1280,height:240});await ownership(p,false);assert.deepEqual(await state(),pending);assert(await p.evaluate(()=>first===ownershipFirst&&barNumericSession===ownershipCapture));
 await p.setViewportSize({width:1280,height:800});await ownership(p,true);assert.deepEqual(await state(),pending);await p.evaluate(()=>{cancelToSelection();document.activeElement.blur()});
 const d=await browser.newPage({viewport:{width:1280,height:800}});d.on('pageerror',e=>errors.push(e.message));await d.goto(pathToFileURL(path.resolve('index.html')).href);const cdp=await d.context().newCDPSession(d);
 await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await d.waitForFunction(()=>floatingToolsMedia.matches);await ownership(d,true);
 await d.evaluate(()=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:false});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches:false,media:floatingToolsMedia.media}))});await d.waitForFunction(()=>!floatingToolsMedia.matches);await settled(d);assert(await d.locator('#toolPanel').isVisible());assert.equal(await d.locator('.semicircle-left-menu,.semicircle-right-menu').count(),0);assert(await d.locator('#tabletTopBar').isHidden());await d.close();
 assert.deepEqual(errors,[]);console.log('PASS atomic ownership, stale same-value repair, inert legacy UI, source identity, fallback, idempotence, transitions, keyboard session and capability switching');
}finally{await browser.close()}}
module.exports={ownership,settled};if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1});
