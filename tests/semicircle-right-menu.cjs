const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const expected={file:['clear','open','save','saveAs','svg','png'],history:['undo','redo'],edit:['copyObjects','pasteObjects','editSelected','delete'],view:['resetView','panView','zoomOut','zoomIn'],snap:['snapToggle','snapOptions'],settings:['drawingScalesToggle']};
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
    const q=await p.evaluate(({id,side})=>{const m=side==='right'?rightCommandMenu:leftDrawingMenu,groups=side==='right'?rightCommandGroups:leftDrawingGroups;if(id==='hub')return {x:m.layout.cx+(side==='right'?-13:13),y:m.layout.cy};const index=groups.findIndex(g=>g.id===id);return index>=0?m.layout.inner[index].icon:m.layout.outer[groups.find(g=>g.id===m.state.activeGroup).children.findIndex(c=>c.id===id)].icon},{id,side});
    if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
   };
   const openGroup=async group=>{if(!await p.evaluate(()=>rightCommandMenu.state.open))await activate('hub');if(await p.evaluate(()=>rightCommandMenu.state.activeGroup)!==group)await activate(group)};
   const command=async(group,id)=>{await openGroup(group);await activate(id);assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false,id+' closes menu')};
   const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,second,selected,multi:[...multiSelection],geometryScale,internalForceScale,camera:JSON.stringify(camera),handle:documentHandle?.name,name:documentName}));
   assert.equal(await root.count(),1);assert.equal(await p.locator('.semicircle-prototype').count(),0);
   assert.deepEqual(await p.evaluate(()=>Object.fromEntries(rightCommandGroups.map(g=>[g.id,g.children.map(c=>c.id)]))),expected);
   assert.deepEqual(await p.evaluate(()=>rightCommandGroups.map(g=>g.label)),['Tệp tin', 'Lịch sử', 'Sao chép', 'Chế độ xem', 'Hiển thị', 'Cài đặt']);
   // Observe the original handlers without replacing their behavior.
   await p.evaluate(()=>{window.commandClicks={};for(const c of rightCommandGroups.flatMap(g=>g.children).filter(c=>c.id!=='snapOptions'))c.source.addEventListener('click',()=>commandClicks[c.id]=(commandClicks[c.id]||0)+1)});
   await p.evaluate(()=>{setMode('bar');first={x:300,y:300};selected=items[0].id;multiSelection=new Set([selected]);render();saveDraft()});
   const before=await snapshot();await activate('hub');const rightInitialChildren=await p.evaluate(()=>rightCommandGroups.find(g=>g.id===rightCommandMenu.state.activeGroup).children.length);assert.equal(await root.locator('.semicircle-control').count(),7+rightInitialChildren);
   await p.screenshot({path:`tests/semicircle-right-inner-${viewport.width}.png`});
   for(const group of Object.keys(expected)){
    await openGroup(group);assert.equal(await root.locator('text,button').count(),0);
    const geometry=await p.evaluate(()=>{
     const m=rightCommandMenu,l=m.layout,mirror=semicircleEngine.mirrorSemicircleLayout(l),group=rightCommandGroups.find(g=>g.id===m.state.activeGroup);
     return {fits:l.fits,radius:l.radius,inner:l.inner[0].r1,hub:l.hubRadius,span:l.outer.at(-1).a1-l.outer[0].a0,
      safe:l.cy-l.radius>=l.bounds.top&&l.cy+l.radius<=l.bounds.bottom,
      targets:[...l.inner,...l.outer].every(s=>{for(let a=0;a<2*Math.PI;a+=Math.PI/36)if(!semicircleEngine.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)))return false;return document.elementFromPoint(s.icon.x,s.icon.y)?.classList.contains('semicircle-hit')}),
      mirror:l.inner.every((s,i)=>s.icon.x<l.cx&&s.icon.y===mirror.inner[i].icon.y&&Math.abs(s.icon.x+mirror.inner[i].icon.x-l.bounds.left-l.bounds.right)<1e-8),
      controls:group.children.map(c=>({id:c.id,real:c.source===document.getElementById(c.id==='snapOptions'?'snapToggle':c.id),label:c.proxyLabel||c.source.getAttribute('aria-label')||c.source.title}))};
    });
    assert(geometry.fits&&geometry.safe&&geometry.targets&&geometry.mirror);assert.equal(geometry.hub,26);assert(geometry.radius<185);
    if(group==='history')assert(geometry.span<Math.PI/3);
    for(const c of geometry.controls){assert(c.real);assert.equal(await sector(c.id).getAttribute('aria-label'),c.label);assert(await sector(c.id).locator('title').textContent());assert.equal(await sector(c.id).locator('.semicircle-icon').evaluate(el=>getComputedStyle(el).pointerEvents),'none')}
    console.log('GEOMETRY',viewport,group,geometry.radius,geometry.span*180/Math.PI);
   }
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
   // Conditional Word proxy uses the same original button; no external Word request in this test.
   await p.evaluate(()=>{wordButton.hidden=false;wordButton.addEventListener('click',()=>commandClicks.insertWord=(commandClicks.insertWord||0)+1)});await command('file','insertWord');assert.equal(await p.evaluate(()=>commandClicks.insertWord),1);
   await p.evaluate(()=>wordButton.disabled=true);await openGroup('file');assert.equal(await sector('insertWord').getAttribute('aria-disabled'),'true');await activate('insertWord');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),true);
   await p.evaluate(()=>{wordButton.disabled=false;wordButton.hidden=true});assert.equal(await sector('insertWord').count(),0);await activate('hub');
   // Existing history and base-point Copy/Paste, followed by mode commands.
   await p.evaluate(()=>{activateSelection();past=[];future=[];checkpoint();items[0].label='history';render()});
   await command('history','undo');assert.notEqual(await p.evaluate(()=>items[0].label),'history');await command('history','redo');assert.equal(await p.evaluate(()=>items[0].label),'history');
   await p.evaluate(()=>{selected=items[0].id;snapEnabled=false;updateSnapControls();render()});await command('edit','copyObjects');assert.equal(await p.evaluate(()=>mode),'copyBase');
   const tap=async(x,y)=>{const q=await p.evaluate(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},[x,y]);await p.touchscreen.tap(q.x,q.y)};
   await tap(300,200);await command('edit','pasteObjects');assert.equal(await p.evaluate(()=>mode),'pastePoint');await tap(500,400);assert.equal(await p.evaluate(()=>items.length),2);
   await command('edit','editSelected');assert.equal(await p.evaluate(()=>mode),'labelEdit');await command('view','resetView');assert.equal(await p.evaluate(()=>mode),'select');
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
   await openGroup('settings');assert.equal(await sector('drawingScalesToggle').getAttribute('aria-expanded'),'true');await activate('drawingScalesToggle');assert(await p.locator('#drawingScales').isHidden());
   for(const [group,ids]of Object.entries(expected)){await openGroup(group);for(const id of ids)if(await p.evaluate(id=>rightOneShot.has(id),id)){assert.equal(await sector(id).getAttribute('aria-pressed'),null);assert(!(await sector(id).getAttribute('class')).includes('active'))}}
   await openGroup('view');await sector('panView').dispatchEvent('pointerenter',{pointerType:'pen'});assert.equal(await p.evaluate(()=>rightCommandMenu.state.hoveredSector),'panView');await sector('zoomIn').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);
   await p.evaluate(()=>{rightCommandSafeProbe.style.paddingRight='calc(100vw - 60px)';rightCommandMenu.refresh()});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='false');
   await p.locator('#toggleTools').tap();await p.locator('button[data-mode=bar]').tap();assert.equal(await p.evaluate(()=>mode),'bar');await p.locator('#ribbonToggle').tap();await p.locator('#ribbonToggle').tap();assert(await p.locator('#ribbonScroll').isVisible());
   await p.evaluate(()=>{rightCommandSafeProbe.style.removeProperty('padding-right');rightCommandMenu.refresh()});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');
   // Every real required command above went through its original control.
   const clicks=await p.evaluate(()=>commandClicks);for(const id of Object.values(expected).flat().filter(id=>id!=='snapOptions'))assert(clicks[id]>0,id+' original handler invoked');
   await command('snap','snapToggle');await p.locator('header strong').tap();await openGroup('snap');await p.screenshot({path:`tests/semicircle-right-${viewport.width}.png`});
   await p.evaluate(()=>{const vv=new EventTarget();Object.assign(vv,{offsetLeft:0,offsetTop:0,width:800,height:240});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});rightCommandMenu.refresh()});assert(await root.isHidden());assert(await p.locator('#ribbonToggle').isVisible());
   assert.deepEqual(errors,[]);console.log('PASS real right commands, navigation isolation, mirrored geometry, File, history, Edit, View, Snap, scales and fallback UI',viewport);await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
