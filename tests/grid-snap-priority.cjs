const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`),nearPoint=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve('.test-tools/grid-snap-priority');fs.mkdirSync(out,{recursive:true});
 for(const touch of [false,true]){
  const context=await browser.newContext({hasTouch:touch,viewport:{width:1400,height:1000}}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const click=async(x,y)=>{const q=await coords(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const reset=async mode=>p.evaluate(mode=>{document.activeElement.blur();cancelToSelection();items=[];past=[];future=[];snapEnabled=true;gridVisible=true;gridSize=25;for(const k in snapOptions)snapOptions[k]=k==='grid';setMode(mode);savedDocument=documentText()},mode);
  const priority=await p.evaluate(()=>{
   setMode('select');snapEnabled=true;gridVisible=true;gridSize=50;
   const event=q=>{const c=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {clientX:c.x,clientY:c.y}};
   const off=()=>{for(const k in snapOptions)snapOptions[k]=k==='grid'},results=[];
   for(const kind of ['endpoint','intersection','midpoint','tangent','member']){
    off();snapOptions[kind]=true;
    if(kind==='endpoint')items=[make('bar',407,407,607,407)];
    else if(kind==='intersection')items=[make('bar',307,407,607,407),make('bar',407,307,407,607)];
    else if(kind==='midpoint')items=[make('bar',307,407,507,407)];
    else items=[make(kind==='member'?'bar':'thin',307,407,607,407)];
    const raw=kind==='endpoint'||kind==='intersection'||kind==='midpoint'?{x:402,y:402}:{x:400,y:402};
    results.push({kind,raw,hit:geometricSnap(raw),grid:gridSnap(raw),point:point(event(raw))});
   }
   off();snapOptions.intersection=true;snapOptions.perpendicular=true;items=[make('thin',100,313,500,313)];setMode('thin');first={x:213,y:117};
   const e=event({x:214,y:312}),perpendicular={hit:constructionSnap(e),point:drawingPoint(e),grid:gridSnap(rawPoint(e))};
   snapOptions.perpendicular=false;const f=event({x:350,y:312}),pending={hit:constructionSnap(f),point:drawingPoint(f),grid:gridSnap(rawPoint(f))};
   return {results,perpendicular,pending};
  });
  priority.results.forEach(r=>{assert(r.hit,r.kind);assert.equal(r.hit.kind,r.kind);nearPoint(r.point,r.hit.point);assert.notDeepEqual(r.point,r.grid);assert(Math.hypot(r.raw.x-r.grid.x,r.raw.y-r.grid.y)<Math.hypot(r.raw.x-r.hit.point.x,r.raw.y-r.hit.point.y))});
  assert.equal(priority.perpendicular.hit.kind,'perpendicular');nearPoint(priority.perpendicular.point,{x:213,y:313});assert.notDeepEqual(priority.perpendicular.point,priority.perpendicular.grid);
  assert.equal(priority.pending.hit.kind,'pendingIntersection');nearPoint(priority.pending.point,priority.pending.hit.point);assert.notDeepEqual(priority.pending.point,priority.pending.grid);
  if(!touch){await p.evaluate(()=>{cancelToSelection();items=[make('bar',413,413,613,413)];for(const k in snapOptions)snapOptions[k]=['grid','endpoint'].includes(k);setMode('bar')});await click(405,405);nearPoint(await p.evaluate(()=>first),{x:413,y:413});await p.screenshot({path:path.join(out,'04-geometry-vs-grid-conflict.png')})}
  for(const mode of ['bar','thin','dashed','linkBar','support','force','moment','udl','rigidRegion']){
   await reset(mode);await click(423,437);
   const anchor=await p.evaluate(mode=>mode==='support'?supportPlacementSession?.anchorPoint:['force','moment','udl'].includes(mode)?loadPlacement?.a:mode==='rigidRegion'?rigidPoints[0]:first,mode);nearPoint(anchor,{x:425,y:425});
   if(['bar','thin','dashed','linkBar','udl'].includes(mode)){
    await click(573,537);const end=await p.evaluate(mode=>mode==='udl'?loadPlacement.b:{x:items.at(-1).x2,y:items.at(-1).y2},mode);nearPoint(end,{x:575,y:525});
   }
  }
  // Actual Dynamic Input commits must retain each locked constraint, even off-lattice.
  for(const [distance,angle]of [[5.5,null],[null,30],[5.5,30]]){
   await reset('bar');await click(423,437);
   if(distance!==null){await p.locator('#dynamicInputValue').fill(String(distance));await p.keyboard.press('Tab')}
   if(angle!==null){await p.locator('#dynamicInputSecondary').fill(String(angle));await p.keyboard.press('Tab')}
   const q=await coords(673,587),expected=await p.evaluate(q=>{const s=barNumericSession.state;return solveBarEndpoint({startPoint:first,candidatePoint:drawingPoint({clientX:q.x,clientY:q.y}),geometryScale,distanceMode:s.distance.mode,distanceValue:s.distance.value,angleMode:s.angle.mode,angleValue:s.angle.value})},q);
   await click(673,587);const o=await p.evaluate(()=>items[0]);nearPoint({x:o.x2,y:o.y2},expected);assert(Math.abs(o.x2/25-Math.round(o.x2/25))>.001||Math.abs(o.y2/25-Math.round(o.y2/25))>.001);
   if(distance!==null)near(Math.hypot(o.x2-o.x,o.y2-o.y),550);
  }
  await reset('select');await p.evaluate(()=>{items=[make('bar',300,413,700,413)];snapOptions.member=true;render();setMode('thin')});await click(425,413);assert(await p.evaluate(()=>!!getThinReferenceBar()));
  const q=await coords(461,467),expected=await p.evaluate(q=>getThinConstrainedGeometry(getThinReferenceBar(),rawPoint({clientX:q.x,clientY:q.y})),q);
  await click(461,467);const thin=await p.evaluate(()=>items.at(-1));nearPoint(thin,expected.drawStartPoint);nearPoint({x:thin.x2,y:thin.y2},expected.endpoint);assert(Math.abs(thin.y2/25-Math.round(thin.y2/25))>.001);
  // Whole-object drags must produce the same non-lattice translation with Grid checked or unchecked.
  const translation=[];
  for(const kind of ['bar','linkBar','rigidRegion','group','sectionGroup']){
   const outputs=[];for(const grid of [false,true]){
    await reset('select');await p.evaluate(({kind,grid})=>{snapOptions.grid=grid;
     if(kind==='rigidRegion')items=[make('rigidRegion',400,400,undefined,undefined,{...rigidDefaults,points:[{x:0,y:0},{x:200,y:0},{x:200,y:100},{x:0,y:100}]})];
     else items=[make(['group','sectionGroup'].includes(kind)?'bar':kind,400,400,700,400)];
     if(['group','sectionGroup'].includes(kind)){items.push(make('bar',400,500,700,500));if(kind==='sectionGroup')items.forEach(o=>o.sectionGroup='grid-translation');else multiSelection=new Set(items.map(o=>o.id))}selected=items[0].id;render();
    },{kind,grid});
    const a=await coords(473,400),b=await coords(496.4,437.6);
    if(touch){const cdp=await context.newCDPSession(p);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x,y:b.y,id:0}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach()}
    else{await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:3});await p.mouse.up()}
    outputs.push(await p.evaluate(()=>items.map(({id,...o})=>o)));
   }
   for(let i=0;i<outputs[0].length;i++){nearPoint(outputs[0][i],{x:423.4,y:['group','sectionGroup'].includes(kind)&&i===1?537.6:437.6});for(const key of ['x','y','x2','y2'])if(key in outputs[0][i])near(outputs[0][i][key],outputs[1][i][key])}
   translation.push({kind,withoutGrid:outputs[0],withGrid:outputs[1]});
  }
  // Existing endpoint editing acquires a point, unlike body translation.
  await reset('select');await p.evaluate(()=>{items=[make('bar',400,400,700,400)];selected=items[0].id;render()});const end=await coords(700,400),dest=await coords(723,537);
  await p.mouse.move(end.x,end.y);await p.mouse.down();await p.mouse.move(dest.x,dest.y,{steps:3});await p.mouse.up();nearPoint(await p.evaluate(()=>({x:items[0].x2,y:items[0].y2})),{x:725,y:525});
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,touch?'touch-evidence.json':'desktop-evidence.json'),JSON.stringify({priority,translation},null,2));await context.close();
 }
 console.log('PASS geometric/construction priority, representative tools, locked Bar, Thin reference, whole-object translation exclusion and endpoint edits (desktop + emulated touch)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
