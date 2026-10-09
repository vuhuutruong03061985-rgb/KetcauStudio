'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const tablet of [false,true]){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve('index.html')).href);
   await page.waitForFunction(()=>typeof beginSupportNumericInput==='function');
   const input=page.locator('#dynamicInputValue'),keypad=page.locator('#tabletNumericKeypad'),bubble=page.locator('#penConnectionBubble'),halo=page.locator('#penConnectionLockHalo');
   const reset=(subtype='pin',bars=[])=>page.evaluate(({subtype,bars})=>{
    cancelToSelection();document.activeElement?.blur();camera={x:0,y:0,w:1100,h:720};applyCamera();
    items=bars.map((b,i)=>make('bar',...b,{id:'bar-'+i}));past=[];future=[copy(items)];selected=null;snapEnabled=false;
    $('support').value=subtype;$('direction').value='down';setMode('support');render();
   },{subtype,bars});
   const screen=q=>page.evaluate(q=>{const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},q);
   const pen=(type,q={x:300,y:300})=>page.evaluate(({type,q})=>{
    const p=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());
    svg.dispatchEvent(new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:71,pointerType:'pen',isPrimary:true,clientX:p.x,clientY:p.y,button:type==='pointermove'?-1:0,buttons:type==='pointerdown'?1:0,pressure:type==='pointerdown'?.22:0}));
   },{type,q});
   const doc=()=>page.evaluate(()=>({items:copy(items),past:copy(past),future:copy(future),selected,text:documentText()}));
   const phase=()=>page.evaluate(()=>penConnectionPlacement?.state||'tracking');
   const pose=()=>page.evaluate(()=>penConnectionPlacement?.lockedCandidate||null);
   async function command(action){
    const r=await page.locator(`#penConnectionBubble [data-pen-connection-action="${action}"]`).boundingBox();assert(r);
    if(tablet)await page.touchscreen.tap(r.x+24,r.y+24);else await page.mouse.click(r.x+24,r.y+24);
   }
   async function anchor(q={x:300,y:300}){
    await pen('pointermove',q);assert.equal(await keypad.isVisible(),false);await pen('pointerdown',q);await pen('pointerup',q);
    assert.equal(await phase(),'anchor-confirming');assert.equal(await keypad.isVisible(),false);
    const before=await doc();await command('confirm');assert.equal(await phase(),'angle-tracking');assert.deepEqual(await doc(),before);
    assert.equal(await keypad.isVisible(),tablet);assert.equal(await input.getAttribute('inputmode'),tablet?'none':'decimal');assert.equal(await input.evaluate(el=>el.readOnly),false);
    await page.evaluate(()=>{window.keypadSupportSession=supportPlacementSession});return before;
   }
   async function key(value){
    const button=page.locator(`#tabletNumericKeypad [data-numeric-key="${value}"]`),r=await button.boundingBox();assert(r);
    assert(r.width>=44&&r.height>=44);assert.equal(await button.evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('[data-numeric-key]')===el}),true);
    await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
   }
   async function enter(value){
    await key('clear');if(value.startsWith('-')){await key('sign');value=value.slice(1)}
    for(const char of value)await key(char);
   }
   async function bounds(){
    // Browser resize/visualViewport events are delivered asynchronously after setViewportSize.
    await page.waitForFunction(()=>{const r=document.getElementById('tabletNumericKeypad').getBoundingClientRect(),v=visualViewport;return r.left>=v.offsetLeft-1&&r.top>=v.offsetTop-1&&r.right<=v.offsetLeft+v.width+1&&r.bottom<=v.offsetTop+v.height+1});
    const r=await keypad.boundingBox(),v=await page.evaluate(()=>({left:visualViewport.offsetLeft,top:visualViewport.offsetTop,width:visualViewport.width,height:visualViewport.height}));assert(r);
    assert(r.x>=v.left-1&&r.y>=v.top-1&&r.x+r.width<=v.left+v.width+1&&r.y+r.height<=v.top+v.height+1);
   }
   assert.equal(await page.evaluate(()=>floatingToolsMedia.matches),tablet);assert.equal(await keypad.count(),1);assert.equal(await keypad.isVisible(),false);
   if(!tablet){
    await reset();const before=await anchor();await input.fill('-90');await input.press('Enter');assert.equal(await phase(),'angle-confirming');assert.equal(await keypad.isVisible(),false);near((await pose()).supportAngle,-90);assert.deepEqual(await doc(),before);
    await command('confirm');assert.equal((await doc()).past.length,1);assert.equal(await input.getAttribute('inputmode'),'decimal');
    // Ordinary PC Support still uses its existing two-point/keyboard commit path.
    await reset();const q=await screen({x:300,y:300});await page.mouse.click(q.x,q.y);await page.keyboard.type('45.5');await page.keyboard.press('Enter');
    near((await doc()).items[0].supportAngle,45.5);assert.equal((await doc()).past.length,1);assert.equal(await keypad.isVisible(),false);
    assert.deepEqual(errors,[]);console.log('PASS desktop: keypad inactive, decimal input mode, physical-keyboard Support and pen bubble semantics unchanged');await context.close();continue;
   }
   for(const subtype of ['pin','pin-plain','roller','roller-plain','fixed']){
    await reset(subtype);const before=await anchor();await bounds();assert.equal(overlap(await keypad.boundingBox(),await page.locator('#dynamicInput').boundingBox()),0);
    const rect=await keypad.boundingBox(),point=await page.evaluate(()=>({...penConnectionPlacement.lockedAnchor}));
    for(const value of ['0','90','-90','180','45.5','-30.5']){
     await enter(value);assert.equal(await input.inputValue(),value);near(await page.evaluate(()=>supportPlacementSession.previewAngle),Number(value));
     assert.equal(await phase(),'angle-tracking');assert.deepEqual(await doc(),before);assert.equal(await page.evaluate(()=>supportPlacementSession===keypadSupportSession),true);
    }
    await key('.');assert.equal(await input.inputValue(),'-30.5');await key('backspace');assert.equal(await input.inputValue(),'-30.');await key('5');
    await key('sign');assert.equal(await input.inputValue(),'30.5');await key('sign');assert.equal(await input.inputValue(),'-30.5');
    await key('clear');assert.equal(await input.inputValue(),'');await key('sign');await key('sign');assert.equal(await input.inputValue(),'');
    await key('confirm');assert.equal(await phase(),'angle-tracking');assert.equal(await input.getAttribute('aria-invalid'),'true');assert.deepEqual(await doc(),before);assert.equal(await input.getAttribute('inputmode'),'none');
    // Native keypad taps retain field focus and route through the original input/validation path.
    await input.tap();await key('9');assert.equal(await input.evaluate(el=>document.activeElement===el),true);assert.equal(await input.getAttribute('inputmode'),'none');
    await enter('83');await key('confirm');assert.equal(await phase(),'angle-confirming');near((await pose()).supportAngle,83);assert.equal(await bubble.isVisible(),true);assert.equal(await keypad.isVisible(),true);assert.equal(await halo.isVisible(),true);assert.deepEqual(await doc(),before);
    const fixedBubble=await bubble.boundingBox();assert.equal(overlap(await keypad.boundingBox(),fixedBubble),0);
    await enter('90');near((await pose()).supportAngle,90);assert.equal(await page.locator('[data-support-preview] > g').getAttribute('transform'),`translate(${point.x} ${point.y}) rotate(90)`);
    await key('confirm');assert.equal(await phase(),'angle-confirming');assert.deepEqual(await bubble.boundingBox(),fixedBubble);assert.deepEqual(await doc(),before);
    await pen('pointermove',{x:440,y:430});near((await pose()).supportAngle,90);assert.deepEqual(await keypad.boundingBox(),rect);
    await page.evaluate(()=>{camera.x+=20;applyCamera()});assert.deepEqual(await keypad.boundingBox(),rect);assert.deepEqual(await doc(),before);
    await command('cancel');assert.equal(await phase(),'angle-tracking');assert.equal(await keypad.isVisible(),true);assert.equal(await halo.isVisible(),true);assert.deepEqual(await page.evaluate(()=>({...penConnectionPlacement.lockedAnchor})),point);assert.deepEqual(await doc(),before);
    await enter('-90');await key('confirm');const draft=await pose();await command('confirm');const after=await doc();
    assert.equal(after.items.length,1);assert.equal(after.items[0].support,subtype);for(const field of ['x','y','supportAngle'])assert.equal(after.items[0][field],draft[field]);assert.deepEqual(after.past,[before.items]);
    assert.equal(await keypad.isVisible(),false);assert.equal(await bubble.isVisible(),false);assert.equal(await input.getAttribute('inputmode'),'decimal');assert.equal(await page.locator('#support').inputValue(),subtype);
    console.log(`PASS tablet ${subtype}: digits/sign/decimal/backspace/clear, validation, 83→90 draft, two independent confirms, retry anchor, one commit and restored input mode`);
   }
   // Local/global conversion stays in the existing Support engine.
   await reset('fixed',[[200,300,500,300]]);const referenceBefore=await anchor();await enter('90');await key('confirm');near((await pose()).supportAngle,0);assert.deepEqual(await doc(),referenceBefore);
   await enter('-90');await key('confirm');near((await pose()).supportAngle,180);assert.deepEqual(await doc(),referenceBefore);await command('confirm');near((await doc()).items.at(-1).supportAngle,180);
   // A newly visible bubble near the default keypad corner must not cover its keys.
   for(const canvasConfirm of [false,true]){
    await reset();const before=await anchor({x:900,y:600});await enter('83');
    if(canvasConfirm){await pen('pointerdown',{x:500,y:400});await pen('pointerup',{x:500,y:400})}else await key('confirm');
    assert.equal(await phase(),'angle-confirming');assert.equal(overlap(await keypad.boundingBox(),await bubble.boundingBox()),0);
    await enter('90');await key('confirm');near((await pose()).supportAngle,90);assert.deepEqual(await doc(),before);await command('confirm');assert.equal((await doc()).past.length,1);
   }
   // Ordinary finger Support keeps its two-point commit path; keypad validation itself never commits.
   await reset();let touchPoint=await screen({x:300,y:300});await page.touchscreen.tap(touchPoint.x,touchPoint.y);
   assert.equal(await keypad.isVisible(),true);const touchBefore=await doc();await enter('90');await key('confirm');assert.deepEqual(await doc(),touchBefore);
   assert.equal(await page.evaluate(()=>!!supportPlacementSession),true);touchPoint=await screen({x:450,y:350});await page.touchscreen.tap(touchPoint.x,touchPoint.y);
   near((await doc()).items[0].supportAngle,90);assert.equal((await doc()).past.length,1);assert.equal(await keypad.isVisible(),false);
   // Pen clicks activate a key once and cannot become drawing contacts.
   await reset();const nativeBefore=await anchor();await key('clear');const cdp=await context.newCDPSession(page);
   for(const value of ['9','0','confirm']){
    const r=await page.locator(`[data-numeric-key="${value}"]`).boundingBox(),p={x:r.x+r.width/2,y:r.y+r.height/2};
    for(const type of ['mouseMoved','mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type,...p,pointerType:'pen',buttons:type==='mousePressed'?1:0,force:type==='mousePressed'?.22:0,...(type==='mouseMoved'?{}:{button:'left',clickCount:1})});
   }
   assert.equal(await input.inputValue(),'90');assert.equal(await phase(),'angle-confirming');assert.deepEqual(await doc(),nativeBefore);await cdp.detach();
   // Fixed screen-space positioning follows viewport changes, not the SVG camera.
   for(const viewport of [{width:1280,height:800},{width:800,height:1100},{width:1024,height:600}]){
    await page.setViewportSize(viewport);await bounds();const r=await keypad.boundingBox();await page.evaluate(()=>{camera.x+=10;applyCamera()});assert.deepEqual(await keypad.boundingBox(),r);
    await key('clear');await key('9');assert.equal(await input.inputValue(),'9');
   }
   await page.evaluate(()=>{window.keypadOriginalViewport=window.visualViewport;Object.defineProperty(window,'visualViewport',{configurable:true,value:new EventTarget()});Object.assign(visualViewport,{offsetLeft:40,offsetTop:25,width:700,height:450});window.dispatchEvent(new Event('resize'))});await bounds();
   await page.evaluate(()=>{Object.defineProperty(window,'visualViewport',{configurable:true,value:keypadOriginalViewport});window.dispatchEvent(new Event('resize'))});await bounds();
   // Complete cancellation and editor/tool resets retire the keypad and suppression attribute.
   for(const action of ['cancel','tool','undo','reset','hide']){
    await reset();await anchor();await page.evaluate(action=>{if(action==='cancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'pen',pointerId:71}));if(action==='tool')setMode('bar');if(action==='undo')actions.undo[1]();if(action==='reset')cancelToSelection();if(action==='hide')hideDynamicInput()},action);
    assert.equal(await keypad.isVisible(),false);assert.equal(await input.getAttribute('inputmode'),'decimal');
   }
   // No other editor opts in, even on a coarse device.
   for(const tool of ['bar','thin','force','moment','udl','text']){
    await reset();await page.evaluate(tool=>{setMode(tool);showDynamicInput({clientX:100,clientY:100,value:'12',suffix:'',onConfirm:()=>{}})},tool);
    assert.equal(await keypad.isVisible(),false);assert.equal(await input.getAttribute('inputmode'),'decimal');await input.fill('34');assert.equal(await input.inputValue(),'34');
   }
   assert.deepEqual(errors,[]);console.log('PASS tablet: native pen keypad, reference conversion, viewport/camera isolation, lifecycle and other-editor exclusion; physical Android keyboard acceptance pending');await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
