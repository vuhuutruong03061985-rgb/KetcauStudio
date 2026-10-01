const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const desktop=await browser.newPage({viewport:{width:1280,height:800}});await desktop.goto(pathToFileURL(path.resolve('index.html')).href);
  assert.notEqual(await desktop.locator('body').getAttribute('data-radial-primary'),'true');assert(await desktop.locator('#toolPanel').isVisible());assert(await desktop.locator('#save').isVisible());assert.equal(await desktop.locator('#commandRibbon,.semicircle-left-menu,.semicircle-right-menu').count(),0);await desktop.close();
  for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){
   const p=await browser.newPage({viewport,hasTouch:true,isMobile:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
   const ready=async value=>p.waitForFunction(value=>document.body.dataset.radialPrimary===String(value),value);
   await ready(true);
   // Dialog focus and native details toggle events can move contextual controls/hubs.
   const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const tap=async(id,side)=>{
    await settled();
    const q=await p.evaluate(({id,side})=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu,groups=side==='left'?leftDrawingGroups:rightCommandGroups;
     if(id==='hub')return{x:m.layout.cx+(side==='left'?13:-13),y:m.layout.cy};const index=groups.findIndex(g=>g.id===id);return index>=0?m.layout.inner[index].icon:m.layout.outer[groups.find(g=>g.id===m.state.activeGroup).children.findIndex(c=>c.id===id)].icon},{id,side});await p.touchscreen.tap(q.x,q.y);
   };
   const command=async(side,group,id)=>{if(!await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.open,side))await tap('hub',side);if(await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.activeGroup,side)!==group)await tap(group,side);await tap(id,side)};
   const snapshot=()=>p.evaluate(()=>({doc:documentText(),items:JSON.stringify(items),dirty:documentText()!==savedDocument,past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,selected,multi:[...multiSelection],geometryScale,internalForceScale,snap:JSON.stringify(snapOptions),snapEnabled,name:documentName,handle:documentHandle?.name,storage:JSON.stringify(localStorage)}));
   const canvasHeight=()=>p.locator('#drawing').evaluate(el=>el.getBoundingClientRect().height);
   assert(await p.locator('#commandRibbon').isHidden());assert(await p.locator('#toggleTools').isHidden());assert(await p.locator('#toolPanel').isHidden());
   assert.equal(await p.locator('#commandRibbon').evaluate(el=>el.getBoundingClientRect().height),0);
   assert.equal(await p.locator('header').evaluate(el=>el.getBoundingClientRect().height),44);
   for(const id of ['save','open','undo','redo','panView','snapToggle','drawingScalesToggle'])assert.equal(await p.locator('#'+id).count(),1);
   assert.equal(await p.locator('#toolPanel button[data-mode=bar]').count(),1);
   assert(await p.locator('#ribbonToggle').isHidden());
   for(const side of ['left','right']){
    assert(await p.locator(`.semicircle-${side}-menu [data-demo-id=hub]`).isVisible());
    assert.equal(await p.locator(`.semicircle-${side}-menu .semicircle-control`).count(),1);
   }
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await p.screenshot({path:`tests/radial-primary-closed-${viewport.width}.png`});
   // Fit failure on either independent side restores both legacy surfaces and preferences.
   await p.evaluate(()=>saveDraft());const primaryHeight=await canvasHeight(),before=await snapshot();
   for(const side of ['left','right']){
    await p.evaluate(side=>{const probe=side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe;probe.style.paddingRight='calc(100vw - 60px)';(side==='left'?leftDrawingMenu:rightCommandMenu).refresh()},side);await ready(false);
    assert(await p.locator('#commandRibbon').isVisible());assert(await p.locator('#toggleTools').isVisible());assert(Math.abs(primaryHeight-await canvasHeight()-60)<1);
    assert.deepEqual(await snapshot(),before);
    await p.evaluate(side=>{(side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe).style.removeProperty('padding-right');(side==='left'?leftDrawingMenu:rightCommandMenu).refresh()},side);await ready(true);assert.deepEqual(await snapshot(),before);
   }
   // Construction failure follows the same fail-safe path; the other side still mounts.
   for(const side of ['left','right']){
    await p.evaluate(side=>{
     const original=semicircleEngine.createMenu;semicircleEngine.createMenu=()=>{throw Error('Intentional construction failure')};
     if(side==='left'){leftDrawingMenu.destroy();leftDrawingMenu=null;mountLeftDrawingMenu()}else{rightCommandMenu.destroy();rightCommandMenu=null;mountRightCommandMenu()}
     semicircleEngine.createMenu=original;
    },side);await ready(false);assert(await p.locator('#toggleTools').isVisible());assert(await p.locator('#commandRibbon').isVisible());
    await p.evaluate(side=>side==='left'?mountLeftDrawingMenu():mountRightCommandMenu(),side);await ready(true);assert.deepEqual(await snapshot(),before);
   }
   // Actual viewport changes, including a keyboard-sized visual viewport, recover without reload.
   await p.setViewportSize({width:viewport.height,height:viewport.width});await ready(true);await p.setViewportSize(viewport);await ready(true);
   await p.evaluate(()=>{window.primaryVV=window.visualViewport;const vv=new EventTarget();Object.assign(vv,{width:innerWidth,height:240,offsetLeft:0,offsetTop:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});window.dispatchEvent(new Event('resize'))});await ready(false);
   await p.evaluate(()=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:primaryVV});window.dispatchEvent(new Event('resize'))});await ready(true);assert.deepEqual(await snapshot(),before);
   // A focused real scale input identifies a transient keyboard shrink. The same
   // no-fit viewport without focus must fall back, including after focus is lost.
   await command('right','settings','drawingScalesToggle');await p.locator('#geometryScale').focus();await settled();
   await p.evaluate(()=>{setMode('bar');first={x:300,y:300};saveDraft()});
   const keyboardBefore=await snapshot(),pendingBefore=await p.evaluate(()=>JSON.stringify(first));
   await p.evaluate(()=>{leftDrawingMenu.state.open=true;leftDrawingMenu.refresh();window.primaryVV=visualViewport;const vv=new EventTarget();Object.assign(vv,{width:innerWidth,height:240,offsetLeft:0,offsetTop:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});window.dispatchEvent(new Event('resize'))});
   await settled();await ready(true);
   assert.equal(await p.evaluate(()=>leftDrawingMenu.layout.fits),false);
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
   for(const id of ['commandRibbon','ribbonToggle','toggleTools'])assert(await p.locator('#'+id).isHidden());
   assert.equal(await p.locator('#toolPanel button[data-mode=bar]').count(),1);
   assert.deepEqual(await snapshot(),keyboardBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),pendingBefore);
   // Viewport restoration while focus remains also resumes normal safe-fit.
   await p.evaluate(()=>{visualViewport.height=innerHeight;window.dispatchEvent(new Event('resize'))});await settled();await ready(true);
   assert.equal(await p.evaluate(()=>leftDrawingMenu.layout.fits&&rightCommandMenu.layout.fits),true);
   await p.evaluate(()=>{visualViewport.height=240;window.dispatchEvent(new Event('resize'))});await settled();await ready(true);
   await p.locator('#geometryScale').blur();await ready(false);
   assert(await p.locator('#commandRibbon').isVisible());assert(await p.locator('#toggleTools').isVisible());
   assert.deepEqual(await snapshot(),keyboardBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),pendingBefore);
   // Focusing after no-fit cannot promote a fallback presentation to radial-primary.
   await p.locator('#geometryScale').focus();await settled();await ready(false);
   await p.evaluate(()=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:primaryVV});window.dispatchEvent(new Event('resize'))});await ready(true);
   assert.deepEqual(await snapshot(),keyboardBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),pendingBefore);
   // Genuine layout shrink while still focused must not inherit keyboard retention.
   await p.setViewportSize({width:viewport.height,height:300});await ready(false);
   assert(await p.locator('#toggleTools').isVisible());
   await p.setViewportSize(viewport);await ready(true);
   assert.deepEqual(await snapshot(),keyboardBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),pendingBefore);
   await p.evaluate(()=>{closeDrawingScales();cancelToSelection()});await settled();
   // Hidden sources retain real anchor rectangles; collapsed Ribbon preference is preserved.
   await p.evaluate(()=>ribbonToggle.click());await ready(true);
   const anchors=await p.evaluate(()=>[drawingScalesButton,snapButton,momentButton].map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}}));assert(anchors.every(r=>r.width>0&&r.height>0));
   await p.evaluate(()=>ribbonToggle.click());
   await p.evaluate(()=>{window.barClicks=0;document.querySelector('button[data-mode=bar]').addEventListener('click',()=>barClicks++)});await command('left','geometry','bar');assert.equal(await p.evaluate(()=>barClicks),1);assert.equal(await p.evaluate(()=>mode),'bar');
   await p.evaluate(()=>saveDraft());const active=await snapshot();await tap('hub','left');await tap('hub','right');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);await tap('hub','left');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);await tap('hub','left');assert.deepEqual(await snapshot(),active);
   await command('left','connections','roller');assert.equal(await p.evaluate(()=>mode),'support');assert.equal(await p.evaluate(()=>$('support').value),'roller');
   await command('right','file','open');assert(await p.locator('#openDrawingDialog').isVisible());await p.locator('#cancelOpenDrawing').tap();await settled();
   await command('right','view','resetView');await p.evaluate(()=>{past=[];future=[];checkpoint();items[0].label='primary history';render()});await command('right','history','undo');assert.notEqual(await p.evaluate(()=>items[0].label),'primary history');await command('right','history','redo');assert.equal(await p.evaluate(()=>items[0].label),'primary history');
   await command('right','view','panView');assert.equal(await p.evaluate(()=>panEnabled),true);await tap('hub','right');await tap('view','right');assert.equal(await p.locator('.semicircle-right-menu [data-demo-id=panView]').getAttribute('aria-pressed'),'true');await tap('panView','right');
   const fits=async selector=>{await settled();assert(await p.locator(selector).isVisible());const r=await p.locator(selector).boundingBox();assert(r&&r.width>0&&r.height>0&&r.x>=0&&r.y>=44&&r.x+r.width<=viewport.width+.1&&r.y+r.height<=viewport.height+.1,selector+JSON.stringify(r))};
   if(await p.evaluate(()=>snapEnabled))await command('right','snap','snapToggle');await command('right','snap','snapToggle');assert.equal(await p.evaluate(()=>snapEnabled),true);await fits('#snapSettings .snap-choices');
   await p.locator('header strong').tap();await command('right','snap','snapOptions');await fits('#snapSettings .snap-choices');const endpoint=await p.locator('#snap-endpoint').isChecked();await p.locator('#snap-endpoint').click();assert.equal(await p.evaluate(()=>snapOptions.endpoint),!endpoint);
   await command('right','settings','drawingScalesToggle');await fits('#drawingScales');await p.locator('#geometryScale').fill('125');await p.locator('#geometryScale').press('Tab');assert.equal(await p.evaluate(()=>geometryScale),125);await p.locator('header strong').tap();
   // Moment and the shared secondary tool popup also use preserved source geometry.
   await tap('hub','left');await tap('loads','left');await p.locator('.semicircle-left-menu [data-demo-id=moment]').focus();await p.keyboard.press('ArrowDown');await fits('#momentDirectionPalette .snap-choices');await p.locator('#momentDirectionPalette input[value=ccw]').check();assert.equal(await p.evaluate(()=>currentMomentRotation),'ccw');
   await command('left','region','hatch');await fits('#secondaryTools');await p.evaluate(()=>{$('hatchMethod').value='points';closeSecondaryTools()});
   const draw=async(x,y)=>{const q=await p.evaluate(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},[x,y]);await p.touchscreen.tap(q.x,q.y)};
   await draw(300,300);await draw(500,300);await draw(450,450);assert(await p.locator('#commandControls button').last().isVisible());const count=await p.evaluate(()=>items.length);await p.locator('#commandControls button').last().tap();assert.equal(await p.evaluate(()=>items.length),count+1);
   await command('left','region','hatch');await p.evaluate(()=>{$('hatchMethod').value='points';closeSecondaryTools()});await draw(300,300);await p.locator('#commandControls button').first().tap();await ready(true);
   if(viewport.width===1280){await tap('hub','left');await tap('connections','left');await p.screenshot({path:'tests/radial-primary-left-1280.png'})}
   else{await tap('hub','right');await tap('snap','right');await p.screenshot({path:'tests/radial-primary-right-800.png'})}
   assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('radial-primary'))),false);assert.deepEqual(errors,[]);
   console.log('PASS radial primary / 60px recovered / safe fallback / source anchors / popups / commands',viewport);await p.close();
  }
  assert(fs.readFileSync('assets/tablet.js','utf8').includes("KETCAU_APP_VERSION='shell-v8'"));
  assert(fs.readFileSync('sw.js','utf8').includes('shell-v8'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
