'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const type of ['pen','touch','hybrid']){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginBarNumericInput==='function');
   const cdp=await context.newCDPSession(p),panel=p.locator('#dynamicInput'),length=p.locator('#dynamicInputValue'),angle=p.locator('#dynamicInputSecondary');
   const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   async function contact(q,canvas=false){
    if(type==='pen')for(const event of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:event,...q,pointerType:'pen',button:'left',buttons:event==='mousePressed'?1:0,clickCount:1});
    else if(type==='touch'||canvas)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
    await settle();
   }
   async function tap(el){const r=await el.boundingBox();assert(r);await contact({x:r.x+r.width/2,y:r.y+r.height/2})}
   const key=k=>tap(p.locator(`[data-numeric-key="${k}"]`));
   const placement=()=>panel.evaluate(el=>({left:el.style.left,top:el.style.top}));
   const inputState=()=>p.evaluate(()=>({active:document.activeElement.id,values:[$('dynamicInputValue'),$('dynamicInputSecondary')].map(el=>({text:el.value,start:el.selectionStart,end:el.selectionEnd,editing:!!el.dataset.editing,inputMode:el.inputMode})),locks:copy(barNumericSession.state),start:copy(first),endpoint:copy(barNumericSession.endpoint),icons:[...document.querySelectorAll('.dynamic-lock-icon')].map(el=>el.dataset.lockState),items:copy(items),past:past.length,future:future.length}));
   async function presentation(primary){
    await settle();assert.equal(await p.locator('body').getAttribute('data-radial-primary'),String(primary),'tablet menu admission');
    for(const id of ['tabletTopBar','tabletBottomLeftBar','tabletBottomRightBar'])assert.equal(await p.locator('#'+id).isVisible(),primary);
    assert.equal(await p.locator('#commandRibbon').isVisible(),!primary);assert.equal(await p.locator('#toggleTools').isVisible(),!primary);
    for(const side of ['left','right']){assert.equal(await p.locator(`.semicircle-${side}-menu`).isVisible(),primary);assert.equal(await p.locator(`.semicircle-${side}-menu`).evaluate(el=>el.inert),!primary)}
    const sources=await p.evaluate(()=>({same:placementSources.every(el=>$(el.id)===el),duplicates:placementSources.filter(el=>document.querySelectorAll('#'+el.id).length!==1).map(el=>el.id),session:first===placementFirst&&barNumericSession===placementSession&&dynamicNumericCapture===placementCapture}));
    assert(sources.same&&sources.session);assert.deepEqual(sources.duplicates,[]);
    if(primary){assert(await p.locator('#toolPanel').isHidden());assert(await p.locator('#toolPanel').evaluate(el=>el.inert));assert(await p.evaluate(()=>leftDrawingMenu.layout.fits&&rightCommandMenu.layout.fits))}
    const r=await panel.boundingBox(),viewport=p.viewportSize();assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);
   }
   await p.evaluate(()=>{window.placementSources=['clear','open','save','saveAs','svg','png','undo','redo','zoomOut','zoomIn','fitView','snapToggle','commandCancel','commandFinish'].map(id=>$(id));cancelToSelection();document.activeElement.blur();items=[];past=[];future=[];geometryScale=40;setMode('bar')});await settle();assert(await panel.isHidden());
   // Exact diagnosed contact: rightmost 88% of canvas width, at 45% height.
   const canvas=await p.locator('#drawing').boundingBox();await contact({x:canvas.x+canvas.width*.88,y:canvas.y+canvas.height*.45},true);
   assert(await p.locator('#penConnectionBubble').isVisible());assert(await panel.isHidden());await tap(p.locator('[data-pen-connection-action="confirm"]'));
   await p.evaluate(()=>{window.placementFirst=first;window.placementSession=barNumericSession;window.placementCapture=dynamicNumericCapture});await presentation(true);
   assert(await p.locator('#tabletNumericKeypad').isVisible());assert.equal(await p.evaluate(()=>barNumericSession.tablet),true);
   await tap(length);await key('3');await tap(angle);await key('3');await key('0');await key('confirm');await presentation(true);
   assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓✓');assert(await p.locator('#commandControls').isHidden());assert.equal(await p.evaluate(()=>commandFinish.hidden),false);assert(await p.locator('#commandFinish').isHidden());
   assert.equal(await p.evaluate(()=>items.length),0);assert(await p.locator('[data-bar-preview] line').count());
   await p.screenshot({path:`.test-tools/bar-stage-a-${type}-landscape.png`});
   for(const side of ['left','right']){
    const hub=p.locator(`.semicircle-${side}-menu [data-demo-id="hub"]`);await hub.tap();await settle();
    assert.equal(await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.open,side),true);
    assert.equal(await p.locator('.semicircle-outer-context:visible').count(),1);assert(await p.locator('#commandControls').isHidden());assert.equal(await p.evaluate(()=>commandControls.hidden),false);
    await hub.tap();await settle();assert(await p.locator('#commandControls').isHidden());assert.equal(await p.evaluate(()=>items.length),0);
   }
   // A pending edit retains confirmed constraints and a partial native selection.
   await tap(length);await key('3');await key('.');await key('2');await key('5');await length.evaluate(el=>el.setSelectionRange(2,3));await settle();
   let before=await inputState(),fixed=await placement();assert.equal(before.values[0].text,'3.25');assert.equal(before.locks.distance.value,3);assert.equal(before.icons[0],'editing');
   await p.mouse.move(canvas.x+canvas.width*.3,canvas.y+canvas.height*.7);await settle();
   await p.evaluate(()=>{syncBarNumericInput();updateDynamicInput();render()});await settle();
   assert.deepEqual(await placement(),fixed,'state and mouse refresh must not move tablet typing target');assert.deepEqual(await inputState(),before);
   for(const viewport of [{width:800,height:1280},{width:1280,height:800}]){
    await p.setViewportSize(viewport);await presentation(true);assert.deepEqual(await inputState(),before,'orientation preserves numeric transaction');fixed=await placement();
    await p.mouse.move(viewport.width*.7,viewport.height*.6);await p.evaluate(()=>syncBarNumericInput());await settle();assert.deepEqual(await placement(),fixed);assert.deepEqual(await inputState(),before);
    if(viewport.width===800)await p.screenshot({path:`.test-tools/bar-stage-a-${type}-portrait.png`});
   }
   // Genuine small viewport still admits the existing safe legacy fallback.
   await p.setViewportSize({width:1280,height:240});await presentation(false);assert.deepEqual(await inputState(),before);
   await p.setViewportSize({width:1280,height:800});await presentation(true);assert.deepEqual(await inputState(),before);
   await key('9');assert.equal(await length.inputValue(),'3.95');assert.equal(await angle.inputValue(),'30');await key('confirm');assert.equal(await p.evaluate(()=>barNumericSession.state.distance.value),3.95);assert.equal(await p.evaluate(()=>items.length),0);
   assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓✓');assert.equal(await p.evaluate(()=>commandFinish.hidden),false);assert(await p.locator('#commandFinish').isHidden());
   // Same keyboard/pointer controls survive cancellation and the next activation.
   await p.evaluate(()=>cancelToSelection());assert(await panel.isHidden());assert(await p.locator('#tabletNumericKeypad').isHidden());
   // Coarse capability alone does not opt a PC-style mouse start into tablet Bar.
   await p.evaluate(()=>{document.activeElement.blur();setMode('bar')});const r=await p.locator('#drawing').boundingBox();await p.mouse.click(r.x+r.width*.5,r.y+r.height*.4);await settle();
   assert.equal(await p.evaluate(()=>barNumericSession.tablet),false);assert(await p.locator('#tabletNumericKeypad').isHidden());assert.equal(await length.getAttribute('inputmode'),'decimal');
   await length.fill('3');await p.keyboard.press('Tab');await angle.fill('30');await p.keyboard.press('Tab');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
   assert.deepEqual(errors,[]);console.log(`PASS ${type}: right-edge admission, frozen edit/selection, orientation, small-viewport fallback/recovery, keypad/locks, source identity and hybrid PC mouse workflow`);await context.close();
  }
  const p=await browser.newPage({viewport:{width:1280,height:800}});await p.goto(pathToFileURL(path.resolve('index.html')).href);
  assert(await p.locator('#toolPanel').isVisible());assert(await p.locator('#save').isVisible());assert.equal(await p.locator('#commandRibbon,.semicircle-left-menu,.semicircle-right-menu').count(),0);
  await p.evaluate(()=>{items=[];past=[];future=[];setMode('bar')});const r=await p.locator('#drawing').boundingBox();await p.mouse.click(r.x+r.width*.75,r.y+r.height*.45);
  await p.locator('#dynamicInputValue').fill('3');await p.keyboard.press('Tab');await p.locator('#dynamicInputSecondary').fill('30');await p.keyboard.press('Tab');await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);assert(await p.locator('#toolPanel').isVisible());assert.equal(await p.locator('#dynamicInputValue').getAttribute('inputmode'),'decimal');
  console.log('PASS desktop: original toolbar/tool panel, Dynamic Input, keyboard Bar commit and history');await p.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
