'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const settle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const tablet of [false,true]){
   const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:tablet,isMobile:tablet}),p=await context.newPage(),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
   await p.waitForFunction(()=>typeof attachTabletTextKeypad==='function');
   const panel=p.locator('#tabletNumericKeypad'),input=p.locator('input[aria-label="Sửa nhãn trên hình"]'),rollers=panel.locator('.tablet-text-roller'),caps=panel.locator('[data-numeric-key=caps]'),space=panel.getByRole('button',{name:'Space',exact:true});
   const snapshot=()=>p.evaluate(()=>({items:copy(items),past:copy(past),future:copy(future),camera:copy(camera)}));
   async function open(type='force',label='Pab'){
    await p.evaluate(({type,label})=>{cancelToSelection();items=[make(type,300,300,undefined,undefined,{label})];past=[];future=[];selected=items[0].id;render();editObjectLabel(items[0])},{type,label});await settle(p);
   }
   async function tap(el){const r=await el.boundingBox();assert(r);await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2)}
   const key=k=>tap(panel.locator(`[data-numeric-key="${k}"]`));
   const char=c=>tap(panel.locator(`[data-text-character="${c}"]`));
   const caret=(a,b=a)=>input.evaluate((el,[a,b])=>el.setSelectionRange(a,b),[a,b]);
   const selection=()=>input.evaluate(el=>[el.selectionStart,el.selectionEnd]);
   async function checkGeometry(){
    const geometry=await panel.evaluate(el=>{
     const panelRect=el.getBoundingClientRect();
     const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x-panelRect.x,y:r.y-panelRect.y,width:r.width,height:r.height}};
     return {width:panelRect.width,height:panelRect.height,rollers:[...el.querySelectorAll('.tablet-text-roller')].map(rect),space:rect(el.querySelector('[data-numeric-key=space]')),numbers:rect(el.querySelector('.tablet-number-keys')),keys:[...el.querySelector('.tablet-number-keys').children].filter(b=>!b.hidden).map(rect),positions:[...el.querySelector('.tablet-number-keys').children].filter(b=>!b.hidden).map(b=>b.dataset.numericKey)};
    });
    assert.equal(geometry.width,414);assert.equal(geometry.height,218);
    assert.deepEqual(geometry.rollers,[0,1,2,3].map(i=>({x:7+48*i,y:7,width:44,height:204})));
    assert.deepEqual(geometry.space,{x:307,y:163,width:48,height:48});
    assert.deepEqual(geometry.numbers,{x:203,y:7,width:204,height:204});
    assert.deepEqual(geometry.keys,Array.from({length:16},(_,i)=>({x:203+52*(i%4),y:7+52*Math.floor(i/4),width:48,height:48})));
    assert.deepEqual(geometry.positions,['7','8','9','backspace','4','5','6','clear','1','2','3','.','0','caps','space','confirm']);
    return geometry;
   }
   await open();assert.equal(await panel.count(),1);
   if(!tablet){
    assert.equal(await panel.isVisible(),false);assert.equal(await space.isVisible(),false);assert.notEqual(await input.getAttribute('inputmode'),'none');
    await input.fill('PC');await input.press('End');await input.press('Space');await input.pressSequentially('label');await input.press('Enter');assert.equal((await snapshot()).items[0].label,'PC label');assert.equal((await snapshot()).past.length,1);
    await open('text');await input.fill('discard');await input.press('Escape');assert.equal((await snapshot()).items[0].label,'Pab');
    assert.deepEqual(errors,[]);console.log('PASS desktop label keyboard/Enter/Escape unchanged; tablet keypad inactive');await context.close();continue;
   }
   const before=await snapshot();assert.equal(await input.getAttribute('inputmode'),'none');assert.equal(await input.evaluate(el=>document.activeElement===el&&!el.readOnly),true);
   assert.equal(await rollers.count(),4);assert.equal(await caps.getAttribute('aria-pressed'),'true');
   const mathCharacters='=_^\\+-*/()[]{}∑√≈≠≤≥<>|';
   const groups=await rollers.evaluateAll(es=>es.map(el=>[...el.children].map(b=>b.dataset.textCharacter).join('')));
   assert.deepEqual(groups,['abcdefghi','jklmnopqr','stuvwxyzαβγδεθλμνπρστφψω',mathCharacters]);
   const all=Array.from(groups.join(''));assert.equal(new Set(all).size,all.length);
   assert(!/[0-9.±∏∬∂∞∇∫]/.test(all.join('')));
   assert.equal(await panel.locator('.tablet-text-rollers > .tablet-text-roller').count(),4);
   assert.equal(await panel.locator('.tablet-text-space-column').count(),0);
   assert.equal(await space.textContent(),'␣');assert.equal(await panel.locator('[data-numeric-key=sign]').isVisible(),false);
   const geometry=await checkGeometry();
   const scrollGeometry=await rollers.evaluateAll(es=>es.map(el=>{const r=el.getBoundingClientRect();return {height:r.height,scroll:el.scrollHeight,visible:[...el.children].filter(c=>{const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom}).length}}));
   for(const [i,r]of scrollGeometry.entries()){assert.equal(r.visible,4);assert(r.scroll>r.height)}
   console.log('PASS rendered keypad geometry (relative CSS px): '+JSON.stringify(geometry));
   // Space shares the active input, selection, focus, suppression and confirmation context.
   await caret(1);await key('space');assert.equal(await input.inputValue(),'P ab');assert.deepEqual(await selection(),[2,2]);
   await caret(1,3);await key('space');assert.equal(await input.inputValue(),'P b');assert.deepEqual(await selection(),[2,2]);
   await key('space');assert.equal(await input.inputValue(),'P  b');assert.deepEqual(await selection(),[3,3]);
   await key('backspace');assert.equal(await input.inputValue(),'P b');assert.deepEqual(await selection(),[2,2]);
   assert.equal(await input.evaluate(el=>document.activeElement===el),true);assert.equal(await input.getAttribute('inputmode'),'none');assert.deepEqual(await snapshot(),before);
   await input.fill('Pab');
   assert.equal(await panel.locator('input').count(),0);
   // Any visible row inserts at the live caret, preserving surrounding text and selections.
   await caret(1);await char('b');assert.equal(await input.inputValue(),'PBab');assert.deepEqual(await selection(),[2,2]);
   await key('9');assert.equal(await input.inputValue(),'PB9ab');await caret(1,3);await char('j');assert.equal(await input.inputValue(),'PJab');
   await key('backspace');assert.equal(await input.inputValue(),'Pab');assert.deepEqual(await selection(),[1,1]);
   await caret(1,3);await key('backspace');assert.equal(await input.inputValue(),'P');
   await key('clear');for(const c of ['a','b','c','d'])await char(c);assert.equal(await input.inputValue(),'ABCD');
   await key('caps');assert.equal(await caps.getAttribute('aria-pressed'),'false');await caret(2);await char('k');assert.equal(await input.inputValue(),'ABkCD');
   await key('.');await key('4');assert.equal(await input.inputValue(),'ABk.4CD');assert.equal(await panel.locator('[data-numeric-key=sign]').isVisible(),false);
   assert.equal(await input.evaluate(el=>document.activeElement===el),true);assert.deepEqual(await snapshot(),before);
   // Each native scroll container is independent; Caps changes neither text nor offsets/selection.
   await rollers.evaluateAll(es=>es.forEach((el,i)=>el.scrollTop=[44,88,352,132][i]));const offsets=await rollers.evaluateAll(es=>es.map(el=>el.scrollTop)),text=await input.inputValue(),sel=await selection();
   await key('caps');assert.deepEqual(await rollers.evaluateAll(es=>es.map(el=>el.scrollTop)),offsets);assert.equal(await input.inputValue(),text);assert.deepEqual(await selection(),sel);
   assert.equal(await panel.locator('[data-text-character=α]').textContent(),'Α');await char('α');assert.equal(await input.inputValue(),'ABk.4ΑCD');await key('caps');await char('β');assert.equal(await input.inputValue(),'ABk.4ΑβCD');
   const cdp=await context.newCDPSession(p);await rollers.nth(0).evaluate(el=>el.scrollTop=0);const value=await input.inputValue();
   const r=await rollers.nth(0).boundingBox(),other=await rollers.evaluateAll(es=>es.slice(1).map(el=>el.scrollTop));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:r.x+22,y:r.y+r.height-26,id:5}]});
   for(const y of [110,90,70,50,30])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:r.x+22,y:r.y+y,id:5}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await p.waitForFunction(()=>document.querySelector('.tablet-text-roller').scrollTop>0);
   assert.equal(await input.inputValue(),value);assert.deepEqual(await rollers.evaluateAll(es=>es.slice(1).map(el=>el.scrollTop)),other);assert.deepEqual(await snapshot(),before);assert.equal(await input.evaluate(el=>document.activeElement===el),true);
   // Native pen taps use click activation exactly once, without taking editor focus.
   const br=await panel.locator('[data-text-character=j]').evaluate(el=>{el.parentElement.scrollTop=0;const r=el.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...br,pointerType:'pen'});
   await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...br,pointerType:'pen',button:'left',buttons:1,force:.22,clickCount:1});
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...br,pointerType:'pen',button:'left',buttons:0,clickCount:1});
   assert.equal(await input.inputValue(),'ABk.4ΑβjCD');assert.deepEqual(await snapshot(),before);
   const spaceRect=await space.boundingBox(),spaceText=await input.inputValue(),spaceAt=(await selection())[0];
   const spacePoint={x:spaceRect.x+spaceRect.width/2,y:spaceRect.y+spaceRect.height/2};
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...spacePoint,pointerType:'pen'});
   await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...spacePoint,pointerType:'pen',button:'left',buttons:1,force:.22,clickCount:1});
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...spacePoint,pointerType:'pen',button:'left',buttons:0,clickCount:1});
   assert.equal(await input.inputValue(),spaceText.slice(0,spaceAt)+' '+spaceText.slice(spaceAt));assert.deepEqual(await selection(),[spaceAt+1,spaceAt+1]);
   assert.equal(await input.evaluate(el=>document.activeElement===el),true);assert.deepEqual(await snapshot(),before);await input.press('Backspace');assert.equal(await input.inputValue(),spaceText);
   // CDP pen drags may end in a container compatibility click; it must not save the editor.
   const penRect=await rollers.nth(1).boundingBox();
   await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',x:penRect.x+22,y:penRect.y+penRect.height-26,pointerType:'pen',button:'left',buttons:1,force:.22,clickCount:1});
   for(const y of [110,90,70,50,20])await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:penRect.x+22,y:penRect.y+y,pointerType:'pen',buttons:1,force:.22});
   await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:penRect.x+22,y:penRect.y+20,pointerType:'pen',button:'left',buttons:0,clickCount:1});
   assert.equal(await input.inputValue(),'ABk.4ΑβjCD');assert.deepEqual(await snapshot(),before);assert.equal(await panel.isVisible(),true);
   // Cancellation of a browser-owned scroll gesture never inserts on pointer release.
   await panel.locator('[data-text-character=k]').dispatchEvent('pointerdown',{pointerType:'pen',pointerId:77,button:0,buttons:1});
   await panel.locator('[data-text-character=k]').dispatchEvent('pointercancel',{pointerType:'pen',pointerId:77});
   assert.equal(await input.inputValue(),'ABk.4ΑβjCD');await cdp.detach();
   // Same confirmation context edits one existing Force label, never creates another Force.
   const finalText=await input.inputValue();await key('confirm');assert.equal(await input.count(),0);assert.equal(await panel.isVisible(),false);
   let after=await snapshot();assert.equal(after.items.length,1);assert.equal(after.items[0].id,before.items[0].id);assert.equal(after.items[0].label,finalText);assert.equal(after.past.length,1);
   // Reopen resets Caps; other labels use the same editor and same keypad instance.
   await open('text','Text');assert.equal(await caps.getAttribute('aria-pressed'),'true');assert.deepEqual(await rollers.evaluateAll(es=>es.map(el=>el.scrollTop)),[0,0,0,0]);await key('clear');await char('s');await key('space');await key('2');await key('confirm');assert.equal((await snapshot()).items[0].label,'S 2');assert.equal(await panel.count(),1);
   await open('dim','L');await char('a');await input.press('Escape');assert.equal((await snapshot()).items[0].label,'L');assert.equal((await snapshot()).past.length,0);assert.equal(await panel.isVisible(),false);
   // Math rows insert literal characters, not palette templates or keyboard commands.
   await open('text','LR');const mathBefore=await snapshot(),mathRoller=rollers.nth(3);
   const math=async c=>{const b=mathRoller.getByRole('button',{name:c,exact:true});await b.scrollIntoViewIfNeeded();await tap(b)};
   for(const c of mathCharacters){
    await input.fill('LR');await caret(1);await math(c);assert.equal(await input.inputValue(),'L'+c+'R');assert.deepEqual(await selection(),[2,2]);
    await input.fill('LxxR');await caret(1,3);await math(c);assert.equal(await input.inputValue(),'L'+c+'R');assert.deepEqual(await selection(),[2,2]);
    await key('backspace');assert.equal(await input.inputValue(),'LR');assert.deepEqual(await snapshot(),mathBefore);
   }
   const mathCase=await mathRoller.textContent(),mathOffsets=await rollers.evaluateAll(es=>es.map(el=>el.scrollTop));await key('caps');
   assert.equal(await mathRoller.textContent(),mathCase);assert.deepEqual(await rollers.evaluateAll(es=>es.map(el=>el.scrollTop)),mathOffsets);assert.equal(await input.inputValue(),'LR');
   // Native touch scrolling of the fourth roller leaves the other rollers and document untouched.
   await mathRoller.evaluate(el=>el.scrollTop=0);const mr=await mathRoller.boundingBox(),siblings=await rollers.evaluateAll(es=>es.slice(0,3).map(el=>el.scrollTop)),mathCDP=await context.newCDPSession(p);
   await mathCDP.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mr.x+22,y:mr.y+mr.height-26,id:6}]});
   for(const y of [110,90,70,50,28])await mathCDP.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:mr.x+22,y:mr.y+y,id:6}]});
   await mathCDP.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(()=>document.querySelectorAll('.tablet-text-roller')[3].scrollTop>0);
   assert.equal(await input.inputValue(),'LR');assert.deepEqual(await rollers.evaluateAll(es=>es.slice(0,3).map(el=>el.scrollTop)),siblings);assert.deepEqual(await snapshot(),mathBefore);
   // Native pen drag compatibility clicks on this roller must not insert or save.
   // End the independent touch-scroll scenario before starting a pen gesture.
   await p.waitForFunction(()=>{const top=document.querySelectorAll('.tablet-text-roller')[3].scrollTop;if(window.mathScrollTop===top)return ++window.mathScrollStable>=5;window.mathScrollTop=top;window.mathScrollStable=0;return false});
   await mathRoller.evaluate(el=>el.scrollTop=0);await settle(p);
   await mathCDP.send('Input.dispatchMouseEvent',{type:'mousePressed',x:mr.x+22,y:mr.y+mr.height-26,pointerType:'pen',button:'left',buttons:1,force:.22,clickCount:1});
   for(const y of [110,90,70,50,20])await mathCDP.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:mr.x+22,y:mr.y+y,pointerType:'pen',buttons:1,force:.22});
   await mathCDP.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:mr.x+22,y:mr.y+20,pointerType:'pen',button:'left',buttons:0,clickCount:1});
   assert.equal(await input.inputValue(),'LR');assert.deepEqual(await snapshot(),mathBefore);
   // A scroll/drag begun in Roller 4 must not activate Space when released over it.
   const spaceTarget=await space.boundingBox(),crossX=mr.x+22,crossY=spaceTarget.y+spaceTarget.height/2,crossEndX=spaceTarget.x+spaceTarget.width/2;
   await mathCDP.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:crossX,y:mr.y+30,id:7}]});
   for(const y of [60,90,120,150,crossY-mr.y])await mathCDP.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:crossX,y:mr.y+y,id:7}]});
   await mathCDP.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert.equal(await input.inputValue(),'LR');assert.deepEqual(await snapshot(),mathBefore);assert.equal(await input.evaluate(el=>document.activeElement===el),true);
   await mathCDP.send('Input.dispatchMouseEvent',{type:'mousePressed',x:crossX,y:mr.y+30,pointerType:'pen',button:'left',buttons:1,force:.22,clickCount:1});
   for(const y of [60,90,120,150,crossY-mr.y])await mathCDP.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:crossX,y:mr.y+y,pointerType:'pen',buttons:1,force:.22});
   await mathCDP.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:crossEndX,y:crossY,pointerType:'pen',buttons:1,force:.22});
   await mathCDP.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:crossEndX,y:crossY,pointerType:'pen',button:'left',buttons:0,clickCount:1});
   assert.equal(await input.inputValue(),'LR');assert.deepEqual(await snapshot(),mathBefore);assert.equal(await panel.isVisible(),true);await mathCDP.detach();
   // Literal operators still reach the existing live calculation and confirmation path.
   await key('clear');await key('2');await math('*');await key('3');await key('confirm');assert.equal((await snapshot()).items[0].label,'6');assert.equal((await snapshot()).past.length,1);
   // Build a supported display expression entirely through the same keypad.
   await open('text','');await key('caps');
   for(const c of '\\frac{x}{2}'){
    if(/\d/.test(c))await key(c);
    else if(/[a-z]/.test(c)){const b=panel.locator(`[data-text-character="${c}"]`);await b.scrollIntoViewIfNeeded();await tap(b)}
    else await math(c);
   }
   assert.equal(await input.inputValue(),'\\frac{x}{2}');assert.equal(await p.locator('[data-label-expression] svg').isVisible(),true);
   await key('confirm');assert.equal((await snapshot()).items[0].label,'\\frac{x}{2}');assert.equal(await p.locator('[data-equation]').count(),1);
   // Switching back to numeric mode hides text controls and restores original dimensions/semantics.
   await p.evaluate(()=>{setMode('support');placeSupport({clientX:500,clientY:400,pointerType:'touch'})});
   assert.equal(await panel.isVisible(),true);assert.equal(await caps.isVisible(),false);assert.equal(await panel.locator('.tablet-text-rollers').isVisible(),false);assert.equal((await panel.boundingBox()).width,218);
   assert.deepEqual(await panel.locator('.tablet-number-keys').evaluate(el=>[...el.children].filter(b=>!b.hidden).map(b=>b.dataset.numericKey)),['7','8','9','backspace','4','5','6','sign','1','2','3','.','0','clear','confirm']);
   assert.equal(await panel.locator('[data-numeric-key=sign]').textContent(),'±');
   const numericGeometry=await panel.locator('.tablet-number-keys').evaluate(el=>{const r=el.getBoundingClientRect();return [...el.children].filter(b=>!b.hidden).map(b=>{const q=b.getBoundingClientRect();return [q.x-r.x,q.y-r.y,q.width,q.height]})});
   assert.deepEqual(numericGeometry,Array.from({length:12},(_,i)=>[52*(i%4),52*Math.floor(i/4),48,48]).concat([[0,156,100,48],[104,156,48,48],[156,156,48,48]]));
   assert.equal(await space.isVisible(),false);const numeric=await p.locator('#dynamicInputValue').inputValue();await panel.locator('[data-numeric-key=space]').dispatchEvent('click');assert.equal(await p.locator('#dynamicInputValue').inputValue(),numeric);
   await key('clear');await key('sign');await key('9');await key('0');assert.equal(await p.locator('#dynamicInputValue').inputValue(),'-90');
   await p.evaluate(()=>cancelToSelection());assert.equal(await panel.isVisible(),false);
   await open('force','P');
   for(const viewport of [{width:1024,height:600},{width:800,height:1100}]){
    await p.setViewportSize(viewport);await settle(p);const r=await panel.boundingBox();assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);await checkGeometry();
   }
   const out=path.resolve('.test-tools/tablet-text-keypad');fs.mkdirSync(out,{recursive:true});await p.setViewportSize({width:1280,height:800});await settle(p);await p.screenshot({path:path.join(out,'text-mode.png')});
   assert.deepEqual(errors,[]);console.log('PASS tablet: four compact rollers, unique literal math characters, Caps invariance, native touch scroll/no insertion, pen drag safety, caret/selection, arithmetic and fraction rendering, numeric reuse and editor confirmation; physical Xiaomi pen scrolling/keyboard suppression pending');await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
