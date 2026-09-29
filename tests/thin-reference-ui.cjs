const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true])for(const width of [550,1100]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  if(process.argv.includes('--baseline'))await p.route(/assets\/(app\.js|tablet\.js|app\.css)/,route=>{
   const file=path.basename(new URL(route.request().url()).pathname),body=require('node:child_process').execFileSync('git',['show',`HEAD:assets/${file}`],{encoding:'utf8'});
   return route.fulfill({body,contentType:file.endsWith('.css')?'text/css':'text/javascript'});
  });
  await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const tap=async(x,y)=>touch?p.touchscreen.tap(x,y):p.mouse.click(x,y);
  const at=async(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await at(x,y);await tap(q.x,q.y)};
  const tool=async name=>{await p.locator('#resetView').click();const b=p.locator(`[data-mode="${name}"]`);if(touch)await b.tap();else await b.click()};
  // Build both members via actual toolbar and trusted canvas input, not a seeded reference session.
  await p.locator('#clear').click();await tool('bar');await click(100,300);await click(500,300);await p.keyboard.press('Escape');
  await tool('bar');await click(300,500);await click(300,200);await p.keyboard.press('Escape');
  await p.evaluate(width=>{camera={x:0,y:0,w:width,h:width*720/1100};applyCamera()},width);
  await tool('thin');await click(300,300);
  assert.equal(await p.evaluate(()=>thinReferenceSession.candidates.length),2);
  const intent=await at(310,340);await p.mouse.move(intent.x,intent.y);
  const ids=await p.evaluate(()=>({h:items.find(o=>o.type==='bar'&&Math.abs(o.y-o.y2)<.01).id,v:items.find(o=>o.type==='bar'&&Math.abs(o.x-o.x2)<.01).id}));
  assert.equal(await p.evaluate(()=>thinReferenceSession.referenceBarId),ids.h);
  await p.locator('#dynamicInputValue').fill('110');await p.evaluate(()=>dynamicInputUI.confirmPending());
  const before=await p.evaluate(()=>({items:JSON.stringify(items),history:past.length,first:{...first}}));
  await p.evaluate(()=>{
   window.uiTrace=[];window.uiOldCommit=commitThinCandidate;commitThinCandidate=function(...args){uiTrace.push('commit');return uiOldCommit(...args)};
   window.uiOldConfirm=dynamicInputUI.confirmPending;dynamicInputUI.confirmPending=function(...args){uiTrace.push('confirm');return uiOldConfirm(...args)};
   document.addEventListener('pointerdown',e=>{if(svg.contains(e.target))uiTrace.push({trusted:e.isTrusted,type:e.pointerType})},true);
  });
  // Real CTM-based CSS offset: 30 px along B, comfortably within the 40 px radius.
  const target=await p.evaluate(()=>{const q=new DOMPoint(first.x,first.y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y+30}});
  assert(await p.evaluate(q=>svg.contains(document.elementFromPoint(q.x,q.y)),target));
  await tap(target.x,target.y);
  const result=await p.evaluate(()=>({id:thinReferenceSession.referenceBarId,items:JSON.stringify(items),history:past.length,first:{...first},value:thinNumericSession.value,trace:uiTrace}));
  assert.equal(result.id,ids.v);assert.equal(result.items,before.items);assert.equal(result.history,before.history);assert.deepEqual(result.first,before.first);assert.equal(result.value,110);
  assert(!result.trace.includes('commit'));assert(!result.trace.includes('confirm'));assert(result.trace.some(e=>e.trusted&&e.type===(touch?'touch':'mouse')));
  const visual=await p.evaluate(id=>{const l=svg.querySelector('.thin-reference-highlight'),b=items.find(o=>o.id===id),g=svg.querySelector(`[data-id="${id}"]`),c=getComputedStyle(l);return {points:['x1','y1','x2','y2'].map(k=>Number(l.getAttribute(k))),expected:[b.x,b.y,b.x2,b.y2],above:!!(l.compareDocumentPosition(g)&Node.DOCUMENT_POSITION_PRECEDING),pointer:c.pointerEvents,opacity:c.opacity,width:c.strokeWidth}},ids.v);
  assert.deepEqual(visual.points,visual.expected);assert(visual.above);assert.equal(visual.pointer,'none');assert.equal(visual.opacity,'1');assert.equal(visual.width,'5px');
  // A later real click outside the radius still confirms and commits normally.
  await click(400,340);assert.equal(await p.evaluate(()=>past.length),before.history+1);assert.equal(await p.evaluate(()=>items.filter(o=>o.type==='thin').length),1);
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS trusted ${touch?'touch':'mouse'} UI at viewBox ${width}: toolbar-drawn joint, CTM hit, override before confirm/commit, unchanged item/history/first, immediate visible B highlight, next click commits`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
