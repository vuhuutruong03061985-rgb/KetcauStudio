const {chromium}=require('../.test-tools/node_modules/playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage();p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginLoadReference==='function');
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},{x,y});
 const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const seed=async(bars,span=[200,300,400,300])=>{await p.evaluate(bars=>{setMode('select');items=bars.map((b,i)=>make('bar',...b,{id:'b'+i}));past=[];future=[];selected=null;snapEnabled=false;setMode('udl')},bars);await tap(span[0],span[1]);await tap(span[2],span[3])};
 const input=p.locator('#dynamicInputValue');
 const body=()=>p.locator('g[data-id]').last().locator('line[marker-end]').evaluateAll(ls=>ls.map(l=>Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(l.getAttribute(k))]))));
 for(const [bar,base]of [[[100,300,500,300],-90],[[500,300,100,300],-90],[[300,100,300,500],0],[[100,100,500,500],-45]])for(const span of [[200,300,400,300],[300,200,300,400],[200,200,400,400]])for(const angle of [0,90,-90,180,30]){
  await seed([bar],span);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b0');
  await input.fill(String(angle));await input.press('Enter');const item=await p.evaluate(()=>items.at(-1));const global=base+angle;near(item.loadAngle,((90-global)%360+360)%360);assert(!('referenceBarId'in item));assert(!('referenceCandidates'in item));assert(!('uiAngle'in item));assert.equal(await p.evaluate(()=>past.length),1);
  const lines=await body(),r=global*Math.PI/180;lines.forEach((l,i)=>{const t=i/(lines.length-1);near(l.x2,span[0]+t*(span[2]-span[0]));near(l.y2,span[1]+t*(span[3]-span[1]));near(l.x1-l.x2,-55*Math.sin(r));near(l.y1-l.y2,55*Math.cos(r))});
 }
 const bars=[[100,300,500,300],[300,100,300,500]];
 for(const locked of [false,true]){
  await seed(bars);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b0');
  if(locked)await input.fill('30');else{const q=await screen(500,500);await p.mouse.move(q.x,q.y);near(Number(await input.inputValue()),45)}
  const before=await p.evaluate(()=>loadPlacement.globalPlacementAngle);
  await tap(300,330);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b1');
  near(await p.evaluate(()=>loadPlacement.globalPlacementAngle),locked?30:before);near(Number(await input.inputValue()),locked?30:before);
  near(Number(await p.locator('[data-load-reference]').getAttribute('x1')),300);
 }
 await seed(bars,[300,200,300,400]);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b1');
 await seed(bars,[200,200,400,400]);await p.evaluate(()=>{loadPlacement.a={x:200,y:200};loadPlacement.b={x:400,y:400};beginLoadReference();render()});assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),null);await tap(330,300);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b0');assert.equal(await p.evaluate(()=>items.length),2);
 await seed(bars);await p.evaluate(()=>{snapEnabled=true;snapOptions.member=true});const q=await screen(300,330);await p.mouse.move(q.x,q.y);assert(await p.locator('.reference-override').count()>0);await tap(300,330);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b1');
 await seed([bars[0]]);await tap(500,500);near(await p.evaluate(()=>items.at(-1).loadAngle),135);
 await seed([bars[0]]);await input.fill('30');await p.evaluate(()=>{items=[];render()});near(Number(await input.inputValue()),-60);await input.press('Enter');near(await p.evaluate(()=>items[0].loadAngle),150);
 await seed([]);await input.fill('30');await input.press('Enter');near(await p.evaluate(()=>items[0].loadAngle),60);
 for(const action of ['escape','undo','redo','select','tool','new','open','rollback','pointercancel']){
  await seed([bars[0]]);if(action==='escape')await p.keyboard.press('Escape');else await p.evaluate(action=>{if(action==='undo'||action==='redo')actions[action][1]();if(action==='select')activateSelection();if(action==='tool')setMode('bar');if(action==='new'){savedDocument=documentText();newDocument()}if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1}))},action);
  assert.equal(await p.evaluate(()=>loadPlacement),null);assert.equal(await p.locator('[data-load-reference]').count(),0);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);
 }
 console.log(`PASS UDL reference ${touch?'touch':'mouse'}: all span/reference directions, reversal, numeric geometry, default/tie, LIVE/LOCKED override, marker, tap, fallback and cleanup`);await context.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
