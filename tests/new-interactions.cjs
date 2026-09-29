const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url');const path=require('node:path');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 async function screen(x,y){return p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},{x,y})}
 async function click(x,y){const q=await screen(x,y);await p.mouse.click(q.x,q.y)}
 await p.evaluate(()=>{items=[];setMode('bar')});await click(200,200);await click(400,200);await click(400,400);assert.equal(await p.evaluate(()=>items.length),2);assert.deepEqual(await p.evaluate(()=>[items[1].x,items[1].y]),[400,200]);
 await p.keyboard.press('Escape');await p.keyboard.press('Escape');await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>mode),'select');
 await p.keyboard.press('Alt+s');assert.equal(await p.evaluate(()=>mode),'labelEdit');await p.keyboard.press('Escape');
 await p.evaluate(()=>{items=[make('thin',200,200,400,200),make('bar',400,200,400,400),make('support',400,200),make('hatch',200,200,undefined,undefined,{points:[{x:0,y:0},{x:200,y:0},{x:200,y:200}],spacing:8,horizontal:false})];setMode('joint')});
 const before=await p.evaluate(()=>copy(items));const a=await screen(400,200),z=await screen(500,300);await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(z.x,z.y,{steps:5});await p.mouse.up();
 assert.deepEqual(await p.evaluate(()=>[items[0].x2,items[0].y2,items[1].x,items[1].y,items[2].x,items[2].y]),[500,300,500,300,500,300]);assert.deepEqual(await p.evaluate(()=>items[3].points[1]),{x:300,y:100});
 await p.keyboard.press('Control+z');assert.deepEqual(await p.evaluate(()=>items),before);
 const check=await p.evaluate(()=>{const c=make('curve',200,400,undefined,undefined,{curvePoints:[{x:200,y:-200},{x:400,y:0}]}),line=make('thin',200,400,600,400);items=[c,line];const poly=closedRegionAt({x:400,y:300});const h=make('hatch',0,0,undefined,undefined,{points:poly,spacing:8,horizontal:false});const input=[c,line,h];const out=deformJoint(input,{x:400,y:200},{x:400,y:100},new Map(input.map(o=>[o.id,newId()])));validate({format:'ket-cau-studio',version:1,items:out});return Math.min(...out[2].points.map(p=>p.y))});assert(Math.abs(check-100)<.3);
 assert.deepEqual(errors,[]);console.log('PASS continuous drawing, Esc x3, Alt+S, joint drag with hatch/support, undo, curved hatch deformation');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
