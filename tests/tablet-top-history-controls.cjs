const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');
const baseline=execFileSync('git',['show','aa815c4:assets/tablet.js'],{encoding:'utf8'});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const out=path.resolve('.test-tools/tablet-top-history-controls');fs.mkdirSync(out,{recursive:true});
  const p=await browser.newPage({hasTouch:true,viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const capability=async matches=>{await p.evaluate(matches=>{Object.defineProperty(floatingToolsMedia,'matches',{configurable:true,value:matches});floatingToolsMedia.dispatchEvent(new MediaQueryListEvent('change',{matches,media:floatingToolsMedia.media}))},matches);await settled(p)};
  await capability(false);
  await p.evaluate(()=>{
   window.historySources=['undo','redo'].map(id=>$(id));window.historyHandlers=historySources.map(e=>e.onclick);
   window.historyMetadata=historySources.map(e=>[e.title,e.getAttribute('aria-label'),e.getAttribute('data-toolbar-icon')]);
   window.historyHomeNodes=[...$('editToolbar').children];
  });
  const identity=async active=>{
   const r=await p.evaluate(active=>({same:historySources.every((e,i)=>e===$(e.id)&&e.onclick===historyHandlers[i]&&JSON.stringify([e.title,e.getAttribute('aria-label'),e.getAttribute('data-toolbar-icon')])===JSON.stringify(historyMetadata[i])),duplicates:['undo','redo'].map(id=>document.querySelectorAll('#'+id).length),order:[...$('editToolbar').children].map(e=>e.id),homes:active?historySources.every(e=>e.parentNode===tabletTopCommands):historyHomeNodes.every((e,i)=>$('editToolbar').children[i]===e),top:[...tabletTopCommands.children].map(e=>e.id)}),active);
   assert(r.same&&r.homes);assert.deepEqual(r.duplicates,[1,1]);
   assert.deepEqual(r.order,active?['copyObjects','pasteObjects','editSelected','delete','mirrorObjects']:['undo','redo','copyObjects','pasteObjects','editSelected','delete','mirrorObjects']);
   assert.deepEqual(r.top,active?['fileToolbar','exportToolbar','undo','redo']:[]);
  };
  await identity(false);
  await capability(true);await ownership(p,true);await identity(true);
  const state=page=>page.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),mode,first,second,hatch:JSON.stringify(hatchPoints),rigid:JSON.stringify(rigidPoints),section:JSON.stringify(sectionPoints),dirty:documentText()!==savedDocument}));
  const seed=page=>page.evaluate(()=>{leftDrawingMenu?.close();rightCommandMenu?.close();cancelToSelection();items=[{...make('bar',400,300,700,300),id:'history-fixture'}];past=[];future=[];selected=null;multiSelection.clear();snapEnabled=false;updateSnapControls();savedDocument=documentText();render()});
  const reference=await browser.newPage({hasTouch:true,viewport:{width:1280,height:800}});
  await reference.route('**/assets/tablet.js',route=>route.fulfill({contentType:'application/javascript',body:baseline}));
  await reference.goto(pathToFileURL(path.resolve('index.html')).href);
  // Same real history handlers on baseline and current, using a reversible edit.
  await seed(p);await seed(reference);await identity(true);
  for(const page of [p,reference])await page.evaluate(()=>{checkpoint();items[0].x2=800;render()});
  const initial=await state(p);assert.deepEqual(initial,await state(reference));
  await p.locator('#undo').tap();await reference.evaluate(()=>$('undo').click());assert.deepEqual(await state(p),await state(reference));assert.equal(await p.evaluate(()=>items[0].x2),700);
  await p.locator('#redo').focus();await p.keyboard.press('Enter');await reference.evaluate(()=>$('redo').click());assert.deepEqual(await state(p),initial);assert.deepEqual(await state(p),await state(reference));
  // Existing wrappers clean pending multipoint work. No replacement history listener.
  for(const page of [p,reference])await page.evaluate(()=>{setMode('hatch');hatchPoints=[{x:400,y:400}];render()});
  await p.locator('#undo').tap();await reference.evaluate(()=>$('undo').click());assert.deepEqual(await state(p),await state(reference));assert.equal(await p.evaluate(()=>hatchPoints.length),0);
  for(const page of [p,reference])await page.evaluate(()=>{setMode('bar');first={x:400,y:300};render()});
  await p.locator('#redo').tap();await reference.evaluate(()=>$('redo').click());assert.deepEqual(await state(p),await state(reference));
  await seed(p);const preserved=await state(p);
  await p.evaluate(()=>{$('undo').disabled=true;$('redo').disabled=true});
  for(const [width,height,active]of [[800,390,false],[1152,584,true],[431,800,false],[1280,800,true],[1032,1376,true],[1152,720,true],[800,776,true],[800,600,true],[800,390,false],[1152,584,true]]){
   await p.setViewportSize({width,height});await ownership(p,active);await identity(active);
   for(const id of ['undo','redo'])assert(await p.locator('#'+id).isDisabled());
   await p.evaluate(()=>{$('undo').click();$('redo').click()});assert.deepEqual(await state(p),preserved);
  }
  await p.evaluate(()=>{$('undo').disabled=false;$('redo').disabled=false});
  await p.setViewportSize({width:800,height:390});await ownership(p,false);await identity(false);
  if(!await p.locator('#undo').isVisible())await p.locator('#ribbonToggle').tap();
  await p.evaluate(()=>{checkpoint();items[0].x2=800;render()});await p.locator('#undo').scrollIntoViewIfNeeded();await p.locator('#undo').tap();assert.equal(await p.evaluate(()=>items[0].x2),700);await p.locator('#redo').tap();assert.equal(await p.evaluate(()=>items[0].x2),800);
  // Compare complete context geometry and actual Cancel/Finish paths with baseline.
  const context=async(page,side)=>{
   await page.evaluate(side=>{leftDrawingMenu.close();rightCommandMenu.close();setMode('hatch');hatchPoints=[{x:400,y:300},{x:600,y:300},{x:500,y:450}];render();updateCommandControls();const m=side==='left'?leftDrawingMenu:rightCommandMenu;m.host.querySelector('[data-demo-id="hub"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))},side);await settled(page);
   return page.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;return {radius:m.layout.radius,profile:m.layout.profile,context:m.layout.contextRing,paths:['commandCancel','commandFinish'].map(id=>m.host.querySelector('[data-fixed-action="'+id+'"] .semicircle-hit')?.getAttribute('d')),mapping:side==='left'?(typeof leftDrawingCategories==='undefined'?leftDrawingRings:leftDrawingCategories).map(r=>r.entries.map(e=>e.id)):m.state.rings.map(r=>r.entries.map(e=>e.id))}},side);
  };
  const fit=async()=>{
   const r=await p.evaluate(()=>{const bar=tabletTopBar.getBoundingClientRect(),scroll=tabletTopCommands.getBoundingClientRect();return {bar:bar.toJSON(),measured:tabletChromeBottom(true),buttons:[...tabletTopCommands.querySelectorAll('button:not([hidden])')].map(e=>({id:e.id,r:e.getBoundingClientRect().toJSON()})),scroll:scroll.toJSON()}});
   assert.equal(r.bar.height,48);assert.equal(r.measured,92);assert.equal(new Set(r.buttons.map(b=>b.r.top)).size,1);
   for(const b of r.buttons){assert(b.r.width>=44&&b.r.height>=44);assert(b.r.left>=r.scroll.left&&b.r.right<=r.scroll.right);assert(b.r.top>=r.bar.top&&b.r.bottom<=r.bar.bottom)}
   assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="undo"],.semicircle-left-menu [data-demo-id="redo"],.semicircle-right-menu [data-demo-id="undo"],.semicircle-right-menu [data-demo-id="redo"]').count(),0);
   return r;
  };
  const evidence=[];
  for(const [width,height]of [[1152,584],[1280,800],[1152,720],[1032,1376],[800,776],[800,600]]){
   for(const page of [p,reference]){await seed(page);await page.setViewportSize({width,height});await settled(page)}await ownership(p,true);await identity(true);
   evidence.push({width,height,fit:await fit()});if(height===584||width===1280)await p.screenshot({path:path.join(out,width+'x'+height+'-closed.png')});
   for(const side of ['left','right']){
    const current=await context(p,side),old=await context(reference,side);if(side==='right')assert.deepEqual(current,old,'RIGHT context geometry unchanged');else{assert.deepEqual(current.mapping,old.mapping);assert(current.radius<old.radius);assert.equal(current.context.sectors.length,2);assert.equal(current.context.sectors[0].a0,-Math.PI/2);assert.equal(current.context.sectors[1].a1,Math.PI/2);assert(current.context.targets.safe);assert(current.paths.every(Boolean))}await fit();
    const empty=await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;return m.layout.contextRing.sectors.slice(2).every(s=>!document.elementFromPoint(s.icon.x,s.icon.y)?.closest('[data-fixed-action]'))},side);assert(empty,'former history slots have no action hit targets');
    if(height===584)await p.screenshot({path:path.join(out,'1152x584-'+side+'-context.png')});
   }
  }
  // Cancel/Finish invoke the identical source semantics from the same paths.
  for(const id of ['commandCancel','commandFinish']){
   for(const page of [p,reference]){await seed(page);await page.setViewportSize({width:1152,height:584});await context(page,'left')}
   for(const page of [p,reference]){const q=await page.evaluate(id=>leftDrawingMenu.layout.contextRing.sectors[id==='commandCancel'?0:1].icon,id);await page.touchscreen.tap(q.x,q.y)}
   const current=await state(p),old=await state(reference);
   // Generated object IDs differ by page; all geometry/history is compared without IDs.
   const normalize=v=>JSON.parse(JSON.stringify(v).replace(/"id":"[^"]*"/g,'"id":"object"'));
   for(const key of ['doc','past','future']){current[key]=normalize(JSON.parse(current[key]));old[key]=normalize(JSON.parse(old[key]))}
   assert.deepEqual(current,old);
  }
  // A real two-point drawing action is reversible through the relocated buttons.
  await p.setViewportSize({width:1280,height:800});await seed(p);await p.evaluate(()=>setMode('bar'));
  for(const point of [{x:400,y:450},{x:650,y:450}]){const q=await p.evaluate(point=>{const q=new DOMPoint(point.x,point.y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},point);await p.touchscreen.tap(q.x,q.y);await settled(p)}
  assert.equal(await p.evaluate(()=>items.length),2);const drawn=await p.evaluate(()=>JSON.stringify(items));
  await p.locator('#undo').tap();assert.equal(await p.evaluate(()=>items.length),1);await p.locator('#redo').tap();assert.equal(await p.evaluate(()=>JSON.stringify(items)),drawn);
  await capability(false);await identity(false);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify(evidence,null,2));
  console.log('PASS same-node history ownership/restoration, exact order/handlers/metadata, disabled state, baseline history/cleanup/Cancel/Finish geometry and semantics, transitions and top fit; screenshots:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
