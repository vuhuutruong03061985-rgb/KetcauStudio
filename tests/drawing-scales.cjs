const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',d=>d.accept());
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.waitForFunction(()=>typeof documentText==='function');
  const scales=()=>page.evaluate(()=>[geometryScale,internalForceScale]);
  assert.deepEqual(await scales(),[100,10]);
  const original=await page.evaluate(()=>JSON.parse(documentText()));
  await page.evaluate(()=>{geometryScale=250;internalForceScale=2.5;newDocument()});
  assert.deepEqual(await scales(),[100,10]);
  assert.deepEqual(await page.evaluate(()=>items),[]);
  const custom={...original,geometryScale:250,internalForceScale:2.5};
  const open=async data=>page.evaluate(async data=>{
   await loadDocument(new File([JSON.stringify(data)],'scales.json'));
  },data);
  await open(custom);
  assert.deepEqual(await scales(),[250,2.5]);
  const beforePreview=await page.evaluate(()=>documentText());
  await page.evaluate(async original=>{
   await selectCandidate({name:'preview.json',file:new File([JSON.stringify(original)],'preview.json')});
  },original);
  assert.equal(await page.evaluate(()=>$('confirmOpenDrawing').disabled),false);
  assert.equal(await page.evaluate(()=>documentText()),beforePreview);
  await assert.rejects(()=>open({...custom,items:null}));
  assert.equal(await page.evaluate(()=>documentText()),beforePreview);
  // Exercise Save and Save As with an in-memory file handle.
  await page.evaluate(()=>{
   window.scaleDisk='';
   window.showSaveFilePicker=async()=>({name:'scales.json',
    getFile:async()=>new File([window.scaleDisk],'scales.json'),
    createWritable:async()=>({write:async text=>{window.scaleDisk=text},close:async()=>{},abort:async()=>{}})});
  });
  assert.equal(await page.evaluate(()=>saveDocument()),true);
  const saved=await page.evaluate(()=>JSON.parse(window.scaleDisk));
  assert.deepEqual(saved,custom);
  await page.evaluate(()=>newDocument());
  await open(saved);
  assert.deepEqual(await scales(),[250,2.5]);
  assert.deepEqual(await page.evaluate(()=>items),original.items);
  assert.equal(await page.evaluate(()=>saveDocument(true)),true);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(window.scaleDisk)),custom);
  // Draft recovery must preserve per-document metadata as well as objects.
  await page.evaluate(()=>saveDraft());
  await page.reload();
  await page.waitForFunction(()=>typeof documentText==='function');
  assert.deepEqual(await scales(),[250,2.5]);
  assert.deepEqual(await page.evaluate(()=>items),original.items);
  const legacy={...original};delete legacy.geometryScale;delete legacy.internalForceScale;
  await page.locator('#file').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
  await page.waitForFunction(()=>documentName==='legacy.json');
  assert.deepEqual(await scales(),[100,10]);
  assert.deepEqual(await page.evaluate(()=>items),original.items);
  // Invalid fields fall back independently without rejecting the document.
  for(const invalid of [null,'250',true,0,-1,[],{}]){
   await open({...custom,geometryScale:invalid});
   assert.deepEqual(await scales(),[100,2.5]);
   await open({...custom,internalForceScale:invalid});
   assert.deepEqual(await scales(),[250,10]);
   assert.deepEqual(await page.evaluate(()=>items),original.items);
  }
  // NaN/Infinity are not JSON literals; overflow is valid JSON yielding Infinity.
  await page.evaluate(async legacy=>{
   const text=JSON.stringify(legacy).replace('"version":1','"version":1,"geometryScale":1e400,"internalForceScale":-1e400');
   await loadDocument(new File([text],'overflow.json'));
  },legacy);
  assert.deepEqual(await scales(),[100,10]);
  assert.deepEqual(await page.evaluate(()=>{
   return [NaN,Infinity,-Infinity,undefined].map(value=>{
    restoreDrawingScales({geometryScale:value,internalForceScale:value});
    return [geometryScale,internalForceScale];
   });
  }),Array(4).fill([100,10]));
  // Old drafts recover with defaults even after a custom document was open.
  await page.evaluate(legacy=>localStorage.setItem(draftKey,JSON.stringify(legacy)),legacy);
  await page.reload();
  await page.waitForFunction(()=>typeof documentText==='function');
  assert.deepEqual(await scales(),[100,10]);
  assert.deepEqual(await page.evaluate(()=>items),original.items);
  assert.deepEqual(errors,[]);
  console.log('PASS drawing defaults, Save/Save As/load, legacy import/drafts, invalid scales, unchanged objects');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
