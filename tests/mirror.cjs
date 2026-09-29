const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof mirroredObjects==='function');
await p.evaluate(()=>{selected=null;multiSelection.clear();render()});
await p.locator('#mirrorObjects').click();
assert.equal(await p.locator('#mirrorObjects').getAttribute('aria-pressed'),'true');
assert((await p.locator('#mirrorObjects').evaluate(b=>getComputedStyle(b).boxShadow)).includes('inset'));
await p.locator('#mirrorObjects').click();assert.equal(await p.locator('#mirrorObjects').getAttribute('aria-pressed'),'false');
await p.locator('#mirrorObjects').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#mirrorObjects').getAttribute('aria-pressed'),'false');
await p.locator('#mirrorObjects').click();await p.evaluate(()=>{selected=items[0].id;render()});await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>mode),'mirror');
await p.locator('#resetView').click();assert.equal(await p.locator('#mirrorObjects').getAttribute('aria-pressed'),'false');
const result=await p.evaluate(()=>{
const source=[make('bar',100,100,200,100),make('force',150,150,undefined,undefined,{loadAngle:0,label:'P_A'}),make('curve',100,200,undefined,undefined,{curvePoints:[{x:50,y:30},{x:100,y:0}]}),make('dim',100,300,200,300,{offset:50}),make('moment',100,100,undefined,undefined,{rotation:'cw'})];
const once=mirroredObjects(source,{x:300,y:0},{x:300,y:500}),twice=mirroredObjects(once,{x:300,y:0},{x:300,y:500});return {once,twice,source};});
assert.equal(result.once[0].x,500);assert.equal(result.once[0].x2,400);assert.equal(result.once[1].loadAngle,180);assert.equal(result.once[1].label,'P_A');assert.equal(result.once[3].offset,-50);assert.equal(result.once[4].rotation,'ccw');assert.deepEqual(result.twice[2].curvePoints,result.source[2].curvePoints);
await p.evaluate(()=>{items=[make('bar',100,100,200,100)];selected=items[0].id;render()});await p.locator('#mirrorObjects').click();
async function click(x,y){const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});await p.mouse.click(q.x,q.y)}
await click(300,100);await click(300,400);await p.getByRole('button',{name:'Giữ bản gốc',exact:true}).click();assert.equal(await p.evaluate(()=>items.length),2);await p.locator('#undo').click();assert.equal(await p.evaluate(()=>items.length),1);
console.log('PASS reflection geometry, loads, curves, labels, dimensions, keep original and undo');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
