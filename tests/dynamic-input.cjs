const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:800,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('index.html')).href);await page.waitForFunction(()=>typeof showDynamicInput==='function');
  assert(await page.locator('#dynamicInput').isHidden());
  await page.evaluate(()=>{savedDocument=documentText();saveDraft();updateFileStatus()});
  const snapshot=()=>page.evaluate(()=>({document:documentText(),saved:savedDocument,draft:localStorage.getItem(draftKey),past:copy(past),future:copy(future),mode,snapOptions:copy(snapOptions),status:$('fileStatus').textContent}));
  const before=await snapshot();
  await page.evaluate(()=>showDynamicInput({clientX:200,clientY:200,value:'5.5',suffix:'m',focus:true}));
  assert(await page.locator('#dynamicInput').isVisible());assert.equal(await page.locator('#dynamicInputValue').inputValue(),'5.5');
  assert.equal(await page.locator('#dynamicInputSuffix').textContent(),'m');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'dynamicInputValue');
  assert.equal(await page.locator('#dynamicInputValue').getAttribute('inputmode'),'decimal');
  await page.locator('#dynamicInputValue').fill('0.25');assert.equal(await page.evaluate(()=>getDynamicInputValue()),'0.25');
  const old=await page.locator('#dynamicInput').boundingBox();
  await page.evaluate(()=>updateDynamicInput({clientX:400,clientY:300,suffix:'đơn vị nội lực'}));
  const moved=await page.locator('#dynamicInput').boundingBox();assert.notEqual(old.x,moved.x);assert.notEqual(old.y,moved.y);
  assert.equal(await page.evaluate(()=>getDynamicInputValue()),'0.25');
  const fits=async(left=0,top=0,width=800,height=900)=>{
   const box=await page.locator('#dynamicInput').boundingBox();assert(box.x>=left&&box.y>=top&&box.x+box.width<=left+width+.1&&box.y+box.height<=top+height+.1,JSON.stringify(box));
  };
  for(const [clientX,clientY]of [[799,899],[0,0],[-100,-100],[2000,2000]]){await page.evaluate(p=>updateDynamicInput(p),{clientX,clientY});await fits()}
  await page.setViewportSize({width:390,height:600});await fits(0,0,390,600);
  await page.evaluate(()=>updateDynamicInput({clientX:100,clientY:100,value:'110',suffix:''}));assert(await page.locator('#dynamicInputSuffix').isHidden());
  if(touch){await page.locator('#dynamicInputValue').evaluate(el=>el.blur());await page.locator('#dynamicInputValue').tap();assert.equal(await page.evaluate(()=>document.activeElement.id),'dynamicInputValue')}
  // Simulate a zoomed/panned visual viewport and virtual-keyboard resize.
  await page.evaluate(()=>{
   hideDynamicInput();const vv=new EventTarget();Object.assign(vv,{width:250,height:180,offsetLeft:35,offsetTop:50});
   Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});
   showDynamicInput({clientX:280,clientY:220,value:'5.5',suffix:'m',focus:true});
  });await fits(35,50,250,180);
  await page.evaluate(()=>{visualViewport.height=100;visualViewport.dispatchEvent(new Event('resize'))});await fits(35,50,250,100);
  await page.evaluate(()=>{hideDynamicInput();delete window.visualViewport;showDynamicInput({clientX:380,clientY:590})});await fits(0,0,390,600);
  await page.evaluate(()=>hideDynamicInput());assert(await page.locator('#dynamicInput').isHidden());assert.notEqual(await page.evaluate(()=>document.activeElement.id),'dynamicInputValue');
  assert.deepEqual(await snapshot(),before);assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS Dynamic Input show/hide/value/suffix/focus/update, decimal/touch, viewport edges/resize/zoom offsets/fallback, unchanged document/history/draft/dirty state');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
