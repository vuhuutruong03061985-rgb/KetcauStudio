'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{for(const pointer of ['pen','touch','mouse']){
  const tablet=pointer!=='mouse',p=await browser.newPage({hasTouch:tablet,isMobile:tablet,viewport:{width:1280,height:800}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.waitForFunction(()=>typeof beginSupportNumericInput==='function');const cdp=await p.context().newCDPSession(p);
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const screen=q=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
  const contact=async(type,q)=>{
   if(pointer==='mouse'){await p.mouse.move(q.x,q.y);if(type==='down')await p.mouse.down();else if(type==='up')await p.mouse.up()}
   else if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd'}[type],touchPoints:type==='up'?[]:[{...q,id:1}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:{down:'mousePressed',move:'mouseMoved',up:'mouseReleased'}[type],...q,pointerType:'pen',button:type==='move'?'none':'left',buttons:type==='down'?1:0,clickCount:type==='move'?0:1});
   await settle();
  };
  const tap=async selector=>{const r=await p.locator(selector).boundingBox();assert(r,selector);const q={x:r.x+r.width/2,y:r.y+r.height/2};await contact('down',q);await contact('up',q)};
  const pick=async q=>{q=await screen(q);await contact('down',q);await contact('up',q)};
  const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,mode,session:copy(supportPlacementSession),numeric:!!supportNumericSession,armed:isDynamicNumericInputArmed(),bubble:!penConnectionBubble.hidden,placement:penConnectionPlacement?.state||null}));
  const field=p.locator('#dynamicInputValue'),key=p.locator('[data-numeric-key="confirm"]');
  const seed=async(subtype,bars=[])=>{
   await p.evaluate(({subtype,bars})=>{document.activeElement.blur();cancelToSelection();rightCommandMenu?.close();leftDrawingMenu?.close();deactivateCanvasPan();items=bars.map((b,i)=>make('bar',...b,{id:'T'+i}));past=[];future=[];snapEnabled=false;$('direction').value='down';$('support').value=subtype;setMode('support')},{subtype,bars});
   await pick({x:300,y:300});if(tablet){assert((await state()).bubble);assert.equal((await state()).items.length,bars.length);await tap('[data-pen-connection-action="confirm"]')}
   assert.equal((await state()).items.length,bars.length);assert(!(await state()).bubble);assert((await state()).session);if(tablet)assert(await p.locator('#tabletNumericKeypad').isVisible());
  };
  for(const subtype of ['pin','pin-plain','roller','roller-plain','fixed']){
   await seed(subtype);const anchor=(await state()).session.anchorPoint;
   await field.fill('90');let s=await state();
   if(tablet){
    assert.equal(s.session.angle.mode,'live','Typing must not lock a tablet Support angle');near(s.session.previewAngle,90);
    assert.equal(await key.textContent(),'✓');await key.evaluate(el=>window.supportConfirmKey=el);const rect=await key.boundingBox();
    await tap('[data-numeric-key="confirm"]');s=await state();assert.equal(s.items.length,0);assert.equal(s.past,0);assert.equal(s.session.angle.mode,'locked');near(s.session.angle.value,90);
    assert.equal(await key.textContent(),'✓✓');assert(await key.evaluate(el=>el===window.supportConfirmKey));assert.deepEqual(await key.boundingBox(),rect);
    assert.equal(await p.locator('#dynamicInputValueLock').getAttribute('data-lock-state'),'locked');assert(!s.bubble);
    await pick({x:500,y:500});assert.equal((await state()).items.length,0);assert(!(await state()).bubble);near((await state()).session.previewAngle,90);
    await tap('[data-numeric-key="confirm"]');
    await key.evaluate(el=>{for(const type of ['pointerdown','pointerup','click'])el.dispatchEvent(type==='click'?new MouseEvent(type,{bubbles:true}):new PointerEvent(type,{bubbles:true,pointerType:'pen',button:0,buttons:type==='pointerdown'?1:0}))});
    await p.evaluate(()=>{for(const type of ['mousedown','mouseup','click'])svg.dispatchEvent(new MouseEvent(type,{bubbles:true,button:0}));activatePenConnectionButton('confirm',{})});
   }else await field.press('Enter');
   s=await state();assert.equal(s.items.length,1);assert.equal(s.past,1);assert.equal(s.mode,'support');const o=s.items[0];assert.equal(o.type,'support');assert.equal(o.support,subtype);assert.equal(o.direction,'down');near(o.x,anchor.x);near(o.y,anchor.y);near(o.supportAngle,90);assert(!('referenceBarId'in o));assert.equal(s.session,null);assert(!s.numeric&&!s.armed&&!s.bubble);assert.equal(s.placement,null);
   await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).items.length,0);await p.evaluate(()=>actions.redo[1]());assert.deepEqual((await state()).items,[o]);
   const json=await p.evaluate(()=>documentText());await p.evaluate(async json=>loadDocument(new File([json],'support.json')),json);assert.deepEqual((await state()).items,[o]);
   if(tablet){
    await seed(subtype);await field.fill('90');await tap('[data-numeric-key="confirm"]');await field.fill('-30');assert.equal(await key.textContent(),'✓');assert.equal((await state()).session.angle.mode,'live');assert.equal(await p.locator('#dynamicInputValueLock').getAttribute('data-lock-state'),'editing');
    for(const invalid of ['', '-', 'NaN','Infinity','1.2.3','1,2,3']){await field.fill(invalid);await tap('[data-numeric-key="confirm"]');assert.equal(await field.getAttribute('aria-invalid'),'true');assert.equal(await key.textContent(),'✓');assert.equal((await state()).items.length,0);assert(!(await state()).bubble)}
    await field.fill('30,5');await tap('[data-numeric-key="confirm"]');assert.equal(await key.textContent(),'✓✓');near((await state()).session.angle.value,30.5);await tap('[data-numeric-key="exit"]');s=await state();assert.equal(s.mode,'select');assert.equal(s.items.length,0);assert.equal(s.session,null);
   }
   for(const [bar,base]of [[[200,300,600,300],-90],[[300,200,300,600],0],[[200,200,600,600],-45],[[600,300,200,300],-90]]){
    await seed(subtype,[bar]);assert.equal((await state()).session.referenceBarId,'T0');await field.fill('90');if(tablet){await tap('[data-numeric-key="confirm"]');assert.equal((await state()).items.length,1);assert(!(await state()).bubble);await tap('[data-numeric-key="confirm"]')}else await field.press('Enter');s=await state();assert.equal(s.items.length,2);near(s.items.at(-1).supportAngle,base+90);assert.equal(s.past,1);assert.equal(s.items.at(-1).support,subtype);
   }
   console.log('PASS Support '+subtype+' '+pointer+': point, draft/lock, same key, commit/dedup, invalid/edit, reference conventions, history and JSON');
  }
  // Locked local angle remains local when the existing explicit reference override changes Bars.
  await seed('pin',[[200,300,600,300],[300,200,300,600]]);await pick({x:330,y:300});assert.equal((await state()).session.referenceBarId,'T0');
  await field.fill('30');if(tablet)await tap('[data-numeric-key="confirm"]');else await p.evaluate(()=>dynamicInputUI.confirmPending());
  await pick({x:300,y:330});const s=await state();assert.equal(s.session.referenceBarId,'T1');near(s.session.previewAngle,30);assert.equal(s.items.length,2);assert.equal(s.past,0);
  await p.evaluate(()=>cancelToSelection());assert.deepEqual(errors,[]);await p.close();
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
