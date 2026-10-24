const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
async function runTabletSupport(p){
 const fs=require('node:fs/promises'),cdp=await p.context().newCDPSession(p);
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const contact=async(type,q)=>{await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[type],touchPoints:['up','cancel'].includes(type)?[]:[{...q,id:1}]});await settle()};
 const tapPoint=async q=>{await contact('down',q);await contact('up',q)};
 const screen=point=>p.evaluate(point=>{const q=new DOMPoint(point.x,point.y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},point);
 const pick=async(x,y)=>tapPoint(await screen({x,y}));
 const tap=async selector=>{const loc=p.locator(selector);await loc.waitFor({state:'visible'});const r=await loc.boundingBox();assert(r,selector);await tapPoint({x:Math.max(8,r.x+r.width/2),y:r.y+r.height/2})};
 const radial='.semicircle-left-menu';
 const hub=()=>tap(radial+' [data-demo-id=hub]');
 const radialTap=async id=>{
  await tap(radial+' [data-demo-id="'+id+'"] .semicircle-icon');
  await p.waitForFunction(()=>!leftDrawingMenu.state.rings.some(r=>r.pointerId!==null||r.snapFrame));await settle();
 };
 async function choose(type){
  if(!await p.evaluate(()=>leftDrawingMenu.state.open))await hub();
  if(await p.evaluate(()=>leftCategoryId!=='supports'))await radialTap('supports');
  const parent=type.replace('-plain','');
  if(type.endsWith('-plain')){
   if(!await p.locator(radial+' [data-context-action="'+type+'"]').isVisible()){await radialTap(parent);if(!await p.evaluate(()=>leftDrawingMenu.state.open))await hub();}
   await radialTap(type);
  }else{
   await radialTap(type);
   if(await p.evaluate(()=>leftDrawingMenu.state.open))await radialTap(type);
  }
  await p.waitForFunction(type=>mode==='support'&&$('support').value===type,type);
  if(await p.evaluate(()=>leftDrawingMenu.state.open))await hub();
 }
 const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,session:copy(supportPlacementSession),mode}));
 let base=0,cases=0;
 const unchanged=async(n=0)=>{const s=await state();assert.equal(s.items.length,n);assert.equal(s.past,base)};
 async function reset(type='pin'){
  await p.keyboard.press('Escape');await tap('#clear');await tap('#clear');
  if(await p.locator('#snapToggle').getAttribute('aria-pressed')==='true')await tap('#snapToggle');
  base=(await state()).past;assert.equal((await state()).items.length,0);await choose(type);
 }
 const key=k=>tap('[data-numeric-key="'+k+'"]');
 const bubble=()=>tap('[data-pen-connection-action=confirm]');
 async function anchor(x=300,y=300,n=0){
  await pick(x,y);await p.waitForFunction(()=>penConnectionPlacement?.state==='anchor-confirming');await unchanged(n);
  assert(await p.locator('#tabletNumericKeypad').isHidden());assert.equal(await p.locator('[data-support-preview]').count(),1);
  await bubble();await p.locator('#tabletNumericKeypad').waitFor({state:'visible'});assert(await p.locator('#penConnectionBubble').isHidden());await unchanged(n);
 }
 async function enter(value){
  await key('clear');for(const digit of String(value).replace('-',''))await key(digit);if(value<0)await key('sign');
 }
 async function lock(n=0){await key('confirm');await unchanged(n);assert.equal((await state()).session.angle.mode,'locked');assert.equal(await p.locator('[data-numeric-key=confirm]').textContent(),'\u2713\u2713');assert(await p.locator('#penConnectionBubble').isHidden())}
 async function commit(n=0){await key('confirm');const s=await state();assert.equal(s.items.length,n+1);assert.equal(s.past,base+1);assert.equal(s.session,null);assert.equal(s.mode,'support');assert(await p.locator('#tabletNumericKeypad').isHidden())}
 async function exported(){const wait=p.waitForEvent('download');await tap('#svg');const download=await wait;return fs.readFile(await download.path(),'utf8')}
 for(const subtype of ['pin','roller','fixed','pin-plain','roller-plain']){
  await reset(subtype);await pick(300,300);let s=await state();await unchanged();assert(s.session);assert.equal(s.session.previewAngle,null);
  assert.equal(await p.locator('[data-support-preview]').count(),1);assert(!(await exported()).includes('data-support-preview'));assert.equal(await p.evaluate(()=>JSON.parse(documentText()).items.length),0);
  await bubble();await p.locator('#tabletNumericKeypad').waitFor({state:'visible'});
  await pick(437,389);await unchanged();const expected=Math.atan2(-137,89)*180/Math.PI;
  near((await state()).session.previewAngle,expected);assert.equal((await state()).session.angle.mode,'live');await lock();await commit();s=await state();
  const o=s.items[0];assert.equal(o.support,subtype);near(o.x,300);near(o.y,300);near(o.supportAngle,expected);
  for(const field of ['anchorPoint','angle','previewAngle','referenceBarId','referenceCandidates'])assert(!(field in o));
  assert((await p.locator(`g[data-id="${o.id}"]`).innerHTML()).includes(`rotate(${o.supportAngle})`));near(await p.evaluate(()=>validate(JSON.parse(documentText()))[0].supportAngle),expected);
  const svg=await exported();assert(svg.includes(`rotate(${o.supportAngle})`));assert(!/data-support-preview|data-anchor-rotation|data-move-anchor/.test(svg));
  base=(await state()).past;await anchor(600,300,1);await p.keyboard.press('Escape');assert.equal((await state()).session,null);assert.equal((await state()).mode,'select');assert.deepEqual((await state()).items,[o]);cases++;
 }
 await reset();await pick(300,300);await tap('[data-pen-connection-action=cancel]');await unchanged();assert.equal((await state()).session,null);assert(await p.locator('#penConnectionBubble').isHidden());cases++;
 await reset();await anchor();await enter(30);await lock();await key('exit');await unchanged();assert.equal((await state()).session,null);assert.equal((await state()).mode,'select');assert(await p.locator('#tabletNumericKeypad').isHidden());cases++;
 // Touch at P is a zero-length direction ray: retain the live angle; do not create.
 await reset();await anchor();await pick(300,300);await unchanged();assert((await state()).session);cases++;
 for(const [x,y,expected]of [[300,400,0],[200,300,90],[400,300,-90],[337,421,Math.atan2(-37,121)*180/Math.PI]]){
  await pick(x,y);const s=await state();near(s.session.previewAngle,expected);near(s.session.anchorPoint.x,300);near(s.session.anchorPoint.y,300);
  assert((await p.locator('[data-support-preview] > g').getAttribute('transform')).includes(`rotate(${s.session.previewAngle})`));await unchanged();cases++;
 }
 await enter(-37.25);await unchanged();await lock();await commit();near((await state()).items[0].supportAngle,-37.25);cases++;
 for(const action of ['escape','tool','undo','redo','new','open']){
  await reset();await anchor();
  if(action==='escape')await p.keyboard.press('Escape');
  if(action==='tool')await p.keyboard.press('t');
  if(action==='undo'||action==='redo')await tap('#'+action);
  if(action==='new')await tap('#clear');
  if(action==='open'){await tap('#open');await tap('#cancelOpenDrawing')}
  const s=await state();assert.equal(s.session,null,action);assert.equal(s.items.length,0,action);assert.equal(await p.locator('[data-support-preview]').count(),0);assert(await p.locator('#tabletNumericKeypad').isHidden());
  assert.equal(s.past,base+(action==='undo'?-1:action==='new'?1:0),action);cases++;
 }
 await reset();await anchor();await enter(-45);await lock();await commit();const saved=(await state()).items;
 base=(await state()).past;await anchor(600,300,1);await tap('#undo');assert.equal((await state()).items.length,0);assert.equal((await state()).session,null);await tap('#redo');assert.deepEqual((await state()).items,saved);near((await state()).items[0].supportAngle,-45);assert.equal((await state()).session,null);cases++;
 for(const phase of ['candidate','locked'])for(const cancel of ['touchCancel','pinch']){
  await reset();const q=await screen({x:300,y:300});
  if(phase==='candidate'){await contact('down',q);assert((await state()).session)}
  else{await anchor();await enter(30);await lock();await contact('down',await screen({x:400,y:400}))}
  await unchanged();const before=(await state()).session;
  if(cancel==='pinch'){
   const first=phase==='candidate'?q:await screen({x:400,y:400});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...first,id:1},{x:first.x+80,y:first.y,id:2}]});await settle();
  }
  await contact('cancel',q);await unchanged();const s=await state();
  if(phase==='candidate'){assert.equal(s.session,null);assert.equal(await p.locator('[data-support-preview]').count(),0)}
  else{assert.deepEqual(s.session.anchorPoint,before.anchorPoint);assert.deepEqual(s.session.angle,before.angle);near(s.session.previewAngle,30);assert(await p.locator('#tabletNumericKeypad').isVisible());await commit();near((await state()).items[0].supportAngle,30)}
  cases++;
 }
 // Build the snap reference through the accepted Bar Bubble workflow, not a fixture assignment.
 await reset();await p.keyboard.press('t');await pick(300,300);await bubble();await pick(500,300);await bubble();await p.keyboard.press('Escape');assert.equal((await state()).items[0].type,'bar');
 await choose('pin');await tap('#snapToggle');base=(await state()).past;
 await anchor(302,302,1);let snapped=await state();near(snapped.session.anchorPoint.x,300);near(snapped.session.anchorPoint.y,300);
 // The direction ray stays raw even when its point lies near the Bar.
 await pick(498,304);await unchanged(1);near((await state()).session.previewAngle,Math.atan2(-198,4)*180/Math.PI);
 await lock(1);await commit(1);snapped=await state();near(snapped.items[1].supportAngle,Math.atan2(-198,4)*180/Math.PI);cases++;
 for(const type of ['hinge','weld','linkBar']){
  await reset();if(await p.evaluate(()=>!leftDrawingMenu.state.open))await hub();if(await p.evaluate(()=>leftCategoryId!=='supports'))await radialTap('supports');await radialTap(type);if(await p.evaluate(()=>leftDrawingMenu.state.open))await radialTap(type);
  await pick(300,300);if(type==='linkBar'){await unchanged();await pick(420,370)}
  const s=await state();assert.equal(s.items.length,1);assert.equal(s.items[0].type,type);assert.equal(s.session,null);assert.equal(s.past,base+1);cases++;
 }
 console.log('PASS support rotatable placement touch: '+cases+' native radial/Bubble/keypad, five subtypes, geometry/export/JSON, cancellation, history, Snap and pointer rollback cases');
}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof syncSupportChoices==='function');
  if(touch){await runTabletSupport(p);assert.deepEqual(errors,[]);await context.close();continue}
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const reset=async(type='pin')=>{await p.evaluate(()=>{setMode('select');items=[];past=[];future=[];selected=null;snapEnabled=false;render()});await p.locator(`[data-support-type="${type}"]`).click()};
  const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,session:copy(supportPlacementSession),mode}));
  for(const subtype of ['pin','roller','fixed','pin-plain','roller-plain']){
   await reset(subtype);await tap(300,300);
   let s=await state();assert.equal(s.items.length,0);assert.equal(s.past,0);assert(s.session);assert.equal(s.session.previewAngle,null);
   assert.equal(await p.locator('[data-support-preview]').count(),1);
   assert.equal(await p.evaluate(()=>exportSVG().includes('data-support-preview')),false);
   assert.equal(await p.evaluate(()=>JSON.parse(documentText()).items.length),0);
   // A real touch tap has no hover move between the two contacts.
   await tap(437,389);s=await state();assert.equal(s.items.length,1);assert.equal(s.past,1);assert.equal(s.session,null);assert.equal(s.mode,'support');
   const o=s.items[0],expected=Math.atan2(-137,89)*180/Math.PI;
   assert.equal(o.support,subtype);near(o.x,300);near(o.y,300);near(o.supportAngle,expected);
   assert(await p.locator(`g[data-id="${o.id}"]`).innerHTML().then(html=>html.includes(`rotate(${o.supportAngle})`)));
   near(await p.evaluate(()=>validate(JSON.parse(documentText()))[0].supportAngle),expected);
   await tap(600,300);assert.equal((await state()).session.previewAngle,null);
   await p.keyboard.press('Escape');assert.equal((await state()).session,null);assert.equal((await state()).mode,'select');
  }
  await reset();await tap(300,300);await tap(300,300);assert.equal((await state()).items.length,0);assert((await state()).session);
  if(!touch){
   for(const [x,y,expected]of [[300,400,0],[200,300,90],[400,300,-90],[337,421,Math.atan2(-37,121)*180/Math.PI]]){
    const q=await screen(x,y);await p.mouse.move(q.x,q.y);const s=await state();near(s.session.previewAngle,expected);near(s.session.anchorPoint.x,300);near(s.session.anchorPoint.y,300);
    const transform=await p.locator('[data-support-preview] > g').getAttribute('transform');assert(transform.includes(`rotate(${s.session.previewAngle})`));
   }
   // Dispatch the second click without a move: stale preview must not determine commit.
   const q=await screen(250,400);await p.locator('#drawing').dispatchEvent('pointerdown',{clientX:q.x,clientY:q.y,button:0,pointerId:1,pointerType:'mouse'});
   near((await state()).items[0].supportAngle,Math.atan2(50,100)*180/Math.PI);
  }
  for(const action of ['escape','tool','undo','redo','new','open','rollback']){
   await reset();await tap(300,300);
   if(action==='escape')await p.keyboard.press('Escape');
   if(action==='tool')await p.locator('[data-mode=bar]').click();
   if(action==='undo'||action==='redo')await p.evaluate(action=>actions[action][1](),action);
   if(action==='new')await p.evaluate(()=>newDocument());
   if(action==='open'){await p.evaluate(()=>openDocument());await p.evaluate(()=>openDialog.close())}
   if(action==='rollback')await p.evaluate(()=>restoreDrawing(captureDrawing()));
   const s=await state();assert.equal(s.session,null,action);assert.equal(s.items.length,0,action);assert.equal(await p.locator('[data-support-preview]').count(),0);
   if(action!=='new')assert.equal(s.past,0,action);
  }
  await reset();await tap(300,300);await tap(400,400);await tap(600,300);
  await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,0);assert.equal((await state()).session,null);
  await p.evaluate(()=>actions.redo[1]());near((await state()).items[0].supportAngle,-45);assert.equal((await state()).session,null);
  if(touch){
   const cdp=await context.newCDPSession(p);
   for(const cancel of ['touchCancel','pinch']){
    await reset();await tap(300,300);
    const q=await screen(400,400);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:q.x,y:q.y}]});
    assert.equal((await state()).items.length,1);
    if(cancel==='pinch'){
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:q.x,y:q.y},{id:1,x:q.x+80,y:q.y}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }else await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    const s=await state();assert.equal(s.items.length,0);assert.equal(s.past,0);assert.equal(s.session,null);
   }
  }
  // First point uses existing support snap; the direction point remains raw.
  await reset();await p.evaluate(()=>{items=[make('bar',300,300,500,300)];snapEnabled=true;render()});
  await tap(302,302);let snapped=await state();near(snapped.session.anchorPoint.x,300);near(snapped.session.anchorPoint.y,300);
  await tap(498,304);snapped=await state();near(snapped.items[1].supportAngle,Math.atan2(-198,4)*180/Math.PI);
  for(const type of ['hinge','weld','linkBar']){
   await reset();await p.locator(`[data-mode=${type}]`).click();await tap(300,300);
   if(type==='linkBar'){assert.equal((await state()).items.length,0);await tap(420,370)}
   assert.equal((await state()).items.length,1);assert.equal((await state()).items[0].type,type);assert.equal((await state()).session,null);
  }
  assert.deepEqual(errors,[]);console.log(`PASS support rotatable placement ${touch?'touch':'mouse'}: five subtypes, arbitrary angles, transient preview/export, two-step commit, cancellation and history`);
  await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
