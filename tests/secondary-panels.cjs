const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 for(const [tool,field,value]of [['force','direction','right'],['udl','direction','up'],['moment','rotation','ccw']]){
  await p.locator(`[data-mode="${tool}"]`).click();
  const panel=p.locator('#secondaryTools');assert(await panel.isVisible());
  await panel.locator(`[data-option-key="${field}"][data-option-value="${value}"]`).click();
  await p.waitForTimeout(300);assert(await panel.isVisible());
  assert.equal(await p.locator('#'+field).inputValue(),value);
  await p.mouse.move(1200,800);await p.waitForFunction(()=>secondaryTools.hidden);
  assert.equal(await p.evaluate(()=>mode),tool);
  await p.locator(`[data-mode="${tool}"]`).click();
  assert.equal(await panel.locator(`[data-option-value="${value}"]`).getAttribute('aria-pressed'),'true');
 }
 await p.locator('#snapSettings summary').click();assert(await p.locator('.snap-choices').isVisible());
 await p.locator('#snap-midpoint').uncheck();await p.waitForTimeout(300);assert(await p.locator('.snap-choices').isVisible());
 await p.mouse.move(1200,800);await p.waitForFunction(()=>!document.getElementById('snapSettings').open);
 assert.equal(await p.evaluate(()=>snapEnabled),true);assert.equal(await p.evaluate(()=>snapOptions.midpoint),false);
 await p.locator('#snapSettings summary').click();assert.equal(await p.locator('#snap-midpoint').isChecked(),false);
 await p.locator('#drawing').dispatchEvent('pointerdown',{pointerType:'touch',button:0,clientX:1100,clientY:700});
 assert.equal(await p.evaluate(()=>document.getElementById('snapSettings').open),false);
 assert.deepEqual(errors,[]);console.log('PASS load options/defaults, pointer leave auto-hide, snap options persist, outside touch');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
