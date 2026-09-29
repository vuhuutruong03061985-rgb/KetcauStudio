const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 await p.evaluate(()=>{items=[make('bar',200,200,400,200)];selected=items[0].id;snapEnabled=false;render()});
 async function click(x,y){const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});await p.mouse.click(q.x,q.y)}
 await p.locator('#copyObjects').click();assert.equal(await p.evaluate(()=>mode),'copyBase');await click(300,200);
 await p.locator('#pasteObjects').click();assert.equal(await p.evaluate(()=>items.length),1);await click(500,400);
 const result=await p.evaluate(()=>items.map(o=>[o.x,o.y,o.x2,o.y2].map(Math.round)));assert.deepEqual(result,[[200,200,400,200],[400,400,600,400]]);
 await p.keyboard.press('Control+v');await click(500,500);assert.deepEqual(await p.evaluate(()=>[items[2].x,items[2].y].map(Math.round)),[400,500]);
 await p.locator('#undo').click();assert.equal(await p.evaluate(()=>items.length),2);
 await p.keyboard.press('Control+v');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>items.length),2);
 console.log('PASS selected base placement, repeated paste, original intact, undo and cancel');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
