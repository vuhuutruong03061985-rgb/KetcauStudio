const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
for(const touch of [false,true]){
 const c=await b.newContext({hasTouch:touch,viewport:{width:1360,height:950}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof positionDrawingScales==='function');
 // Exercise the original source control through the real safe-fit fallback.
 if(touch){
  await p.evaluate(()=>{rightCommandSafeProbe.style.paddingRight='calc(100vw - 60px)';rightCommandMenu.refresh()});
  await p.waitForFunction(()=>document.body.dataset.radialPrimary==='false');
 }
 const button=p.getByRole('button',{name:'Tỷ lệ vẽ',exact:true}),panel=p.locator('#drawingScales');const toggle=async()=>touch?button.tap():button.click();
 assert.equal(await panel.locator('small').count(),0);assert.equal(await panel.locator('label').count(),2);assert(await panel.isHidden());assert.equal(await button.getAttribute('title'),'Tỷ lệ vẽ');assert(await button.evaluate(el=>el.classList.contains('icon-button')));
 await p.evaluate(()=>{saveDraft();savedDocument=documentText()});const before=await p.evaluate(()=>({doc:documentText(),draft:localStorage.getItem(draftKey),history:copy(past)}));
 await toggle();assert(await panel.isVisible());assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await p.locator('#geometryScale').inputValue(),'100');assert.equal(await p.locator('#internalForceScale').inputValue(),'0.1');
 await toggle();assert(await panel.isHidden());await toggle();await p.locator('#geometryScale').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.id),'internalForceScale');await p.keyboard.press('Escape');assert(await panel.isHidden());assert.equal(await p.evaluate(()=>document.activeElement.id),'drawingScalesToggle');
 await toggle();if(touch)await p.locator('header strong').tap();else await p.locator('header strong').click();assert(await panel.isHidden());assert.deepEqual(await p.evaluate(()=>({doc:documentText(),draft:localStorage.getItem(draftKey),history:copy(past)})),before);
 await toggle();await p.locator('#geometryScale').fill('80');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>geometryScale),80);await p.locator('#internalForceScale').fill('0');await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>internalForceScale),10);
 await p.evaluate(async()=>loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[],geometryScale:125,internalForceScale:5})],'other.json')));assert(await panel.isHidden());await toggle();assert.equal(await p.locator('#geometryScale').inputValue(),'125');assert.equal(await p.locator('#internalForceScale').inputValue(),'0.2');
 await p.evaluate(()=>newDocument());assert(await panel.isHidden());await toggle();
 for(const viewport of [{width:390,height:700},{width:800,height:1280},{width:1280,height:800}]){
 await p.setViewportSize(viewport);await p.evaluate(()=>positionDrawingScales());const box=await panel.boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=viewport.width&&box.y+box.height<=viewport.height);
 }
 await p.evaluate(()=>{const vv=new EventTarget();Object.assign(vv,{width:300,height:240,offsetLeft:20,offsetTop:30});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});positionDrawingScales()});const box=await panel.boundingBox();assert(box.x>=20&&box.y>=30&&box.x+box.width<=320&&box.y+box.height<=270);
 assert.deepEqual(errors,[]);await c.close();
}console.log('PASS scale icon/popover desktop/touch: visibility/toggle/outside/Escape/focus/Tab, binding/validation/New/Open, no dirty on visibility, viewport/keyboard bounds');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
