const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve('.test-tools/grid-snap');fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
 const settled=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const shot=async n=>{await settled();await p.screenshot({path:path.join(out,n+'.png')})};
 const open=()=>p.evaluate(()=>snapButton.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})));
 const at=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const click=async(x,y)=>{const q=await at(x,y);await p.mouse.click(q.x,q.y)};
 const sample=()=>p.evaluate(()=>{const q=new DOMPoint(123,137).matrixTransform(svg.getScreenCTM());return point({clientX:q.x,clientY:q.y})});
 const nearPoint=(a,b)=>{assert(Math.abs(a.x-b.x)<1e-7,JSON.stringify(a));assert(Math.abs(a.y-b.y)<1e-7,JSON.stringify(a))};
 assert.deepEqual(await p.evaluate(()=>snapOptions),{endpoint:true,midpoint:true,intersection:true,member:true,dimension:true,perpendicular:true,tangent:false,grid:false});
 await open();assert.equal(await p.locator('#snap-grid').isChecked(),false);assert.equal(await p.locator('label:has(#snap-grid)').getAttribute('title'),'Lưới');await shot('01-new-grid-choice');
 await p.evaluate(()=>{items=[];setMode('bar');gridVisible=true;render()});nearPoint(await sample(),{x:123,y:137});await shot('02-grid-snap-off');
 const state=()=>p.evaluate(()=>({doc:documentText(),saved:savedDocument,past:JSON.stringify(past),future:JSON.stringify(future),mode,first,second,title:document.title,file:headerFileName.textContent}));
 await open();const before=await state();await p.locator('#snap-grid').check();assert.deepEqual(await state(),before);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('ket-cau-snap-settings')).options.grid),true);
 nearPoint(await sample(),{x:100,y:150});await p.evaluate(()=>snapPanel.open=false);await click(123,137);await p.mouse.move(...Object.values(await at(273,237)));await shot('03-grid-snap-on');
 await p.evaluate(()=>{cancelToSelection();gridVisible=false;render()});nearPoint(await sample(),{x:123,y:137});await open();assert(await p.locator('#snap-grid').isChecked());await shot('05-hidden-grid-checked');
 await p.evaluate(()=>snapPanel.open=false);await p.locator('#gridToggle').click();nearPoint(await sample(),{x:100,y:150});await p.locator('#snapToggle').click();nearPoint(await sample(),{x:123,y:137});await p.locator('#snapToggle').click();
 const math=await p.evaluate(()=>{
  const results=[];for(const [size,x,y]of [[50,123,137],[25,123,137],[12.5,-31.3,18.8],[12.3,36.9,-49.2],[50,-.01,-24.9],[600,9999,-9999],[12.3,10000,-10000]]){gridSize=size;const input={x,y};results.push({input,size,result:gridSnap(input),unchanged:input.x===x&&input.y===y,negativeZero:Object.is(gridSnap(input).x,-0)||Object.is(gridSnap(input).y,-0)})}
  const matrix=[];gridSize=50;for(const enabled of [false,true])for(const visible of [false,true])for(const option of [false,true]){snapEnabled=enabled;gridVisible=visible;snapOptions.grid=option;matrix.push({enabled,visible,option,result:gridSnap({x:123,y:137})})}
  snapEnabled=true;gridVisible=true;snapOptions.grid=true;return {results,matrix,invalid:[gridSnap({x:NaN,y:0}),gridSnap({x:Infinity,y:0})]};
 });
 const expected=[{x:100,y:150},{x:125,y:125},{x:-37.5,y:25},{x:36.9,y:-49.2},{x:0,y:0},{x:9600,y:-9600},{x:9999.9,y:-9999.9}];
 math.results.forEach((r,i)=>{assert.deepEqual(r.result,expected[i]);assert(r.unchanged);assert(!r.negativeZero);assert(Math.abs(r.result.x)<=10000&&Math.abs(r.result.y)<=10000)});
 math.matrix.forEach(r=>assert.deepEqual(r.result,r.enabled&&r.visible&&r.option?{x:100,y:150}:null));assert.deepEqual(math.invalid,[null,null]);
 await p.locator('#gridSize').fill('50');await p.locator('#gridSize').press('Enter');nearPoint(await sample(),{x:100,y:150});await p.locator('#gridSize').fill('25');await p.locator('#gridSize').press('Enter');nearPoint(await sample(),{x:125,y:125});
 await p.evaluate(()=>{items=[];setMode('bar')});await click(123,137);await click(273,237);assert.deepEqual(await p.evaluate(()=>[items[0].x,items[0].y,items[0].x2,items[0].y2]),[125,125,275,225]);await shot('06-25-unit-bar');
 await p.evaluate(()=>{cancelToSelection();camera={x:-400,y:-400,w:1100,h:720};applyCamera();setMode('bar')});await click(-123,-137);nearPoint(await p.evaluate(()=>first),{x:-125,y:-125});await p.mouse.move(...Object.values(await at(-273,-237)));await shot('07-negative-grid-snap');
 await p.evaluate(()=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera()});
 const json=await p.evaluate(()=>JSON.parse(documentText()));assert.equal(json.version,1);for(const k of ['gridSnap','gridVisible','gridSize','snapOptions'])assert(!(k in json));
 await p.reload();assert.deepEqual(await p.evaluate(()=>[snapOptions.grid,gridVisible,gridSize]),[true,false,50]);await open();assert(await p.locator('#snap-grid').isChecked());assert.equal(await p.evaluate(()=>gridSnap({x:123,y:137})),null);
 const cdp=await context.newCDPSession(p);await cdp.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');await p.evaluate(()=>snapPanel.open=false);
 assert.deepEqual(await p.locator('#tabletBottomView').evaluate(e=>[...e.children].map(c=>c.id)),['gridToggle','gridSizeControl','snapToggle','drawingScalesToggle']);
 const b=await p.locator('#tabletBottomRightBar').boundingBox();assert.equal(b.width,208);assert.equal(b.height,48);await shot('11-bottom-right-unchanged');
 await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await p.locator('.semicircle-right-menu [data-demo-id="snapOptions"]').focus();await p.keyboard.press('Enter');await shot('13-right-snap-options-focused');await p.keyboard.press('Enter');assert(await p.evaluate(()=>snapPanel.open));assert(await p.locator('#snap-grid').isVisible());await shot('12-right-snap-route');
 const layout=[];for(const [width,height,name]of [[1280,800,'landscape-popup'],[800,1280,'08-portrait-popup'],[800,777,'09-800x777'],[800,568,'10-800x568-fallback']]){
  await p.evaluate(()=>{document.activeElement.blur();snapPanel.open=false});await p.setViewportSize({width,height});await settled();await p.waitForFunction(expected=>document.body.dataset.radialPrimary===String(expected),height!==568,{timeout:3000}).catch(async e=>{console.error(await p.evaluate(()=>({size:[innerWidth,innerHeight],primary:document.body.dataset.radialPrimary,left:leftDrawingBounds(),right:rightCommandBounds()})));throw e});await open();await settled();
  const box=await p.locator('#snapSettings .snap-choices').boundingBox();assert(box);assert(box.x>=0&&box.y>=0&&box.x+box.width<=width+.01&&box.y+box.height<=height+.01,JSON.stringify(box));assert(await p.locator('#snap-grid').isVisible());layout.push({width,height,box});await shot(name);
 }
 for(const grid of [undefined,'true']){
  const old={enabled:false,options:{endpoint:false,midpoint:true,intersection:false,member:true,dimension:false,perpendicular:false,tangent:true,...(grid===undefined?{}:{grid})}};
  const c=await browser.newContext(),q=await c.newPage();await c.addInitScript(payload=>localStorage.setItem('ket-cau-snap-settings',JSON.stringify(payload)),old);await q.goto(pathToFileURL(path.resolve('index.html')).href);
  assert.deepEqual(await q.evaluate(()=>({enabled:snapEnabled,options:snapOptions})),{enabled:false,options:{...old.options,grid:false}});assert.deepEqual(await q.evaluate(()=>JSON.parse(localStorage.getItem('ket-cau-snap-settings'))),old);await c.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({math,layout,screenshots:fs.readdirSync(out).filter(n=>n.endsWith('.png'))},null,2));
 console.log('PASS Grid defaults/storage, condition matrix, lattice math/bounds, live spacing, creation, history/JSON independence, reload, popup fit and RIGHT route');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
