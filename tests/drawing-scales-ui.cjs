const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const touch of [false,true]){
   const context=await browser.newContext({hasTouch:touch,viewport:touch?{width:800,height:1280}:{width:1360,height:950}});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.goto(pathToFileURL(path.resolve('index.html')).href);
   await page.waitForFunction(()=>!!document.getElementById('geometryScale'));
   const ui=()=>page.evaluate(()=>[$('geometryScale').value,$('internalForceScale').value]);
   const state=()=>page.evaluate(()=>[geometryScale,internalForceScale]);
   assert.deepEqual(await ui(),['100','0.1']);
   
   
   const before=await page.evaluate(()=>({items:copy(items),past:copy(past),future:copy(future),svg:exportSVG(),mode,snapEnabled,snapOptions:copy(snapOptions)}));
   const edit=async(id,value)=>{
    if(await page.locator('#drawingScales').isHidden())await page.locator('#drawingScalesToggle').click();
    const input=page.locator('#'+id);if(touch)await input.tap();
    await input.fill(value);await input.press('Tab');
   };
   await edit('geometryScale','80');await edit('internalForceScale','0.4');
   assert.deepEqual(await state(),[80,2.5]);
   
   
   for(const id of ['geometryScale','internalForceScale']){
    for(const value of ['', '0','-2']){await edit(id,value);assert.deepEqual(await state(),[80,2.5]);assert.deepEqual(await ui(),['80','0.4'])}
    for(const value of ['NaN','Infinity','abc','1e400']){
     await page.evaluate(({id,value})=>{const input=$(id);input.value=value;input.dispatchEvent(new Event('change'))},{id,value});
     assert.deepEqual(await state(),[80,2.5]);assert.deepEqual(await ui(),['80','0.4']);
    }
   }
   assert.deepEqual(await page.evaluate(()=>({items:copy(items),past:copy(past),future:copy(future),svg:exportSVG(),mode,snapEnabled,snapOptions:copy(snapOptions)})),before);
   assert.deepEqual(await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem(draftKey));return [d.geometryScale,d.internalForceScale]}),[80,2.5]);
   await page.evaluate(()=>{
    window.scaleSaved='';window.showSaveFilePicker=async()=>({name:'ui.json',createWritable:async()=>({write:async text=>{window.scaleSaved=text},close:async()=>{}})});
   });
   assert.equal(await page.evaluate(()=>saveDocument()),true);
   assert.deepEqual(await page.evaluate(()=>{const d=JSON.parse(window.scaleSaved);return [d.geometryScale,d.internalForceScale]}),[80,2.5]);
   await edit('geometryScale','120');
   assert.equal(await page.evaluate(()=>documentText()!==savedDocument),true);
   await page.evaluate(async()=>loadDocument(new File([window.scaleSaved],'saved.json')));
   assert.deepEqual(await ui(),['80','0.4']);
   await page.evaluate(async()=>{
    const d=JSON.parse(documentText());delete d.geometryScale;delete d.internalForceScale;
    await loadDocument(new File([JSON.stringify(d)],'legacy.json'));
   });
   assert.deepEqual(await ui(),['100','0.1']);
   await edit('geometryScale','200');await page.evaluate(()=>newDocument());
   assert.deepEqual(await ui(),['100','0.1']);
   for(const viewport of [{width:800,height:1280},{width:1280,height:800},{width:390,height:844}]){
    await page.setViewportSize(viewport);if(await page.locator('#drawingScales').isHidden())await page.locator('#drawingScalesToggle').click();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    for(const id of ['geometryScale','internalForceScale']){const box=await page.locator('#'+id).boundingBox();assert(box.width>0&&box.height>=28)}
   }
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS scale UI/state, validation, previews, unchanged objects/render/history/snap, save/load/new, desktop and emulated touch/layout');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
