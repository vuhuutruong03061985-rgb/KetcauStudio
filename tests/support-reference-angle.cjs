const {chromium}=require('../.test-tools/node_modules/playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof supportReferenceFrame==='function');
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},{x,y});
 const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const seed=async(bars,subtype='pin')=>{await p.evaluate(({bars,subtype})=>{setMode('select');items=bars.map((b,i)=>make('bar',...b,{id:'b'+i}));past=[];future=[];selected=null;snapEnabled=false;$('support').value=subtype;setMode('support')},{bars,subtype});await tap(300,300)};
 const input=p.locator('#dynamicInputValue');
 for(const subtype of ['pin','roller','fixed','pin-plain','roller-plain'])for(const [bar,base]of [[[200,300,500,300],-90],[[500,300,200,300],-90],[[300,200,300,500],0],[[200,200,500,500],-45]])for(const angle of [0,90,-90,180,30]){
  await seed([bar],subtype);assert.equal(await p.evaluate(()=>supportPlacementSession.referenceBarId),'b0');assert.equal(await p.locator('[data-support-reference]').count(),1);
  await input.fill(String(angle));await input.press('Enter');const item=await p.evaluate(()=>items.at(-1));near(item.supportAngle,((base+angle+540)%360)-180===-180?180:((base+angle+540)%360)-180);assert.equal(item.support,subtype);assert(!('referenceBarId'in item));assert.equal(await p.locator('[data-support-reference]').count(),0);
 }
 const bars=[[200,300,500,300],[300,200,300,500]];
 for(const locked of [false,true]){
  await seed(bars);await tap(330,300);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>supportPlacementSession.referenceBarId),'b0');
  if(locked)await input.fill('30');else{const q=await screen(420,430);await p.mouse.move(q.x,q.y)}
  const before=await p.evaluate(()=>supportPlacementSession.previewAngle);
  await tap(300,330);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>supportPlacementSession.referenceBarId),'b1');
  if(locked){near(await p.evaluate(()=>supportPlacementSession.previewAngle),30);near(Number(await input.inputValue()),30)}else near(await p.evaluate(()=>supportPlacementSession.previewAngle),before);
  const coords=await p.locator('[data-support-reference]').getAttribute('x1');near(Number(coords),300);
  await p.keyboard.press('Escape');assert.equal(await p.locator('[data-support-reference]').count(),0);
 }
 await seed(bars);await tap(330,300);
 await p.evaluate(()=>{snapEnabled=true;snapOptions.member=true});
 const markerPoint=await screen(300,330);await p.mouse.move(markerPoint.x,markerPoint.y);
 assert(await p.locator('.reference-override').count()>0);await tap(300,330);assert.equal(await p.evaluate(()=>supportPlacementSession.referenceBarId),'b1');
 for(const action of ['undo','redo','select','tool','new','open','rollback','pointercancel']){
  await seed([[200,300,500,300]]);
  await p.evaluate(action=>{if(action==='undo'||action==='redo')actions[action][1]();if(action==='select')activateSelection();if(action==='tool')setMode('bar');if(action==='new'){savedDocument=documentText();newDocument()}if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1}))},action);
  assert.equal(await p.evaluate(()=>supportPlacementSession),null,action);assert.equal(await p.locator('[data-support-reference]').count(),0,action);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false,action);
 }
 await seed([[200,300,500,300]]);await tap(450,450);near(await p.evaluate(()=>items.at(-1).supportAngle),-45);
 await seed([[200,300,500,300]]);await input.fill('30');await p.evaluate(()=>{items=[];render()});assert.equal(await p.locator('[data-support-reference]').count(),0);assert.equal(await p.evaluate(()=>supportPlacementSession.referenceBarId),null);
 await seed([]);await input.fill('30');await input.press('Enter');near(await p.evaluate(()=>items[0].supportAngle),30);
 console.log(`PASS support reference ${touch?'touch':'mouse'}: five subtypes, local cardinal/diagonal/reversal, LIVE/LOCKED override, no commit on switch, highlight, fallback and fresh tap`);await context.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
