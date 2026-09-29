const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch});
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof syncSupportChoices==='function');
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
