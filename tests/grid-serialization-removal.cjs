const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
function current(doc){assert.equal(doc.version,1);assert(!Object.hasOwn(doc,'grid'));assert(!Object.hasOwn(doc,'gridSize'));}
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext(),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
 const url=pathToFileURL(path.resolve('index.html')).href;await p.goto(url);await p.waitForFunction(()=>typeof documentText==='function');
 const original=await p.evaluate(()=>JSON.parse(documentText()));current(original);
 const legacy={...original,grid:true,gridSize:20,geometryScale:100,internalForceScale:10,legacyExtra:'ignored'};
 await p.evaluate(async data=>{
  window.diskText=JSON.stringify(data);window.writeCount=0;
  window.memoryHandle={name:'legacy.json',getFile:async()=>new File([diskText],'legacy.json'),createWritable:async()=>({write:async text=>{diskText=text;writeCount++},close:async()=>{},abort:async()=>{}})};
  await selectCandidate({name:'legacy.json',file:await memoryHandle.getFile()});
 },legacy);
 assert.equal(await p.evaluate(()=>$('confirmOpenDrawing').disabled),false);assert.deepEqual(await p.evaluate(()=>JSON.parse(documentText())),original);
 await p.evaluate(async()=>loadDocument(await memoryHandle.getFile(),memoryHandle));
 assert.equal(await p.evaluate(()=>writeCount),0);assert.deepEqual(await p.evaluate(()=>JSON.parse(diskText)),legacy);
 assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);assert.equal(await p.evaluate(()=>document.title.startsWith('*')),false);
 assert.deepEqual(await p.evaluate(()=>items),original.items);assert.deepEqual(await p.evaluate(()=>[geometryScale,internalForceScale]),[100,10]);
 assert.deepEqual(await p.evaluate(()=>[typeof grid,gridVisible,gridSize]),['undefined',false,50]);
 await p.evaluate(()=>{items[0].x+=1;render()});assert.equal(await p.evaluate(()=>savedDocument===documentText()),false);
 await p.evaluate(async()=>loadDocument(await memoryHandle.getFile(),memoryHandle));
 await p.evaluate(()=>{geometryScale=250;render()});assert.equal(await p.evaluate(()=>savedDocument===documentText()),false);
 await p.evaluate(async()=>loadDocument(await memoryHandle.getFile(),memoryHandle));
 await p.evaluate(()=>window.showSaveFilePicker=async()=>memoryHandle);
 assert.equal(await p.evaluate(()=>saveDocument()),true);const saved=await p.evaluate(()=>JSON.parse(diskText));current(saved);assert.deepEqual(saved.items,original.items);assert.equal(saved.geometryScale,100);assert.equal(saved.internalForceScale,10);
 assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);
 await p.evaluate(async data=>loadDocument(new File([JSON.stringify(data)],'current.json')),saved);assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);
 assert.equal(await p.evaluate(()=>saveDocument(true)),true);current(await p.evaluate(()=>JSON.parse(diskText)));
 await p.evaluate(()=>saveDraft());current(await p.evaluate(()=>JSON.parse(localStorage.getItem(draftKey))));
 // Fresh contexts prevent unload autosave from replacing the draft under test.
 for(const extra of [{},{grid:true,gridSize:20},{grid:null,gridSize:'invalid'},{grid:{old:true},gridSize:-1}]){
  const c=await browser.newContext(),tab=await c.newPage();tab.on('pageerror',e=>errors.push(e.message));
  const draft={...original,geometryScale:250,internalForceScale:2.5,...extra};
  await tab.addInitScript(d=>localStorage.setItem('ket-cau-studio-last-drawing-v1',JSON.stringify(d)),draft);
  await tab.goto(url);await tab.waitForFunction(()=>typeof documentText==='function');
  const doc=await tab.evaluate(()=>JSON.parse(documentText()));current(doc);assert.deepEqual(doc.items,draft.items);assert.equal(doc.geometryScale,250);assert.equal(doc.internalForceScale,2.5);
  assert.deepEqual(await tab.evaluate(()=>[typeof grid,gridVisible,gridSize]),['undefined',false,50]);
  await tab.evaluate(()=>saveDraft());current(await tab.evaluate(()=>JSON.parse(localStorage.getItem(draftKey))));await c.close();
 }
 for(const extra of [{grid:false,gridSize:99},{grid:[],gridSize:null}]){
  await p.evaluate(async data=>{validate(data);await loadDocument(new File([JSON.stringify(data)],'old.json'))},{...legacy,...extra});
  assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);assert.deepEqual(await p.evaluate(()=>items),original.items);
 }
 assert.deepEqual(errors,[]);console.log('PASS current JSON/draft without grid, legacy/invalid grid ignored, clean Open/no disk writes, real edits dirty, Save/Save As, preview, scales, exact geometry and v1');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
