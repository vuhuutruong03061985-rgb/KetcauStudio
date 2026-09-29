const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const pointerType of ['mouse','pen','touch']){
  const context=await browser.newContext({hasTouch:true,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(pointerType==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const orange=()=>p.locator('.reference-override').count();
  const seed=async(width=1100,count=2)=>{await p.evaluate(({width,count})=>{document.activeElement.blur();setMode('select');items=[{...make('bar',100,300,500,300),id:'h'},...(count===2?[{...make('bar',300,100,300,500),id:'v'}]:[])];past=[];future=[];camera={x:0,y:0,w:width,h:width*720/1100};applyCamera();setMode('thin')},{width,count});await click(300,300);const q=await coords(310,340);await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType});assert.equal(await p.evaluate(()=>thinReferenceSession.referenceBarId),'h')};
  const move=async(x,y,expected)=>{
   const q=await p.evaluate(({x,y})=>{const a=thinReferenceSession.anchorPoint,s=Math.abs(svg.getScreenCTM().a),pt=new DOMPoint(a.x+x/s,a.y+y/s).matrixTransform(svg.getScreenCTM());return {x:pt.x,y:pt.y}},{x,y});
   await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType});assert.equal(await orange(),expected?1:0);
   if(expected){const marker=await p.evaluate(()=>{const g=svg.querySelector('.reference-override'),shape=g.querySelector('path,circle');return {color:getComputedStyle(shape).stroke,pointer:getComputedStyle(g).pointerEvents,can:thinReferenceOverrideAt(thinReferenceSession.rawCursorPoint)?.id,current:thinReferenceSession.referenceBarId}});assert.equal(marker.color,'rgb(245, 158, 11)');assert.equal(marker.pointer,'none');assert.notEqual(marker.can,marker.current)}
   return q;
  };
  for(const width of [550,1100]){
   await seed(width);await move(0,45,false);await move(0,30,true);await move(0,45,false);await move(-30,0,false);await move(8,8,false);await move(0,5,false);await move(11,30,false);
   await p.evaluate(()=>{items.push({...make('bar',320,310,340,310),id:'unrelated'})});await move(25,15,false);
   const before=await p.evaluate(()=>({count:items.length,history:past.length})),q=await move(0,30,true);
   if(pointerType==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
   assert.equal(await p.evaluate(()=>thinReferenceSession.referenceBarId),'v');assert.deepEqual(await p.evaluate(()=>({count:items.length,history:past.length})),before);assert.equal(await orange(),0);await move(0,30,false);
  }
  await seed(1100,1);await move(0,30,false);
  for(const action of ['escape','tool','commit','undo','redo','new','open','leave']){
   await seed();await move(0,30,true);
   if(action==='escape')await p.keyboard.press('Escape');else if(action==='commit')await click(400,450);else if(action==='leave')await p.locator('#drawing').dispatchEvent('pointerleave',{pointerType});else await p.evaluate(async action=>{if(action==='tool')setMode('bar');if(action==='undo')actions.undo[1]();if(action==='redo')actions.redo[1]();if(action==='new')newDocument();if(action==='open')await loadDocument(new File([JSON.stringify({format:'ket-cau-studio',version:1,items:[]})],'marker.json'))},action);
   assert.equal(await orange(),0,action);
  }
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS existing snap marker ${pointerType}: hover in/out, current/tie/dead-zone/noncandidate, same hit -> override, zoom, cleanup; no new marker`);
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
