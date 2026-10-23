const assert=require('node:assert/strict');
// Only fixture setup may seed bars. Placement and completion always use native UI contacts.
module.exports=async function tabletUDLDriver(p){
 const cdp=await p.context().newCDPSession(p);
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const contact=async q=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...q,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle();
 };
 const tap=async selector=>{const loc=p.locator(selector);await loc.waitFor({state:'visible'});const r=await loc.boundingBox();assert(r,selector);await contact({x:r.x+r.width/2,y:r.y+r.height/2})};
 const screen=point=>p.evaluate(point=>{const q=new DOMPoint(point.x,point.y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},point);
 const pick=async point=>contact(await screen(point));
 const key=k=>tap('[data-numeric-key="'+k+'"]');
 const field=p.locator('#dynamicInputValue');
 const noCommit=async(n=0)=>{assert.equal(await p.evaluate(()=>items.length),n);assert.equal(await p.evaluate(()=>past.length),0)};
 async function confirmPoint(point,endpoint,n){
  await pick(point);await p.waitForFunction(()=>penConnectionPlacement?.state==='confirming');
  assert.equal(await p.evaluate(()=>penConnectionPlacement.endpoint),endpoint);await noCommit(n);
  assert(await p.locator('#tabletNumericKeypad').isHidden());await tap('[data-pen-connection-action=confirm]');await noCommit(n);
 }
 async function span(a,b,n=0){
  await confirmPoint(a,'a',n);assert(await p.locator('#tabletNumericKeypad').isHidden());
  await confirmPoint(b,'b',n);await p.locator('#tabletNumericKeypad').waitFor({state:'visible'});
  assert(await p.locator('#penConnectionBubble').isHidden());
  for(const [actual,expected]of [[await p.evaluate(()=>({...loadPlacement.a})),a],[await p.evaluate(()=>({...loadPlacement.b})),b]])for(const k of ['x','y'])assert(Math.abs(actual[k]-expected[k])<.002,`${k}: ${actual[k]} != ${expected[k]}`);
 }
 async function enter(text,{clear=false}={}){
  if(clear)await key('clear');
  const normalized=String(text).replace(',','.');
  assert(/^-?\d+(\.\d+)?$/.test(normalized),text);
  for(const digit of normalized.replace('-',''))await key(digit);
  if(normalized.startsWith('-'))await key('sign');
 }
 async function lock(n=0){await key('confirm');assert.equal(await p.evaluate(()=>loadPlacement.uiAngle.mode),'locked');await noCommit(n);assert.equal(await p.locator('[data-numeric-key=confirm]').textContent(),'\u2713\u2713');assert(await p.locator('#penConnectionBubble').isHidden())}
 async function commit(n=0){await key('confirm');assert.equal(await p.evaluate(()=>items.length),n+1);assert.equal(await p.evaluate(()=>past.length),1);assert.equal(await p.evaluate(()=>loadPlacement),null);assert(await p.locator('#tabletNumericKeypad').isHidden());await p.evaluate(()=>svg.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.equal(await p.evaluate(()=>items.length),n+1)}
 return {tap,pick,key,field,span,enter,lock,commit,noCommit,screen,settle};
};
