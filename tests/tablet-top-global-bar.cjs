const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),http=require('node:http'),{pathToFileURL}=require('node:url');
const commands=['clear','open','save','saveAs','svg','png','insertWord'];
(async()=>{
 // Local fixtures only: picker writes remain in memory, Word requests never
 // reach Word/COM, and the unchanged export handler renders its real PNG.
 const repo=path.resolve('.'),wordRequests=[];
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/bridge-info'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({token:'top-bar-test'}));return}
  if(pathname==='/insert-word'){
   let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{wordRequests.push({token:req.headers['x-studio-token'],body:JSON.parse(body)});res.setHeader('Content-Type','application/json');res.end('{"ok":true}')});return;
  }
  const file=path.resolve(repo,'.'+decodeURIComponent(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(repo+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end();return}
  res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({viewport:{width:1280,height:800},acceptDownloads:true}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(`http://localhost:${server.address().port}/index.html`);
  await p.waitForFunction(()=>typeof tabletTopBar!=='undefined'&&wordBridgeToken==='top-bar-test');
  const cdp=await p.context().newCDPSession(p),bar=p.locator('#tabletTopBar');
  const ready=value=>p.waitForFunction(value=>document.body.dataset.radialPrimary===String(value),value);
  const settled=()=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const tap=async locator=>{await locator.waitFor({state:'visible'});const r=await locator.boundingBox();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+r.width/2,y:r.y+r.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settled()};
  const source=id=>id==='insertWord'?p.locator('#exportToolbar [data-toolbar-icon="insertWord"]'):p.locator('#'+id);
  const visibleCommands=()=>bar.locator('button:not([hidden])').evaluateAll(es=>es.map(e=>e.id||e.dataset.toolbarIcon));
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),mode,first,second,selected,rotation:currentMomentRotation,support:$('support').value}));
  const menuMemory=()=>p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>m?.state.rings.map(r=>({id:r.id,index:r.activeIndex,offset:r.offset,pointer:r.pointerId,dragging:r.dragging}))));
  const out=path.resolve('.test-tools/tablet-top-global-bar');fs.mkdirSync(out,{recursive:true});
  const shot=async name=>{await p.waitForTimeout(600);await settled();await p.screenshot({path:path.join(out,name+'.png')})};
  await p.evaluate(()=>{
   window.topOriginal=Object.fromEntries(['clear','open','save','saveAs','svg','png','insertWord'].map(id=>[id,id==='insertWord'?wordButton:$(id)]));
   window.topHandlers=Object.fromEntries(Object.entries(topOriginal).map(([id,button])=>[id,button.onclick]));
   window.topAttributes=Object.fromEntries(Object.entries(topOriginal).map(([id,button])=>[id,{label:button.getAttribute('aria-label'),title:button.title,icon:button.style.getPropertyValue('--tool-icon')} ]));
   window.topActionOrder=[...$('actions').children];window.topCalls={};
   for(const [id,button]of Object.entries(topOriginal))button.addEventListener('click',()=>topCalls[id]=(topCalls[id]||0)+1);
  });
  const identity=async restored=>{
   assert(await p.evaluate(restored=>Object.entries(topOriginal).every(([id,button])=>button===(id==='insertWord'?wordButton:$(id))&&button.onclick===topHandlers[id]&&button.getAttribute('aria-label')===topAttributes[id].label&&button.title===topAttributes[id].title&&button.style.getPropertyValue('--tool-icon')===topAttributes[id].icon&&button.closest(restored?'#actions':'#tabletTopCommands')),restored));
   if(restored)assert(await p.evaluate(()=>[...$('actions').children].every((node,i)=>node===topActionOrder[i])&&$('actions').children.length===topActionOrder.length));
   for(const id of commands.filter(id=>id!=='insertWord'))assert.equal(await p.locator('#'+id).count(),1);
   assert.equal(await p.locator('#fileToolbar,#exportToolbar').count(),2);
  };
  assert(await bar.isHidden());await identity(true);await shot('desktop');
  const beforeMedia=await snapshot();await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});await ready(true);await settled();
  assert.deepEqual(await snapshot(),beforeMedia);await identity(false);assert.deepEqual(await visibleCommands(),commands);
  assert.equal(await p.locator('#tabletTopBar #ribbonToggle').count(),0);
  assert.equal(await p.locator('#tabletTopBar #headerFileName,#tabletTopBar #fileStatus').count(),0);
  assert(await p.locator('#commandRibbon').isHidden());assert(await p.locator('#ribbonToggle').isHidden());
  const geometry=async()=>{await settled();return p.evaluate(()=>{
   const h=document.querySelector('header').getBoundingClientRect(),t=tabletTopBar.getBoundingClientRect(),drawing=svg.getBoundingClientRect();
   return {primary:document.body.dataset.radialPrimary,headerBottom:h.bottom,topBarBottom:t.bottom,height:t.height,canvasTop:drawing.top,overflow:document.documentElement.scrollWidth>innerWidth,
    targets:[...tabletTopCommands.querySelectorAll('button:not([hidden])')].map(b=>{const r=b.getBoundingClientRect();return {id:b.id||b.dataset.toolbarIcon,w:r.width,h:r.height,top:r.top,bottom:r.bottom}}),
    menus:[leftDrawingMenu,rightCommandMenu].map(m=>({radius:m.layout.radius,fits:m.layout.fits,bounds:m.layout.bounds,top:m.layout.cy-m.layout.radius}))};
  })};
  const checkGeometry=async()=>{
   const g=await geometry();assert.equal(g.primary,'true');assert.equal(g.height,48);assert.equal(g.headerBottom,g.topBarBottom-g.height);assert(g.canvasTop>=g.topBarBottom);assert(!g.overflow);
   assert(g.targets.every(t=>t.w>=44&&t.h>=44&&t.top>=g.headerBottom&&t.bottom<=g.topBarBottom));
   assert(g.menus.every(m=>m.fits&&m.bounds.top>=g.topBarBottom+8&&m.top>=g.topBarBottom+8));
   assert.deepEqual(g.menus.map(m=>m.radius),[304.04759747124507,248.81914748738225]);return g;
  };
  console.log('LANDSCAPE',JSON.stringify(await checkGeometry()));await shot('landscape');
  await p.evaluate(()=>{wordButton.hidden=true});await settled();assert.deepEqual(await visibleCommands(),commands.slice(0,-1));const exportWidth=await p.locator('#exportToolbar').evaluate(e=>e.getBoundingClientRect().width);await shot('word-hidden');
  await p.evaluate(()=>{wordButton.hidden=false});await settled();assert.deepEqual(await visibleCommands(),commands);assert.equal(await p.locator('#exportToolbar').evaluate(e=>e.getBoundingClientRect().width)-exportWidth,48);await shot('word-visible');

  // File operations use actual source taps with mocked picker handles. No real
  // file is overwritten, including conflict and unsaved-document safeguards.
  await p.evaluate(()=>{
   window.pickSaves=0;window.savedFiles={};
   window.testHandle=name=>({name,getFile:async()=>new File([savedFiles[name]||''],name),createWritable:async()=>({write:async text=>savedFiles[name]=text,close:async()=>{},abort:async()=>{}})});
   window.showSaveFilePicker=async()=>testHandle(++pickSaves===1?'Top-bar-khung.json':'Top-bar-ban-sao.json');
   savedDocument=documentText();updateFileStatus();
  });
  await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');assert(await bar.isVisible());
  const beforeSave=await snapshot(),remembered=await menuMemory();await tap(source('save'));await p.waitForFunction(()=>documentName==='Top-bar-khung.json'&&!fileBusy);
  assert.deepEqual(await snapshot(),beforeSave);assert.equal(await p.evaluate(()=>topCalls.save),1);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
  assert.deepEqual(await menuMemory(),remembered);assert.equal(await p.evaluate(()=>pickSaves),1);
  assert.equal(await p.locator('#headerFileName').textContent(),'Top-bar-khung.json');assert.equal(await p.locator('#headerFileName').getAttribute('aria-live'),'polite');await shot('named-file');
  await p.evaluate(()=>{items[0].label='Dirty named file';render()});assert.equal(await p.locator('#headerFileName').textContent(),'Top-bar-khung.json *');await shot('dirty-file');
  await tap(source('save'));await p.waitForFunction(()=>savedDocument===documentText()&&!fileBusy);assert.equal(await p.evaluate(()=>pickSaves),1);assert.equal(await p.locator('#headerFileName').textContent(),'Top-bar-khung.json');
  await tap(source('saveAs'));await p.waitForFunction(()=>documentName==='Top-bar-ban-sao.json'&&!fileBusy);assert.equal(await p.evaluate(()=>pickSaves),2);assert.equal(await p.evaluate(()=>topCalls.saveAs),1);
  await p.evaluate(()=>{savedFiles['Top-bar-ban-sao.json']='external';items[0].label='Conflict';render()});const conflict=await snapshot();p.once('dialog',d=>d.dismiss());await tap(source('save'));await p.waitForFunction(()=>!fileBusy);assert.equal(await p.evaluate(()=>savedFiles['Top-bar-ban-sao.json']),'external');assert.deepEqual(await snapshot(),conflict);
  p.once('dialog',d=>d.dismiss());await tap(source('clear'));assert.deepEqual(await snapshot(),conflict);assert.equal(await p.evaluate(()=>topCalls.clear),1);
  const doc=await p.evaluate(()=>documentText());await tap(source('open'));assert(await p.locator('#openDrawingDialog').isVisible());
  await p.evaluate(doc=>listCandidates([{name:'Opened-top.json',file:new File([doc],'Opened-top.json')},{name:'bad.json',file:new File(['null'],'bad.json')}]),doc);
  await tap(p.locator('#drawingFileList button').filter({hasText:'Opened-top.json'}));await p.waitForFunction(()=>!$('confirmOpenDrawing').disabled);assert(await p.locator('#drawingFilePreview').isVisible());assert.equal(await p.evaluate(()=>documentText()),doc);
  await tap(p.locator('#drawingFileList button').filter({hasText:'bad.json'}));await p.waitForFunction(()=>$('confirmOpenDrawing').disabled);assert.equal(await p.evaluate(()=>documentText()),doc);
  await tap(p.locator('#cancelOpenDrawing'));assert.deepEqual(await snapshot(),conflict);
  await tap(source('open'));await p.evaluate(doc=>listCandidates([{name:'Opened-top.json',file:new File([doc],'Opened-top.json')}]),doc);await tap(p.locator('#drawingFileList button').first());await p.waitForFunction(()=>!$('confirmOpenDrawing').disabled);
  p.once('dialog',d=>d.dismiss());await tap(p.locator('#confirmOpenDrawing'));assert.equal(await p.evaluate(()=>documentText()),doc);assert.equal(await p.evaluate(()=>documentName),'Top-bar-ban-sao.json');
  p.once('dialog',d=>d.accept());await tap(p.locator('#confirmOpenDrawing'));await p.waitForFunction(()=>documentName==='Opened-top.json');assert.equal(await p.evaluate(()=>documentText()),doc);

  // A top command closes navigation only: pending drawing points and ring memory
  // survive source Save/exports; no synthesized Escape or canvas activation.
  await p.evaluate(()=>{setMode('bar');first={x:300,y:300};render();window.topEscapes=0;window.topDrawingDowns=0;window.addEventListener('keydown',e=>{if(e.key==='Escape')topEscapes++});svg.addEventListener('pointerdown',()=>topDrawingDowns++);showSaveFilePicker=async()=>testHandle('Pending-top.json')});
  const pending=await snapshot();await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await tap(source('saveAs'));await p.waitForFunction(()=>documentName==='Pending-top.json'&&!fileBusy);assert.deepEqual(await snapshot(),pending);assert.equal(await p.evaluate(()=>rightCommandMenu.state.open),false);
  for(const id of ['svg','png']){
   await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');const count=await p.evaluate(id=>topCalls[id]||0,id),download=p.waitForEvent('download');await tap(source(id));const result=await download;
   assert.equal(result.suggestedFilename(),id==='svg'?'ket-cau.svg':'ket-cau.png');assert.equal(await p.evaluate(id=>topCalls[id],id),count+1);assert.deepEqual(await snapshot(),pending);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
  }
  await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');const inserted=p.waitForResponse('**/insert-word');await tap(source('insertWord'));assert((await inserted).ok());await p.waitForFunction(()=>!wordButton.disabled);
  assert.equal(wordRequests.length,1);assert.equal(wordRequests[0].token,'top-bar-test');assert(Buffer.from(wordRequests[0].body.png,'base64').subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert.deepEqual(await snapshot(),pending);
  assert.equal(await p.evaluate(()=>topCalls.insertWord),1);assert.equal(await p.evaluate(()=>topDrawingDowns+topEscapes),0);
  await p.evaluate(()=>{$('save').disabled=true});assert(await source('save').isDisabled());const calls=await p.evaluate(()=>topCalls.save);await tap(source('save'));assert.equal(await p.evaluate(()=>topCalls.save),calls);await p.evaluate(()=>{$('save').disabled=false;cancelToSelection()});
  await p.evaluate(()=>{savedDocument=documentText();updateFileStatus()});await tap(source('clear'));assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.locator('#headerFileName').textContent(),'');assert(await p.locator('#headerFileName').isHidden());
  await p.evaluate(async()=>loadDocument(new File([savedFiles['Top-bar-khung.json']],'Long-named-structure-'.repeat(10)+'.json')));assert(await p.locator('#headerFileName').isVisible());
  assert(await p.locator('#headerFileName').evaluate(e=>e.scrollWidth>e.clientWidth&&getComputedStyle(e).textOverflow==='ellipsis'));
  await p.evaluate(()=>{documentName='Top-bar-khung.json';savedDocument=documentText();updateFileStatus();$('installApp').hidden=false});assert(await bar.isVisible());await checkGeometry();await p.evaluate(()=>window.dispatchEvent(new Event('appinstalled')));await settled();assert(await bar.isVisible());

  // Collapsed fallback preference never hides persistent top chrome. Every
  // fallback restores group order; no reload is needed to return to radial UI.
  await p.evaluate(()=>{ribbonCollapsed=true;localStorage.setItem('ket-cau-ribbon-collapsed','true');paintCommandRibbon()});assert(await bar.isVisible());
  const stable=await snapshot();
  for(const side of ['left','right']){
   await p.evaluate(side=>{const probe=side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe;probe.style.paddingRight='calc(100vw - 60px)';(side==='left'?leftDrawingMenu:rightCommandMenu).refresh()},side);await ready(false);await identity(true);
   assert(await bar.isHidden());assert.equal(await p.locator('#commandRibbon').count(),1);assert(await p.locator('#ribbonToggle').isVisible());assert(await p.locator('#ribbonScroll').isHidden());
   await tap(p.locator('#ribbonToggle'));assert(await p.locator('#ribbonScroll').isVisible());await tap(p.locator('#ribbonToggle'));assert(await p.locator('#ribbonScroll').isHidden());assert.deepEqual(await snapshot(),stable);
   await p.evaluate(side=>{(side==='left'?leftDrawingSafeProbe:rightCommandSafeProbe).style.removeProperty('padding-right');(side==='left'?leftDrawingMenu:rightCommandMenu).refresh()},side);await ready(true);await identity(false);assert(await bar.isVisible());assert.deepEqual(await snapshot(),stable);
  }
  // MQL change injection verifies the runtime ownership transition; the fresh
  // desktop page above separately uses actual fine-pointer CSS/media.
  for(const matches of [false,true,false,true]){
   await p.evaluate(matches=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:matches});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches,media:floatingToolsMedia.media}))},matches);await ready(matches);await identity(!matches);assert.deepEqual(await snapshot(),stable);
   if(!matches){assert(await bar.isHidden());assert.equal(await p.locator('#commandRibbon').count(),0);assert.equal(await p.locator('#actions,#viewTools').evaluateAll(es=>es.every(e=>e.parentElement.tagName==='ARTICLE')),true)}
  }
  // DOM-based chrome measurement also follows safe-area/header height changes.
  await p.setViewportSize({width:1280,height:900});await ready(true);
  await p.evaluate(()=>{document.querySelector('header').style.height='62px';tabletTopBar.style.paddingLeft='24px';tabletTopBar.style.paddingRight='28px';leftDrawingSafeProbe.style.paddingLeft='24px';rightCommandSafeProbe.style.paddingRight='28px'});
  await p.waitForFunction(()=>leftDrawingMenu.layout.bounds.top===118&&rightCommandMenu.layout.bounds.top===118);await checkGeometry();
  await p.evaluate(()=>{document.querySelector('header').style.removeProperty('height');tabletTopBar.style.removeProperty('padding-left');tabletTopBar.style.removeProperty('padding-right');leftDrawingSafeProbe.style.removeProperty('padding-left');rightCommandSafeProbe.style.removeProperty('padding-right')});await p.waitForFunction(()=>leftDrawingMenu.layout.bounds.top===100&&rightCommandMenu.layout.bounds.top===100);await p.setViewportSize({width:1280,height:800});await ready(true);
  await p.locator('.semicircle-left-menu [data-demo-id="hub"]').dispatchEvent('click');await checkGeometry();await shot('left-open');
  await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await checkGeometry();await shot('right-open');
  assert.deepEqual(await p.evaluate(()=>rightCommandRings[1].entries.map(e=>e.id)),['panView','snapOptions']);
  await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close()});await p.setViewportSize({width:800,height:1280});await ready(true);await checkGeometry();await shot('portrait');
  await p.setViewportSize({width:800,height:784});await ready(true);await p.waitForFunction(()=>rightCommandMenu.layout.bounds.bottom===716);console.log('BOUNDARY FIT',JSON.stringify(await checkGeometry()));await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await shot('boundary-fit');
  await p.setViewportSize({width:800,height:776});await ready(false);await identity(true);assert(await bar.isHidden());await tap(p.locator('#ribbonToggle'));assert(await source('save').isVisible());await shot('fallback-ribbon');
  for(let i=0;i<6;i++){await p.evaluate(()=>{leftDrawingMenu.refresh();rightCommandMenu.refresh()});await settled();assert.equal(await p.evaluate(()=>document.body.dataset.radialPrimary),'false')}
  await p.setViewportSize({width:800,height:736});await ready(false);await settled();assert(await bar.isHidden());assert.equal(await p.evaluate(()=>rightCommandBounds().top),52);console.log('BASELINE 736 NOW FALLBACK',JSON.stringify(await geometry()));
  await p.setViewportSize({width:280,height:900});await ready(false);await p.evaluate(()=>{leftDrawingSafeProbe.style.paddingRight='calc(100vw - 60px)';leftDrawingMenu.refresh()});await settled();
  // A narrow admitted viewport keeps one row and every 44px source target.
  await p.setViewportSize({width:390,height:900});await p.evaluate(()=>leftDrawingSafeProbe.style.removeProperty('padding-right'));await ready(true);await checkGeometry();assert.equal(await bar.locator('button:not([hidden])').count(),7);await identity(false);
  assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('tablet-top'))),false);
  assert.deepEqual(errors,[]);console.log('PASS exact real top sources, source Save/Open/New/SVG/PNG/Word, filename/dirty, no click-through, same-node restores, collapse independence, safe chrome/fit and media; screenshots:',out);
 }finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
