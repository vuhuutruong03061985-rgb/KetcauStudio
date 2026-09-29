const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1400,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof sectionGeometry!=='undefined');
 const result=await p.evaluate(()=>{
  const bar=make('bar',100,200,500,200),curve=make('curve',100,300,undefined,undefined,{curvePoints:[{x:200,y:-100},{x:400,y:0}]}),hatch=make('hatch',100,100,undefined,undefined,{points:[{x:0,y:0},{x:400,y:0},{x:400,y:300},{x:0,y:300}],spacing:8});
  items=[bar,curve,hatch];
  const graph=sectionGeometry.build(items,[{x:300,y:150},{x:300,y:250}]);
  const groups=graph.candidates.map(id=>sectionGeometry.extract(graph,id,items));
  return {bars:groups.map(g=>g.filter(o=>o.type==='bar').length),nonbars:groups.flat().filter(o=>o.type!=='bar').length,source:items.length};
 });
 assert.deepEqual(result.bars,[1,1]);assert.equal(result.nonbars,0);assert.equal(result.source,3);
 await p.evaluate(()=>{items=[make('bar',100,200,500,200),make('thin',100,250,500,250)];render()});
 await p.locator('[data-mode=section]').click();
 async function click(x,y){const q=await p.evaluate(({x,y})=>{const p=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:p.x,y:p.y}},{x,y});await p.mouse.click(q.x,q.y)}
 await click(300,100);await click(300,400);await p.keyboard.press('Enter');await click(450,200);
 await p.locator('#sectionNames input').fill('K1');await p.locator('#sectionNames button[type="submit"]').click();
 assert.equal(await p.evaluate(()=>items.length),2);
 const original=await p.evaluate(()=>JSON.stringify(items));
 const q=await p.evaluate(()=>{const q=new DOMPoint(450,200).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});
 await p.mouse.move(q.x,q.y);await p.mouse.down();await p.mouse.move(q.x+90,q.y+60);await p.mouse.up();
 assert.equal(await p.evaluate(()=>items.length),7);
 assert.equal(await p.evaluate(()=>JSON.stringify(items.filter(o=>!o.sectionExtract))),original);
 assert.deepEqual(await p.evaluate(()=>items.filter(o=>o.sectionAction).map(o=>o.label).sort()),['M_{K1}','N_{K1}','Q_{K1}']);
 assert.equal(await p.evaluate(()=>items.filter(o=>o.sectionMark).length),1);
 assert.equal(await p.evaluate(()=>multiSelection.size),5);
 assert.equal(await p.evaluate(()=>validate(JSON.parse(documentText())).length),7);
 assert(await p.evaluate(()=>items.find(o=>o.sectionExtract&&o.type==='bar').x>300));
 assert(await p.evaluate(()=>{const d=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');const o=items.find(o=>o.sectionAction==='N');return d.querySelector(`[data-id="${o.id}"]`).textContent.includes('K1')}));
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);
 await p.locator('#redo').click();assert.equal(await p.evaluate(()=>items.length),7);
 assert.deepEqual(errors,[]);console.log('PASS finite open cut, conservative curve/hatch ownership, UI grouping, JSON, SVG, undo/redo');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
