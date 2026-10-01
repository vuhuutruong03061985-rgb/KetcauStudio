const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const touch of [false,true]){
const c=await b.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof commitThinCandidate==='function');
const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
const move=async(x,y)=>{const q=await coords(x,y);await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType:touch?'touch':'mouse'})};
const start=async()=>{await p.evaluate(()=>{document.activeElement.blur();items=[];past=[];future=[];internalForceScale=10;setMode('thin');savedDocument=documentText()});await click(300,300)};
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
for(const [x,y]of [[500,300],[100,300],[300,100],[300,500],[600,500]]){
 await start();await move(500,300);if(touch)await p.evaluate(()=>openArmedDynamicInput());await p.keyboard.type('110');await move(x,y);
 const expected=await p.evaluate(()=>solveThinEndpointFromValue({startPoint:first,candidatePoint:hover,internalForceValue:110,internalForceScale}));
 assert.equal(await p.evaluate(()=>documentText()===savedDocument),true);await p.keyboard.press('Enter');
 // Done commits immediately for every pointer type; no second canvas tap.
 const r=await p.evaluate(()=>({o:items[0],n:items.length,h:past.length,first,state:thinNumericSession}));assert.equal(r.n,1);assert.equal(r.h,1);near(r.o.x2,expected.x);near(r.o.y2,expected.y);near(Math.hypot(r.o.x2-r.o.x,r.o.y2-r.o.y),11);assert.deepEqual(r.first,{x:r.o.x2,y:r.o.y2});assert.equal(r.state.valueMode,'live');assert.equal(r.state.value,0);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),true);
 const saved=await p.evaluate(()=>documentText());assert(!saved.includes('internalForceValue'));await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>thinNumericSession),null);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),r.o);await p.evaluate(async s=>loadDocument(new File([s],'thin.json')),saved);assert.deepEqual(await p.evaluate(()=>items[0]),r.o);
}
await start();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);
for(const text of ['0','-110','NaN','Infinity','']){await p.evaluate(()=>openArmedDynamicInput());await p.locator('#dynamicInputValue').fill(text);await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert(await p.locator('#dynamicInput').isVisible())}
await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>{hover={...first};render()});await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>mode),'thin');assert.equal(await p.evaluate(()=>thinNumericSession.value),110);assert.equal(await p.evaluate(()=>thinNumericSession.valueMode),'locked');await move(500,300);await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
// A locked magnitude still supports the existing canvas commit route.
await start();await move(500,300);await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());assert.equal(await p.evaluate(()=>items.length),0);await click(500,300);assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
await start();if(await p.locator('#drawingScales').isHidden())await p.evaluate(()=>$('drawingScalesToggle').click());await p.locator('#geometryScale').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);
await p.evaluate(()=>{const d=document.createElement('dialog');d.id='testDialog';document.body.append(d);d.showModal()});await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);await p.evaluate(()=>$('testDialog').remove());
// Touch/pen editing in a mouse-started session uses the same single-Enter route.
for(const pointerType of ['touch','pen']){
 await start();await move(500,300);await p.evaluate(()=>openArmedDynamicInput());await p.locator('#dynamicInputValue').dispatchEvent('pointerdown',{pointerType});await p.locator('#dynamicInputValue').fill('110');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);assert.equal(await p.evaluate(()=>thinNumericSession.pointerType),pointerType);
 await p.locator('#dynamicInputValue').dispatchEvent('keydown',{key:'Enter',repeat:true});assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
}
for(const scale of [0,-1,NaN,Infinity]){
 await start();await move(500,300);await p.locator('#dynamicInputValue').fill('110');await p.evaluate(scale=>internalForceScale=scale,scale);await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert(await p.locator('#dynamicInput').isVisible());
}
// Reference-bar Done uses the existing perpendicular solver on either side,
// independent of the order of the reference endpoints.
for(const reversed of [false,true])for(const y of [200,400]){
 await p.evaluate(reversed=>{document.activeElement.blur();setMode('select');items=[reversed?make('bar',500,300,100,300):make('bar',100,300,500,300)];past=[];future=[];internalForceScale=10;setMode('thin')},reversed);
 await click(300,300);await move(350,y);await p.locator('#dynamicInputValue').fill('110');
 await p.evaluate(()=>dynamicInputUI.confirmPending());
 const geometry=await p.evaluate(()=>getThinConstrainedGeometry(getThinReferenceBar()));assert(geometry);
 await p.keyboard.press('Enter');const r=await p.evaluate(()=>({o:items.at(-1),n:items.length,h:past.length}));assert.equal(r.n,2);assert.equal(r.h,1);
 near(r.o.x,geometry.drawStartPoint.x);near(r.o.y,geometry.drawStartPoint.y);near(r.o.x2,geometry.endpoint.x);near(r.o.y2,geometry.endpoint.y);near(Math.hypot(r.o.x2-r.o.x,r.o.y2-r.o.y),11);
}
assert.deepEqual(errors,[]);await c.close();
}console.log('PASS thin keyboard mouse/touch/pen single Enter, exact geometry/history/chaining, undo/redo/save/load, invalid retry/isolation, ambiguous direction, repeat protection and canvas commit');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});

