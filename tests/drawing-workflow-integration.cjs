const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const touch of [false,true]){
   const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.goto(pathToFileURL(path.resolve('index.html')).href);
   await page.waitForFunction(()=>typeof thinNumericSession!=='undefined');
   const click=async(x,y)=>{
    const q=await page.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:p.x,y:p.y}},{x,y});
    if(touch)await page.touchscreen.tap(q.x,q.y);else await page.mouse.click(q.x,q.y);
   };
   const tool=async mode=>{const button=page.locator(`[data-mode="${mode}"]`);if(touch)await button.tap();else await button.click()};
   const clean=async()=>assert(await page.evaluate(()=>!barNumericSession&&!thinNumericSession&&!isDynamicNumericInputArmed()&&document.getElementById('dynamicInput').hidden));
   const open=async text=>page.evaluate(async text=>loadDocument(new File([text],'integration.json')),text);
   await page.evaluate(()=>{items=[];past=[];future=[];setMode('select')});
   for(let cycle=0;cycle<3;cycle++){
    for(const mode of ['bar','thin','bar']){
     await tool(mode);await clean();await click(200,200);
     assert.equal(await page.evaluate(()=>mode==='bar'?barNumericSession.state.distance.mode:thinNumericSession.valueMode),'live');
     const counts=await page.evaluate(()=>[items.length,past.length]);
     await page.locator('#dynamicInputValue').fill(mode==='bar'?'1':'110');await click(600,400);
     if(mode==='thin'){
      // The preceding bar lies along this cursor direction: LOCKED has no normal side yet.
      assert.deepEqual(await page.evaluate(()=>[items.length,past.length]),counts);
      await click(600,450);
     }
     assert.deepEqual(await page.evaluate(()=>[items.length,past.length]),counts.map(n=>n+1));
    }
    await page.evaluate(()=>actions.undo[1]());await clean();
    await tool('thin');await click(200,300);await page.locator('#dynamicInputValue').fill('110');
    await page.evaluate(()=>dynamicInputUI.confirmPending());
    await open(JSON.stringify({format:'ket-cau-studio',version:1,items:[],geometryScale:100,internalForceScale:10}));
    await clean();await tool('bar');await clean();
   }
   for(const mode of ['bar','thin']){
    await page.evaluate(()=>{items=[];past=[];future=[];setMode('select')});await tool(mode);await click(200,300);
    for(let i=0;i<5;i++){
     const before=await page.evaluate(()=>({document:documentText(),first:{...first},history:past.length}));
     await page.locator('#dynamicInputValue').fill(mode==='bar'?'0.5':'110');
     assert.equal(await page.evaluate(()=>documentText()),before.document);
     await click(600,400);
     const result=await page.evaluate(()=>({object:items.at(-1),count:items.length,history:past.length,first,live:mode==='bar'?barNumericSession.state.distance.mode:thinNumericSession.valueMode}));
     assert.equal(result.count,i+1);assert.equal(result.history,before.history+1);
     assert.deepEqual({x:result.object.x,y:result.object.y},before.first);
     assert.deepEqual(result.first,{x:result.object.x2,y:result.object.y2});assert.equal(result.live,'live');
     assert(Math.abs(Math.hypot(result.object.x2-result.object.x,result.object.y2-result.object.y)-(mode==='bar'?50:11))<1e-7);
    }
    const geometry=await page.evaluate(()=>JSON.stringify(items));
    // Exercise the existing save path using an in-memory file handle.
    await page.evaluate(()=>{window.integrationSaved='';window.showSaveFilePicker=async()=>({name:'integration.json',createWritable:async()=>({write:async text=>{window.integrationSaved=text},close:async()=>{}})})});
    assert.equal(await page.evaluate(()=>saveDocument(true)),true);
    const saved=await page.evaluate(()=>window.integrationSaved);
    for(const width of [550,2200,1100]){
     await page.evaluate(width=>{camera.w=width;camera.h=width*720/1100;applyCamera()},width);
     assert.equal(await page.evaluate(()=>JSON.stringify(items)),geometry);
    }
    await page.evaluate(()=>actions.undo[1]());await clean();assert.equal(await page.evaluate(()=>items.length),4);
    await page.evaluate(()=>actions.redo[1]());await clean();assert.equal(await page.evaluate(()=>JSON.stringify(items)),geometry);
    await open(saved);await clean();assert.equal(await page.evaluate(()=>JSON.stringify(items)),geometry);
    assert.deepEqual(await page.evaluate(()=>[geometryScale,internalForceScale]),[100,10]);
   }
   assert.deepEqual(errors,[]);await context.close();
   console.log(`PASS ${touch?'touch':'mouse'} integration: repeated tool/Undo/Open lifecycle, 5 segments per tool, exact checkpoints/chaining, live reset, zoom, undo/redo, save/load`);
  }
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
