const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);
  await p.waitForFunction(()=>items.length>0);
  const snap=await p.evaluate(()=>snapEnabled);
  await p.keyboard.press('F3');assert.equal(await p.evaluate(()=>snapEnabled),!snap);
  await p.keyboard.press('F3');assert.equal(await p.evaluate(()=>snapEnabled),snap);
  await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>d.open=false);setMode('bar')});
  const before=await p.evaluate(()=>({drawing:JSON.stringify(items),camera:{...camera}}));
  const box=await p.locator('#drawing').boundingBox();
  await p.keyboard.down('Control');await p.keyboard.down('Alt');
  await p.mouse.move(box.x+100,box.y+100);await p.mouse.down();
  await p.mouse.move(box.x+160,box.y+130);await p.mouse.up();
  await p.keyboard.up('Alt');await p.keyboard.up('Control');
  assert.equal(await p.evaluate(()=>JSON.stringify(items)),before.drawing);
  assert.notEqual(await p.evaluate(()=>camera.x),before.camera.x);
  assert.equal(await p.evaluate(()=>panEnabled),false);
  assert.equal(await p.evaluate(()=>mode),'bar');
  await p.evaluate(()=>{setMode('select');editObjectLabel(items.find(o=>o.type==='force'))});
  const input=p.getByRole('textbox',{name:'Sửa nhãn trên hình'});
  await input.fill('P = 4*5');
  assert.equal(await p.locator('[data-label-expression]').textContent(),'P = 4*5 = 20');
  await input.press('Enter');
  assert.equal(await p.evaluate(()=>items.find(o=>o.type==='force').label),'P = 20');
  await p.evaluate(()=>editObjectLabel(items.find(o=>o.type==='force')));
  await input.fill('P = 4*7 = 20');
  assert.equal(await p.locator('[data-label-expression]').textContent(),'P = 4*7 = 28');
  await input.press('Tab');
  assert.equal(await p.evaluate(()=>items.find(o=>o.type==='force').label),'P = 28');
  await p.evaluate(()=>editObjectLabel(items.find(o=>o.type==='force')));
  assert.equal(await input.inputValue(),'P = 4*7 = 28');await input.press('Escape');
  const stroke=await p.evaluate(()=>{
   const o=make('curve',100,100,undefined,undefined,{curvePoints:[{x:50,y:50},{x:100,y:0}]});
   items.push(o);render(true);return svg.querySelector(`[data-id="${o.id}"] path`).getAttribute('stroke-width');
  });assert.equal(stroke,'1');
  console.log('PASS F3, temporary pan preserves drawing/mode, live result/blur/reopen, thin curve export');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
