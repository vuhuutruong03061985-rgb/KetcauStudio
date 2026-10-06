const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {focusRadialEntry}=require('./radial-focus.cjs');
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
    const browseRing={history:'R1',edit:'R1',view:'R2',snap:'R2',settings:'R2'};
    if(side==='right'&&browseRing[id]){
     const next=await p.evaluate(ringId=>{const ring=rightCommandMenu.state.rings.find(r=>r.id===ringId);return ring.entries[(ring.activeIndex+1)%ring.entries.length].id},browseRing[id]);
     await focusRadialEntry(p,'right',next);return;
    }
    const q=await p.evaluate(({id,side})=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;
     if(id==='hub')return{x:m.layout.cx+(side==='left'?13:-13),y:m.layout.cy};if(['commandCancel','commandFinish'].includes(id))return m.layout.contextRing.sectors[sharedOuterActions.findIndex(e=>e.id===id)].icon;
     if(side==='left'){
      const aliases={geometry:'geometry',connections:'supports',loads:'loads',region:'annotation',dimensions:'annotation',annotation:'annotation',diagrams:'annotation'};
      const r=aliases[id]?m.state.rings[0]:m.state.rings.find(r=>r.entries.some(e=>e.id===id));
      const i=r.entries.findIndex(e=>e.id===(aliases[id]||id));return m.layout.rings.find(l=>l.id===r.id).sectors[i].icon;
     }
     const aliases={history:'R1',edit:'R1',view:'R2',snap:'R2',settings:'R2'};const r=aliases[id]?m.state.rings.find(r=>r.id===aliases[id]):m.state.rings.find(r=>r.entries.some(e=>e.id===id));const i=aliases[id]?(r.activeIndex+1)%r.entries.length:r.entries.findIndex(e=>e.id===id);return m.layout.rings.find(l=>l.id===r.id).sectors[i].icon;
    },{id,side});await p.touchscreen.tap(q.x,q.y);
   };
   const command=async(side,group,id)=>{
    if(side==='right'&&(group==='file'||['undo','redo','snapToggle','drawingScalesToggle'].includes(id))){await p.evaluate(()=>rightCommandMenu.close());await p.locator('#'+id).tap();return;}
    if(!await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.open,side))await tap('hub',side);
    if(side==='left'){const category=await p.evaluate(id=>leftDrawingCategories.find(c=>c.entries.some(e=>e.id===id)).id,id);if(await p.evaluate(()=>leftCategoryId)!==category){const q=await p.evaluate(id=>{const m=leftDrawingMenu;return m.layout.rings[0].sectors[m.state.rings[0].entries.findIndex(e=>e.id===id)].icon},category);await p.touchscreen.tap(q.x,q.y)}}
    await tap(id,side);
   };
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
   // Review clean canvas and each navigation level in both orientations.
   for(const id of ['undo','redo'])assert(await p.locator('#tabletTopBar #'+id).isVisible());
   for(const [side,group]of [['left','region'],['right','view']]){
    await tap('hub',side);
    await p.screenshot({path:`tests/task3a-${side}-open-${viewport.width}.png`});
    await tap(group,side);
    const root=p.locator(`.semicircle-${side}-menu`);
    assert.equal(await root.locator('.selected-group').count(),side==='left'?1:2);
    assert.equal(await root.locator('text,button').count(),0);
    await p.screenshot({path:`tests/task3a-${side}-expanded-${viewport.width}.png`});
    await tap('hub',side);
   }
   // Fit failure on either independent side restores both legacy surfaces and preferences.
   await p.evaluate(()=>saveDraft());const primaryHeight=await canvasHeight(),topBarHeight=await p.locator('#tabletTopBar').evaluate(el=>el.getBoundingClientRect().height),before=await snapshot();
   for(const side of ['left','right']){
    await p.evaluate(side=>{const probe=side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe;probe.style.paddingRight='calc(100vw - 60px)';(side==='left'?leftDrawingMenu:rightCommandMenu).refresh()},side);await ready(false);
    assert(await p.locator('#commandRibbon').isVisible());assert(await p.locator('#toggleTools').isVisible());assert(Math.abs(primaryHeight-await canvasHeight()-(60-topBarHeight))<1);
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
   // 3C.7A requires complete fallback whenever the fans cannot fit, even with
   // editable focus. Preserve pending state and field switching across that move.
   await command('right','settings','drawingScalesToggle');await p.locator('#geometryScale').focus();await settled();
   await p.evaluate(()=>{setMode('bar');first={x:300,y:300};saveDraft()});
   const keyboardBefore=await snapshot(),pendingBefore=await p.evaluate(()=>JSON.stringify(first));
   const fallback=async()=>{await settled();await ready(false);for(const id of ['tabletTopBar','tabletBottomLeftBar','tabletBottomRightBar'])assert(await p.locator('#'+id).isHidden());assert(await p.locator('#toggleTools').isVisible());assert(await p.locator('#commandRibbon').isVisible());assert.equal(await p.locator('.semicircle-left-menu:visible,.semicircle-right-menu:visible').count(),0)};
   await p.evaluate(()=>{leftDrawingMenu.state.open=true;leftDrawingMenu.refresh();window.primaryVV=visualViewport;const vv=new EventTarget();Object.assign(vv,{width:innerWidth,height:240,offsetLeft:0,offsetTop:0});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});window.dispatchEvent(new Event('resize'))});
   await fallback();assert.equal(await p.evaluate(()=>leftDrawingMenu.layout.fits),false);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await snapshot(),keyboardBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),pendingBefore);
   await p.locator('#geometryScale').blur();await fallback();await p.locator('#geometryScale').focus();await fallback();
   await p.evaluate(()=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:primaryVV});window.dispatchEvent(new Event('resize'))});await ready(true);assert.deepEqual(await snapshot(),keyboardBefore);
   const keyboardViewport={width:Math.round(viewport.width*.98),height:240};
   for(const size of [keyboardViewport,viewport,keyboardViewport,{width:viewport.height,height:300},viewport]){
    await p.setViewportSize(size);if(size.height<=300)await fallback();else await ready(true);assert.deepEqual(await snapshot(),keyboardBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),pendingBefore);
   }
   await p.evaluate(()=>{closeDrawingScales();cancelToSelection()});await settled();
   await p.evaluate(()=>{setMode('bar');first={x:300,y:300};beginBarNumericInput({clientX:400,clientY:400,pointerType:'touch'});window.primaryCapture=dynamicNumericCapture;saveDraft()});
   await p.locator('#dynamicInputValue').focus();const fieldBefore=await snapshot(),fieldPoint=await p.evaluate(()=>JSON.stringify(first));
   const preserved=async()=>{await fallback();assert.deepEqual(await snapshot(),fieldBefore);assert.equal(await p.evaluate(()=>JSON.stringify(first)),fieldPoint);assert(await p.evaluate(()=>dynamicNumericCapture===primaryCapture))};
   await p.setViewportSize(keyboardViewport);await preserved();
   for(const [from,to] of [['dynamicInputValue','dynamicInputSecondary'],['dynamicInputSecondary','dynamicInputValue']]){
    await p.locator('#'+from).blur();assert.equal(await p.evaluate(()=>document.activeElement===document.body),true);await preserved();await p.locator('#'+to).focus();await preserved();
   }
   await p.setViewportSize(viewport);await ready(true);assert.deepEqual(await snapshot(),fieldBefore);
   await p.setViewportSize(keyboardViewport);await preserved();await p.evaluate(()=>hideDynamicInput());await fallback();assert.deepEqual(await snapshot(),fieldBefore);
   await p.setViewportSize(viewport);await settled();await ready(true);await p.evaluate(()=>cancelToSelection());
   // Hidden sources retain real anchor rectangles; collapsed Ribbon preference is preserved.
   await p.evaluate(()=>ribbonToggle.click());await ready(true);
   const anchors=await p.evaluate(()=>[drawingScalesButton,snapButton,momentButton].map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height}}));assert(anchors.every(r=>r.width>0&&r.height>0));
   await p.evaluate(()=>ribbonToggle.click());
   await p.evaluate(()=>{window.barClicks=0;document.querySelector('button[data-mode=bar]').addEventListener('click',()=>barClicks++)});await command('left','geometry','bar');assert.equal(await p.evaluate(()=>barClicks),1);assert.equal(await p.evaluate(()=>mode),'bar');
   await p.evaluate(()=>saveDraft());const active=await snapshot();await tap('hub','left');await tap('hub','right');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);await tap('hub','left');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);await tap('hub','left');assert.deepEqual(await snapshot(),active);
   await command('left','connections','roller');assert.equal(await p.evaluate(()=>mode),'support');assert.equal(await p.evaluate(()=>$('support').value),'roller');
   await command('right','file','open');assert(await p.locator('#openDrawingDialog').isVisible());await p.locator('#cancelOpenDrawing').tap();await settled();
   await command('right','view','resetView');await p.evaluate(()=>{past=[];future=[];checkpoint();items[0].label='primary history';render()});await command('right','history','undo');assert.notEqual(await p.evaluate(()=>items[0].label),'primary history');await command('right','history','redo');assert.equal(await p.evaluate(()=>items[0].label),'primary history');
   await command('right','view','panView');assert.equal(await p.evaluate(()=>panEnabled),true);await tap('hub','right');assert.equal(await p.locator('.semicircle-right-menu [data-demo-id=panView]').getAttribute('aria-pressed'),'true');await tap('panView','right');
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
   console.log('PASS radial primary / 48px global row / 12px gain over expanded fallback / safe fallback / source anchors / popups / commands',viewport);await p.close();
  }
  assert(fs.readFileSync('assets/tablet.js','utf8').includes("KETCAU_APP_VERSION='shell-v8'"));
  assert(fs.readFileSync('sw.js','utf8').includes('shell-v8'));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
