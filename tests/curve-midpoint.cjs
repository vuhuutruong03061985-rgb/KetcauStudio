const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
await p.evaluate(()=>{items=[];setMode('curve')});
async function click(x,y){const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});await p.mouse.click(q.x,q.y)}
await click(200,300);await click(400,150);await click(600,300);
assert.equal(await p.evaluate(()=>items.length),1);assert.equal(await p.evaluate(()=>items[0].type),'curve');
const curve=await p.evaluate(()=>curvePath(items[0])),numbers=curve.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);assert.equal(numbers.length,6);numbers.forEach((v,i)=>assert(Math.abs(v-[200,300,400,0,600,300][i])<.001));
assert.equal(await p.evaluate(()=>validate({format:'ket-cau-studio',version:1,items:copy(items)}).length),1);
assert((await p.evaluate(()=>exportSVG())).includes(curve));
await p.evaluate(()=>{selected=items[0].id;render()});await p.locator('#copyObjects').click();await click(200,300);await p.locator('#pasteObjects').click();await click(700,400);assert.deepEqual(await p.evaluate(()=>items[1].curvePoints),await p.evaluate(()=>items[0].curvePoints));
await p.locator('#undo').click();assert.equal(await p.evaluate(()=>items.length),1);
await p.evaluate(()=>{items.push(make('thin',200,500,500,500));});assert.deepEqual(await p.evaluate(()=>midpointSnap({x:352,y:502})),{x:350,y:500});
assert.deepEqual(errors,[]);console.log('PASS curve through 3 points, JSON, export, copy/undo and midpoint on line');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
