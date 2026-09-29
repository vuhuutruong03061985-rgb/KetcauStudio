const assert=require('node:assert/strict'),{geometry,bar}=require('./section-connectivity.cjs');
const {chromium}=require('../.test-tools/node_modules/playwright'),{pathToFileURL}=require('node:url'),path=require('node:path');
const g=geometry(),b=bar('b',0,0,100,0),v=(x,y)=>({x,y});
const cuts=points=>g.build([b],points).cuts[0].length;
assert.equal(cuts([v(50,10),v(50,30)]),0); // Section extension only.
assert.equal(cuts([v(150,-10),v(150,10)]),0); // Bar extension only.
assert.equal(cuts([v(150,10),v(150,30)]),0); // Both extensions.
assert.equal(cuts([v(50,-10),v(50,10)]),1);
assert.equal(cuts([v(0,-10),v(50,0),v(100,10)]),1); // Shared vertex.
assert.equal(cuts([v(0,-10),v(0,10)]),0); // Existing endpoint.
assert.equal(cuts([v(30,-20),v(30,20),v(70,20),v(70,-20)]),2);
assert.equal(cuts([v(0,-20),v(40,-20),v(60,20),v(100,20)]),1); // Middle only.
for(const n of [2,3,4,5,7])assert.equal(g.segments(Array.from({length:n},(_,i)=>v(i,i*i))).length,n-1);
assert.equal(g.build([b,bar('b2',0,20,100,20)],[v(50,-10),v(50,30)]).cuts.flat().length,2);
assert.equal(cuts([v(20,-20),v(80,20),v(20,20),v(80,-20)]),1); // Self-intersection, same physical cut.
assert.equal(cuts([v(50,-10),v(50,10),v(50.01,10),v(50.01,-10)]),2); // Not topology dedup.
const oldPoints=[v(400,300),v(462,388),v(620,388)];
let old=g.build([bar('b',350,344,600,344)],oldPoints);
assert.equal(old.edges.length,2);assert.equal(old.cuts[0].length,1);assert(Math.abs(old.pieces[0].b.x-431)<1e-6);

(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:true}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.waitForFunction(()=>typeof sectionGeometry!=='undefined');
 // Keep this precision-sensitive geometry fixture at its original drawing dimensions.
 await p.addStyleTag({content:'.canvas-wrap{flex:none;height:739px}'});
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const click=async(x,y,touch=false)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const seed=async(points=oldPoints,objects=[bar('source',350,344,600,344)])=>p.evaluate(({points,objects})=>{
  cancelToSelection();items=objects;past=[];future=[];snapEnabled=false;updateSelection([]);render();setMode('section');sectionPoints=points;finishSection();
 },{points,objects});
 await seed();assert.equal(await p.locator('[data-section-piece]').count(),2);
 assert.equal(await p.locator('[data-section-piece][data-id]').count(),0);
 assert.equal(await p.evaluate(()=>multiSelection.size),0);
 const source=await p.evaluate(()=>JSON.stringify(items));
 let q=await screen(380,344);await p.mouse.move(q.x,q.y);
 assert.equal(await p.locator('[data-section-highlight=true]').count(),1);
 await click(380,344);assert.equal(await p.locator('#sectionNames input').count(),1);
 assert((await p.locator('#sectionNames label').textContent()).includes('(431, 344)'));
 await p.locator('#sectionNames button[type=submit]').click();
 assert.equal(await p.evaluate(()=>past.length),0);
 q=await screen(380,344);await p.mouse.move(q.x,q.y);await p.mouse.down();await p.mouse.move(q.x,q.y+150);await p.mouse.up();
 assert.equal(await p.evaluate(()=>past.length),1);
 assert.equal(await p.evaluate(()=>JSON.stringify(items.filter(o=>!o.sectionExtract))),source);
 assert.equal(await p.evaluate(()=>new Set(items.filter(o=>o.sectionExtract).map(o=>o.sectionGroup)).size),1);
 assert.equal(await p.evaluate(()=>items.filter(o=>o.sectionAction).length),3);
 assert(await p.evaluate(()=>{const doc=JSON.parse(documentText());return doc.version===1&&validate(doc).length===items.length&&!items.some(o=>['componentId','startPort','endPort','neighbors','sectionCutId','sectionEnds'].some(k=>k in o))}));
 assert(await p.evaluate(()=>{const d=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');return !d.querySelector('[data-section-preview]')&&items.filter(o=>o.sectionAction).every(o=>d.querySelector(`[data-id="${o.id}"]`))}));
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(items)),source);
 await p.locator('#redo').click();assert.equal(await p.evaluate(()=>items.filter(o=>o.sectionAction).length),3);
 // Real committed extraction goes through the existing PNG export with hidden N respected.
 await p.evaluate(()=>{const o=items.find(o=>o.sectionAction==='N');o.sectionVisible=false;render();download=async blob=>{const bitmap=await createImageBitmap(blob);window.pngSize=[bitmap.width,bitmap.height];bitmap.close()}});
 assert(await p.evaluate(()=>!new DOMParser().parseFromString(exportSVG(),'image/svg+xml').querySelector(`[data-id="${items.find(o=>o.sectionAction==='N').id}"]`)));
 await p.locator('#png').click();await p.waitForFunction(()=>window.pngSize);assert((await p.evaluate(()=>pngSize)).every(n=>n>0));
 // All pieces of a connected frame highlight together; untouched structures are not candidates.
 const frame=[bar('a',100,200,500,200),bar('b',100,400,500,400),bar('c',100,200,100,400),bar('remote',700,200,850,200)];
 await seed([v(300,100),v(300,500)],frame);q=await screen(200,200);await p.mouse.move(q.x,q.y);
 assert.equal(await p.locator('[data-section-highlight=true]').count(),3);
 assert.equal(await p.locator('[data-section-piece]').count(),5);
 await p.screenshot({path:path.join(require('node:os').tmpdir(),'section-open-polyline-smoke.png')});
 // Both sides of a cut are indistinguishable exactly on its boundary: do not guess.
 await click(300,200);assert.equal(await p.locator('#sectionNames').count(),0);assert.equal(await p.evaluate(()=>sectionPending.component),null);
 // Escape and right click preserve source/history at preview and naming stages.
 for(const key of ['Escape','right']){
  await seed();const before=await p.evaluate(()=>JSON.stringify(items));
  if(key==='Escape')await click(380,344);
  if(key==='Escape')await p.keyboard.press(key);else {q=await screen(380,344);await p.mouse.click(q.x,q.y,{button:'right'})}
  assert.equal(await p.evaluate(()=>mode),'select');assert.equal(await p.locator('[data-section-preview],#sectionNames').count(),0);
  assert.equal(await p.evaluate(()=>JSON.stringify(items)),before);assert.equal(await p.evaluate(()=>past.length),0);
 }
 await seed([v(400,200),v(400,450)],[bar('a',200,344,600,344),bar('b',400,344,400,500)]);
 assert.equal(await p.evaluate(()=>sectionPending),null);assert.equal(await p.evaluate(()=>past.length),0);
 assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.locator('[data-section-conflict]').count(),1);
 assert.equal(await p.locator('#status').count(),0);
 // Browser preview matches finite geometry, including unused segments and ordinary nodes.
 for(const [points,objects,pieces,cutCount]of [
  [[v(200,200),v(400,200),v(400,400),v(600,400)],[bar('a',300,300,500,300)],2,1],
  [[v(400,200),v(400,250)],[bar('a',300,300,500,300)],0,0],
  [[v(600,200),v(600,400)],[bar('a',300,300,500,300)],0,0],
  [[v(400,200),v(400,450)],[bar('a',300,300,500,300),bar('b',300,400,500,400)],4,2],
  [[v(350,200),v(350,400),v(450,400),v(450,200)],[bar('a',300,300,500,300)],3,2],
  [[v(400,200),v(400,400)],[bar('a',300,300,400,300),bar('b',400,300,500,300)],0,0]
 ]){
  await seed(points,objects);assert.equal(await p.locator('[data-section-piece]').count(),pieces);
  assert.equal(await p.evaluate(()=>sectionPending?.graph.cuts.flat().length||0),cutCount);
  assert.equal(await p.evaluate(()=>past.length),0);assert.deepEqual(await p.evaluate(()=>items),objects);
 }
 // First-touch extraction is transactional under pointercancel or a second finger.
 const cdp=await p.context().newCDPSession(p),touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([id,x,y])=>({id,x,y}))});
 for(const cancel of ['cancel','pinch']){
  await seed();await click(380,344,true);await p.locator('#sectionNames button[type=submit]').tap();
  const before=await p.evaluate(()=>JSON.stringify(items));q=await screen(380,344);
  await touch('touchStart',[[0,q.x,q.y]]);await touch('touchMove',[[0,q.x+30,q.y+40]]);
  assert.equal(await p.evaluate(()=>items.filter(o=>o.sectionAction).length),3);
  if(cancel==='cancel')await touch('touchCancel',[]);
  else{await touch('touchStart',[[0,q.x+30,q.y+40],[1,q.x+120,q.y+40]]);await touch('touchEnd',[])}
  assert.equal(await p.evaluate(()=>JSON.stringify(items)),before);
  assert(await p.evaluate(()=>past.length===0&&groupDrag===null&&contacts.size===0));
 }
 // Emulated touch: point collection, component choice, naming and extraction.
 await p.evaluate(()=>{cancelToSelection();items=[make('bar',350,344,600,344)];past=[];future=[];render();setMode('section')});
 for(const pt of oldPoints)await click(pt.x,pt.y,true);
 assert.equal(await p.evaluate(()=>sectionPoints.length),3);await p.keyboard.press('Enter');
 await click(380,344,true);assert.equal(await p.locator('#sectionNames input').count(),1);
 await p.locator('#sectionNames button[type=submit]').tap();await click(380,344,true);
 assert.equal(await p.evaluate(()=>items.filter(o=>o.sectionAction).length),3);assert.equal(await p.evaluate(()=>past.length),1);
 assert.deepEqual(errors,[]);
 console.log('PASS open finite polyline: extension exclusions, vertex dedup, multiple cuts, old closing-edge bug; component hover/selection, naming, source/history/JSON, cancel/T rejection, SVG/PNG, emulated touch creation/pointercancel/pinch rollback');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
