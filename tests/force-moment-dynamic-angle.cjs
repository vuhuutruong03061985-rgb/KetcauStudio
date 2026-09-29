const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.002,`${a} != ${b}`);
const internal=(type,a)=>(((type==='force'?90:Math.atan2(34,-18)*180/Math.PI)-a)%360+360)%360;
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 for(const touch of [false,true]){
  const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:touch,isMobile:touch}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof beginLoadNumericInput==='function');
  const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
  const tap=async(x,y)=>{const q=await screen(x,y);if(touch)await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)};
  const reset=async type=>{await p.evaluate(type=>{setMode('select');items=[];past=[];future=[];selected=null;snapEnabled=false;document.activeElement?.blur();$('rotation').value='cw';currentMomentRotation='cw';setMode(type)},type);await tap(300,300)};
  const input=p.locator('#dynamicInputValue');
  const shaft=selector=>p.locator(selector+' line[marker-end]').first().evaluate(el=>Object.fromEntries(['x1','y1','x2','y2'].map(k=>[k,Number(el.getAttribute(k))])));
  const checkRay=(g,dx,dy)=>{const len=Math.hypot(dx,dy);near(g.x2,300);near(g.y2,300);near(g.x1-g.x2,75*dx/len);near(g.y1-g.y2,75*dy/len)};
  for(const [dx,dy,angle]of [[0,150,0],[-150,0,90],[150,0,-90],[0,-150,180],[80,130,Math.atan2(-80,130)*180/Math.PI]]){
   await reset('force');
   if(!touch){const q=await screen(300+dx,300+dy);await p.mouse.move(q.x,q.y);near(Number(await input.inputValue()),angle);checkRay(await shaft('[data-load-preview]'),dx,dy)}
   await tap(300+dx,300+dy);const live=await shaft('g[data-id]');checkRay(live,dx,dy);
   await reset('force');await input.fill(String(angle));await input.press('Enter');const numeric=await shaft('g[data-id]');checkRay(numeric,dx,dy);
   for(const key of ['x1','y1','x2','y2'])near(live[key],numeric[key]);
  }
  // Legacy stored angles still describe tail-to-head direction, independent of the new UI adapter.
  for(const angle of [0,90,180,270,37.5]){
   await p.evaluate(angle=>{setMode('select');items=validate({format:'ket-cau-studio',version:1,items:[make('force',300,300,undefined,undefined,{loadAngle:angle})]});selected=null;render()},angle);
   const g=await shaft('g[data-id]'),r=angle*Math.PI/180;checkRay(g,-Math.cos(r),Math.sin(r));
  }
  const momentBody=selector=>p.locator(selector+' path[marker-end]').first().evaluate(arc=>{
   const point=arc.getPointAtLength(arc.getTotalLength()/2),group=arc.parentElement;
   const transform=group.transform.baseVal.consolidate().matrix;
   const mid=new DOMPoint(point.x,point.y).matrixTransform(transform);
   const stem=group.querySelector('line');const anchor=new DOMPoint(Number(stem.getAttribute('x1')),Number(stem.getAttribute('y1'))).matrixTransform(transform);
   return {x:mid.x-anchor.x,y:mid.y-anchor.y,ax:anchor.x,ay:anchor.y};
  });
  for(const angle of [0,90,-90,180,30,-30,45,-135.5]){
   const r=angle*Math.PI/180,dx=-Math.sin(r),dy=Math.cos(r);
   let cw;
   for(const rotation of ['cw','ccw']){
    await reset('moment');if(rotation==='ccw'){await p.locator('[data-mode=moment]').click();await p.locator('input[name=momentDirection][value=ccw]').click();await tap(300,300)}
    // One event ray, no prior hover required for touch; gesture sense remains independent.
    const q=await screen(300+dx*130,300+dy*130);
    if(touch)await p.touchscreen.tap(q.x,q.y);
    else await p.locator('#drawing').dispatchEvent('pointerdown',{clientX:q.x,clientY:q.y,button:0,pointerId:1,pointerType:'mouse'});
    const live=await momentBody('g[data-id]');near(live.ax,300);near(live.ay,300);assert(live.x*dx+live.y*dy>0);near(live.x*dy-live.y*dx,0);
    await reset('moment');if(rotation==='ccw'){await p.locator('[data-mode=moment]').click();await p.locator('input[name=momentDirection][value=ccw]').click();await tap(300,300)}await input.fill(String(angle));
    const preview=await momentBody('[data-load-preview]');await input.press('Enter');const numeric=await momentBody('g[data-id]');
    for(const k of ['x','y','ax','ay']){near(live[k],numeric[k]);near(preview[k],numeric[k])}
    if(cw){near(cw.x,numeric.x);near(cw.y,numeric.y)}else cw=numeric;
   }
  }
  for(const rotation of ['cw','ccw'])for(const angle of [0,37.5,180,270]){
   await p.evaluate(({rotation,angle})=>{setMode('select');items=validate({format:'ket-cau-studio',version:1,items:[make('moment',300,300,undefined,undefined,{rotation,loadAngle:angle})]});selected=null;render()},{rotation,angle});
   const body=await momentBody('g[data-id]'),r=-angle*Math.PI/180,x=rotation==='cw'?-34:34,y=-18;
   // SVG path-length sampling approximates the exact semicircle midpoint.
   assert(Math.abs(body.x-(x*Math.cos(r)-y*Math.sin(r)))<.025);assert(Math.abs(body.y-(x*Math.sin(r)+y*Math.cos(r)))<.025);
  }
  for(const type of ['force','moment']){
   for(const [text,angle] of [['30',30],['-30',-30],['30,5',30.5],['37.5',37.5],['270',-90],['-180',180]]){
    await reset(type);assert.equal(await p.locator('#loadAngleInput').count(),0);assert(await p.locator('#dynamicInput').isVisible());
    if(touch){await input.tap();await input.fill(text)}else await p.keyboard.type(text);
    const q=await screen(450,410);await p.keyboard.down('Shift');await p.mouse.move(q.x,q.y);await p.keyboard.up('Shift');
    near(await p.evaluate(()=>loadPlacement.uiAngle.value),angle);
    await input.press('Enter');const s=await p.evaluate(()=>({items:copy(items),past:past.length,session:loadPlacement,armed:isDynamicNumericInputArmed()}));
    assert.equal(s.items.length,1);assert.equal(s.past,1);near(s.items[0].loadAngle,internal(type,angle));near(s.items[0].x,300);near(s.items[0].y,300);assert.equal(s.session,null);assert.equal(s.armed,false);assert(await p.locator('#dynamicInput').isHidden());
   }
   for(const [x,y,angle]of [[300,450,0],[150,300,90],[450,300,-90],[300,150,180]]){
    await reset(type);await tap(x,y);near(await p.evaluate(()=>items[0].loadAngle),internal(type,angle));
   }
   await reset(type);const q=await screen(380,430);await p.mouse.move(q.x,q.y);near(Number(await input.inputValue()),Math.atan2(-80,130)*180/Math.PI);
   for(const text of ['', '-', 'NaN','Infinity','1.2.3','1,2,3']){
    await reset(type);await input.fill(text);await input.press('Enter');assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);assert(await p.locator('#dynamicInput').isVisible());
   }
   for(const action of ['escape','tool','undo','redo','new','open','rollback','select','pointercancel']){
    await reset(type);
    if(action==='escape')await p.keyboard.press('Escape');
    else await p.evaluate(action=>{if(action==='tool')setMode('bar');if(action==='undo'||action==='redo')actions[action][1]();if(action==='new')newDocument();if(action==='open'){openDocument();openDialog.close()}if(action==='rollback')restoreDrawing(captureDrawing());if(action==='select')activateSelection();if(action==='pointercancel')svg.dispatchEvent(new PointerEvent('pointercancel',{bubbles:true,pointerId:1,pointerType:'mouse'}))},action);
    assert.equal(await p.evaluate(()=>loadPlacement),null);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);assert(await p.locator('#dynamicInput').isHidden());
   }
   if(touch){
    const cdp=await context.newCDPSession(p);
    for(const cancellation of ['cancel','pinch']){
     await reset(type);const q=await screen(450,400);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:q.x,y:q.y}]});
     assert.equal(await p.evaluate(()=>items.length),1);
     if(cancellation==='pinch'){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:q.x,y:q.y},{id:1,x:q.x+80,y:q.y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     }else await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
     assert.equal(await p.evaluate(()=>items.length),0);assert.equal(await p.evaluate(()=>past.length),0);
     assert.equal(await p.evaluate(()=>loadPlacement),null);assert.equal(await p.evaluate(()=>isDynamicNumericInputArmed()),false);
    }
   }
   await reset(type);await input.fill('37.5');await input.press('Enter');
   const round=await p.evaluate(()=>{const original=copy(items[0]);const restored=validate(JSON.parse(documentText()))[0];objectClipboard=[copy(original)];clipboardBase={x:original.x,y:original.y};placeClipboard({x:600,y:400});const pasted=copy(items[1]);const mirrored=mirroredObjects([original],{x:550,y:0},{x:550,y:700})[0];actions.undo[1]();const undone=items.length;actions.redo[1]();return {original,restored,pasted,mirrored,undone,redone:items.length}});
   near(round.restored.loadAngle,round.original.loadAngle);near(round.pasted.loadAngle,round.original.loadAngle);assert.equal(round.undone,1);assert.equal(round.redone,2);assert(Number.isFinite(round.mirrored.loadAngle));if(type==='moment')assert.notEqual(round.mirrored.rotation,round.original.rotation);
  }
  await reset('moment');await p.locator('[data-mode=moment]').click();await p.locator('input[name=momentDirection][value=ccw]').click();await tap(300,300);await input.fill('30');await input.press('Enter');assert.equal(await p.evaluate(()=>items[0].rotation),'ccw');
  await reset('moment');for(const [x,y]of [[400,300],[300,400]]){const q=await screen(x,y);await p.mouse.move(q.x,q.y)}assert.equal(await p.evaluate(()=>loadPlacement.rotation),'cw');
  await p.evaluate(()=>setMode('udl'));await tap(200,400);await tap(500,400);assert(await p.locator('#dynamicInputValue').isVisible());await p.locator('#dynamicInputValue').fill('45');await p.locator('#dynamicInputValue').press('Enter');assert.equal(await p.evaluate(()=>items.at(-1).loadAngle),45);
  assert.deepEqual(errors,[]);console.log(`PASS force/moment dynamic angles ${touch?'touch emulated':'mouse'}: LIVE/LOCKED, adapters, invalid, lifecycle, history, serialization, copy/mirror, CW/CCW and legacy UDL`);await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
