const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 const result=await p.evaluate(()=>{
  items=[make('thin',100,300,500,300)];setMode('thin');first={x:200,y:100};
  const event=(x,y)=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {clientX:q.x,clientY:q.y}};
  const perpendicular=constructionSnap(event(201,299));
  snapOptions.perpendicular=false;
  const intersection=constructionSnap(event(350,299)),committed=drawingPoint(event(350,299));
  snapEnabled=false;const disabled=constructionSnap(event(350,299));
  return {perpendicular,intersection,committed,disabled};
 });
 assert.equal(result.perpendicular.kind,'perpendicular');assert.deepEqual(result.perpendicular.point,{x:200,y:300});
 assert.equal(result.intersection.kind,'pendingIntersection');assert(Math.abs(result.intersection.point.y-300)<1e-6);
 assert.deepEqual(result.committed,result.intersection.point);assert.equal(result.disabled,null);
 console.log('PASS perpendicular foot, pending line intersection, placement matches hint, F3 disable');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
