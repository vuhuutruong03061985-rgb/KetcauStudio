const {chromium}=require('../.test-tools/node_modules/playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const touch of [false,true]){
 const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof loadReferenceFrame==='function');
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},{x,y});
 const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const seed=async(bars,subtype='force')=>{await p.evaluate(({bars,subtype})=>{setMode('select');items=bars.map((b,i)=>make('bar',...b,{id:'b'+i}));past=[];future=[];selected=null;snapEnabled=false;currentMomentRotation='cw';setMode(subtype)},{bars,subtype});await tap(300,300)};
 const input=p.locator('#dynamicInputValue');
 for(const subtype of ['force','moment'])for(const [bar,base]of [[[200,300,500,300],-90],[[500,300,200,300],-90],[[300,200,300,500],0],[[200,200,500,500],-45]])for(const angle of [0,90,-90,180,30]){
  await seed([bar],subtype);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b0');assert.equal(await p.locator('[data-load-reference]').count(),1);
  await input.fill(String(angle));await input.press('Enter');const item=await p.evaluate(()=>items.at(-1));const global=base+angle,expected=(((subtype==='force'?90:Math.atan2(34,-18)*180/Math.PI)-global)%360+360)%360;near(item.loadAngle,expected);assert.equal(item.type,subtype);assert(!('referenceBarId'in item));assert.equal(await p.locator('[data-load-reference]').count(),0);
 }
 // Measure visible body vectors after local-angle conversion, for both moment senses.
 for(const type of ['force','moment'])for(const rotation of ['cw','ccw']){
  await seed([[200,300,500,300]],type);
  if(type==='moment')await p.evaluate(rotation=>{loadPlacement.rotation=rotation},rotation);
  await input.fill('30');await input.press('Enter');
  const vector=await p.evaluate(()=>{
   const o=items.at(-1),group=svg.querySelector(`g[data-id="${o.id}"]`);
   if(o.type==='force'){const l=group.querySelector('line[marker-end]');return{x:Number(l.getAttribute('x1'))-o.x,y:Number(l.getAttribute('y1'))-o.y}}
   const arc=group.querySelector('path[marker-end]'),q=arc.getPointAtLength(arc.getTotalLength()/2),m=arc.parentElement.transform.baseVal.consolidate().matrix;
   const point=new DOMPoint(q.x,q.y).matrixTransform(m);return{x:point.x-o.x,y:point.y-o.y};
  });
  const dx=Math.cos(Math.PI/6),dy=Math.sin(Math.PI/6);assert(vector.x*dx+vector.y*dy>0);assert(Math.abs(vector.x*dy-vector.y*dx)<.03);
 }
 const bars=[[200,300,500,300],[300,200,300,500]];
 for(const tool of ['force','moment'])for(const locked of [false,true]){
  await seed(bars,tool);await tap(330,300);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b0');
  if(locked)await input.fill('30');else{const q=await screen(420,430);await p.mouse.move(q.x,q.y)}
  const before=await p.evaluate(()=>loadPlacement.globalPlacementAngle);
  await tap(300,330);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b1');
  if(tool==='moment'){await p.evaluate(()=>render());assert.equal(await p.locator('[data-load-preview] path[marker-end]').count(),1)}
  if(locked){near(await p.evaluate(()=>loadPlacement.globalPlacementAngle),30);near(Number(await input.inputValue()),30)}else near(await p.evaluate(()=>loadPlacement.globalPlacementAngle),before);
  const coords=await p.locator('[data-load-reference]').getAttribute('x1');near(Number(coords),300);
  await p.keyboard.press('Escape');assert.equal(await p.locator('[data-load-reference]').count(),0);
 }
 await seed(bars);await tap(330,300);
 await p.evaluate(()=>{snapEnabled=true;snapOptions.member=true});
 const markerPoint=await screen(300,330);await p.mouse.move(markerPoint.x,markerPoint.y);
 assert(await p.locator('.reference-override').count()>0);await tap(300,330);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b1');
 for(const action of ['undo','redo','select','tool','new','open','rollback','pointercancel']){
  await seed([[200,300,500,300]]);
  await p.evaluate(action=>{if(action==='undo'||action==='redo')actions[action][1]();if(action==='select')activateSelection();if(action==='tool')setMode('bar');if(action==='new'){savedDocument=documentText();newDocument()}if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1}))},action);
  assert.equal(await p.evaluate(()=>loadPlacement),null,action);assert.equal(await p.locator('[data-load-reference]').count(),0,action);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false,action);
 }
 await seed([[200,300,500,300]]);await tap(450,450);near(await p.evaluate(()=>items.at(-1).loadAngle),135);
 await seed([[200,300,500,300]]);await input.fill('30');await p.evaluate(()=>{items=[];render()});assert.equal(await p.locator('[data-load-reference]').count(),0);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),null);
 await seed([]);await input.fill('30');await input.press('Enter');near(await p.evaluate(()=>items[0].loadAngle),60);
 console.log(`PASS force/moment reference ${touch?'touch':'mouse'}: both tools, local cardinal/diagonal/reversal, LIVE/LOCKED override, no commit on switch, highlight, fallback and fresh tap`);await context.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
