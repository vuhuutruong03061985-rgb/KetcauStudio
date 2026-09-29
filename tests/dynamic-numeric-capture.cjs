const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const c=await b.newContext({hasTouch:touch,viewport:{width:1000,height:1000}}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof armDynamicNumericInput==='function');
  await p.evaluate(()=>{window.values=[];window.cancels=0;savedDocument=documentText();saveDraft();updateFileStatus()});
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),saved:savedDocument,draft:localStorage.getItem(draftKey),past:copy(past),future:copy(future),mode,snapEnabled,snapOptions:copy(snapOptions),status:$('fileStatus').textContent}));const before=await snapshot();
  const arm=()=>p.evaluate(()=>{document.activeElement.blur();armDynamicNumericInput({clientX:100,clientY:100,suffix:'unit',initialValue:'110',onConfirm:n=>values.push(n),onCancel:()=>cancels++})});
  await p.keyboard.type('5');assert(await p.locator('#dynamicInput').isHidden());
  for(const text of ['5','5.5','-5.5','0.25','5,5','.5',',5']){
   await arm();await p.keyboard.type(text);assert.equal(await p.locator('#dynamicInputValue').inputValue(),text);await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);
  }
  assert.deepEqual(await p.evaluate(()=>values),[5,5.5,-5.5,.25,5.5,.5,.5]);
  await arm();await p.keyboard.type('2');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>cancels),1);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);
  await arm();await p.evaluate(()=>disarmDynamicNumericInput());assert.equal(await p.evaluate(()=>cancels),1);
  // Every editor retains native typing while armed, including nested contenteditable targets.
  for(const tag of ['input','textarea','select','div']){
   await arm();await p.evaluate(tag=>{const el=document.createElement(tag);el.id='captureOther';if(tag==='div'){el.contentEditable='true';el.innerHTML='<span>text</span>'}if(tag==='select')el.innerHTML='<option>5</option>';document.body.append(el);el.focus()},tag);
   await p.keyboard.type('5');assert(await p.locator('#dynamicInput').isHidden());
   if(tag!=='select')assert((await p.locator('#captureOther').evaluate(el=>el.value??el.textContent)).includes('5'));
   await p.locator('#captureOther').evaluate(el=>el.remove());await p.evaluate(()=>disarmDynamicNumericInput());
  }
  await arm();for(const key of ['Control+5','Alt+5','Meta+5']){await p.keyboard.press(key);assert(await p.locator('#dynamicInput').isHidden())}
  await p.evaluate(()=>document.body.dispatchEvent(new KeyboardEvent('keydown',{key:'5',bubbles:true,isComposing:true})));assert(await p.locator('#dynamicInput').isHidden());
  await p.evaluate(()=>updateDynamicNumericInputAnchor(300,250));await p.keyboard.type('5');let box=await p.locator('#dynamicInput').boundingBox();assert.equal(box.x,316);assert.equal(box.y,266);
  await p.evaluate(()=>updateDynamicNumericInputAnchor(400,350));box=await p.locator('#dynamicInput').boundingBox();assert.equal(box.x,416);assert.equal(box.y,366);
  await p.evaluate(()=>disarmDynamicNumericInput());assert(await p.locator('#dynamicInput').isHidden());
  for(let i=0;i<20;i++){await arm();await p.evaluate(()=>disarmDynamicNumericInput())}
  await arm();await p.evaluate(()=>{window.oldCalls=0;armDynamicNumericInput({onConfirm:()=>oldCalls++,onCancel:()=>oldCalls++})});await arm();await p.keyboard.type('123');assert.equal(await p.locator('#dynamicInputValue').inputValue(),'123');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>oldCalls),0);assert.equal(await p.evaluate(()=>values.filter(n=>n===123).length),1);
  // Touch launcher exists only in the test: future workflows call the same API from a gesture.
  await arm();await p.evaluate(()=>{const button=document.createElement('button');button.id='captureLaunch';button.textContent='Open';button.onclick=()=>openArmedDynamicInput();document.body.append(button)});
  if(touch)await p.locator('#captureLaunch').tap();else await p.locator('#captureLaunch').click();
  assert.equal(await p.locator('#dynamicInputValue').inputValue(),'110');assert.equal(await p.evaluate(()=>document.activeElement.id),'dynamicInputValue');
  const confirm=p.locator('#dynamicInput button').first();if(touch)await confirm.tap();else await confirm.click();assert.equal(await p.evaluate(()=>values.at(-1)),110);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);
  await arm();await p.evaluate(()=>openArmedDynamicInput());const cancel=p.locator('#dynamicInput button').last();if(touch)await cancel.tap();else await cancel.click();assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);
  for(const text of ['5,5.5','5,,5']){await arm();await p.keyboard.type(text);await p.keyboard.press('Enter');assert(await p.locator('#dynamicInput').isVisible());await p.evaluate(()=>disarmDynamicNumericInput())}
  // Disarming never closes an unrelated direct component session.
  await arm();await p.evaluate(()=>{showDynamicInput({value:'9'});disarmDynamicNumericInput()});assert(await p.locator('#dynamicInput').isVisible());await p.evaluate(()=>hideDynamicInput());
  assert.deepEqual(await snapshot(),before);
  for(const armed of [false,true]){if(armed)await arm();await p.evaluate(()=>document.activeElement.blur());await p.keyboard.press('F3');assert.equal(await p.evaluate(()=>snapEnabled),!before.snapEnabled);await p.keyboard.press('F3');assert.equal(await p.evaluate(()=>snapEnabled),before.snapEnabled);await p.evaluate(()=>disarmDynamicNumericInput())}
  assert.deepEqual(errors,[]);await c.close();
 }
 console.log('PASS numeric capture desktop/touch: gating, decimal/comma/negative, native editing, lifecycle, ownership, anchor, callbacks, shortcuts, unchanged document/draft/history/scales/snap');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
