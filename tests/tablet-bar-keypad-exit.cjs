'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const type of ['pen','touch','hybrid']){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true,isMobile:true}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
   const cdp=await context.newCDPSession(p),keypad=p.locator('#tabletNumericKeypad'),exit=keypad.locator('[data-numeric-key="exit"]'),length=p.locator('#dynamicInputValue'),angle=p.locator('#dynamicInputSecondary');
   const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   async function contact(q,canvas=false){
    if(type==='pen')for(const event of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type:event,...q,pointerType:'pen',button:'left',buttons:event==='mousePressed'?1:0,clickCount:1});
    else if(type==='touch'||canvas)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);await settle();
   }
   async function tap(el){const r=await el.boundingBox();assert(r);assert(await el.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'contact target uncovered');await contact({x:r.x+r.width/2,y:r.y+r.height/2})}
   const key=k=>tap(keypad.locator(`[data-numeric-key="${k}"]`));
   const drawing=()=>p.evaluate(()=>({items:copy(items),past:copy(past),future:copy(future),document:documentText(),saved:savedDocument}));
   const transaction=()=>p.evaluate(()=>({fields:copy(barNumericSession.state),first:copy(first),endpoint:copy(barNumericSession.endpoint),owner:dynamicNumericCapture===barNumericSession.capture,focused:document.activeElement.id,inputs:[$('dynamicInputValue'),$('dynamicInputSecondary')].map(el=>({value:el.value,start:el.selectionStart,end:el.selectionEnd,editing:!!el.dataset.editing,inputMode:el.inputMode}))}));
   async function reset(){await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close();hideDynamicInput();cancelToSelection();items=[make('bar',100,200,200,200)];past=[[]];future=[copy(items)];geometryScale=40;snapEnabled=false;setMode('bar')});await settle()}
   async function candidate(fraction=.88){const r=await p.locator('#drawing').boundingBox();await contact({x:r.x+r.width*fraction,y:r.y+r.height*.45},true)}
   async function start(){await candidate();assert(await p.locator('#penConnectionBubble').isVisible());await tap(p.locator('[data-pen-connection-action="confirm"]'));assert(await exit.isVisible());assert.equal(await p.evaluate(()=>barNumericSession.tablet),true)}
   async function lock(field,value){await tap(field);await key('clear');for(const c of String(value))await key(c);await key('confirm')}
   async function define(){await lock(length,3);assert.equal(await keypad.locator('[data-numeric-key="confirm"]').textContent(),'✓');await lock(angle,30);assert.equal(await keypad.locator('[data-numeric-key="confirm"]').textContent(),'✓✓')}
   async function exitCommand(){const before=await drawing();await tap(exit);assert.deepEqual(await drawing(),before,'exit preserves all geometry and history');assert.deepEqual(await p.evaluate(()=>({mode,first,session:barNumericSession,capture:dynamicNumericCapture,pending:penConnectionPlacement,focused:document.activeElement.id,flag:document.body.dataset.barKeypadCommands||null})),{mode:'select',first:null,session:null,capture:null,pending:null,focused:'',flag:null});assert(await keypad.isHidden());assert(await p.locator('#dynamicInput').isHidden());assert(await p.locator('#commandControls').isHidden());assert.equal(await length.getAttribute('inputmode'),'decimal');assert.equal(await angle.getAttribute('inputmode'),'decimal');await exit.dispatchEvent('click');assert.deepEqual(await drawing(),before,'duplicate exit cannot commit')}
   // Four-row geometry is identical for a non-Bar adapter, with the extra row hidden.
   await p.evaluate(()=>showDynamicInput({tabletKeypad:true,value:'1',onConfirm:()=>{}}));
   const metrics=()=>keypad.locator('.tablet-number-keys').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.querySelectorAll('button')].filter(b=>!b.hidden&&b.dataset.numericKey!=='exit').map(b=>{const q=b.getBoundingClientRect();return {key:b.dataset.numericKey,x:q.x-r.x,y:q.y-r.y,width:q.width,height:q.height}})});
   const original=await metrics();assert.equal(original.length,15);assert(await exit.isHidden());
   assert.deepEqual(original.map(m=>[m.key,m.x/52,m.y/52,m.width,m.height]),[
    ['7',0,0,48,48],['8',1,0,48,48],['9',2,0,48,48],['backspace',3,0,48,48],
    ['4',0,1,48,48],['5',1,1,48,48],['6',2,1,48,48],['sign',3,1,48,48],
    ['1',0,2,48,48],['2',1,2,48,48],['3',2,2,48,48],['.',3,2,48,48],
    ['0',0,3,100,48],['clear',2,3,48,48],['confirm',3,3,48,48]
   ],'approved four-row numeric geometry');
   await reset();const beforeStart=await drawing();await candidate();assert(await keypad.isHidden());assert(await exit.isHidden());await tap(p.locator('#commandCancel'));assert.equal(await p.evaluate(()=>mode),'select');assert.deepEqual(await drawing(),beforeStart);assert(await p.locator('#penConnectionBubble').isHidden());
   for(const state of ['start','length-edit','angle-edit','one-lock','two-locks','invalid-edit','endpoint-candidate','chained']){
    await reset();await start();assert.deepEqual(await metrics(),original,'existing numeric rows unchanged');
    const grid=await keypad.locator('.tablet-number-keys').boundingBox(),r=await exit.boundingBox();assert.equal(r.width,grid.width);assert.equal(r.height,44);assert.equal(r.y-grid.y,208);assert.equal((await keypad.boundingBox()).width,218);assert.equal(await exit.textContent(),'×');assert(await exit.getAttribute('aria-label'));
    if(state==='length-edit'){await tap(length);await key('9')}
    if(state==='angle-edit'){await tap(angle);await key('9')}
    if(state==='one-lock')await lock(length,3);
    if(['two-locks','chained'].includes(state))await define();
    if(state==='invalid-edit'){await define();await tap(length);await key('clear');await key('confirm');assert.equal(await length.getAttribute('aria-invalid'),'true')}
    if(state==='endpoint-candidate'){await candidate(.55);assert(await p.locator('#penConnectionBubble').isVisible());const first=await p.evaluate(()=>copy(first));await tap(p.locator('[data-pen-connection-action="cancel"]'));assert.equal(await p.evaluate(()=>mode),'bar');assert.deepEqual(await p.evaluate(()=>copy(first)),first);await candidate(.55)}
    if(state==='chained'){
     const endpoint=await p.evaluate(()=>copy(barNumericSession.endpoint)),count=(await drawing()).items.length,past=(await drawing()).past.length;
     await key('confirm');assert.equal((await drawing()).items.length,count+1);assert.equal((await drawing()).past.length,past+1);assert.deepEqual(await p.evaluate(()=>copy(first)),endpoint);assert.deepEqual(await p.evaluate(()=>[barNumericSession.state.distance.mode,barNumericSession.state.angle.mode]),['live','live']);
     await keypad.locator('[data-numeric-key="confirm"]').dispatchEvent('click');await p.locator('#commandFinish').dispatchEvent('click');assert.equal((await drawing()).items.length,count+1);await define();await key('confirm');assert.equal((await drawing()).items.length,count+2);
    }
    assert(await p.locator('#commandControls').isHidden());await exitCommand();
   }
   // The rectangle is presentation-only suppression; source actions and both radial proxies survive.
   await reset();await start();await define();assert.deepEqual(await p.evaluate(()=>({hidden:commandControls.hidden,finish:commandFinish.hidden,disabled:commandFinish.disabled,handlers:typeof commandCancel.onclick==='function'&&typeof commandFinish.onclick==='function'})),{hidden:false,finish:false,disabled:false,handlers:true});
   for(const side of ['left','right']){const hub=p.locator(`.semicircle-${side}-menu [data-demo-id="hub"]`);await hub.tap();await settle();assert(await p.locator(`.semicircle-${side}-menu [data-fixed-action="commandCancel"]`).isVisible());assert(await p.locator(`.semicircle-${side}-menu [data-fixed-action="commandFinish"]`).isVisible());assert(await p.locator('#commandControls').isHidden());await hub.tap();await settle()}
   const radialBefore=await drawing();await p.locator('.semicircle-right-menu [data-demo-id="hub"]').tap();await settle();
   const radialPoint=await p.evaluate(()=>rightCommandMenu.layout.contextRing.sectors[sharedOuterActions.findIndex(a=>a.id==='commandFinish')].icon);await contact(radialPoint);assert.equal((await drawing()).items.length,radialBefore.items.length+1);assert.equal((await drawing()).past.length,radialBefore.past.length+1);
   await reset();await start();await define();
   // Hiding the keypad returns accessible Finish/Cancel without changing availability or model.
   const defined=await transaction();await p.evaluate(()=>{tabletInputKeypad.hide();updateCommandControls()});assert(await p.locator('#commandCancel').isVisible());assert(await p.locator('#commandFinish').isVisible());assert(await exit.isHidden());assert.deepEqual(await transaction(),defined);
   await tap(p.locator('#commandFinish'));assert.equal((await drawing()).items.length,2);assert.equal((await drawing()).past.length,2);assert(await exit.isVisible());assert(await p.locator('#commandControls').isHidden());
   // Stationary drafts/selection and the taller keypad survive feasible rotation and real fallback.
   await define();await tap(length);await key('3');await key('.');await key('2');await key('5');await length.evaluate(el=>el.setSelectionRange(2,3));await settle();const tx=await transaction(),fixed=await p.locator('#dynamicInput').boundingBox();
   await p.mouse.move(500,600);await p.evaluate(()=>{syncBarNumericInput();render()});await settle();assert.deepEqual(await transaction(),tx);assert.deepEqual(await p.locator('#dynamicInput').boundingBox(),fixed);
   for(const viewport of [{width:800,height:1280},{width:1280,height:800},{width:1280,height:240},{width:1280,height:800}]){
    await p.setViewportSize(viewport);await settle();assert.deepEqual(await transaction(),tx);assert.equal(await p.locator('body').getAttribute('data-radial-primary'),String(viewport.height!==240));
    const k=await keypad.boundingBox(),i=await p.locator('#dynamicInput').boundingBox();assert(k.x>=0&&k.y>=0&&k.x+k.width<=viewport.width&&k.y+k.height<=viewport.height);
    if(viewport.height!==240){assert.equal(overlap(k,i),0);for(const side of ['left','right']){const envelope=await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;return {x:side==='left'?m.layout.cx:m.layout.cx-m.layout.radius,y:m.layout.cy-m.layout.radius,width:m.layout.radius,height:2*m.layout.radius}},side);assert.equal(overlap(k,envelope),0)}await p.screenshot({path:`.test-tools/bar-stage-b-${type}-${viewport.width}.png`})}
   }
   await key('9');assert.equal(await length.inputValue(),'3.95');assert.equal(await angle.inputValue(),'30');await key('confirm');await exitCommand();
   // No fifth row or suppression survives tool switches/shared numeric and text adapters.
   for(const tool of ['thin','force','support','text']){await reset();await start();await p.evaluate(tool=>{setMode(tool);showDynamicInput({tabletKeypad:true,value:'1',onConfirm:()=>{}})},tool);assert(await exit.isHidden());assert.notEqual(await p.locator('body').getAttribute('data-bar-keypad-commands'),'true');assert.deepEqual(await metrics(),original)}
   await p.evaluate(()=>{hideDynamicInput();cancelToSelection();showDynamicInput({value:'x'});tabletInputKeypad.show({input:$('dynamicInputValue'),text:true,confirm:()=>{}})});assert(await exit.isHidden());assert(await keypad.locator('[data-numeric-key="space"]').isVisible());await p.evaluate(()=>{hideDynamicInput();cancelToSelection()});
   // A mouse-started Bar on a hybrid device keeps PC ownership, Enter and Escape.
   await p.evaluate(()=>setMode('bar'));const canvas=await p.locator('#drawing').boundingBox();await p.mouse.click(canvas.x+canvas.width*.5,canvas.y+canvas.height*.4);assert.equal(await p.evaluate(()=>barNumericSession.tablet),false);assert(await keypad.isHidden());assert(await exit.isHidden());
   await length.fill('3');await p.keyboard.press('Tab');await angle.fill('30');await p.keyboard.press('Tab');await p.evaluate(()=>document.activeElement.blur());await settle();assert(await p.locator('#commandFinish').isVisible());const n=(await drawing()).items.length;await p.keyboard.press('Enter');assert.equal((await drawing()).items.length,n+1);const pcBefore=await drawing();await p.keyboard.press('Escape');assert.deepEqual(await drawing(),pcBefore);assert.equal(await p.evaluate(()=>mode),'select');
   assert.deepEqual(errors,[]);console.log(`PASS ${type}: fifth row/isolation, all exit states and history, candidate cancellation, chaining/duplicate guards, shared/radial/fallback ownership, Stage A rotation/freeze, caret/IME and hybrid PC`);await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
