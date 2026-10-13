'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
const near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const pointer of ['mouse','touch','pen']){
  const tablet=pointer!=='mouse',p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof normalizeRotationDegrees==='function');
  const cdp=await p.context().newCDPSession(p),field=p.locator('#dynamicInputValue');
  const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const screen=q=>p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
  const contact=async(type,q)=>{
   if(pointer==='mouse'){await p.mouse.move(q.x,q.y);if(type==='down')await p.mouse.down();if(type==='up')await p.mouse.up()}
   else if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd',cancel:'touchCancel'}[type],touchPoints:['up','cancel'].includes(type)?[]:[{...q,id:1}]});
   else await cdp.send('Input.dispatchMouseEvent',{type:{down:'mousePressed',move:'mouseMoved',up:'mouseReleased'}[type],...q,button:'left',buttons:type==='up'?0:1,clickCount:1,pointerType:'pen'});
   if(type==='move'&&pointer==='touch')await settle();
  };
  const tap=async selector=>{await settle();const b=await p.locator(selector).boundingBox();assert(b,selector);if(tablet)assert(b.width>=43.99&&b.height>=43.99,selector+' 44px');await contact('down',{x:b.x+b.width/2,y:b.y+b.height/2});await contact('up',{x:b.x+b.width/2,y:b.y+b.height/2});await settle()};
  const state=()=>p.evaluate(()=>({items:copy(items),past:past.length,future:future.length,session:!!smartMoveSession,angle:smartMoveSession?.rotationAngle,preview:smartMoveSession?.rotationPreview,pivot:smartMoveSession?.rotationPivot,locked:smartMoveSession?.rotationNumeric?.locked,pending:smartMoveSession?.pending?.kind,dirty:dynamicInputUI.hasPendingEdit(),inputOpen:dynamicInputUI.isOpen(),keypad:!$('tabletNumericKeypad').hidden,bubble:!penConnectionBubble.hidden,mode,pan:panEnabled}));
  const seed=async pivot=>{await p.evaluate(pivot=>{cancelToSelection();deactivateCanvasPan();camera={x:0,y:0,w:1100,h:720};applyCamera();items=[make('bar',250,310,550,310,{id:'A',label:'A',strokeColor:'#336699',...(pivot?{pivot}: {})}),make('bar',730,520,930,520,{id:'B'})];past=[];future=[];snapEnabled=true;updateSelection(['A'],'A');render()},pivot);await settle()};
  const start=async()=>{const b=await p.locator('[data-rotation-hit]').boundingBox();assert(b);const center=await screen(await p.evaluate(()=>objectPivot(items[0]))),a={x:b.x+b.width/2,y:b.y+b.height/2};await contact('down',a);assert((await state()).session);return {a,center}};
  // Positive angles are CCW on the drawing: screen/SVG rotation has the opposite sign.
  const at=(g,degrees)=>{const r=-degrees*Math.PI/180,x=g.a.x-g.center.x,y=g.a.y-g.center.y;return {x:g.center.x+x*Math.cos(r)-y*Math.sin(r),y:g.center.y+x*Math.sin(r)+y*Math.cos(r)}};
  const drag=async degrees=>{const g=await start();await contact('move',at(g,degrees));await contact('up',at(g,degrees));await settle();return g};
  const numericCheck=async()=>{if(tablet){if(!await p.locator('#tabletNumericKeypad').isVisible())await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await tap('[data-numeric-key="confirm"]')}else await field.press('Enter');await settle()};
  const enter=async value=>{if(tablet)await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await field.fill(value);await numericCheck()};
  const finish=async action=>tap(tablet?'[data-pen-connection-action="'+action+'"]':action==='confirm'?'#commandFinish':'#commandCancel');
  const geometry=(s,before,deg,tolerance=1e-7)=>{
   const c=s.pivot,o=before.items[0],r=-deg*Math.PI/180,rot=q=>({x:c.x+(q.x-c.x)*Math.cos(r)-(q.y-c.y)*Math.sin(r),y:c.y+(q.x-c.x)*Math.sin(r)+(q.y-c.y)*Math.cos(r)}),a=rot(o),b=rot({x:o.x2,y:o.y2});
   near(s.preview.x,a.x,tolerance);near(s.preview.y,a.y,tolerance);near(s.preview.x2,b.x,tolerance);near(s.preview.y2,b.y,tolerance);near(Math.hypot(s.preview.x2-s.preview.x,s.preview.y2-s.preview.y),300);
  };
  for(const pivot of [undefined,{along:-150,normal:0},{along:30,normal:75}]){
   await seed(pivot);const before=await state();await drag(20);let s=await state();geometry(s,before,20,1e-4);assert.equal(s.locked,false);assert.equal(await p.locator('#dynamicInputLabel').textContent(),'Δθ');assert.equal(await p.locator('#dynamicInputSuffix').textContent(),'°');
   await enter('30');s=await state();geometry(s,before,30);assert(s.locked&&!s.dirty);assert.deepEqual(s.items,before.items);assert.equal(s.past,0);assert.equal(s.pending,'rotation');assert.equal(s.keypad,false);assert.equal(s.bubble,tablet);
   const worldPivot=await p.evaluate(()=>objectPivot(smartMoveSession.rotationPreview));near(worldPivot.x,s.pivot.x);near(worldPivot.y,s.pivot.y);assert(await p.evaluate(()=>Object.isFrozen(smartMoveSession.rotationPivot)&&Object.isFrozen(smartMoveSession.originals[0])));
   assert.equal(await p.locator('#dynamicInputValueLock').getAttribute('data-lock-state'),'locked');
   assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓');assert(await p.locator('[data-numeric-key="exit"]').isHidden());
   const stable=s.preview;await p.mouse.move(900,600);await p.evaluate(()=>updateBarRotation({x:900,y:600}));assert.deepEqual((await state()).preview,stable);
   await numericCheck();assert.equal((await state()).past,0,'repeated numeric confirmation never commits');
   if(tablet){await field.blur();await p.keyboard.press('Enter');assert.equal((await state()).past,0,'tablet canvas Enter must not bypass the rotation Bubble')}
   await finish('confirm');s=await state();assert.equal(s.past,1);assert(!s.session&&!s.inputOpen&&!s.keypad&&!s.bubble);assert.deepEqual(s.items[1],before.items[1]);assert.equal(s.items[0].label,'A');assert.equal(s.items[0].strokeColor,'#336699');assert.deepEqual(s.items[0].pivot,pivot);
   const after=s.items;await p.evaluate(()=>actions.undo[1]());assert.deepEqual((await state()).items,before.items);await p.evaluate(()=>actions.redo[1]());assert.deepEqual((await state()).items,after);await p.evaluate(()=>{items=validate(JSON.parse(JSON.stringify({format:'ket-cau-studio',version:1,items})));render()});assert.deepEqual((await state()).items,after);
  }
  for(const [text,deg]of [['-45',-45],['12.5',12.5],['+90',90],['180',180],['450',90],['-450',-90],['1080',0],['-360',0],['1e20',Number('1e20')%360],['0',0]]){
   await seed();const before=await state();await drag(20);await enter(text);let s=await state();geometry(s,before,deg);assert.equal(s.past,0);assert.deepEqual(s.items,before.items);assert.equal(Number(await field.inputValue()),deg);assert.equal(await p.locator('[data-rotation-angle]').textContent(),`Δθ = ${deg>=0?'+':''}${deg.toFixed(1)}°`);await finish('confirm');s=await state();assert.equal(s.past,deg===0?0:1);if(deg===0)assert.deepEqual(s.items,before.items);
  }
  await seed();const original=await state();await drag(20);await enter('30');const valid=(await state()).preview;
  assert.equal(await p.locator('[data-rotation-angle]').textContent(),'Δθ = +30.0°');
  for(const text of ['-','+','','1e','1..2','Infinity','NaN']){
   if(tablet)await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await field.fill(text);assert((await state()).dirty);await numericCheck();assert.equal(await field.getAttribute('aria-invalid'),'true');assert.deepEqual((await state()).preview,valid);assert.deepEqual((await state()).items,original.items);assert.equal((await state()).past,0);
   if(tablet)await finish('confirm');else await p.evaluate(()=>commitBarRotation());assert.equal((await state()).past,0);assert((await state()).session);
  }
  await finish('cancel');assert.deepEqual((await state()).items,original.items);assert.equal((await state()).past,0);assert(!(await state()).inputOpen);
  for(const phase of ['draft','locked']){
   await seed();const before=await state();await drag(20);await field.fill('-45');if(phase==='locked')await numericCheck();
   await field.press('Escape');await settle();assert(!(await state()).session);assert.deepEqual((await state()).items,before.items);assert.equal((await state()).past,0);
  }
  if(!tablet){
   await seed();await drag(20);await enter('30');await field.blur();await p.keyboard.press('Enter');await settle();assert(!(await state()).session);assert.equal((await state()).past,1,'PC canvas Enter commits the locked numeric preview');
  }
  await seed();await drag(0);await enter('30');assert((await state()).locked);near((await state()).angle,-Math.PI/6);await finish('cancel');
  await seed();await drag(20);assert.equal((await state()).locked,false);assert.equal(Number(await field.inputValue()),20,'fresh live value');
  if(tablet){
   assert.equal(await field.getAttribute('inputmode'),'none');assert.equal(await p.locator('#dynamicInputSecondary').isVisible(),false);
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await settle();assert.deepEqual(await field.evaluate(el=>[el.selectionStart,el.selectionEnd]),[0,(await field.inputValue()).length]);
   for(const k of ['1','2','.','5'])await tap('[data-numeric-key="'+k+'"]');assert.equal(await field.inputValue(),'12.5');await numericCheck();
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await field.evaluate(el=>{el.focus();el.setSelectionRange(1,3)});await settle();await tap('[data-numeric-key="0"]');assert.equal(await field.inputValue(),'105');
   await field.evaluate(el=>el.setSelectionRange(2,2));await settle();await tap('[data-numeric-key="backspace"]');assert.equal(await field.inputValue(),'15');await numericCheck();
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');for(const k of ['clear','sign','4','5','.','5'])await tap('[data-numeric-key="'+k+'"]');assert.equal(await field.inputValue(),'-45.5');
   const rows=await p.locator('#tabletNumericKeypad .tablet-number-keys').evaluate(el=>new Set([...el.children].filter(x=>!x.hidden&&x.getClientRects().length).map(x=>Math.round(x.getBoundingClientRect().top))).size);assert.equal(rows,4);await numericCheck();near((await state()).angle,45.5*Math.PI/180);
  }else{
   await field.focus();await field.press('Control+a');await field.pressSequentially('12.5');await field.press('Enter');assert((await state()).locked);assert.equal((await state()).past,0);assert(!(await state()).keypad);
  }
  await enter('30');const locked=(await state()).preview,g=await start();assert.equal((await state()).locked,false,'explicit Handle grab releases lock');assert.deepEqual((await state()).preview,locked,'unlock never jumps');await contact('move',at(g,10));await contact('up',at(g,10));await settle();near((await state()).angle,-40*Math.PI/180,1e-5);assert.equal((await state()).past,0);await finish('cancel');assert.equal((await state()).past,0);
  for(const phase of ['draft','locked'])for(const action of ['pan','undo','tool','blur','resize','zoom']){
   await seed();const before=await state();await drag(20);await field.fill('-45');if(phase==='locked')await numericCheck();
   if(action==='resize')await p.setViewportSize({width:800,height:1280});else await p.evaluate(action=>{if(action==='pan')panButton.click();if(action==='undo')actions.undo[1]();if(action==='tool')setMode('thin');if(action==='blur')window.dispatchEvent(new Event('blur'));if(action==='zoom')zoomAt(1.1)},action);
   await settle();const s=await state();assert(!s.session&&!s.inputOpen&&!s.keypad&&!s.bubble,JSON.stringify({pointer,phase,action,state:s}));assert.deepEqual(s.items,before.items);assert.equal(s.past,0);await p.setViewportSize({width:1280,height:800});
  }
  if(tablet)for(const viewport of [{width:1280,height:800},{width:800,height:1280}])for(const zoom of [1,1.25]){
   await p.setViewportSize(viewport);await seed();await p.evaluate(zoom=>zoomAt(zoom),zoom);await settle();await drag(20);await enter('30');await settle();assert.equal(await p.locator('body').getAttribute('data-radial-primary'),'true');
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');const controls=['#dynamicInput','#tabletNumericKeypad','#penConnectionBubble','[data-rotation-hit]','[data-pivot-hit]'];
   const boxes=await Promise.all(controls.map(s=>p.locator(s).boundingBox()));for(let i=0;i<boxes.length;i++){const b=boxes[i];assert(b);assert(b.x>=0&&b.y>=0&&b.x+b.width<=viewport.width+.1&&b.y+b.height<=viewport.height+.1,controls[i]+' in viewport');for(let k=i+1;k<boxes.length;k++){const a=boxes[k];assert(Math.min(b.x+b.width,a.x+a.width)-Math.max(b.x,a.x)<=.1||Math.min(b.y+b.height,a.y+a.height)-Math.max(b.y,a.y)<=.1,controls[i]+' overlaps '+controls[k])}}
   assert.equal(await field.getAttribute('inputmode'),'none');await finish('cancel');
  }
  if(tablet)for(const [x,y]of [[800,70],[50,610]]){
   await p.setViewportSize({width:1280,height:800});await seed();await p.evaluate(({x,y})=>{Object.assign(items[0],{x,y,x2:x+200,y2:y});render()},{x,y});await drag(0);await enter('-12.5');await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');
   assert.equal(await p.locator('body').getAttribute('data-radial-primary'),'true');
   for(const id of ['dynamicInput','tabletNumericKeypad','penConnectionBubble'])assert(await p.evaluate(id=>{const r=$(id).getBoundingClientRect(),bounds=tabletBarInputHorizontalBounds(0,innerWidth,r.width);return !bounds||r.left>=bounds.min-.1&&r.left<=bounds.max+.1},id),id+' clears normal menu envelopes');
   await finish('cancel');
  }
  // Release R2 and verify the same editor/keypad returns to the approved Bar owner.
  await seed();await drag(0);await enter('30');await finish('cancel');
  await p.evaluate(()=>{cancelToSelection();document.activeElement.blur();items=[];past=[];future=[];geometryScale=40;setMode('bar')});await settle();
  const q=await screen({x:300,y:300});await contact('down',q);await contact('up',q);await settle();if(tablet)await tap('[data-pen-connection-action="confirm"]');
  assert(await p.locator('#dynamicInputLabel').isHidden());assert(await p.locator('#dynamicInputSecondary').isVisible());assert.equal(await p.evaluate(()=>barNumericSession.state.distance.mode),'live');assert.equal(await p.evaluate(()=>barNumericSession.state.angle.mode),'live');
  if(tablet){
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputValue)');await field.fill('3');await numericCheck();assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓');
   await tap('#dynamicInput .dynamic-hit-area:has(#dynamicInputSecondary)');await p.locator('#dynamicInputSecondary').fill('30');await numericCheck();assert.equal(await p.locator('[data-numeric-key="confirm"]').textContent(),'✓✓');assert.equal(await p.evaluate(()=>items.length),0);
   await tap('[data-numeric-key="confirm"]');assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);await tap('[data-numeric-key="exit"]');assert.equal(await p.evaluate(()=>mode),'select');assert.equal(await p.evaluate(()=>items.length),1);
  }else await p.keyboard.press('Escape');
  assert.deepEqual(errors,[]);await p.close();console.log('PASS Rotation R2 '+pointer+': signed/original-relative numeric solve, normalization, pivots, drafts/locks, separate confirmation/history, caret/keypad, resume and lifecycle/layout');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
