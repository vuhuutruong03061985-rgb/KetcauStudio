const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.waitForFunction(()=>typeof selectionGeometry!=='undefined');
 const seed=()=>p.evaluate(()=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();snapEnabled=false;items=[make('bar',200,200,400,200),make('bar',200,300,400,300),make('bar',200,400,400,400)];items.forEach((o,i)=>o.id='ABC'[i]);updateSelection([]);past=[];future=[];render()});
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const ids=()=>p.evaluate(()=>[...selectedObjectIds()].sort().join(''));
 async function box(a,b,ctrl=false,cancel=null){
  const x=await screen(...a),y=await screen(...b);
  if(ctrl)await p.keyboard.down('Control');
  await p.mouse.move(x.x,x.y);await p.mouse.down();await p.mouse.move(y.x,y.y,{steps:3});
  assert.equal(await p.locator('[data-marquee]').getAttribute('data-selection-kind'),a[0]>b[0]?'crossing':'window');
  if(cancel==='Escape')await p.keyboard.press('Escape');
  else if(cancel==='pointercancel')await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'})));
  await p.mouse.up();if(ctrl)await p.keyboard.up('Control');
  assert.equal(await p.locator('[data-marquee]').count(),0);
 }
 await seed();await box([150,170],[300,230]);assert.equal(await ids(),'');
 await box([300,170],[150,230]);assert.equal(await ids(),'A');
 await box([150,270],[450,330]);assert.equal(await ids(),'B'); // Replace.
 await p.evaluate(()=>{updateSelection(['A','B'],'B');render()});
 await box([150,270],[450,430],true);assert.equal(await ids(),'AC');
 await p.evaluate(()=>{updateSelection(['A','B'],'B');render()});
 await box([450,270],[150,430],true);assert.equal(await ids(),'AC');
 for(const cancel of ['Escape','pointercancel']){await box([150,170],[450,430],false,cancel);assert.equal(await ids(),'AC')}
 assert.equal(await p.evaluate(()=>past.length),0);
 await p.keyboard.press('Delete');assert.equal(await p.evaluate(()=>past.length),1);assert.equal(await ids(),'');assert.equal(await p.evaluate(()=>items.map(o=>o.id).join('')),'B');
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>items.length),3);
 // Precise geometry queries isolate hit testing from empty-space gesture initiation.
 const hit=async(r,cross=true)=>p.evaluate(({r,cross})=>selectionGeometry.capture().filter(o=>selectionGeometry.matches(o.parts,r,cross)).map(o=>o.id),{r,cross});
 const rect=(left,top,right,bottom)=>({left,top,right,bottom});
 await seed();assert.deepEqual(await hit(rect(250,198.25,300,198.25)),['A']); // Stroke boundary.
 assert.deepEqual(await hit(rect(198.25,198.25,401.75,201.75),false),['A']);
 await p.evaluate(()=>{items=[make('bar',200,200,400,400),make('curve',500,200,undefined,undefined,{curvePoints:[{x:100,y:150},{x:200,y:0}]})];items[0].id='diagonal';items[1].id='curve';render()});
 assert.deepEqual(await hit(rect(210,350,240,380)),[]); // Empty diagonal bbox.
 assert.deepEqual(await hit(rect(590,210,610,230)),[]); // Empty curve bbox.
 assert.deepEqual(await hit(rect(590,345,610,355)),['curve']);
 assert.deepEqual(await hit(rect(190,190,410,410),false),['diagonal']);
 await p.evaluate(()=>{items=[make('rigidRegion',400,300,undefined,undefined,{...rigidDefaults,fillMode:'color',rigidAngle:35,points:[{x:0,y:0},{x:130,y:0},{x:70,y:100}]}),make('force',700,400,undefined,undefined,{label:'P'}),make('text',300,500,undefined,undefined,{label:'Hello'})];items.forEach((o,i)=>o.id=['region','load','text'][i]);render()});
 assert((await hit(rect(350,250,550,500),false)).includes('region'));
 assert((await hit(rect(410,345,420,355))).includes('region')); // Filled interior.
 assert(!(await hit(rect(380,440,390,450))).includes('region'));
 assert((await hit(rect(695,395,705,405))).includes('load')); // Arrow tip.
 assert((await hit(rect(270,475,330,505),false)).includes('text'));
 // Hidden action and selection decoration never enter geometry.
 await p.evaluate(()=>{items.push(make('force',100,100,undefined,undefined,{sectionAction:'N',sectionVisible:false}));updateSelection(items.map(o=>o.id));render()});
 assert.equal((await hit(rect(-100,-100,1100,720),false)).length,3);
 // All current types have visible candidates, without relying on enlarged picking strokes.
 assert.deepEqual(await p.evaluate(()=>{items=[];for(const type of Object.keys(modes).filter(t=>!['select','extend','section'].includes(t))){
  const o=make(type,300,300,450,350);if(type==='curve')o.curvePoints=[{x:75,y:-50},{x:150,y:50}];
  if(type==='hatch')Object.assign(o,{points:[{x:0,y:0},{x:100,y:0},{x:50,y:100}],spacing:8});
  if(type==='rigidRegion')Object.assign(o,rigidDefaults,{points:[{x:0,y:0},{x:100,y:0},{x:50,y:100}]});
  items.push(o);
 }updateSelection([]);render();const found=new Set(selectionGeometry.capture().map(o=>o.id));return items.filter(o=>!found.has(o.id)).map(o=>o.type)}),[]);
 // Client-pixel threshold stays invariant at different camera scales.
 for(const w of [550,2200]){
  await seed();await p.evaluate(w=>{camera={x:100,y:100,w,h:w*720/1100};applyCamera();updateSelection(['A']);render()},w);
  let q=await screen(160,160);await p.mouse.move(q.x,q.y);await p.mouse.down();await p.mouse.move(q.x+2,q.y+1);assert.equal(await p.locator('[data-marquee]').count(),0);await p.mouse.up();assert.equal(await ids(),'');
  await box([150,170],[450,230]);assert.equal(await ids(),'A');
 }
 // Touch cancellation and pinch restore the snapshot rather than commit a box.
 await seed();await p.evaluate(()=>{updateSelection(['B']);render()});
 const cdp=await p.context().newCDPSession(p),touch=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,q])=>({id,x:q.x,y:q.y}))});
 for(const kind of ['cancel','pinch']){
  const a=await screen(150,150),z=await screen(450,450);await touch('touchStart',[[0,a]]);await touch('touchMove',[[0,z]]);
  if(kind==='cancel')await touch('touchCancel',[]);
  else{await touch('touchStart',[[0,z],[1,{x:z.x+60,y:z.y}]]);await touch('touchEnd',[])}
  assert.equal(await ids(),'B');assert.equal(await p.locator('[data-marquee]').count(),0);assert.equal(await p.evaluate(()=>past.length),0);
 }
 assert.deepEqual(errors,[]);console.log('PASS Selection V1 directions, geometry, Ctrl toggle, replacement, cancellation, Delete history, zoom/pan threshold, all drawable candidates and emulated touch/pinch');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
