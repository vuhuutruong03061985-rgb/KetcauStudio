const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
const settle=p=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true}),results=[];try{
 for(const pointer of ['touch','pen']){
  const p=await b.newPage({viewport:{width:1280,height:800},hasTouch:true,isMobile:true});try{
   await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginSmartMove==='function');
   await p.evaluate(()=>{cancelToSelection();items=[make('bar',200,250,500,250,{id:'A'}),make('bar',800,450,950,450,{id:'T'})];past=[];future=[];updateSelection(['A'],'A');render()});await settle(p);
   const cdp=await p.context().newCDPSession(p),screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
   const a=await screen(260,250),z=await screen(650,400),tap=async q=>{if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else{await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1,pointerType:'pen'})}await settle(p)};
   if(pointer==='touch'){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...z,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
   else{await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',buttons:1,clickCount:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...z,button:'left',buttons:1,pointerType:'pen'});await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...z,button:'left',buttons:0,clickCount:1,pointerType:'pen'})}
   await settle(p);assert.equal(await p.evaluate(()=>smartMoveSession.command),false);assert.equal(await p.evaluate(()=>past.length),0);
   await p.evaluate(()=>{window.postDragHubActions=0;rightCommandMenu.host.addEventListener('click',e=>{if(e.target.closest('[data-demo-id="hub"]'))postDragHubActions++},true)});
   // No programmatic hub/source clicks in the test, menu edits, retries or timing workaround.
   await tap(await p.evaluate(()=>({x:rightCommandMenu.layout.cx-13,y:rightCommandMenu.layout.cy})));
   assert(await p.evaluate(()=>rightCommandMenu.state.open),'first native '+pointer+' hub tap after direct drag must open');
   assert.equal(await p.evaluate(()=>postDragHubActions),1,'hub action exactly once, including compatibility click');
   const hub=()=>p.evaluate(()=>({x:rightCommandMenu.layout.cx-13,y:rightCommandMenu.layout.cy}));
   await tap(await hub());assert(!await p.evaluate(()=>rightCommandMenu.state.open));assert.equal(await p.evaluate(()=>postDragHubActions),2);
   if(pointer==='touch'){
    const q=await hub();await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...q,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:q.x-30,y:q.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await settle(p);
    assert(!await p.evaluate(()=>rightCommandMenu.state.open));assert.equal(await p.evaluate(()=>postDragHubActions),2,'hub drag must not toggle');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...q,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await settle(p);assert(!await p.evaluate(()=>rightCommandMenu.state.open));assert.equal(await p.evaluate(()=>postDragHubActions),2,'hub cancel must not toggle');
   }
   await tap(await hub());assert(await p.evaluate(()=>rightCommandMenu.state.open));assert.equal(await p.evaluate(()=>postDragHubActions),3,'fresh tap after drag/cancel works once');
   assert.deepEqual(await p.evaluate(()=>rightCommandMenu.state.rings.flatMap(r=>r.entries.filter(e=>['moveObjects','moveBasePoint'].includes(e.id)))),[]);
   // The retained Pan sector must still cancel a pending direct Pivot-based Move.
   await tap(await p.evaluate(()=>{const m=rightCommandMenu,r=m.state.rings.find(r=>r.entries.some(e=>e.id==='panView'));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id==='panView')].icon}));
   assert.equal(await p.evaluate(()=>smartMoveSession),null);assert(await p.evaluate(()=>panEnabled));assert.equal(await p.evaluate(()=>penConnectionPlacement),null);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>items[0].x),200);
   results.push({pointer,passed:true});console.log('PASS native post-drag radial Pan activation '+pointer);
  }catch(e){results.push({pointer,passed:false,error:e.message});console.error('FAIL native post-drag radial Base activation '+pointer+': '+e.message);process.exitCode=1}finally{await p.close()}
 }
}finally{await b.close();fs.writeFileSync('.test-tools/pan-move-radial-after-drag-results.json',JSON.stringify(results,null,2))}})().catch(e=>{console.error(e);process.exitCode=1});
