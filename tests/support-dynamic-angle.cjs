const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginSupportNumericInput==='function');
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const reset=async(type='pin')=>{await p.evaluate(()=>{setMode('select');items=[];past=[];future=[];selected=null;snapEnabled=false;render();document.activeElement?.blur()});await p.locator(`[data-support-type=${type}]`).click();await tap(300,300)};
  const input=p.locator('#dynamicInputValue');
  for(const type of ['pin','roller','fixed','pin-plain','roller-plain'])for(const [text,angle]of [['30',30],['-30',-30],['30,5',30.5],['37.25',37.25],['270',-90],['-180',180]]){
   await reset(type);assert(await p.evaluate(()=>isDynamicNumericInputArmed()));assert(await p.locator('#dynamicInput').isVisible());
   if(touch){await input.tap();await input.fill(text)}else await p.keyboard.type(text);
   const q=await screen(450,410);await p.mouse.move(q.x,q.y);
   near(await p.evaluate(()=>supportPlacementSession.previewAngle),angle);
   await p.keyboard.press('Enter');
   const result=await p.evaluate(()=>({items:copy(items),past:past.length,session:supportPlacementSession,armed:isDynamicNumericInputArmed()}));
   assert.equal(result.items.length,1);assert.equal(result.past,1);assert.equal(result.items[0].support,type);near(result.items[0].supportAngle,angle);assert.equal(result.session,null);assert.equal(result.armed,false);assert(await p.locator('#dynamicInput').isHidden());
  }
  for(const text of ['', '-', 'NaN','Infinity','1.2.3','1,2,3']){
   await reset();await input.fill(text);await input.press('Enter');
   assert.equal(await p.evaluate(()=>items.length),0);assert(await p.evaluate(()=>!!supportPlacementSession));assert(await p.locator('#dynamicInput').isVisible());
  }
  for(const action of ['escape','tool','undo','redo','new','open','rollback','select']){
   await reset();
   if(action==='escape')await p.keyboard.press('Escape');
   else await p.evaluate(action=>{if(action==='tool')setMode('bar');if(action==='undo'||action==='redo')actions[action][1]();if(action==='new')newDocument();if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='select')activateSelection()},action);
   assert.equal(await p.evaluate(()=>supportPlacementSession),null);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);assert(await p.locator('#dynamicInput').isHidden());assert.equal(await p.evaluate(()=>items.length),0);
  }
  await reset();const q=await screen(400,400);await p.mouse.move(q.x,q.y);near(Number(await input.inputValue()),-45);
  await tap(450,300);near(await p.evaluate(()=>items[0].supportAngle),-90);
  assert.deepEqual(errors,[]);console.log(`PASS support dynamic angle ${touch?'touch emulated':'mouse'}: all subtypes, signed/comma/arbitrary/canonical angles, locked preview, Enter, invalid input, LIVE and cleanup`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
