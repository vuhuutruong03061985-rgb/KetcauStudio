const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof loadPlacement!=='undefined');
 await p.evaluate(()=>{items=[];snapEnabled=false;render()});
 async function move(x,y,click=false){const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});await p.mouse.move(q.x,q.y);if(click)await p.mouse.click(q.x,q.y)}
 await p.locator('[data-mode=force]').click();await move(300,300,true);await move(400,220);assert.equal(await p.evaluate(()=>items.length),0);
 await move(410,300,true);assert.equal(await p.evaluate(()=>Math.round(items[0].loadAngle)),180);
 await p.locator('[data-mode=udl]').click();await move(200,400,true);await move(500,400,true);await p.locator('#dynamicInputValue').fill('45');await p.locator('#dynamicInputValue').press('Enter');
 assert.equal(await p.evaluate(()=>items[1].loadAngle),45);
 await p.locator('[data-mode=moment]').click();assert.equal(await p.evaluate(()=>currentMomentRotation),'cw');assert.equal(await p.locator('#momentDirectionPalette').evaluate(el=>el.open),false);await move(500,300,true);await move(550,300);await move(500,250);await move(450,300,true);
 assert.equal(await p.evaluate(()=>items[2].type),'moment');
 await move(600,300,true);await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>loadPlacement),null);assert.equal(await p.evaluate(()=>items.length),3);
 assert.equal(await p.evaluate(()=>validate(JSON.parse(documentText())).length),3);
 console.log('PASS mouse loads, angle, rotation, cancel and JSON');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
