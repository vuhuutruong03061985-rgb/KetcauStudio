const {chromium}=require('../.test-tools/node_modules/playwright');
const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:800,height:1100}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 const absent=async()=>{assert.equal(await p.locator('[data-grid-background],#drawingGridPattern,#grid,#snap-grid').count(),0);assert.equal(await p.getByText('Cỡ lưới (px)',{exact:true}).count(),0)};
 await absent();await p.locator('#zoomOut').click();await absent();
 await p.evaluate(()=>{camera.x=-1600;camera.y=2200;applyCamera();render()});await absent();
 await p.setViewportSize({width:1400,height:800});await absent();
 const before=await p.evaluate(()=>documentText());await p.keyboard.press('F4');await absent();assert.equal(await p.evaluate(()=>documentText()),before);
 assert(!/data-grid-background|drawingGridPattern/.test(await p.evaluate(()=>exportSVG())));assert.deepEqual(errors,[]);
 console.log('PASS grid absent across portrait, zoom, pan, resize, F4 and clean export');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
