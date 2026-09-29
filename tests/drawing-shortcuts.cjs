const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
  for(const [key,tool] of [['t','bar'],['l','thin'],['d','dashed'],['c','curve'],['k','dim'],['T','bar']]){
   await p.keyboard.press(key);assert.equal(await p.evaluate(()=>mode),tool);
  }
  await p.keyboard.press('t');assert.equal(await p.evaluate(()=>mode),'text');
  await p.keyboard.press('Escape');
  await p.keyboard.down('t');await p.keyboard.down('t');await p.keyboard.up('t');
  assert.equal(await p.evaluate(()=>mode),'bar');
  await p.evaluate(()=>{lastToolT=performance.now()-800});
  await p.keyboard.press('t');assert.equal(await p.evaluate(()=>mode),'bar');
  await p.locator('[data-mode="select"]').click();await p.keyboard.press('t');
  assert.equal(await p.evaluate(()=>mode),'bar');
  await p.keyboard.press('Escape');await p.keyboard.press('Control+l');
  assert.equal(await p.evaluate(()=>mode),'select');
  await p.evaluate(()=>{editObjectLabel(items.find(o=>o.type==='force'))});
  const input=p.getByRole('textbox',{name:'Sửa nhãn trên hình'});
  await input.fill('');await input.pressSequentially('tl d c tt k');
  assert.equal(await input.inputValue(),'tl d c tt k');assert.equal(await p.evaluate(()=>mode),'select');
  await input.press('Escape');
  assert.match(await p.locator('[data-mode="text"]').getAttribute('title'),/TT/);
  assert.deepEqual(errors,[]);console.log('PASS drawing shortcuts, TT timing/repeat/reset, modifiers, label typing, tooltips');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
