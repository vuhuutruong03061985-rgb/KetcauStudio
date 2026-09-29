const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1400,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const xy=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await xy(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const move=async(x,y)=>{const q=await xy(x,y);await p.mouse.move(q.x,q.y)};
  const seed=async()=>p.evaluate(()=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();items=[make('bar',200,300,600,300)];past=[];future=[];selected=null;render();savedDocument=documentText()});
  await seed();const button=p.locator('#annotationTools [data-mode="person"]');assert.equal(await button.count(),1);assert.equal(await button.getAttribute('title'),'Hình người – đặt vị trí đứng');await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
  if(!touch){
   const doc=await p.evaluate(()=>documentText());
   for(const [x,y,angle]of [[400,285,180],[400,315,0]]){await move(x,y);assert.equal(await p.locator('[data-person-preview]').count(),1);const actual=await p.locator('[data-person-preview]').getAttribute('transform');assert(actual.includes(`rotate(${angle})`));assert.equal(await p.evaluate(()=>documentText()),doc);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>savedDocument===documentText()),true)}
   await move(400,500);assert.equal(await p.locator('[data-person-preview]').count(),0);
   for(const [bar,point]of [[{x:400,y:200,x2:400,y2:500},{x:415,y:350}],[{x:400,y:200,x2:400,y2:500},{x:385,y:350}],[{x:200,y:200,x2:600,y2:400},{x:400,y:315}]]){
    await p.evaluate(bar=>{items=[make('bar',bar.x,bar.y,bar.x2,bar.y2)];render()},bar);await move(point.x,point.y);
    const expected=await p.evaluate(point=>personTransform({...solvePersonPlacement({bar:items[0],candidatePoint:point}),size:PERSON_DEFAULT_SIZE}),point);
    const actual=await p.locator('[data-person-preview]').getAttribute('transform');const nums=s=>s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);nums(actual).forEach((v,i)=>near(v,nums(expected)[i]));
   }
   await seed();await button.click();
  }
  // Touch commits directly, without a preceding pointer move.
  await click(400,315);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>past.length),1);assert.equal(await p.evaluate(()=>mode),'person');
  const person=await p.evaluate(()=>copy(items[1]));near(person.x,400);near(person.y,324);near(person.angle,0);assert.equal(person.size,2);assert.deepEqual(Object.keys(person).sort(),['angle','id','size','type','x','y']);
  assert.equal(await p.evaluate(()=>savedDocument===documentText()),false);assert.equal(await p.locator('[data-person-preview]').count(),0);
  await click(400,500);await click(400,300);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>past.length),1);
  await click(500,285);assert.equal(await p.evaluate(()=>items.length),3);assert.equal(await p.evaluate(()=>past.length),2);near(await p.evaluate(()=>items[2].angle),180);
  const nearest=await p.evaluate(()=>{const a=make('bar',200,300,600,300),b=make('bar',200,320,600,320);items=[a,make('thin',200,318,600,318),make('person',400,318),make('bar',400,318,400,318),b];return [findNearestBar({x:400,y:317},30)===b,findNearestBar({x:400,y:310},30)===a,findNearestBar({x:400,y:500},30)===null]});assert.deepEqual(nearest,[true,true,true]);
  for(const w of [550,2200]){
   await seed();await p.evaluate(w=>{camera.w=w;camera.h=720*w/1100;applyCamera();setMode('person')},w);
   const scale=await p.evaluate(()=>Math.abs(svg.getScreenCTM().a));await click(400,300+20/scale);assert.equal(await p.evaluate(()=>items.length),2);await click(400,300+28/scale);assert.equal(await p.evaluate(()=>items.length),2);
  }
  await seed();await button.click();await click(400,315);await p.locator('#resetView').click();await click(400,325);assert.equal(await p.evaluate(()=>selected),await p.evaluate(()=>items[1].id));assert(await p.locator('[data-selection-decoration]').count()>0);
  const before=await p.evaluate(()=>copy(items)),a=await xy(400,325),z=await xy(420,342);
  if(touch){const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:z.x,y:z.y,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
  else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y);await p.mouse.up()}
  const moved=await p.evaluate(()=>copy(items[1]));near(moved.x,before[1].x+20);near(moved.y,before[1].y+17);assert.equal(moved.angle,before[1].angle);assert.equal(moved.size,before[1].size);assert.equal(await p.evaluate(()=>past.length),2);
  await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>items),before);await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>items[1]),moved);
  await p.evaluate(()=>{selected=items[1].id;render()});await p.keyboard.press('Delete');assert.equal(await p.evaluate(()=>items.length),1);await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>items[1]),moved);await p.evaluate(()=>actions.redo[1]());assert.equal(await p.evaluate(()=>items.length),1);await p.evaluate(()=>actions.undo[1]());
  await p.evaluate(()=>{selected=items[1].id;render()});await p.locator('#copyObjects').click();await click(100,100);await p.locator('#pasteObjects').click();await click(160,180);
  const pasted=await p.evaluate(()=>copy(items.at(-1)));assert.notEqual(pasted.id,moved.id);assert.equal(pasted.angle,moved.angle);assert.equal(pasted.size,moved.size);near(pasted.x,moved.x+60);near(pasted.y,moved.y+80);assert.equal(await p.locator('#personSymbol').count(),1);
  const captured=await p.evaluate(()=>selectionGeometry.capture().map(e=>e.id));assert(captured.includes(pasted.id));
  await p.evaluate(()=>{items[0].x+=50;items[0].y+=40;render()});assert.deepEqual(await p.evaluate(()=>items[1]),moved);await p.evaluate(()=>{items.splice(0,1);render()});assert.deepEqual(await p.evaluate(()=>items[0]),moved);
  const saved=await p.evaluate(()=>JSON.parse(documentText()));assert.equal(saved.version,1);assert(!('grid' in saved));assert(!('gridSize' in saved));await p.evaluate(async d=>loadDocument(new File([JSON.stringify(d)],'person.json')),saved);assert.deepEqual(await p.evaluate(()=>items),saved.items);
  const exported=await p.evaluate(()=>{const d=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');return [d.querySelectorAll('#personSymbol').length,d.querySelectorAll('use[href="#personSymbol"]').length,d.querySelectorAll('[data-person-preview]').length]});assert.deepEqual(exported,[1,2,0]);
  if(!touch){for(const action of ['escape','tool','undo','new','open','select']){
   await seed();await button.click();await move(400,315);assert.equal(await p.locator('[data-person-preview]').count(),1);
   if(action==='escape')await p.keyboard.press('Escape');if(action==='tool')await p.locator('[data-mode="thin"]').click();if(action==='undo')await p.evaluate(()=>actions.undo[1]());if(action==='new')await p.evaluate(()=>newDocument());if(action==='open')await p.evaluate(async d=>loadDocument(new File([JSON.stringify(d)],'open.json')),saved);if(action==='select')await p.locator('#resetView').click();assert.equal(await p.locator('[data-person-preview]').count(),0);
  }}
  // Shared marquee/group move includes rotated symbol instances.
  await p.evaluate(()=>{cancelToSelection();camera={x:0,y:0,w:1100,h:720};applyCamera();items=[make('person',300,250,undefined,undefined,{angle:90,size:2}),make('person',450,250,undefined,undefined,{angle:180,size:3})];past=[];future=[];render()});
  const start=await xy(230,170),end=await xy(480,300);
  if(!touch){
   await p.mouse.move(start.x,start.y);await p.mouse.down();await p.mouse.move(end.x,end.y);await p.mouse.up();assert.equal(await p.evaluate(()=>selectedObjectIds().size),2);
   const original=await p.evaluate(()=>copy(items)),from=await xy(280,250),to=await xy(290,267);
   await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:3});await p.mouse.up();
   const group=await p.evaluate(()=>copy(items));for(let i=0;i<2;i++){near(group[i].x,original[i].x+10);near(group[i].y,original[i].y+17);assert.equal(group[i].angle,original[i].angle);assert.equal(group[i].size,original[i].size)}
   assert.equal(await p.evaluate(()=>past.length),1);await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>items),original);
  }else{
   await seed();await button.click();const cdp=await context.newCDPSession(p),a=await xy(400,315),b=await xy(500,315),snapshot=await p.evaluate(()=>documentText());
   const send=(type,points)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points});
   await send('touchStart',[{id:0,x:a.x,y:a.y}]);assert.equal(await p.evaluate(()=>items.length),2);
   await send('touchStart',[{id:0,x:a.x,y:a.y},{id:1,x:b.x,y:b.y}]);await send('touchEnd',[]);
   assert.equal(await p.evaluate(()=>documentText()),snapshot);assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.locator('[data-person-preview]').count(),0);
  }
  assert.deepEqual(errors,[]);console.log(`PASS person ${touch?'touch (emulated)':'mouse'}: tool/preview, direct placement, nearest/zoom, history, free move, delete/copy, independence, model/export and cleanup`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
