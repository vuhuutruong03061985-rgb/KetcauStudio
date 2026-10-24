const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url'),{chromium}=require('../.test-tools/node_modules/playwright');
const nearAngle=(a,b)=>near(Math.atan2(Math.sin((a-b)*Math.PI/180),Math.cos((a-b)*Math.PI/180))*180/Math.PI,0);
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});let cases=0;try{
for(const pointer of ['mouse','pen','touch']){
 const p=await browser.newPage({viewport:{width:1280,height:800},hasTouch:pointer!=='mouse',isMobile:pointer!=='mouse'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof renderAnchorRotation==='function');const cdp=await p.context().newCDPSession(p);
 const settle=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const send=async(type,q)=>{if(pointer==='mouse'){await p.mouse.move(q.x,q.y);if(type==='down')await p.mouse.down();if(type==='up')await p.mouse.up()}else if(pointer==='touch')await cdp.send('Input.dispatchTouchEvent',{type:{down:'touchStart',move:'touchMove',up:'touchEnd'}[type],touchPoints:type==='up'?[]:[{...q,id:1}]});else await cdp.send('Input.dispatchMouseEvent',{type:{down:'mousePressed',move:'mouseMoved',up:'mouseReleased'}[type],...q,pointerType:pointer,button:'left',buttons:type==='up'?0:1,clickCount:type==='move'?0:1});await settle()};
 const seed=async(type='force',angle=0,legacy=false)=>{await p.evaluate(({type,angle,legacy})=>{cancelToSelection();items=[make(type==='force'?'force':'support',500,350,undefined,undefined,{id:'subject',label:'Keep',strokeColor:'#123456',...(type==='force'?(legacy?{direction:'down'}:{loadAngle:angle}):{support:type,...(legacy?{direction:'right'}:{supportAngle:angle})})})];past=[];future=[];selected='subject';snapEnabled=true;render()},{type,angle,legacy});await p.locator('[data-anchor-rotation-hit]').waitFor({state:'visible'});return p.evaluate(()=>copy(items[0]))};
 const positions=async()=>{const r=await p.locator('[data-anchor-rotation-hit]').boundingBox();assert(r);near(r.width,44);near(r.height,44);const center=await p.evaluate(()=>{const q=new DOMPoint(500,350).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});return {handle:{x:r.x+r.width/2,y:r.y+r.height/2},center}};
 const turn=(a,c,t)=>({x:c.x+(a.x-c.x)*Math.cos(t)-(a.y-c.y)*Math.sin(t),y:c.y+(a.x-c.x)*Math.sin(t)+(a.y-c.y)*Math.cos(t)});
 const begin=async theta=>{const q=await positions();await send('down',q.handle);assert(await p.evaluate(()=>!!anchorRotationSession));await send('move',turn(q.handle,q.center,theta/2));await send('move',turn(q.handle,q.center,theta));return turn(q.handle,q.center,theta)};
 const geometry=async(type,angle)=>{if(type==='force'){const l=await p.locator('g[data-id=subject] > line[marker-end]').evaluate(e=>Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(e.getAttribute(k))])));near(l.x2,500);near(l.y2,350);near(l.x1,500-75*Math.cos(angle*Math.PI/180));near(l.y1,350+75*Math.sin(angle*Math.PI/180))}else{const t=await p.locator('g[data-id=subject] > g[transform]').first().getAttribute('transform');assert(t.startsWith('translate(500 350) rotate('));nearAngle(Number(t.match(/rotate\(([^)]+)/)[1]),angle)}};
 for(const type of ['force','fixed','pin','pin-plain','roller','roller-plain'])for(const angle of [0,90,180,-90,270,37.25]){
  const original=await seed(type);const end=await begin((type==='force'?-1:1)*angle*Math.PI/180);assert.deepEqual(await p.evaluate(()=>items[0]),original);await geometry(type,angle);assert.equal(await p.evaluate(()=>past.length),0);await send('up',end);
  const next=await p.evaluate(()=>copy(items[0])),field=type==='force'?'loadAngle':'supportAngle';nearAngle(next[field],angle);assert.deepEqual({...next,[field]:original[field]},original);await geometry(type,angle);assert.equal(await p.evaluate(()=>mode),'select');assert.equal(await p.evaluate(()=>past.length),angle?1:0);assert.equal(await p.evaluate(()=>items.length),1);
  await p.evaluate(()=>svg.dispatchEvent(new MouseEvent('click',{bubbles:true})));assert.deepEqual(await p.evaluate(()=>items[0]),next);assert.equal(await p.evaluate(()=>past.length),angle?1:0);
  const exported=await p.evaluate(()=>exportSVG());assert(!exported.includes('data-anchor-rotation'));assert(!exported.includes('data-move-anchor'));
  if(angle){await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),original);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[0]),next)}
  const json=await p.evaluate(()=>documentText());assert(!json.includes('anchorRotation'));await p.evaluate(j=>loadDocument(new File([j],'rotated.json')),json);assert.equal(await p.evaluate(()=>documentText()),json);cases++;
 }
 for(const action of ['escape','cancel','pinch','zoom','tool','lostcapture','return']){
  const original=await seed('force',23);let end=await begin(.6);
  if(action==='escape')await p.keyboard.press('Escape');
  if(action==='cancel')await p.evaluate(()=>svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:anchorRotationSession.pointerId})));
  if(action==='pinch'){const first=pointer==='touch'?[{...end,id:1}]:[];await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[...first,{x:end.x+100,y:end.y+20,id:2},...(first.length?[]:[{x:end.x+50,y:end.y+50,id:3}])]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]})}
  if(action==='zoom')await p.evaluate(()=>zoomAt(1.25));
  if(action==='tool')await p.evaluate(()=>setMode('bar'));
  if(action==='lostcapture')await p.evaluate(()=>svg.releasePointerCapture(anchorRotationSession.pointerId));
  if(action==='return'){const q=await positions();const c=q.center;const s=await p.evaluate(()=>anchorRotationSession.handle);const start=await p.evaluate(s=>{const q=new DOMPoint(s.x,s.y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},s);await send('move',start);end=start}
  await settle();if(action!=='pinch')await send('up',end);assert.deepEqual(await p.evaluate(()=>items[0]),original,action);assert.equal(await p.evaluate(()=>past.length),0,action);assert.equal(await p.evaluate(()=>anchorRotationSession),null,action);cases++;
 }
 await seed('pin',0,true);const initial=await p.evaluate(()=>anchorObjectAngle(items[0]));near(initial,-90);let end=await begin(Math.PI/2);await send('up',end);nearAngle(await p.evaluate(()=>items[0].supportAngle),0);assert.equal(await p.evaluate(()=>items[0].direction),'right');cases++;
 await seed('force',0,true);near(await p.evaluate(()=>anchorObjectAngle(items[0])),-90);end=await begin(-Math.PI/2);await send('up',end);nearAngle(await p.evaluate(()=>items[0].loadAngle),0);cases++;
 for(const type of ['force','pin']){
  const original=await seed(type,23);const m=await p.locator('[data-move-anchor]').boundingBox();const start={x:m.x+m.width/2,y:m.y+m.height/2},end={x:start.x+30,y:start.y+20};
  await send('down',start);assert.equal(await p.evaluate(()=>anchorRotationSession),null);await send('move',end);await send('up',end);const moved=await p.evaluate(()=>copy(items[0]));assert(moved.x!==original.x||moved.y!==original.y);assert.equal(moved[type==='force'?'loadAngle':'supportAngle'],23);assert.equal(await p.evaluate(()=>past.length),1);cases++;
 }
 await seed();await p.evaluate(()=>{selected=null;render()});const body=await p.evaluate(()=>{const q=new DOMPoint(462.5,350).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});await send('down',body);await send('up',body);assert(await p.locator('[data-anchor-rotation-hit]').isVisible());cases++;
 await seed();const r=await p.locator('[data-anchor-rotation-hit]').boundingBox(),m=await p.locator('[data-move-anchor]').boundingBox();assert(r.x+r.width<=m.x||m.x+m.width<=r.x||r.y+r.height<=m.y||m.y+m.height<=r.y);
 for(const zoom of [.5,2]){await p.evaluate(z=>zoomAt(z),zoom);await settle();await positions()}cases++;
 for(const type of ['moment','udl','bar','rigidRegion']){await p.evaluate(type=>{cancelToSelection();items=[make(type,400,350,650,350,{id:'other',...(type==='rigidRegion'?{...rigidDefaults,points:[{x:0,y:0},{x:100,y:0},{x:50,y:80}]}:{})})];selected='other';render()},type);assert.equal(await p.locator('[data-anchor-rotation-hit]').count(),0)}
 await seed();await p.evaluate(()=>{items.push(make('force',700,350,undefined,undefined,{id:'second'}));multiSelection.add('subject');multiSelection.add('second');render()});assert.equal(await p.locator('[data-anchor-rotation-hit]').count(),0);cases++;
 for(const viewport of [{width:800,height:1280},{width:1280,height:800}]){
  await p.setViewportSize(viewport);await settle();
  for(const type of ['force','fixed','roller'])for(const point of [{x:80,y:150},{x:1000,y:600}]){
   await seed(type,17);await p.evaluate(point=>{Object.assign(items[0],point);render()},point);const r=await p.locator('[data-anchor-rotation-hit]').boundingBox();assert(r&&r.width>=43.99&&r.height>=43.99);assert(r.x>=0&&r.y>=0&&r.x+r.width<=viewport.width&&r.y+r.height<=viewport.height);cases++;
  }
 }
 if(pointer==='touch'){await seed('roller',37);fs.mkdirSync('.test-tools/force-support-rotation',{recursive:true});await p.screenshot({path:'.test-tools/force-support-rotation/tablet.png'})}
 assert.deepEqual(errors,[]);await p.close();
}
console.log('PASS Force/Support rotation: '+cases+' mouse/pen/touch cases');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
