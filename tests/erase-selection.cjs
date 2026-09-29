const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.waitForFunction(()=>typeof selectionGeometry!=='undefined');
 const seed=()=>p.evaluate(()=>{cancelToSelection();snapEnabled=false;items=[make('bar',200,200,400,200),make('bar',200,300,400,300),make('bar',200,400,400,400)];items.forEach((o,i)=>o.id='ABC'[i]);past=[];future=[];updateSelection([]);setMode('erase')});
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const ids=()=>p.evaluate(()=>[...selectedObjectIds()].sort().join(''));
 const cursor=()=>p.locator('#drawing').evaluate(e=>getComputedStyle(e).cursor);
 async function box(a,b,ctrl=false,cancel=null){
  const x=await screen(...a),y=await screen(...b);
  if(ctrl)await p.keyboard.down('Control');await p.mouse.move(x.x,x.y);await p.mouse.down();await p.mouse.move(y.x,y.y,{steps:3});
  assert.equal(await p.locator('[data-marquee]').getAttribute('data-selection-kind'),a[0]>b[0]?'crossing':'window');
  assert((await cursor()).includes('data:image/svg+xml'));
  if(cancel==='Escape')await p.keyboard.press('Escape');
  if(cancel==='pointercancel')await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1})));
  await p.mouse.up();if(ctrl)await p.keyboard.up('Control');
  assert.equal(await p.locator('[data-marquee]').count(),0);
 }
 await seed();const original=await p.evaluate(()=>JSON.stringify(items)),eraser=await cursor();
 await box([150,170],[300,230]);assert.equal(await p.evaluate(()=>items.length),3);assert.equal(await p.evaluate(()=>past.length),0);
 await box([300,170],[150,230]);assert.equal(await p.evaluate(()=>items.map(o=>o.id).join('')),'BC');assert.equal(await p.evaluate(()=>past.length),1);
 await p.keyboard.press('Control+z');assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);
 for(const crossing of [false,true]){
  await seed();await p.evaluate(()=>{updateSelection(['A','B'],'B');render()});
  await box(crossing?[450,270]:[150,270],crossing?[150,430]:[450,430],true);
  assert.equal(await p.evaluate(()=>items.map(o=>o.id).join('')),'A'); // Only box hits B/C, never prior selection A.
  assert.equal(await p.evaluate(()=>past.length),1);assert.equal(await ids(),'');
  assert.equal(await p.evaluate(()=>mode),'erase');assert.equal(await cursor(),eraser);
  await p.keyboard.press('Control+z');assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);
 }
 await seed();await box([150,170],[450,430]);
 assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),1);
 await p.keyboard.press('Control+z');assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);
 // A small empty-space gesture cannot trigger deletion/history.
 await seed();const small=await screen(150,150);
 await p.mouse.move(small.x,small.y);await p.mouse.down();await p.mouse.move(small.x+2,small.y+1);await p.mouse.up();
 assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);assert.equal(await p.evaluate(()=>past.length),0);
 for(const cancel of ['pointercancel','Escape']){
  await seed();await p.evaluate(()=>{updateSelection(['B'],'B');render()});
  await box([150,170],[450,430],false,cancel);
  assert.equal(await ids(),'B');assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);
  assert.equal(await p.evaluate(()=>past.length),0);
  assert.equal(await p.evaluate(()=>mode),cancel==='Escape'?'select':'erase');
 }
 // A cancelled touch marquee must not delete or add a checkpoint.
 await seed();await p.evaluate(()=>{updateSelection(['B']);render()});
 const cdp=await p.context().newCDPSession(p),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,q])=>({id,x:q.x,y:q.y}))});
 for(const how of ['cancel','pinch']){
  const a=await screen(150,150),z=await screen(450,450);
  await touch('touchStart',[[0,a]]);await touch('touchMove',[[0,z]]);
  if(how==='cancel')await touch('touchCancel',[]);
  else{await touch('touchStart',[[0,z],[1,{x:z.x+60,y:z.y}]]);await touch('touchEnd',[])}
  assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);assert.equal(await p.evaluate(()=>past.length),0);
  assert.equal(await ids(),'B');assert.equal(await p.locator('[data-marquee]').count(),0);
 }
 // A box overlapping only empty space in a diagonal's bbox must not select it.
 await seed();await p.evaluate(()=>{items=[make('bar',200,200,400,400)];render()});
 await box([250,330],[150,380]);assert.equal(await ids(),'');assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>past.length),0);
 // Direct click, including on an existing multi-selection, never starts marquee.
 await seed();await p.evaluate(()=>{updateSelection(['A','B']);render()});
 const q=await screen(300,200);await p.mouse.move(q.x,q.y);await p.mouse.down();
 assert.equal(await p.evaluate(()=>items.map(o=>o.id).join('')),'BC');
 assert.equal(await p.evaluate(()=>boxSelect),null);assert.equal(await p.evaluate(()=>past.length),1);
 await p.mouse.up();assert.equal(await p.evaluate(()=>mode),'erase');
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);
 // Pan cursor precedence and restoration survive the shared marquee.
 await box([150,170],[450,230]);await p.keyboard.down('Control');await p.keyboard.down('Alt');assert.equal(await cursor(),'grab');
 await p.keyboard.up('Alt');await p.keyboard.up('Control');assert.equal(await cursor(),eraser);
 assert.deepEqual(errors,[]);console.log('PASS Erase marquee: Window/Crossing, Ctrl-independent targets, bbox rejection, immediate batch erase/one Undo, prior-selection isolation, Escape/pointercancel/touch-pinch restoration, direct-click priority and cursor/pan');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
