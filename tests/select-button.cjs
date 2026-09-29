const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 for(const selector of ['#resetView']){
  await p.evaluate(()=>{items=[make('bar',200,200,600,200)];setMode('bar');first={x:100,y:100};panEnabled=true;gesture={kind:'pan'};render()});
  await p.locator(selector).click();
  assert.deepEqual(await p.evaluate(()=>[mode,panEnabled,gesture,first]),['select',false,null,null]);
  const q=await p.evaluate(()=>{const q=new DOMPoint(400,200).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});
  await p.mouse.click(q.x,q.y);assert.equal(await p.evaluate(()=>selected),await p.evaluate(()=>items[0].id));
 }
 console.log('PASS Select button exit pan/drawing and select a line');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
