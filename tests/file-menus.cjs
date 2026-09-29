const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1360,height:950},acceptDownloads:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 for(const [menu,ids]of [['fileToolbar',['clear','open','save','saveAs']],['editToolbar',['undo','redo','copyObjects','pasteObjects','editSelected','delete']],['exportToolbar',['svg','png']]]){
  for(const id of ids){assert.equal(await p.locator('#'+id).count(),1);assert.equal(await p.locator('#'+menu+' #'+id).count(),1)}
 }
 assert.equal(await p.locator('#viewTools #finishHatch').count(),0);assert.equal(await p.locator('#drawingTools #hatchMethod').count(),1);
 assert.equal(await p.locator('#editMenu').getAttribute('open'),null);
 let dl=p.waitForEvent('download');await p.locator('#svg').click();assert.equal((await dl).suggestedFilename(),'ket-cau.svg');
 dl=p.waitForEvent('download');await p.locator('#png').click();assert.equal((await dl).suggestedFilename(),'ket-cau.png');
 await p.locator('#editSelected').click();assert.equal(await p.evaluate(()=>mode),'labelEdit');assert.equal(await p.locator('#editMenu').getAttribute('open'),null);
 await p.keyboard.press('Escape');
 // File picker handles are mocked; all data stays in memory, never overwriting real files.
 await p.evaluate(()=>{
  window.pickSaves=0;window.savedFiles={};
  window.makeTestHandle=name=>({name,getFile:async()=>new File([window.savedFiles[name]||''],name),createWritable:async()=>({write:async text=>{window.savedFiles[name]=text},close:async()=>{},abort:async()=>{}})});
  window.showSaveFilePicker=async()=>{window.pickSaves++;return window.makeTestHandle(window.pickSaves===1?'khung.json':'ban-sao.json')};
 });
 await p.keyboard.press('Control+s');await p.waitForFunction(()=>documentName==='khung.json');assert.equal(await p.evaluate(()=>window.pickSaves),1);
 await p.evaluate(()=>{items[0].label='Changed';render()});assert.match(await p.locator('#fileStatus').textContent(),/Chưa lưu/);
 await p.keyboard.press('Control+s');await p.waitForFunction(()=>savedDocument===documentText());assert.equal(await p.evaluate(()=>window.pickSaves),1);
 await p.keyboard.press('Control+Shift+s');await p.waitForFunction(()=>documentName==='ban-sao.json');assert.equal(await p.evaluate(()=>window.pickSaves),2);
 await p.keyboard.press('Control+o');await p.evaluate(async()=>listCandidates([{name:'khung.json',handle:window.makeTestHandle('khung.json')}]));await p.locator('#drawingFileList button').click();await p.waitForFunction(()=>!document.getElementById('confirmOpenDrawing').disabled);await p.locator('#confirmOpenDrawing').click();await p.waitForFunction(()=>documentName==='khung.json');
 // Cancel external-change overwrite: disk remains untouched and document remains dirty.
 await p.evaluate(()=>{window.savedFiles['khung.json']='external';items[0].label='new change';render()});
 p.once('dialog',d=>d.dismiss());await p.keyboard.press('Control+s');await p.waitForFunction(()=>!fileBusy);
 assert.equal(await p.evaluate(()=>window.savedFiles['khung.json']),'external');assert.notEqual(await p.evaluate(()=>savedDocument),await p.evaluate(()=>documentText()));
 // Cancel New keeps current document.
 const before=await p.evaluate(()=>documentText());p.once('dialog',d=>d.dismiss());await p.locator('#clear').click();assert.equal(await p.evaluate(()=>documentText()),before);
 
 await p.setViewportSize({width:390,height:844});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('PASS unique toolbar commands, export downloads, mode activation, Save/Save As/Open mocked handles, conflict/cancel protection, mobile layout');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
