const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1400,height:1000}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.waitForFunction(()=>typeof eraseCursorSVG!=='undefined');
 await p.evaluate(()=>{items=[make('bar',200,200,500,200),make('text',300,350,undefined,undefined,{label:'Label'})];past=[];future=[];render()});
 const original=await p.evaluate(()=>JSON.stringify(items));
 const cursors=()=>p.evaluate(()=>[svg,...svg.querySelectorAll('[data-id],text,[data-hit-area],line')].map(e=>getComputedStyle(e).cursor));
 const before=await cursors();await p.locator('#delete').click();
 const erase=await p.locator('#drawing').evaluate(e=>getComputedStyle(e).cursor);
 assert(erase.includes('data:image/svg+xml')&&erase.includes('3 15'));
 assert((await cursors()).every(c=>c===erase));
 assert(await p.evaluate(async()=>{const d=new DOMParser().parseFromString(eraseCursorSVG,'image/svg+xml');const im=new Image();im.src='data:image/svg+xml,'+encodeURIComponent(eraseCursorSVG);await im.decode();return im.naturalWidth===24&&im.naturalHeight===24&&d.querySelector('path').getAttribute('d')===toolIconPaths.delete}));
 // Existing temporary pan wins on the canvas and descendants, then restores Erase.
 await p.keyboard.down('Control');await p.keyboard.down('Alt');assert((await cursors()).every(c=>c==='grab'));
 await p.keyboard.up('Alt');await p.keyboard.up('Control');assert((await cursors()).every(c=>c===erase));
 await p.locator('#panView').click();assert((await cursors()).every(c=>c==='grab'));
 await p.locator('#panView').click();assert((await cursors()).every(c=>c===erase));
 await p.keyboard.press('Shift');assert((await cursors()).every(c=>c===erase));
 await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert((await cursors()).every(c=>c===erase));
 await p.locator('#delete').click();assert.deepEqual(await cursors(),before);
 await p.locator('#delete').click();
 // Delete precisely on pointer-down, including a transparent enlarged hit stroke.
 for(const [x,y]of [[350,205],[300,350]]){
  const q=await p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const count=await p.evaluate(()=>items.length);await p.mouse.move(q.x,q.y);await p.mouse.down();
  assert.equal(await p.evaluate(()=>items.length),count-1);assert.equal(await p.evaluate(()=>mode),'erase');await p.mouse.up();
 }
 assert.equal(await p.evaluate(()=>past.length),2);await p.locator('#undo').click();await p.locator('#undo').click();
 assert.equal(await p.evaluate(()=>JSON.stringify(items)),original);assert((await cursors()).every(c=>c===erase));
 await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>mode),'select');assert.deepEqual(await cursors(),before);
 await p.locator('[data-mode=bar]').click();assert(!await p.locator('#drawing').evaluate(e=>e.classList.contains('erase-cursor')));
 assert.deepEqual(errors,[]);console.log('PASS eraser SVG artwork/24px/hotspot, canvas/child cursors, pan/key/blur restoration, exit, immediate/repeated deletion and undo');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
