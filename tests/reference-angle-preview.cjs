const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const api=vm.runInNewContext(source.slice(source.indexOf('function rotateVector('),source.indexOf('function rigidWorld('))+source.slice(source.indexOf('function getThinBarFrame('),source.indexOf('function thinReferenceOverrideAt('))+';({getReferenceBarFrame,referenceAngleToGlobalPlacementAngle,solveReferenceAnglePreviewGeometry})');
const {getReferenceBarFrame:frame,referenceAngleToGlobalPlacementAngle:global,solveReferenceAnglePreviewGeometry:solve}=api;
const near=(a,b,tolerance=1e-7)=>assert(Math.abs(a-b)<tolerance,`${a} != ${b}`);
for(const bar of [{x:0,y:0,x2:100,y2:0},{x:0,y:0,x2:0,y2:100},{x:0,y:0,x2:100,y2:100}]){
 const f=frame(bar),reverse=frame({x:bar.x2,y:bar.y2,x2:bar.x,y2:bar.y});
 for(const angle of [0,-0,1e-10,30,-30,90,-90,180,-180,37.25]){
  const options={anchor:{x:80,y:70},referenceFrame:f,globalPlacementAngle:global(angle,f),localAngle:angle,radius:30},before=JSON.stringify(options);
  const g=solve(options);assert.equal(JSON.stringify(options),before);assert(!Object.is(g.signedAngle,-0));assert.deepEqual(g,solve({...options,referenceFrame:reverse}));
  const start=Math.atan2(f.tangent.y,f.tangent.x),mid=start+g.signedAngle*Math.PI/360,end=start+g.signedAngle*Math.PI/180;
  near(g.arcMidPoint.x,80+30*Math.cos(mid));near(g.arcMidPoint.y,70+30*Math.sin(mid));near(g.arcEnd.x,80+30*Math.cos(end));near(g.arcEnd.y,70+30*Math.sin(end));
 }
}
for(const referenceFrame of [null,{},frame({x:0,y:0,x2:0,y2:0}),{length:1,tangent:{x:0,y:0},globalAngle:0}])assert.equal(solve({anchor:{x:0,y:0},referenceFrame,globalPlacementAngle:0,localAngle:0}),null);
console.log('PASS pure reference preview: signed cardinal/diagonal arcs, reversed endpoints, zero/180, invalid frames, non-mutating');
const {chromium}=require('../.test-tools/node_modules/playwright'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{for(const touch of [false,true]){
 const p=await browser.newPage({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}},{x,y});
 const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
 const move=async(x,y)=>{const q=await screen(x,y);await p.mouse.move(q.x,q.y)};
 const seed=async(type,subtype='pin',bars=[[200,300,500,300]])=>{await p.evaluate(({type,subtype,bars})=>{document.activeElement.blur();setMode('select');items=bars.map((b,i)=>make('bar',...b,{id:'b'+i}));past=[];future=[];selected=null;snapEnabled=false;$('support').value=subtype;setMode(type)},{type,subtype,bars});await tap(300,300)};
 const lock=angle=>p.evaluate(angle=>{if(mode==='support')lockSupportNumericAngle(angle);else lockLoadNumericAngle(angle)},angle);
 const input=p.locator('#dynamicInputValue'),arc=p.locator('.reference-angle-preview');
 for(const type of ['support','force']){
  for(const subtype of type==='support'?['pin','roller','fixed','pin-plain','roller-plain']:['force']){
   await seed(type,subtype);
   const before=await p.evaluate(()=>({json:documentText(),history:past.length}));
   for(const angle of [0,30,-30,90,-90,180]){
    await lock(angle);assert.equal(await arc.count(),angle===0?0:1);near(Number(await input.inputValue()),angle);
    const result=await p.evaluate(()=>{const g=activeReferenceAnglePreview(),c=svg.getScreenCTM(),panel=$('dynamicInput').getBoundingClientRect(),pt=new DOMPoint(g.inputAnchor.x,g.inputAnchor.y).matrixTransform(c);return{direction:g.arcMidDirection,radius:g.radius*Math.hypot(c.a,c.b),inputX:pt.x,inputY:pt.y,rect:{x:panel.x,y:panel.y,width:panel.width,height:panel.height},text:svg.querySelectorAll('.reference-angle-preview text').length,global:mode==='support'?supportPlacementSession.previewAngle:loadPlacement.globalPlacementAngle,angle:g.signedAngle,fill:svg.querySelector('.reference-angle-preview')?.getAttribute('fill'),tail:mode==='force'?loadVector({loadAngle:loadPlacement.angle}).map(v=>-v):null}});
    near(result.radius,30);near(result.global,angle===-90?180:angle-90);assert.equal(result.text,0);near(result.rect.x,result.inputX+(result.direction.x<0?-result.rect.width:0),.03);near(result.rect.y,result.inputY+(result.direction.y<0?-result.rect.height:0),.03);assert(result.rect.x>=0&&result.rect.x+result.rect.width<=1500);
    if(result.tail){near(result.tail[0],Math.cos(angle*Math.PI/180));near(result.tail[1],Math.sin(angle*Math.PI/180))}
    if(angle){assert.equal(await arc.getAttribute('stroke'),'#14B8A6');assert.equal(await arc.getAttribute('pointer-events'),'none');assert.equal(await arc.getAttribute('stroke-dasharray'),'4 3');assert.equal(result.fill,'none')}
    await p.evaluate(()=>render());assert.equal(await arc.count(),angle===0?0:1);assert.equal(await p.locator('#dynamicInput').count(),1);assert.equal(await p.locator('#dynamicInput input:visible').count(),1);
   }
   assert.deepEqual(await p.evaluate(()=>({json:documentText(),history:past.length})),before);
   assert.equal(await p.evaluate(()=>{render(true);const has=!!svg.querySelector('.reference-angle-preview');render();return has}),false);
   await input.focus();const box=await p.locator('#dynamicInput').boundingBox();await input.fill('30');await move(450,450);assert.deepEqual(await p.locator('#dynamicInput').boundingBox(),box);near(Number(await input.inputValue()),30);await input.press('Enter');assert.equal(await arc.count(),0);assert.equal(await p.locator('#dynamicInput').isVisible(),false);
  }
  // LIVE and LOCKED override consumes click, and uses the same signed field value.
  for(const locked of [false,true]){
   await seed(type,'pin',[[200,300,500,300],[300,200,300,500]]);await tap(330,300);await move(430,420);if(locked)await lock(30);
   const before=await p.evaluate(()=>mode==='support'?supportPlacementSession.previewAngle:loadPlacement.globalPlacementAngle);await tap(300,330);
   const after=await p.evaluate(()=>({global:mode==='support'?supportPlacementSession.previewAngle:loadPlacement.globalPlacementAngle,local:activeReferenceAnglePreview().signedAngle,count:items.length,history:past.length}));
   near(after.global,locked?30:before);near(Number(await input.inputValue()),after.local,.001);assert.equal(after.count,2);assert.equal(after.history,0);assert.equal(await arc.count(),1);
  }
  // Camera changes rebuild the CSS-sized arc without requiring pointer movement.
  await seed(type);await lock(30);
  for(const w of [550,2200,1100]){
   const radius=await p.evaluate(w=>{camera={x:20,y:10,w,h:w*720/1100};applyCamera();const path=svg.querySelector('.reference-angle-preview');return Number(path.getAttribute('d').split(' A')[1].split(' ')[0])*Math.abs(svg.getScreenCTM().a)},w);near(radius,30);
  }
  await p.evaluate(()=>{camera={x:0,y:0,w:1100,h:720};applyCamera()});
  // No reference keeps global entry; loss returns the editor to normal positioning.
  await seed(type);await move(430,420);await p.evaluate(()=>{items=[];render()});assert.equal(await arc.count(),0);await move(470,470);assert.equal(await arc.count(),0);
  const fallback=await p.evaluate(()=>{const n=mode==='support'?supportNumericSession:loadNumericSession,a=n.touch?n.initialAnchor:n.cursorAnchor,r=$('dynamicInput').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,a}});
  near(fallback.x,fallback.a.clientX+16,.03);near(fallback.y,fallback.a.clientY-16-fallback.h,.03);
  await seed(type,'pin',[]);await move(430,420);assert.equal(await arc.count(),0);
  // A final tap needs no pointermove and leaves no transient state in saved data.
  await seed(type);await tap(450,450);assert.equal(await arc.count(),0);assert.equal(await p.evaluate(()=>items.length),2);assert.equal(await p.evaluate(()=>/reference-angle-preview|inputAnchor|arcMidPoint/.test(documentText())),false);
  for(const action of ['undo','redo','select','tool','new','open','rollback','pointercancel','escape']){
   await seed(type);await lock(30);await p.evaluate(action=>{if(action==='undo'||action==='redo')actions[action][1]();if(action==='select')activateSelection();if(action==='tool')setMode('bar');if(action==='new'){savedDocument=documentText();newDocument()}if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1}));if(action==='escape')cancelToSelection()},action);assert.equal(await arc.count(),0,`${type} ${action}`);
  }
 }
 const seedUDL=async(span=[200,300,400,300],bars=[[100,300,500,300]])=>{
  await p.evaluate(bars=>{document.activeElement.blur();setMode('select');items=bars.map((b,i)=>make('bar',...b,{id:'b'+i}));past=[];future=[];selected=null;snapEnabled=false;setMode('udl')},bars);
  await tap(span[0],span[1]);assert.equal(await arc.count(),0);await tap(span[2],span[3]);
 };
 const checkEnd=async()=>{
  const g=await p.evaluate(()=>{const g=activeReferenceAnglePreview(),s=loadPlacement,c=svg.getScreenCTM(),q=new DOMPoint(g.inputAnchor.x,g.inputAnchor.y).matrixTransform(c),r=$('dynamicInput').getBoundingClientRect();return {center:{x:g.arcStart.x-g.radius*g.startDirection.x,y:g.arcStart.y-g.radius*g.startDirection.y},a:s.a,b:s.b,reference:s.referenceAnchor,local:g.signedAngle,tail:loadVector({loadAngle:s.angle}).map(v=>-v),end:g.endDirection,q:{x:q.x,y:q.y},rect:{x:r.x,y:r.y,w:r.width,h:r.height},mid:g.arcMidDirection}});
  near(g.center.x,g.b.x);near(g.center.y,g.b.y);near(g.reference.x,(g.a.x+g.b.x)/2);near(g.reference.y,(g.a.y+g.b.y)/2);assert(Math.hypot(g.center.x-g.reference.x,g.center.y-g.reference.y)>50);
  near(g.tail[0],g.end.x);near(g.tail[1],g.end.y);return g;
 };
 for(const span of [[200,300,400,300],[400,300,200,300],[300,200,300,400],[200,200,400,400]])for(const reverse of [false,true]){
  await seedUDL(span,[reverse?[500,300,100,300]:[100,300,500,300]]);
  const before=await p.evaluate(()=>({doc:documentText(),history:past.length,saved:savedDocument}));
  for(const angle of [0,30,-30,90,-90,180]){
   await lock(angle);const g=await checkEnd();near(g.local,angle);assert.equal(await arc.count(),angle?1:0);
   near(g.rect.x,g.q.x+(g.mid.x<0?-g.rect.w:0),.03);near(g.rect.y,g.q.y+(g.mid.y<0?-g.rect.h:0),.03);
   assert.equal(await p.locator('#dynamicInput input:visible').count(),1);assert.equal(await p.locator('.reference-angle-preview text').count(),0);
   await move(550,500);near((await checkEnd()).local,angle);await p.evaluate(()=>render());assert.equal(await arc.count(),angle?1:0);
  }
  assert.deepEqual(await p.evaluate(()=>({doc:documentText(),history:past.length,saved:savedDocument})),before);
  assert.equal(await p.evaluate(()=>exportSVG().includes('reference-angle-preview')),false);
  await input.focus();const box=await p.locator('#dynamicInput').boundingBox();await input.fill('30');await move(520,470);assert.deepEqual(await p.locator('#dynamicInput').boundingBox(),box);await input.press('Enter');assert.equal(await arc.count(),0);
 }
 for(const locked of [false,true]){
  await seedUDL(undefined,[[100,300,500,300],[300,100,300,500]]);await move(500,500);await checkEnd();if(locked)await lock(30);
  const global=await p.evaluate(()=>loadPlacement.globalPlacementAngle);await tap(300,330);const g=await checkEnd();near(await p.evaluate(()=>loadPlacement.globalPlacementAngle),locked?30:global);assert.equal(await p.evaluate(()=>loadPlacement.referenceBarId),'b1');assert.equal(await p.evaluate(()=>past.length),0);near(Number(await input.inputValue()),g.local,.001);
 }
 await seedUDL(undefined,[]);await move(500,500);assert.equal(await arc.count(),0);
 await seedUDL();await tap(500,500);assert.equal(await arc.count(),0);assert.equal(await p.evaluate(()=>items.at(-1).type),'udl');
 for(const action of ['undo','redo','select','tool','new','open','rollback','pointercancel','escape','loss']){
  await seedUDL();await lock(30);await p.evaluate(action=>{if(action==='undo'||action==='redo')actions[action][1]();if(action==='select')activateSelection();if(action==='tool')setMode('bar');if(action==='new'){savedDocument=documentText();newDocument()}if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerType:'mouse',pointerId:1}));if(action==='escape')cancelToSelection();if(action==='loss'){items=[];render()}},action);assert.equal(await arc.count(),0,`UDL ${action}`);
 }
 console.log(`PASS UDL end-edge ${touch?'emulated touch':'desktop'}: logical spanEnd, midpoint reference, reversed span/bar, signed angles, body ray, input/focus, LIVE/LOCKED switch, cleanup and transient export/history`);
 assert.deepEqual(errors,[]);console.log(`PASS reference preview ${touch?'emulated touch':'desktop'}: all supports/force, signed angles, one field, focus stability, overrides, reference loss, clean render/history/JSON and cleanup`);await p.close();
}}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
