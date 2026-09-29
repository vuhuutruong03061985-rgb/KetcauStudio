const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:18766/');await page.waitForFunction(()=>items.length>0);
 await page.locator('#editSelected').click();
 for(const [type,value]of [['force','P = 45 kN'],['udl','q = 12 kN/m']]){
 const id=await page.evaluate(t=>items.find(o=>o.type===t).id,type);
 await page.locator(`g[data-id="${id}"] text`).last().click();
 const input=page.getByRole('textbox',{name:'Sửa nhãn trên hình'});await input.fill(value);await input.press('Enter');
 assert.equal(await page.evaluate(()=>mode),'labelEdit');
 assert.equal(await page.evaluate(t=>items.find(o=>o.type===t).label,type),value);
 }
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>mode),'select');
 await page.evaluate(()=>{multiSelection=new Set(items.slice(0,3).map(o=>o.id));selected=null;render()});
 const original=await page.evaluate(()=>copy(items));
 await page.keyboard.press('Control+c');await page.keyboard.press('Control+v');
 const after=await page.evaluate(()=>copy(items));assert.equal(after.length,original.length+3);
 for(let i=0;i<3;i++){assert.notEqual(after[original.length+i].id,original[i].id);assert.equal(after[original.length+i].x,original[i].x+20)}
 assert.equal(await page.evaluate(()=>multiSelection.size),3);
 await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>items),original);
 await page.locator('#redo').click();assert.deepEqual(await page.evaluate(()=>items),after);
 assert.deepEqual(errors,[]);console.log('PASS continuous label editing, Escape, group copy/paste, unique IDs, offset, undo/redo');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
