const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1400,height:1000},hasTouch:touch,isMobile:touch}),p=await context.newPage();
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof currentMomentRotation!=='undefined');
  const activate=async locator=>touch?locator.tap():locator.click();
  const tap=async(x,y)=>{const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},{x,y});if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  await p.evaluate(()=>{setMode('select');items=[];past=[];future=[];selected=null;snapEnabled=false;render();savedDocument=documentText()});
  const parent=p.locator('[data-mode=moment]'),panel=p.locator('#momentDirectionPalette'),options=panel.locator('input');
  let previousIcon;
  for(const rotation of ['cw','ccw','cw']){
   const before=await p.evaluate(()=>({text:documentText(),past:past.length,saved:savedDocument}));
   await activate(parent);assert(await panel.evaluate(el=>el.open));assert.equal(await options.count(),2);
   assert.equal(await panel.locator('.snap-choices .snap-icon-choice').count(),2);
   await activate(panel.locator(`input[value=${rotation}]`));
   assert.equal(await p.evaluate(()=>mode),'moment');assert.equal(await p.evaluate(()=>currentMomentRotation),rotation);assert.equal(await panel.evaluate(el=>el.open),false);
   assert.equal(await panel.locator('input:checked').inputValue(),rotation);assert.equal(await parent.getAttribute('data-rotation'),rotation);
   const icon=await parent.evaluate(el=>el.style.getPropertyValue('--tool-icon'));if(previousIcon)assert.notEqual(icon,previousIcon);previousIcon=icon;
   assert.deepEqual(await p.evaluate(()=>({text:documentText(),past:past.length,saved:savedDocument})),before);
   for(let i=0;i<2;i++){
    await tap(300+i*200,300);assert.equal(await p.locator('#momentDirectionToggle').count(),0);
    assert.equal(await p.locator('#dynamicInput input:visible').count(),1);assert.equal(await p.locator('#dynamicInput button:visible').count(),0);
    const q=await p.evaluate(()=>{const p=new DOMPoint(450,450).matrixTransform(svg.getScreenCTM());return{x:p.x,y:p.y}});await p.mouse.move(q.x,q.y);
    assert.equal(await p.evaluate(()=>loadPlacement.rotation),rotation);
    await p.locator('#dynamicInputValue').fill('35');await p.locator('#dynamicInputValue').press('Enter');
    assert.equal(await p.evaluate(()=>items.at(-1).rotation),rotation);
   }
   await tap(700,400);const n=await p.evaluate(()=>({items:items.length,past:past.length}));await activate(parent);
   assert.equal(await p.evaluate(()=>loadPlacement),null);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);assert(await p.locator('#dynamicInput').isHidden());
   assert.deepEqual(await p.evaluate(()=>({items:items.length,past:past.length})),n);
   await activate(p.locator('#resetView'));assert.equal(await panel.evaluate(el=>el.open),false);
  }
  console.log(`PASS moment flyout ${touch?'touch':'mouse'}: shared Snap classes, exclusive selection, icon, no document/history changes, repeated direction, angle-only and cancellation`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
