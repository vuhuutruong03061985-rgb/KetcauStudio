const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof syncSupportChoices==='function');
 const choices=['pin','roller','fixed','pin-plain','roller-plain'];
 async function check(type=null){
  const states=await p.locator('[data-support-type]').evaluateAll(bs=>bs.map(b=>({type:b.dataset.supportType,active:b.classList.contains('active'),pressed:b.getAttribute('aria-pressed')})));
  assert.equal(states.length,5);
  for(const s of states){assert.equal(s.active,s.type===type);assert.equal(s.pressed,String(s.type===type))}
 }
 const click=async(x,y,button='left')=>{const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});await p.mouse.click(q.x,q.y,{button})};
 assert.equal(await p.evaluate(()=>mode),'select');await check();
 for(const type of choices){
  for(const exit of ['select','escape','right','direct','switch']){
   await p.evaluate(()=>{selected=null;multiSelection.clear()});
   await p.locator('[data-support-type="'+type+'"]').click();assert.equal(await p.evaluate(()=>mode),'support');await check(type);
   if(exit==='select')await p.locator('#resetView').click();
   if(exit==='escape')await p.keyboard.press('Escape');
   if(exit==='right')await click(900,550,'right');
   if(exit==='direct')await p.evaluate(()=>setMode('select'));
   if(exit==='switch')await p.locator('[data-mode=bar]').click();
   assert.equal(await p.evaluate(()=>mode),exit==='switch'?'bar':'select');await check();
   assert.equal(await p.locator('#support').inputValue(),type);
   await p.evaluate(()=>setMode('support'));await check(type);
  }
  await p.evaluate(()=>{items=[];selected=null;past=[];future=[];snapEnabled=false;render()});
  await click(300,300);await click(300,400);await click(600,300);await click(600,400);
  assert.equal(await p.evaluate(()=>mode),'support');await check(type);
  assert.deepEqual(await p.evaluate(()=>items.map(o=>o.support)),[type,type]);
  await p.locator('#resetView').click();await check();
  await p.evaluate(()=>{updateSelection([items[0].id],items[0].id);render()});
  const next=choices[(choices.indexOf(type)+1)%choices.length];
  await p.locator('[data-support-type="'+next+'"]').click();
  assert.equal(await p.evaluate(()=>mode),'select');assert.equal(await p.evaluate(()=>items[0].support),next);await check();
 }
 for(const type of ['hinge','linkBar','weld']){
  await p.locator('[data-mode="'+type+'"]').click();
  assert.equal(await p.evaluate(()=>mode),type);
  assert.equal(await p.locator('[data-mode="'+type+'"]').getAttribute('aria-pressed'),'true');await check();
  await p.locator('#resetView').click();
  assert.equal(await p.locator('[data-mode="'+type+'"]').getAttribute('aria-pressed'),'false');await check();
 }
 assert.deepEqual(errors,[]);console.log('PASS support toolbar: startup, five choices, Select/Escape/right/direct/switch exits, remembered values, repeated placement, selected-support editing and hinge/linkBar/weld states');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
