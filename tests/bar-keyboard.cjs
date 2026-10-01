const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
 const p=await b.newPage({hasTouch:touch,viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof commitBarCandidate==='function');
 const move=async(x,y)=>{const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});if(touch)await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType:'touch'});else await p.mouse.move(q.x,q.y)};
 const start=async(noDirection=false)=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];geometryScale=100;setMode('bar');const q=new DOMPoint(300,300).matrixTransform(svg.getScreenCTM());window.startClient={x:q.x,y:q.y}});const q=await p.evaluate(()=>startClient);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);if(!noDirection)await move(600,400)};
 const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
 const result=()=>p.evaluate(()=>({o:items[0],n:items.length,h:past.length,first,state:barNumericSession?.state}));
 for(const [sequence,length,angle]of [['5.5',550,null],['5.5|30',550,30],['|30',Math.sqrt(100000),30],['|-30',Math.sqrt(100000),-30],['|450',Math.sqrt(100000),450]]){
  await start();const parts=sequence.split('|');await p.keyboard.type(parts[0]);if(parts.length>1){await p.keyboard.press('Tab');if(!parts[0])assert.equal(await p.evaluate(()=>barNumericSession.state.distance.mode),'live');await p.keyboard.type(parts[1])}
  await p.keyboard.press('Enter');const r=await result();assert.equal(r.n,1);assert.equal(r.h,1);near(Math.hypot(r.o.x2-r.o.x,r.o.y2-r.o.y),length);
  if(angle!==null){near(r.o.x2-r.o.x,Math.cos(angle*Math.PI/180)*length);near(r.o.y2-r.o.y,-Math.sin(angle*Math.PI/180)*length)}
  assert.deepEqual(r.first,{x:r.o.x2,y:r.o.y2});assert.equal(r.state.distance.mode,'live');assert.equal(r.state.angle.mode,'live');
  await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>barNumericSession),null);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),r.o);
 }
 await start();await p.keyboard.type('5.5');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>items.length),0);await move(300,500);await p.keyboard.press('Enter');let r=await result();near(r.o.x2,r.o.x);near(r.o.y2-r.o.y,550);
 await start();await p.keyboard.type('5.5');await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');await p.keyboard.type('6');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>barNumericSession.state.distance.value),6);assert.equal(await p.evaluate(()=>items.length),0);await p.keyboard.press('Shift+Tab');await p.keyboard.type('7');await p.keyboard.press('Enter');r=await result();near(Math.hypot(r.o.x2-r.o.x,r.o.y2-r.o.y),700);
 for(const bad of ['0','-1','Infinity','']){await start();await p.locator('#dynamicInputValue').fill(bad);await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>barNumericSession.state.activeField),'distance');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0)}
 await start();await p.keyboard.type('5.5');await p.keyboard.press('Tab');await p.keyboard.type('30');await p.keyboard.press('Tab');const fixed=await p.evaluate(()=>({...barNumericSession.endpoint}));await move(700,500);await p.keyboard.press('Enter');r=await result();near(r.o.x2,fixed.x);near(r.o.y2,fixed.y);
 await start();await move(300,300);await p.keyboard.type('5.5');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>barNumericSession),null);
 await start();if(await p.locator('#drawingScales').isHidden())await p.evaluate(()=>$('drawingScalesToggle').click());await p.locator('#geometryScale').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);
 await p.evaluate(()=>{const d=document.createElement('dialog');d.id='testModal';document.body.append(d);d.showModal()});await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);await p.evaluate(()=>$('testModal').remove());
 // The first segment must not invent a direction; a locked distance survives retry.
 await start(true);await p.locator('#dynamicInputValue').fill('5.5');await p.keyboard.press('Enter');
 assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>barNumericSession.state.distance.mode),'locked');
 await move(600,300);await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),1);
 // Four Done presses: inherited direction, pointer override, then inherit the new direction.
 await start(true);await p.locator('#dynamicInputValue').fill('5.5');await p.keyboard.press('Tab');await p.locator('#dynamicInputSecondary').fill('30');await p.keyboard.press('Enter');
 const check=async(n,length,angle)=>{
  const r=await p.evaluate(()=>({n:items.length,h:past.length,o:items.at(-1),state:barNumericSession.state,first,hover}));
  assert.equal(r.n,n);assert.equal(r.h,n);near(r.o.x2-r.o.x,length*Math.cos(angle*Math.PI/180));near(r.o.y2-r.o.y,-length*Math.sin(angle*Math.PI/180));
  assert.equal(r.state.angle.mode,'live');assert.equal(r.state.distance.mode,'live');near(r.state.angle.value,angle);assert.deepEqual(r.first,{x:r.o.x2,y:r.o.y2});assert.equal(r.hover,null);
  await p.locator('#dynamicInputValue').dispatchEvent('keydown',{key:'Enter',repeat:true});assert.equal(await p.evaluate(()=>items.length),n);
 };
 await check(1,550,30);
 // Both LIVE and an inherited direction alone do not create distance or history.
 await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
 await p.locator('#dynamicInputValue').fill('3');await p.keyboard.press('Enter');await check(2,300,30);
 const next=await p.evaluate(()=>({x:first.x,y:first.y+100}));await move(next.x,next.y);
 assert.equal(await p.evaluate(()=>barNumericSession.state.angle.mode),'live');
 await p.locator('#dynamicInputValue').fill('2');await p.keyboard.press('Enter');await check(3,200,270);
 await p.locator('#dynamicInputValue').fill('1');await p.keyboard.press('Enter');await check(4,100,270);
 const saved=await p.evaluate(()=>documentText()),objects=await p.evaluate(()=>copy(items));assert(!saved.includes('liveDirection'));
 await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.length),3);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items),objects);
 await p.evaluate(async s=>loadDocument(new File([s],'bar-chain.json')),saved);assert.deepEqual(await p.evaluate(()=>items),objects);
 await p.close();assert.deepEqual(errors,[]);}
 console.log('PASS bar keyboard flows, Tab validation/locking/navigation, live candidate, exact commit/history/chaining, undo/redo, invalid solver and editor isolation');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
