const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {focusRadialEntry}=require('./radial-focus.cjs');
const legacyExpected={file:['clear','open','save','saveAs','svg','png'],history:['undo','redo'],edit:['copyObjects','pasteObjects','editSelected','delete'],view:['resetView','panView','zoomOut','zoomIn'],snap:['snapToggle','snapOptions'],settings:['drawingScalesToggle']};
const expected={R1:['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],R2:['panView','snapOptions']};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const desktop=await browser.newPage();await desktop.goto(pathToFileURL(path.resolve('index.html')).href);
  assert.equal(await desktop.locator('.semicircle-right-menu,.semicircle-left-menu').count(),0);assert(await desktop.locator('#toolPanel').isVisible());assert.equal(await desktop.locator('#commandRibbon').count(),0);await desktop.close();
  for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){
   const p=await browser.newPage({viewport,hasTouch:true,isMobile:true,acceptDownloads:true}),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(pathToFileURL(path.resolve('index.html')).href);
   const root=p.locator('.semicircle-right-menu'),sector=id=>root.locator(`[data-demo-id="${id}"]`);
   const activate=async(id,side='right',pointer='touch')=>{
    const q=await p.evaluate(({id,side})=>{const m=side==='right'?rightCommandMenu:leftDrawingMenu;if(id==='hub')return{x:m.layout.cx+(side==='right'?-13:13),y:m.layout.cy};const r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon},{id,side});
    if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
   };
   const openGroup=async group=>{if(!await p.evaluate(()=>rightCommandMenu.state.open))await activate('hub')};
   const focus=async id=>{await openGroup();if(['undo','redo'].includes(id))return;await focusRadialEntry(p,'right',id)};
   const command=async(group,id)=>{if(['undo','redo','clear','open','save','saveAs','svg','png','insertWord','zoomIn','zoomOut','snapToggle','drawingScalesToggle'].includes(id)){await p.evaluate(()=>rightCommandMenu.close());await p.locator(id==='insertWord'?'#tabletTopBar [data-toolbar-icon=insertWord]':'#'+id).tap();return;}await focus(id);await activate(id);assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),['undo','redo'].includes(id),id+' menu state')};
   const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,second,selected,multi:[...multiSelection],geometryScale,internalForceScale,camera:JSON.stringify(camera),handle:documentHandle?.name,name:documentName}));
   assert.equal(await root.count(),1);assert.equal(await p.locator('.semicircle-prototype').count(),0);
   assert.deepEqual(await p.evaluate(()=>Object.fromEntries(rightCommandRings.map(g=>[g.id,g.entries.map(c=>c.id)]))),expected);
   // Observe the original handlers without replacing their behavior.
   await p.evaluate(()=>{window.commandClicks={};for(const c of [...rightCommandRings.flatMap(g=>g.entries),...sharedOuterActions,...['undo','redo','clear','open','save','saveAs','svg','png','zoomIn','zoomOut','snapToggle','drawingScalesToggle'].map(id=>({id,source:document.getElementById(id)}))].filter(c=>c.id!=='snapOptions'))c.source.addEventListener('click',()=>commandClicks[c.id]=(commandClicks[c.id]||0)+1)});
   await p.evaluate(()=>{setMode('bar');first={x:300,y:300};selected=items[0].id;multiSelection=new Set([selected]);render();saveDraft()});
   const before=await snapshot();await activate('hub');const sharedOuterCount=await root.locator('[data-fixed-action]').count();assert.equal(await root.locator('.semicircle-control').count(),1+Object.values(expected).flat().length+sharedOuterCount);
   await p.screenshot({path:`tests/semicircle-right-inner-${viewport.width}.png`});
   const geometry=await p.evaluate(()=>{
    const l=rightCommandMenu.layout;
    return {fits:l.fits,radius:l.radius,hub:l.hubRadius,safe:l.cy-l.radius>=l.bounds.top&&l.cy+l.radius<=l.bounds.bottom,
     targets:l.rings.flatMap(r=>r.sectors).every(s=>{for(let a=0;a<2*Math.PI;a+=Math.PI/36)if(!semicircleEngine.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)))return false;return true}),
     mirror:l.rings.flatMap(r=>r.sectors).every(s=>s.icon.x<l.cx),
     controls:rightCommandRings.flatMap(r=>r.entries).map(c=>({id:c.id,real:c.source===rightCommandSource(c.id),label:c.proxyLabel||c.source.getAttribute('aria-label')||c.source.title}))};
   });
   assert(geometry.fits&&geometry.safe&&geometry.targets&&geometry.mirror);assert.equal(geometry.hub,26);assert.equal(geometry.radius,248.81914748738225);
   for(const c of geometry.controls){assert(c.real);assert.equal(await sector(c.id).getAttribute('aria-label'),c.label);assert(await sector(c.id).locator('title').textContent());assert.equal(await sector(c.id).locator('.semicircle-icon').evaluate(el=>getComputedStyle(el).pointerEvents),'none')}
   console.log('GEOMETRY',viewport,geometry);
   assert.deepEqual(await snapshot(),before);await activate('hub','left');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),true);
   await activate('hub');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await snapshot(),before);
   await p.touchscreen.tap(viewport.width/2,viewport.height-200);assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);assert.deepEqual(await snapshot(),before);
   await activate('hub','right','mouse');await p.mouse.click(viewport.width/2,viewport.height-200);assert.deepEqual(await snapshot(),before);
   // Current New confirmation, Save/Save As handles and Open preview workflow.
   await p.evaluate(()=>{activateSelection();items[0].label='unsaved radial';render()});const dirty=await p.evaluate(()=>documentText());
   p.once('dialog',d=>d.dismiss());await command('file','clear');assert.equal(await p.evaluate(()=>documentText()),dirty);
   p.once('dialog',d=>d.accept());await command('file','clear');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>documentHandle),null);assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);
   await p.evaluate(()=>{
    window.savedFiles={};window.pickSaves=0;
    window.makeTestHandle=name=>({name,getFile:async()=>new File([savedFiles[name]||''],name),createWritable:async()=>({write:async text=>{savedFiles[name]=text},close:async()=>{},abort:async()=>{}})});
    window.showSaveFilePicker=async()=>makeTestHandle(++pickSaves===1?'radial.json':'radial-copy.json');
    items=[make('bar',200,200,400,200)];render();
   });
   await command('file','save');await p.waitForFunction(()=>!fileBusy);assert.equal(await p.evaluate(()=>documentName),'radial.json');assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);
   await command('file','saveAs');await p.waitForFunction(()=>!fileBusy);assert.equal(await p.evaluate(()=>documentName),'radial-copy.json');assert.equal(await p.evaluate(()=>pickSaves),2);
   await p.evaluate(()=>{savedFiles['radial-copy.json']='external';items[0].label='changed';render()});p.once('dialog',d=>d.dismiss());await command('file','save');await p.waitForFunction(()=>!fileBusy);assert.equal(await p.evaluate(()=>savedFiles['radial-copy.json']),'external');
   await command('file','open');assert(await p.locator('#openDrawingDialog').isVisible());
   await p.evaluate(()=>listCandidates([{name:'radial.json',handle:makeTestHandle('radial.json')}]));await p.locator('#drawingFileList button').click();await p.waitForFunction(()=>!$('confirmOpenDrawing').disabled);
   p.once('dialog',d=>d.accept());await p.locator('#confirmOpenDrawing').click();await p.waitForFunction(()=>documentName==='radial.json');assert(await p.locator('#openDrawingDialog').isHidden());
   for(const id of ['svg','png']){const download=p.waitForEvent('download');await command('file',id);assert.equal((await download).suggestedFilename(),'ket-cau.'+id)}
   // Word remains exclusively in the top bar, with its real availability/disabled state.
   await p.evaluate(()=>{wordButton.hidden=false;wordButton.addEventListener('click',()=>commandClicks.insertWord=(commandClicks.insertWord||0)+1)});await command('file','insertWord');assert.equal(await p.evaluate(()=>commandClicks.insertWord),1);
   await p.evaluate(()=>wordButton.disabled=true);assert(await p.locator('#tabletTopBar [data-toolbar-icon=insertWord]').isDisabled());await p.evaluate(()=>wordButton.click());assert.equal(await p.evaluate(()=>commandClicks.insertWord),1);await p.evaluate(()=>{wordButton.disabled=false;wordButton.hidden=true});assert.equal(await sector('insertWord').count(),0);
   // Existing history and base-point Copy/Paste, followed by mode commands.
   await p.evaluate(()=>{activateSelection();past=[];future=[];checkpoint();items[0].label='history';render()});
   await command('history','undo');assert.notEqual(await p.evaluate(()=>items[0].label),'history');await command('history','redo');assert.equal(await p.evaluate(()=>items[0].label),'history');
   await p.evaluate(()=>{selected=items[0].id;snapEnabled=false;updateSnapControls();render()});await command('edit','copyObjects');assert.equal(await p.evaluate(()=>mode),'copyBase');
   const tap=async(x,y)=>{const q=await p.evaluate(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},[x,y]);await p.touchscreen.tap(q.x,q.y)};
   await tap(300,200);await command('edit','pasteObjects');assert.equal(await p.evaluate(()=>mode),'pastePoint');await tap(500,400);assert.equal(await p.evaluate(()=>items.length),2);
   await command('edit','extend');assert.equal(await p.evaluate(()=>mode),'extend');await command('edit','editSelected');assert.equal(await p.evaluate(()=>mode),'labelEdit');await command('view','resetView');assert.equal(await p.evaluate(()=>mode),'select');
   await p.evaluate(()=>{selected=null;multiSelection.clear();render()});await command('edit','delete');assert.equal(await p.evaluate(()=>mode),'erase');await command('view','resetView');
   await command('view','panView');assert.equal(await p.evaluate(()=>panEnabled),true);await openGroup('view');assert.equal(await sector('panView').getAttribute('aria-pressed'),'true');await activate('panView');assert.equal(await p.evaluate(()=>panEnabled),false);
   const width=await p.evaluate(()=>camera.w);await command('view','zoomIn');assert(await p.evaluate(()=>camera.w)<width);await command('view','zoomOut');assert(Math.abs(await p.evaluate(()=>camera.w)-width)<.001);
   // Snap uses the original toggle and original checkbox UI/persistence.
   await command('snap','snapToggle');assert.equal(await p.evaluate(()=>snapEnabled),true);assert(await p.locator('#snapSettings').evaluate(el=>el.open));await p.evaluate(()=>snapPanel.open=false);
   await command('snap','snapOptions');assert(await p.locator('#snapSettings').evaluate(el=>el.open));assert.equal(await p.evaluate(()=>document.activeElement.id),'snap-endpoint');
   const endpoint=await p.evaluate(()=>snapOptions.endpoint);await p.locator('#snap-endpoint').click();assert.equal(await p.evaluate(()=>snapOptions.endpoint),!endpoint);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ket-cau-snap-settings')).options.endpoint),!endpoint);
   await command('snap','snapToggle');assert.equal(await p.evaluate(()=>snapEnabled),false);await openGroup('snap');assert.equal(await sector('snapOptions').getAttribute('aria-disabled'),'true');await activate('snapOptions');assert.equal(await p.evaluate(()=>snapEnabled),false);await activate('hub');
   // Scale popup remains authoritative and stays open after radial close.
   await command('settings','drawingScalesToggle');assert(await p.locator('#drawingScales').isVisible());await p.locator('#geometryScale').fill('125');await p.locator('#geometryScale').press('Tab');assert.equal(await p.evaluate(()=>geometryScale),125);
   await openGroup('settings');assert.equal(await p.locator('#drawingScalesToggle').getAttribute('aria-expanded'),'true');await command('settings','drawingScalesToggle');assert(await p.locator('#drawingScales').isHidden());
   for(const [group,ids]of Object.entries(expected)){await openGroup(group);for(const id of ids)if(await p.evaluate(id=>rightOneShot.has(id),id)){assert.equal(await sector(id).getAttribute('aria-pressed'),null);assert(!(await sector(id).getAttribute('class')).includes('active'))}}
   await openGroup('view');await sector('panView').dispatchEvent('pointerenter',{pointerType:'pen'});assert.equal(await p.evaluate(()=>rightCommandMenu.state.hoveredSector),'panView');await focus('panView');await sector('panView').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);
   await p.evaluate(()=>{rightCommandSafeProbe.style.paddingRight='calc(100vw - 60px)';rightCommandMenu.refresh()});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='false');
   await p.locator('#toggleTools').tap();await p.locator('button[data-mode=bar]').tap();assert.equal(await p.evaluate(()=>mode),'bar');await p.locator('#ribbonToggle').tap();await p.locator('#ribbonToggle').tap();assert(await p.locator('#ribbonScroll').isVisible());
   await p.evaluate(()=>{rightCommandSafeProbe.style.removeProperty('padding-right');rightCommandMenu.refresh()});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');
   // Every real required command above went through its original control.
   const clicks=await p.evaluate(()=>commandClicks);for(const id of [...new Set([...Object.values(legacyExpected).flat(),...Object.values(expected).flat()])].filter(id=>id!=='snapOptions'))assert(clicks[id]>0,id+' original handler invoked');
   await command('snap','snapToggle');await p.locator('header strong').tap();await openGroup('snap');await p.screenshot({path:`tests/semicircle-right-${viewport.width}.png`});
   await p.evaluate(()=>{const vv=new EventTarget();Object.assign(vv,{offsetLeft:0,offsetTop:0,width:800,height:240});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});rightCommandMenu.refresh()});assert(await root.isHidden());assert(await p.locator('#ribbonToggle').isVisible());
   assert.deepEqual(errors,[]);console.log('PASS real right commands, navigation isolation, mirrored geometry, File, history, Edit, View, Snap, scales and fallback UI',viewport);await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
