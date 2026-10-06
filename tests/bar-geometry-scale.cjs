'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-4,`${actual} != ${expected}`);
const pointNear=(actual,expected)=>{near(actual.x,expected.x);near(actual.y,expected.y)};
const length=o=>Math.hypot(o.x2-o.x,o.y2-o.y);
const diagnosticCases=[[50,1,0,50,0],[50,1,90,0,-50],[100,1,0,100,0],[50,2,0,100,0],[75,.5,0,37.5,0]];

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const evidence=[],parity=[];
  for(const touch of [false,true]){
   const context=await browser.newContext({hasTouch:touch,deviceScaleFactor:touch?2.5:1,viewport:touch?{width:1152,height:584}:{width:1400,height:1000}});
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.goto(pathToFileURL(path.resolve('index.html')).href);
   const client=q=>p.evaluate(q=>{const c=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:c.x,y:c.y}},q);
   const click=async q=>{const c=await client(q);if(touch)await p.touchscreen.tap(c.x,c.y);else await p.mouse.click(c.x,c.y)};
   const move=async q=>{
    const c=await client(q);
    // Touch hover is emulated; taps/commits use the browser's real touch path.
    if(touch)await p.locator('#drawing').dispatchEvent('pointermove',{pointerType:'touch',clientX:c.x,clientY:c.y});
    else await p.mouse.move(c.x,c.y);
   };
   const setScale=async value=>{
    if(await p.locator('#drawingScales').isHidden())await p.locator('#drawingScalesToggle').click();
    await p.locator('#geometryScale').fill(String(value));await p.locator('#geometryScale').press('Tab');
    assert.equal(await p.evaluate(()=>geometryScale),value);
    await p.evaluate(()=>{closeDrawingScales();document.activeElement?.blur()});
   };
   const start=async(scale=50,zoom=100)=>{
    await p.evaluate(zoom=>{
     document.activeElement?.blur();cancelToSelection();leftDrawingMenu?.close();rightCommandMenu?.close();
     items=[];past=[];future=[];snapEnabled=false;snapOptions.grid=false;gridVisible=false;
     const w=1100*100/zoom;camera={x:300-w/2,y:300-w*720/1100/2,w,h:w*720/1100};applyCamera();
    },zoom);
    await setScale(scale);await p.evaluate(()=>setMode('bar'));await click({x:300,y:300});
    const first=await p.evaluate(()=>({...first}));pointNear(first,{x:300,y:300});return first;
   };
   const lock=async(id,value)=>{
    await p.locator('#'+id).fill(String(value));await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');
   };
   const preview=()=>p.evaluate(()=>{
    const line=svg.querySelector('[data-bar-preview] line');
    return {endpoint:barNumericSession.endpoint,line:line?{x:+line.getAttribute('x2'),y:+line.getAttribute('y2')}:null,state:barNumericSession.state};
   });
   const result=()=>p.evaluate(()=>({...items.at(-1)}));
   const assertCommit=async(expected,candidate,keyboard=false)=>{
    const before=await preview();pointNear(before.endpoint,expected);pointNear(before.line,expected);
    if(keyboard)await p.keyboard.press('Enter');else await click(candidate);
    const bar=await result();assert.equal(bar.type,'bar');pointNear({x:bar.x2,y:bar.y2},expected);
    pointNear({x:bar.x2,y:bar.y2},before.endpoint);return bar;
   };

   const platform=[];
   for(const [scale,distance,angle,dx,dy]of diagnosticCases){
    const first=await start(scale),candidate={x:first.x+90,y:first.y+60};await move(candidate);
    await lock('dynamicInputValue',distance);await lock('dynamicInputSecondary',angle);
    const state=(await preview()).state;assert.deepEqual(state.distance,{mode:'locked',value:distance});assert.deepEqual(state.angle,{mode:'locked',value:angle});
    const bar=await assertCommit({x:first.x+dx,y:first.y+dy},candidate,true);
    near(length(bar),Math.hypot(dx,dy));near(bar.x2-bar.x,dx);near(bar.y2-bar.y,dy);
    platform.push({dx:bar.x2-bar.x,dy:bar.y2-bar.y});
    evidence.push({input:touch?'touch':'mouse',dpr:touch?2.5:1,scale,distance,angle,length:length(bar)});
    // Actual Save writes model coordinates in JSON v1; actual Open restores them.
    await p.evaluate(()=>{
     window.geometryDisk='';window.showSaveFilePicker=async()=>({name:'bar.json',createWritable:async()=>({write:async text=>{geometryDisk=text},close:async()=>{}})});
    });
    assert.equal(await p.evaluate(()=>saveDocument(true)),true);
    const saved=await p.evaluate(()=>JSON.parse(geometryDisk));assert.equal(saved.version,1);assert.equal(saved.geometryScale,scale);assert.deepEqual(saved.items,[bar]);
    await p.evaluate(async()=>loadDocument(new File([geometryDisk],'bar.json')));assert.deepEqual(await result(),bar);
   }
   parity.push(platform);

   // Zoom changes screen scale, never committed model length. Exercise both
   // pointer commit and Enter, with the same independent 50 px oracle.
   const screenWidths=[];
   for(const zoom of [50,100,150,200])for(const keyboard of [false,true]){
    const first=await start(50,zoom),candidate={x:first.x+90,y:first.y+60};await move(candidate);
    await lock('dynamicInputValue',1);await lock('dynamicInputSecondary',0);
    const expected={x:first.x+50,y:first.y},a=await client(first),b=await client(expected);
    if(keyboard)screenWidths.push({zoom,width:Math.hypot(b.x-a.x,b.y-a.y)});
    near(length(await assertCommit(expected,candidate,keyboard)),50);
   }
   for(const row of screenWidths)near(row.width/screenWidths[0].width,row.zoom/50);

   // All four independent lock states. The oracles do not call the solver.
   for(const distanceLocked of [false,true])for(const angleLocked of [false,true]){
    const first=await start(75),candidate={x:first.x+90,y:first.y+60};await move(candidate);
    if(distanceLocked)await lock('dynamicInputValue',.5);if(angleLocked)await lock('dynamicInputSecondary',90);
    const n=distanceLocked?37.5:Math.hypot(90,60),expected=angleLocked?{x:first.x,y:first.y-n}:{x:first.x+90/Math.hypot(90,60)*n,y:first.y+60/Math.hypot(90,60)*n};
    const bar=await assertCommit(expected,candidate);near(length(bar),n);
    if(!distanceLocked&&!angleLocked)pointNear({x:bar.x2,y:bar.y2},candidate);
   }

   // Pending edits are accepted by a canvas tap even without Tab/Enter. They
   // must retain meter units when both fields are waiting for confirmation.
   const first=await start(50),candidate={x:first.x+90,y:first.y+60};await move(candidate);
   await p.locator('#dynamicInputValue').fill('1');await p.locator('#dynamicInputSecondary').fill('90');
   await click(candidate);const pending=await result();near(pending.x2-pending.x,0);near(pending.y2-pending.y,-50);near(length(pending),50);

   // Changing the real scale control leaves existing geometry untouched.
   const oldFirst=await start(50);await move({x:oldFirst.x+90,y:oldFirst.y});await lock('dynamicInputValue',1);await lock('dynamicInputSecondary',0);await p.keyboard.press('Enter');
   const oldBar=await result();near(length(oldBar),50);await p.evaluate(()=>cancelToSelection());await setScale(100);
   assert.deepEqual(await result(),oldBar);await p.evaluate(()=>setMode('bar'));await click({x:300,y:420});
   const newFirst=await p.evaluate(()=>({...first})),newCandidate={x:newFirst.x+90,y:newFirst.y};await move(newCandidate);
   await lock('dynamicInputValue',1);await lock('dynamicInputSecondary',0);await p.keyboard.press('Enter');
   const bars=await p.evaluate(()=>items);assert.deepEqual(bars[0],oldBar);near(length(bars[1]),100);

   // Acquired Grid/geometric candidates choose direction only for locked D.
   for(const snap of ['grid','endpoint'])for(const angle of [null,90]){
    const first=await start(50),candidate=snap==='grid'?{x:389,y:361}:{x:392,y:362};
    await p.evaluate(snap=>{
     snapEnabled=true;gridVisible=snap==='grid';gridSize=50;
     for(const key of Object.keys(snapOptions))snapOptions[key]=false;
     snapOptions[snap]=true;
     if(snap==='endpoint')items.push(make('bar',390,360,480,360));render();
    },snap);
    await move(candidate);await lock('dynamicInputValue',1);if(angle!==null)await lock('dynamicInputSecondary',angle);
    const acquired=await p.evaluate(()=>({...hover}));pointNear(acquired,snap==='grid'?{x:400,y:350}:{x:390,y:360});
    const dx=acquired.x-first.x,dy=acquired.y-first.y,n=Math.hypot(dx,dy);
    const expected=angle===null?{x:first.x+dx/n*50,y:first.y+dy/n*50}:{x:first.x,y:first.y-50};
    near(length(await assertCommit(expected,candidate)),50);
   }
   assert.deepEqual(errors,[]);await context.close();
   console.log(`PASS ${touch?'tablet touch DPR 2.5':'desktop mouse DPR 1'}: scale cases, four states, raw clicks, pending edits, zoom, preview/commit, Save/Open, unchanged old bars, Grid/endpoint constraints`);
  }
  parity[0].forEach((row,i)=>{near(row.dx,parity[1][i].dx);near(row.dy,parity[1][i].dy)});
  const out=path.resolve('.test-tools/bar-geometry-scale');fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({cases:evidence,physicalAndroid:'Not tested; browser touch emulation'},null,2));
  console.log('PASS mouse/touch model parity; evidence:',out);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
