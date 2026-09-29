const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const p=await browser.newPage({viewport:{width:1200,height:1000},hasTouch:touch,isMobile:touch}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
  await p.evaluate(()=>{items=[];past=[];future=[];setMode('select');snapEnabled=false});
  if(!touch){
   for(const [key,tool]of [['l','thin'],['d','dashed'],['c','curve'],['k','dim']]){await p.keyboard.press(key);assert.equal(await p.evaluate(()=>mode),tool)}
   await p.keyboard.press('t');assert.equal(await p.evaluate(()=>mode),'bar');
   await p.evaluate(()=>lastToolT=performance.now()-701);await p.keyboard.press('t');assert.equal(await p.evaluate(()=>mode),'bar');
   await p.keyboard.press('t');assert.equal(await p.evaluate(()=>mode),'text');
  }else await p.locator('[data-mode="text"]').tap();
  const q=await p.evaluate(()=>{const q=new DOMPoint(400,300).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});
  if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
  const input=p.getByRole('textbox',{name:'Sửa nhãn trên hình'});
  assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),1);
  assert(await input.evaluate(e=>e===document.activeElement));
  const original=await p.evaluate(()=>copy(items));await p.keyboard.type('New text');await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>items[0].label),'New text');assert.equal(await p.evaluate(()=>past.length),2);
  await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items)),original);
  await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items.length),0);
  await p.evaluate(()=>{actions.redo[1]();actions.redo[1]();items[0].strokeColor='#123456';selected=items[0].id;render()});
  await p.keyboard.press('Alt+s');assert.equal(await p.evaluate(()=>mode),'labelEdit');assert(await input.evaluate(e=>e===document.activeElement));
  const n=await p.evaluate(()=>past.length);await input.press('Enter');assert.equal(await p.evaluate(()=>past.length),n);
  await p.keyboard.press('Alt+s');await input.fill('Changed');await input.press('Enter');assert.equal(await p.evaluate(()=>items[0].strokeColor),'#123456');
  await p.keyboard.press('Escape');await p.locator('[data-mode="text"]').click();
  if(touch)await p.touchscreen.tap(q.x+90,q.y);else await p.mouse.click(q.x+90,q.y);
  const beforeCancel=await p.evaluate(()=>copy(items)),history=await p.evaluate(()=>past.length);
  assert(!Object.hasOwn(beforeCancel[1],'strokeColor'));await input.fill('Discard');await input.press('Escape');
  assert.deepEqual(await p.evaluate(()=>copy(items)),beforeCancel);assert.equal(await p.evaluate(()=>past.length),history);
  // Alt+S still uses the generic persistent label editor for every supported type.
  for(const type of ['force','moment','udl','dim','diagramM','diagramQ','diagramN']){
   await p.evaluate(type=>{items=[make(type,300,300,500,300)];setMode('select');selected=items[0].id;render()},type);
   await p.keyboard.press('Alt+s');assert.equal(await p.evaluate(()=>mode),'labelEdit');await input.fill('Label');await input.press('Enter');assert.equal(await p.evaluate(()=>items[0].label),'Label');
  }
  assert.deepEqual(errors,[]);await p.close();console.log('PASS Text placement '+(touch?'emulated touch':'mouse/TT')+': focus, typing, confirm/cancel, history, color and generic Alt+S');
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
