const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
async function click(x,y,shift=false){const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});if(shift)await p.keyboard.down('Shift');await p.mouse.click(q.x,q.y);if(shift)await p.keyboard.up('Shift')}
await p.evaluate(()=>{items=[];setMode('bar')});await click(200,200);await click(400,260,true);
assert.deepEqual(await p.evaluate(()=>[items[0].x2,items[0].y2].map(Math.round)),[400,200]);
await p.locator('[data-mode="thin"]').click();await click(600,200);await click(660,400,true);
assert.deepEqual(await p.evaluate(()=>[items[1].x2,items[1].y2].map(Math.round)),[600,400]);
await p.locator('[data-mode="dashed"]').click();await click(200,500);await click(400,600);
assert.deepEqual(await p.evaluate(()=>[items[2].x2,items[2].y2].map(Math.round)),[400,600]);
await p.evaluate(()=>{mode='select';render()});assert.equal(await p.evaluate(()=>mode),'select');
await click(300,200);await p.locator('[data-mode=dashed]').click();assert.equal(await p.evaluate(()=>items[0].type),'dashed');
await p.locator('#undo').click();assert.equal(await p.evaluate(()=>items[0].type),'bar');
await p.evaluate(()=>{selected=null;multiSelection=new Set(items.map(o=>o.id));render()});
const geometry=await p.evaluate(()=>items.map(({id,x,y,x2,y2})=>({id,x,y,x2,y2})));
await p.evaluate(()=>{mode='select';render()});assert.equal(await p.evaluate(()=>multiSelection.size),3);
await p.locator('[data-mode=thin]').click();assert(await p.evaluate(()=>items.every(o=>o.type==='thin')));
assert.deepEqual(await p.evaluate(()=>items.map(({id,x,y,x2,y2})=>({id,x,y,x2,y2}))),geometry);
assert.deepEqual(errors,[]);console.log('PASS Shift horizontal/vertical, free diagonal, selected line conversion, group geometry and undo');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
