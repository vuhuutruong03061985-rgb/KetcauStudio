'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL,fileURLToPath}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const baseline=process.argv.includes('--baseline');
const baselineRef='15b6a44',root=path.resolve('.');
// Read the complete baseline application from Git; never restore working-tree files.
const baselineFiles=baseline?new Set(execFileSync('git',['ls-tree','-r','--name-only',baselineRef],{encoding:'utf8'}).trim().split('\n')):null;
const baselineBodies=new Map();
const contentTypes={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const finishFailures=[];
 try{for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  if(baseline){
   await p.route('**/*',async route=>{
    const url=new URL(route.request().url());if(url.protocol!=='file:')return route.continue();
    const file=path.relative(root,fileURLToPath(url)).split(path.sep).join('/');
    if(!baselineFiles.has(file))throw new Error(`Resource is absent from pristine ${baselineRef}: ${file}`);
    if(!baselineBodies.has(file))baselineBodies.set(file,execFileSync('git',['show',`${baselineRef}:${file}`]));
    await route.fulfill({body:baselineBodies.get(file),contentType:contentTypes[path.extname(file)]||'application/octet-stream'});
   });
  }
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const start=async(modeValue='bar',zoom=100)=>{
   await p.evaluate(({modeValue,zoom})=>{
    document.activeElement?.blur();cancelToSelection();leftDrawingMenu?.close();rightCommandMenu?.close();
    items=[];past=[];future=[];snapEnabled=false;gridVisible=false;geometryScale=50;internalForceScale=10;
    const w=1100*100/zoom;camera={x:100-w/2,y:100-w*720/1100/2,w,h:w*720/1100};applyCamera();setMode(modeValue);
   },{modeValue,zoom});
   const q=await p.evaluate(()=>{const q=new DOMPoint(100,100).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});
   if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
   await p.evaluate(()=>{window.zeroMoves=0;svg.addEventListener('pointermove',()=>zeroMoves++,{signal:(window.zeroController?.abort(),window.zeroController=new AbortController()).signal})});
  };
  const lock=async(id,value)=>{await p.locator('#'+id).fill(String(value));await p.keyboard.press('Tab')};
  const preview=async(angle)=>{
   const r=await p.evaluate(()=>{
    const line=svg.querySelector('[data-bar-preview] line');
    return {endpoint:barNumericSession.endpoint,line:line?{x:+line.getAttribute('x2'),y:+line.getAttribute('y2')}:null,hover,moves:zeroMoves};
   });
   assert.equal(r.moves,0);assert.equal(r.hover,null);assert(r.line);near(r.endpoint.x,angle===0?150:100);near(r.endpoint.y,angle===0?100:50);
   near(r.line.x,r.endpoint.x);near(r.line.y,r.endpoint.y);
  };
  const committed=async(angle)=>{
   const r=await p.evaluate(()=>({items,past:past.length,moves:zeroMoves}));assert.equal(r.items.length,1);assert.equal(r.past,1);assert.equal(r.moves,0);
   const o=r.items[0];assert.equal(o.type,'bar');near(o.x,100);near(o.y,100);near(o.x2,angle===0?150:100);near(o.y2,angle===0?100:50);near(Math.hypot(o.x2-o.x,o.y2-o.y),50);
  };
  for(const zoom of [50,100,150,200])for(const angle of [0,90])for(const last of ['angle','distance']){
   await start('bar',zoom);
   for(const id of last==='angle'?['dynamicInputValue','dynamicInputSecondary']:['dynamicInputSecondary','dynamicInputValue'])await lock(id,id==='dynamicInputValue'?1:angle);
   await preview(angle);await p.keyboard.press('Enter');await committed(angle);
  }
  console.log(`PASS ${touch?'touch':'mouse'} zero-motion Enter, both lock orders, immediate preview, 0/90 degrees, four zooms`);
  for(const fields of [[],['dynamicInputValue'],['dynamicInputSecondary']]){
   await start();for(const id of fields)await lock(id,id==='dynamicInputValue'?1:90);
   await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);
   assert.equal(await p.locator('#commandFinish').isVisible(),false);
  }
  // Enter also accepts the second pending value and commits in the same event.
  await start();await lock('dynamicInputValue',1);await p.locator('#dynamicInputSecondary').fill('90');
  await p.keyboard.press('Enter');await committed(90);
  await start();
  const live=await p.evaluate(()=>{const q=new DOMPoint(200,150).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});
  await p.locator('#drawing').dispatchEvent('pointermove',{pointerType:touch?'touch':'mouse',clientX:live.x,clientY:live.y});
  await p.keyboard.press('Enter');const liveBar=await p.evaluate(()=>items[0]);near(liveBar.x2,200);near(liveBar.y2,150);
  await start('thin');await p.locator('#dynamicInputValue').fill('110');await p.keyboard.press('Enter');
  assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>thinNumericSession.endpoint),null);
  const q=await p.evaluate(()=>{const q=new DOMPoint(200,100).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});
  await p.locator('#drawing').dispatchEvent('pointermove',{pointerType:touch?'touch':'mouse',clientX:q.x,clientY:q.y});
  await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>items.length),1);near(await p.evaluate(()=>items[0].x2-items[0].x),11);
  console.log('PASS partial/live states blocked; Thin Line zero-motion underdetermined, acquired direction commits without further motion');
  const finish=async(angle=0,last='angle',zoom=100)=>{
   await start('bar',zoom);
   for(const id of last==='angle'?['dynamicInputValue','dynamicInputSecondary']:['dynamicInputSecondary','dynamicInputValue'])await lock(id,id==='dynamicInputValue'?1:angle);
   await preview(angle);
   await p.evaluate(()=>{
    // Retain identity references only to inspect normal chained-session cleanup.
    window.previousBarSession=barNumericSession;window.previousBarFirst=first;
    window.beforeFinishCounts={objects:items.length,history:past.length};document.activeElement?.blur();
   });
   const control=p.locator('#commandFinish'),available=await control.isVisible();
   const diagnostic=await p.evaluate(()=>({hidden:commandFinish.hidden,disabled:commandFinish.disabled,
    controlsHidden:commandControls.hidden,objects:items.length,history:past.length,moves:zeroMoves}));
   console.log(`${baseline?baselineRef:'working tree'} ${touch?'touch':'mouse'} Finish angle=${angle} last=${last} zoom=${zoom}: ${JSON.stringify(diagnostic)}`);
   // Identical success assertions for baseline and working tree. This must fail
   // naturally on the baseline, rather than assert the old unavailable behavior.
   assert(available,'Locked/locked Bar must expose existing Finish action');
   assert.equal(await control.isEnabled(),true,'Command Finish must be enabled');
   if(touch)await control.tap();else await control.click();
   await committed(angle);
   const cleanup=await p.evaluate(()=>{
    const session=barNumericSession;
    return {objectsDelta:items.length-beforeFinishCounts.objects,historyDelta:past.length-beforeFinishCounts.history,
     mode,first,hover,selected,lastId:items.at(-1).id,future:future.length,
     sessionReplaced:!!session&&session!==previousBarSession,captureReplaced:!!session&&session.capture!==previousBarSession.capture,
     firstReplaced:first!==previousBarFirst,sessionOwnsFirst:session?.first===first,state:session?.state,endpoint:session?.endpoint,
     captureOwned:!!session&&dynamicNumericCapture===session.capture,uiOwned:!!session&&dynamicInputUI.owns(session.capture.confirm),
     uiOpen:dynamicInputUI.isOpen(),fields:['dynamicInputValue','dynamicInputSecondary'].map(id=>{
      const el=document.getElementById(id);return {value:el.value,locked:el.classList.contains('dynamic-locked'),editing:!!el.dataset.editing};
     })};
   });
   assert.equal(cleanup.objectsDelta,1);assert.equal(cleanup.historyDelta,1);assert.equal(cleanup.future,0);
   assert.equal(cleanup.mode,'bar');near(cleanup.first.x,angle===0?150:100);near(cleanup.first.y,angle===0?100:50);
   assert.equal(cleanup.hover,null);assert.equal(cleanup.selected,cleanup.lastId);
   for(const key of ['sessionReplaced','captureReplaced','firstReplaced','sessionOwnsFirst','captureOwned','uiOwned','uiOpen'])assert.equal(cleanup[key],true,key);
   assert.deepEqual(cleanup.state,{activeField:'distance',distance:{mode:'live',value:0},angle:{mode:'live',value:0}});
   assert.deepEqual(cleanup.endpoint,cleanup.first);
   assert.deepEqual(cleanup.fields,[{value:'0',locked:false,editing:false},{value:'0',locked:false,editing:false}]);
   assert.equal(await control.isVisible(),false,'Fresh LIVE/LIVE segment must not retain Finish eligibility');
   console.log(`PASS ${touch?'touch':'mouse'} real #commandFinish: endpoint=${JSON.stringify(cleanup.first)}, length=50, history delta=1, fresh LIVE/LIVE chain`);
  };
  // Keep the canonical assertion identical and collect failures only so both
  // input types still exercise the existing baseline-compatible Enter/Thin cases.
  let canonicalPassed=false;
  try{await finish();canonicalPassed=true}catch(error){
   console.error(`FAIL ${touch?'touch':'mouse'} canonical Finish: ${error.message}`);finishFailures.push(error);
  }
  if(canonicalPassed){
   for(const zoom of [50,100,150,200])for(const angle of [0,90])for(const last of ['angle','distance']){
    if(zoom===100&&angle===0&&last==='angle')continue;
    await finish(angle,last,zoom);
   }
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 if(finishFailures.length)throw new AggregateError(finishFailures,'Canonical Command Finish regression failed');
 console.log('PASS zero-motion regression and Finish matrix; touch is browser emulation, not physical Android');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
