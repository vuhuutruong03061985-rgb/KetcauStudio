const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const near=(a,b)=>assert(Math.abs(a-b)<.003,`${a} != ${b}`);
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const out=path.resolve('.test-tools/grid-snap-polish');fs.mkdirSync(out,{recursive:true});
 const context=await browser.newContext({hasTouch:true,viewport:{width:1280,height:800}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');const cdp=await context.newCDPSession(p);
 const settled=()=>p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const shot=async name=>{await settled();await p.screenshot({path:path.join(out,name+'.png')})};
 const tap=async selector=>{await p.locator(selector).tap();await settled()};
 const coords=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 const canvasTap=async(x,y)=>{const q=await coords(x,y);await p.touchscreen.tap(q.x,q.y)};
 const move=async(x,y)=>{const q=await coords(x,y);await p.locator('#drawing').dispatchEvent('pointermove',{clientX:q.x,clientY:q.y,pointerType:'touch'})};
 await p.evaluate(()=>{window.polishCanvasDowns=0;window.polishSyntheticKeys=[];document.addEventListener('pointerdown',e=>{if(svg.contains(e.target))polishCanvasDowns++},true);document.addEventListener('keydown',e=>{if(!e.isTrusted&&['Enter','Escape'].includes(e.key))polishSyntheticKeys.push(e.key)},true)});
 const seed=async mode=>{
  await p.evaluate(mode=>{document.activeElement.blur();cancelToSelection();closeDrawingScales();snapPanel.open=false;items=[];past=[];future=[];snapEnabled=true;gridVisible=true;gridSize=50;for(const k in snapOptions)snapOptions[k]=['grid','member'].includes(k);$('snap-grid').checked=true;updateSnapControls();updateGridControls();syncGridSizeControl();
   if(['thin-reference','support','force','moment','udl'].includes(mode))items=[make('bar',300,350,700,350)];setMode(mode==='thin-reference'?'thin':mode);savedDocument=documentText();render();
  },mode);
  const onReference=['thin-reference','support','force','moment','udl'].includes(mode);await canvasTap(423,onReference?350:337);if(mode==='udl')await canvasTap(623,350);
  await p.evaluate(()=>{window.polishFirst=first;window.polishCapture=dynamicNumericCapture;window.polishSession=mode==='bar'?barNumericSession:mode==='thin'?thinNumericSession:mode==='support'?supportPlacementSession:loadPlacement;polishCanvasDowns=0});
 };
 const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),mode,first:JSON.stringify(first),second:JSON.stringify(second),camera:JSON.stringify(camera),saved:savedDocument,title:document.title}));
 const preserved=async(before,label)=>{assert.deepEqual(await snapshot(),before,label);assert(await p.evaluate(()=>first===polishFirst&&dynamicNumericCapture===polishCapture&&polishSession===(mode==='bar'?barNumericSession:mode==='thin'?thinNumericSession:mode==='support'?supportPlacementSession:loadPlacement)),label);assert.equal(await p.evaluate(()=>polishCanvasDowns),0,label);assert.deepEqual(await p.evaluate(()=>polishSyntheticKeys),[],label)};
 for(const mode of ['bar','thin','thin-reference','support','force','moment','udl']){
  await seed(mode);const before=await snapshot();
  for(const selector of ['#gridToggle','#gridToggle','#snapToggle','#snapToggle','#snap-grid','#snap-grid']){await tap(selector);await preserved(before,mode+' '+selector)}
  if(mode==='bar')await shot('09-active-bar-snap-popup');if(mode==='thin-reference'){assert(await p.evaluate(()=>!!getThinReferenceBar()));await shot('10-thin-reference')}
  await tap('#drawingScalesToggle');await preserved(before,mode+' Scale open');await tap('#drawingScalesToggle');await preserved(before,mode+' Scale close');
  for(const value of ['25','12.5','25']){await p.locator('#gridSize').fill(value);await p.locator('#gridSize').press('Enter');await preserved(before,mode+' spacing '+value);assert.equal(await p.evaluate(()=>gridSize),Number(value))}
  await p.locator('#gridSize').blur();await p.evaluate(()=>snapPanel.open=false);
  if(mode==='bar'){
   await p.evaluate(()=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:480});Object.defineProperty(visualViewport,'offsetTop',{configurable:true,value:0})});await tap('#gridSize');await p.evaluate(()=>visualViewport.dispatchEvent(new Event('resize')));await settled();const b=await p.locator('#gridSize').boundingBox();assert(b.y+b.height<=480);await preserved(before,'Bar visual keyboard');await shot('keyboard-viewport');
   await p.evaluate(()=>{delete visualViewport.height;delete visualViewport.offsetTop;visualViewport.dispatchEvent(new Event('resize'))});await p.locator('#gridSize').blur();await settled();
  }
  if(['bar','thin'].includes(mode)){await canvasTap(573,437);const o=await p.evaluate(()=>items.at(-1));near(o.x2,575);near(o.y2,425)}
  else if(mode==='thin-reference'){
   const q=await coords(573,437),expected=await p.evaluate(q=>getThinConstrainedGeometry(getThinReferenceBar(),rawPoint({clientX:q.x,clientY:q.y})),q);await canvasTap(573,437);const o=await p.evaluate(()=>items.at(-1));near(o.x2,expected.endpoint.x);near(o.y2,437);assert.notEqual(o.y2,425);
  }else{
   const expected=await p.evaluate(()=>{if(mode==='support'){supportPlacementSession.angle={mode:'locked',value:31};return {anchor:{...supportPlacementSession.anchorPoint},angle:supportGlobalAngle()}}loadPlacement.uiAngle={mode:'locked',value:31};resolveLoadUserAngle();return {anchor:{...loadPlacement.a},angle:loadPlacement.angle}});
   await canvasTap(573,437);const o=await p.evaluate(()=>items.at(-1));near(o.x,expected.anchor.x);near(o.y,expected.anchor.y);near(mode==='support'?o.supportAngle:o.loadAngle,expected.angle);
  }
 }
 // Construction wins before Grid; locked Bar consumes the candidate without a post-solver snap.
 await seed('bar');await p.evaluate(()=>{items=[make('thin',300,513,700,513)];snapOptions.perpendicular=true;snapOptions.intersection=true;render()});await move(401,512);
 assert.equal(await p.locator('[data-extra-snap-hint="perpendicular"]').count(),1);assert.equal(await p.locator('[data-rigid-snap="grid"]').count(),0);near(await p.evaluate(()=>hover.y),513);await shot('03-construction-wins');
 await p.locator('#dynamicInputValue').fill('2.37');await p.keyboard.press('Tab');await p.locator('#dynamicInputSecondary').fill('31');await p.keyboard.press('Tab');assert.deepEqual(await p.evaluate(()=>[barNumericSession.state.distance,barNumericSession.state.angle]),[{mode:'locked',value:2.37},{mode:'locked',value:31}]);await canvasTap(800,600);assert.equal(await p.evaluate(()=>items.length),2);const locked=await p.evaluate(()=>items.at(-1));near(Math.hypot(locked.x2-locked.x,locked.y2-locked.y),237);assert(Math.abs(locked.x2/50-Math.round(locked.x2/50))>.001);assert.equal(await p.locator('[data-rigid-snap="grid"]').count(),0);
 // Keep one finger on an active drag while a second finger taps a control outside the canvas.
 await p.evaluate(()=>{cancelToSelection();items=[make('bar',400,350,700,350)];selected=items[0].id;gridVisible=true;gridSize=50;snapEnabled=true;for(const k in snapOptions)snapOptions[k]=k==='grid';render();polishCanvasDowns=0});
 const a=await coords(473,350),b=await coords(496.4,387.6);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...a}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,...b}]});
 const dragState=await snapshot(),box=await p.locator('#gridToggle').boundingBox(),control={id:1,x:box.x+box.width/2,y:box.y+box.height/2};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...b},control]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[control]});assert.deepEqual(await snapshot(),dragState);assert.equal(await p.evaluate(()=>polishCanvasDowns),1);assert(await p.evaluate(()=>!!drag));await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
 // Group Grid fallback keeps one delta and does not claim an unrelated rigid marker.
 await p.evaluate(()=>{cancelToSelection();items=[make('bar',400,350,700,350),make('thin',400,450,700,450)];selected=items[0].id;multiSelection=new Set(items.map(o=>o.id));gridVisible=true;snapEnabled=true;gridSize=50;for(const k in snapOptions)snapOptions[k]=k==='grid';render()});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,...a}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,...b}]});near(await p.evaluate(()=>items[0].x),427);near(await p.evaluate(()=>items[1].x),427);assert.equal(await p.locator('[data-rigid-snap="grid"]').count(),0);await shot('12-group-grid');await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await p.evaluate(()=>{cancelToSelection();gridVisible=true;render()});
 const geometry=await p.evaluate(()=>({bottoms:[leftDrawingBounds().bottom,rightCommandBounds().bottom],radii:[leftDrawingMenu.layout.radius,rightCommandMenu.layout.radius]}));assert.deepEqual(geometry,{bottoms:[732,732],radii:[304.04759747124507,248.81914748738225]});
 const layout=[];for(const [width,height,name]of [[1280,800,'14-landscape'],[800,1280,'13-portrait-popup'],[800,777,'15-800x777'],[800,766,'16-800x766'],[432,800,'17-432x800'],[431,800,'18-431x800'],[390,800,'390x800']]){
  await p.evaluate(()=>{document.activeElement.blur();snapPanel.open=false});await p.setViewportSize({width,height});const admitted=width>=432&&height!==766;await p.waitForFunction(v=>document.body.dataset.radialPrimary===String(v),admitted);await settled();
  if(!await p.locator('#snapToggle').isVisible())await tap('#ribbonToggle');if(await p.evaluate(()=>snapEnabled))await tap('#snapToggle');await tap('#snapToggle');
  const popup=await p.locator('#snapSettings .snap-choices').boundingBox();assert(popup&&popup.x>=0&&popup.y>=0&&popup.x+popup.width<=width+.01&&popup.y+popup.height<=height+.01);
  assert.equal(await p.locator('#snapSettings .snap-choices input').count(),8);for(const label of await p.locator('#snapSettings .snap-choices label').all()){const r=await label.boundingBox();assert(r.width>=44&&r.height>=44)}
  const old=await p.locator('#snap-grid').isChecked();await tap('#snap-grid');assert.equal(await p.locator('#snap-grid').isChecked(),!old);await tap('#snap-grid');
  if(admitted){const bar=await p.locator('#tabletBottomRightBar').boundingBox(),input=await p.locator('#gridSize').boundingBox();assert.equal(bar.width,208);assert.equal(bar.height,48);assert.equal(input.width,60);assert.equal(input.height,44);for(const id of ['gridToggle','snapToggle','drawingScalesToggle']){const r=await p.locator('#'+id).boundingBox();assert.equal(r.width,44);assert.equal(r.height,44)}}
  await shot(name);layout.push({width,height,admitted,popup});
 }
 await p.setViewportSize({width:1280,height:800});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');await p.evaluate(()=>snapPanel.open=false);await p.locator('.semicircle-right-menu [data-demo-id="hub"]').dispatchEvent('click');await p.locator('.semicircle-right-menu [data-demo-id="snapOptions"]').focus();await p.keyboard.press('Enter');await p.keyboard.press('Enter');assert(await p.evaluate(()=>snapPanel.open));assert(await p.locator('#snap-grid').isVisible());await shot('right-snap-route');
 assert.deepEqual(await p.evaluate(()=>rightCommandRings.map(r=>r.ids)),[['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],['panView','snapOptions','openCalculator']]);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({geometry,layout,device:'Headless Edge + CDP touch; Physical Xiaomi Pad 6 Pro validation pending'},null,2));
 console.log('PASS active Bar/Thin/reference/Support/load control isolation, locked solver precedence, construction, drag touch safety, group fallback, all seven viewports, touch popup/RIGHT route and unchanged geometry (physical Xiaomi pending)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
