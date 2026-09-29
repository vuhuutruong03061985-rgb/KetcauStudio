const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForFunction(()=>items.length>0);
  assert.equal(await page.getByText('Chèn vào Word',{exact:true}).isVisible(),false);
  const previous=await page.evaluate(()=>({format:'ket-cau-studio',version:1,items:copy(items)}));
  await page.locator('#clear').click();
  await page.locator('#file').setInputFiles({name:'old.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(previous))});
  await page.waitForFunction(()=>items.length>0);assert.deepEqual(await page.evaluate(()=>items),previous.items);
  await page.locator('[data-mode="hatch"]').click();await page.evaluate(()=>{hatchMethod.value='points';hatchMethod.dispatchEvent(new Event('change'))});
  await page.evaluate(()=>{hatchPoints=[{x:200,y:200},{x:400,y:200},{x:300,y:300}]});
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>items.at(-1).type),'hatch');
  await page.locator('#undo').click();assert.equal(await page.evaluate(()=>items.length),previous.items.length);
  const keep=await page.evaluate(()=>JSON.stringify(items));
  await page.locator('#file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('null')});
  await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Không mở được:'));
  assert.equal(await page.evaluate(()=>JSON.stringify(items)),keep);assert.deepEqual(errors,[]);
  // LAN HTTP is not a secure context: UUID fallback must still allow drawing.
  const lan=await browser.newPage();lan.on('pageerror',e=>errors.push(e.message));
  await lan.route('http://studio.test/**',async route=>{
   const source='http://localhost:18766'+new URL(route.request().url()).pathname;
   const response=await route.fetch({url:source});await route.fulfill({response});
  });
  await lan.goto('http://studio.test/');await lan.waitForFunction(()=>items.length>0);
  assert.equal(await lan.evaluate(()=>window.isSecureContext),false);
  await lan.locator('[data-mode="force"]').click();const count=await lan.evaluate(()=>items.length);
  await lan.locator('#drawing').click({position:{x:200,y:200}});
  await lan.locator('#loadAngleInput').press('Enter');assert.equal(await lan.evaluate(()=>items.length),count+1);assert.deepEqual(errors,[]);
  console.log('PASS direct file, legacy JSON, invalid JSON preservation, touch-accessible hatch/undo, insecure LAN UUID fallback');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
