const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});let count=0;try{
for(const pointer of ['touch','pen'])for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){
const p=await b.newPage({viewport,hasTouch:true,isMobile:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof canFinishLockedUDL==='function');const c=await p.context().newCDPSession(p);
const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const tap=async selector=>{const r=await p.locator(selector).boundingBox();assert(r,selector);await contact({x:r.x+r.width/2,y:r.y+r.height/2})};
const contact=async q=>{if(pointer==='touch'){await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...q,id:1}]});await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else{await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,pointerType:'pen',button:'left',buttons:1,clickCount:1});await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,pointerType:'pen',button:'left',buttons:0,clickCount:1})}await settle()};
const pick=async(x,y)=>contact(await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y}));
const state=()=>p.evaluate(()=>({a:loadPlacement?.a,b:loadPlacement?.b,phase:loadPlacement?.phase,angle:loadPlacement?.uiAngle,history:past.length,n:items.length}));
const reset=()=>p.evaluate(()=>{document.activeElement.blur();cancelToSelection();items=[];past=[];future=[];snapEnabled=false;leftDrawingMenu.close();rightCommandMenu.close();setMode('udl')});
await reset();await pick(350,300);assert(await p.locator('#penConnectionBubble').isVisible());assert(await p.locator('#dynamicInput').isHidden());await tap('[data-pen-connection-action=cancel]');assert.equal(await p.evaluate(()=>loadPlacement),null);count++;
await pick(350,300);await tap('[data-pen-connection-action=confirm]');const a=(await state()).a;assert.equal((await state()).phase,'b');await pick(350,300);assert(await p.locator('#penConnectionBubble').isHidden());count++;
await pick(650,300);await tap('[data-pen-connection-action=cancel]');assert.deepEqual((await state()).a,a);assert.equal((await state()).b,undefined);await pick(650,300);await tap('[data-pen-connection-action=confirm]');const locked=await state();assert.equal(locked.phase,'angle');
assert.equal(await p.evaluate(()=>document.body.dataset.radialPrimary),'true');
assert(await p.locator('#dynamicInputValue').evaluate(e=>e.inputMode==='none'||e.readOnly));
for(const selector of ['[data-numeric-key=confirm]','[data-numeric-key="4"]']){const r=await p.locator(selector).boundingBox();assert(r.width>=44&&r.height>=44)}
count++;
assert(await p.locator('#tabletNumericKeypad').isVisible());assert(await p.locator('#penConnectionBubble').isHidden());count++;
const grip=await p.locator('.tablet-keypad-grip').boundingBox(),g={x:grip.x+grip.width/2,y:grip.y+grip.height/2};
if(pointer==='touch'){
 await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...g,id:1}]});
 await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:g.x-35,y:g.y+35,id:1}]});
 await c.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}else{
 await c.send('Input.dispatchMouseEvent',{type:'mousePressed',...g,pointerType:'pen',button:'left',buttons:1,clickCount:1});
 await c.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:g.x-35,y:g.y+35,pointerType:'pen',button:'left',buttons:1});
 await c.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:g.x-35,y:g.y+35,pointerType:'pen',button:'left',buttons:0,clickCount:1});
}
await settle();await p.waitForTimeout(300);assert.deepEqual((await state()).a,locked.a);assert.deepEqual((await state()).b,locked.b);count++;
await tap('[data-numeric-key="4"]');await tap('[data-numeric-key="5"]');assert.equal(await p.locator('#dynamicInputValue').inputValue(),'45');assert.equal((await state()).angle.mode,'live');await tap('[data-numeric-key=confirm]');assert.equal((await state()).angle.mode,'locked');assert.equal((await state()).n,0);assert.equal(await p.evaluate(()=>canFinishLockedUDL()),true);count++;
await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'touch',pointerId:999})));assert.deepEqual((await state()).a,locked.a);assert.deepEqual((await state()).b,locked.b);await pick(700,400);assert.equal((await state()).n,0);count++;
const box=await p.locator('#drawing').boundingBox();
await c.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.4,y:box.y+box.height*.5,id:1},{x:box.x+box.width*.6,y:box.y+box.height*.5,id:2}]});
await c.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.35,y:box.y+box.height*.5,id:1},{x:box.x+box.width*.65,y:box.y+box.height*.5,id:2}]});
await c.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settle();assert.deepEqual((await state()).a,locked.a);assert.deepEqual((await state()).b,locked.b);assert.equal((await state()).n,0);count++;
await p.evaluate(()=>restoreDrawing(captureDrawing(),{preserveSupportAnchor:true}));assert.deepEqual((await state()).a,locked.a);assert.deepEqual((await state()).b,locked.b);
await tap('[data-numeric-key=confirm]');assert.equal((await state()).n,1);assert.equal((await state()).history,1);assert.equal(await p.evaluate(()=>items[0].loadAngle),45);await p.evaluate(()=>actions.undo[1]());assert.equal((await state()).n,0);await p.evaluate(()=>actions.redo[1]());assert.equal((await state()).n,1);const json=await p.evaluate(()=>documentText());await p.evaluate(j=>loadDocument(new File([j],'udl.json')),json);assert.equal(await p.evaluate(()=>documentText()),json);count++;
await reset();await p.evaluate(()=>{items=[make('bar',300,300,700,300,{id:'reference'})];snapEnabled=true;render()});
await pick(350,300);await tap('[data-pen-connection-action=confirm]');await pick(650,300);await tap('[data-pen-connection-action=confirm]');assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'reference');await p.locator('#dynamicInputValue').fill('30');await tap('[data-numeric-key=confirm]');const expected=await p.evaluate(()=>loadUIToInternal('udl',referenceAngleToGlobalPlacementAngle(30,loadReferenceFrame())));await tap('[data-numeric-key=confirm]');assert.equal(await p.evaluate(()=>items[1].loadAngle),expected);count++;
await reset();await pick(350,300);await tap('[data-pen-connection-action=confirm]');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>loadPlacement),null);assert.equal((await state()).history,0);count++;
assert.deepEqual(errors,[]);await p.close();
}console.log('PASS tablet UDL '+count+' scenarios')}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
