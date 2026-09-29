const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:900,height:1000}}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof cancelDynamicInput==='function');
  await p.evaluate(()=>{window.results=[];window.cancels=0;savedDocument=documentText();saveDraft();updateFileStatus()});
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),saved:savedDocument,draft:localStorage.getItem(draftKey),past:copy(past),future:copy(future),snap:snapEnabled,mode,status:$('fileStatus').textContent}));const before=await snapshot();
  const show=value=>p.evaluate(value=>showDynamicInput({clientX:200,clientY:200,value,focus:true,onConfirm:n=>results.push(n),onCancel:()=>cancels++}),value);
  for(const value of ['5','5.5','0.25','110','-3','0']){await show(value);await p.keyboard.press('Enter');assert(await p.locator('#dynamicInput').isHidden())}
  assert.deepEqual(await p.evaluate(()=>results),[5,5.5,.25,110,-3,0]);
  for(const value of ['', ' ', 'NaN','Infinity','1e400','abc','5+2','1/3']){await show(value);await p.keyboard.press('Enter');assert(await p.locator('#dynamicInput').isVisible());assert.equal(await p.locator('#dynamicInputValue').getAttribute('aria-invalid'),'true')}
  assert.equal(await p.evaluate(()=>results.length),6);
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>cancels),1);assert(await p.locator('#dynamicInput').isHidden());
  await show('1');await p.evaluate(()=>cancelDynamicInput());assert.equal(await p.evaluate(()=>cancels),2);
  await show('2');await p.evaluate(()=>hideDynamicInput());assert.equal(await p.evaluate(()=>cancels),2);assert.equal(await p.evaluate(()=>results.length),6);
  await show('12');await p.keyboard.press('End');await p.keyboard.press('Backspace');assert.equal(await p.evaluate(()=>getDynamicInputValue()),'1');await p.keyboard.press('Home');await p.keyboard.press('Delete');assert.equal(await p.evaluate(()=>getDynamicInputValue()),'');
  await p.evaluate(()=>hideDynamicInput());
  if(await p.locator('#drawingScales').isHidden())await p.locator('#drawingScalesToggle').click();await p.locator('#geometryScale').focus();await show('7');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'geometryScale');
  await p.evaluate(()=>showDynamicInput({value:'8',focus:false}));assert.equal(await p.evaluate(()=>document.activeElement.id),'geometryScale');await p.keyboard.press('Enter');assert(await p.locator('#dynamicInput').isVisible());await p.evaluate(()=>hideDynamicInput());
  await show('9');await p.evaluate(()=>showDynamicInput({value:'10',focus:true}));await p.keyboard.press('Enter');assert.deepEqual(await p.evaluate(()=>results),[5,5.5,.25,110,-3,0,7]);
  for(let i=0;i<15;i++){await show('3');await p.evaluate(()=>hideDynamicInput())}await show('4');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>results.filter(n=>n===4).length),1);
  await show('5.5');const confirm=p.locator('#dynamicInput button[aria-label="Xác nhận"]');if(touch)await confirm.tap();else await confirm.click();assert.equal(await p.evaluate(()=>results.at(-1)),5.5);
  await show('2');const cancel=p.locator('#dynamicInput button[aria-label="Hủy"]');if(touch)await cancel.tap();else await cancel.click();assert.equal(await p.evaluate(()=>cancels),3);
  await show('6');await p.locator('#dynamicInputValue').dispatchEvent('keydown',{key:'Enter',isComposing:true});assert(await p.locator('#dynamicInput').isVisible());await p.evaluate(()=>hideDynamicInput());
  assert.deepEqual(await snapshot(),before);
  await p.keyboard.press('F3');assert.equal(await p.evaluate(()=>snapEnabled),!before.snap);await p.keyboard.press('F3');assert.equal(await p.evaluate(()=>snapEnabled),before.snap);
  if(await p.locator('#drawingScales').isHidden())await p.locator('#drawingScalesToggle').click();await p.locator('#geometryScale').focus();await p.keyboard.press('Control+a');await p.keyboard.type('80');assert.equal(await p.locator('#geometryScale').inputValue(),'80');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log('PASS lifecycle desktop/touch: numeric confirm, validation, cancel, native editing, focus, session cleanup, hidden shortcuts, unchanged drawing state');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
