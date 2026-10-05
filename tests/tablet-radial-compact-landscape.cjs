const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');
const left=[['bar','thin','dashed','curve'],['hinge','linkBar','weld','pin','roller','fixed'],['force','moment','udl'],['dim','text','person','section','rigidRegion','hatch','joint','diagram']];
const right=[['resetView','editSelected','copyObjects','pasteObjects','delete','extend'],['panView','snapOptions']];
const normal=[151.04759747124507,248.81914748738225],compact=[143.04759747124507,217.60804137472095];

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const out=path.resolve('.test-tools/tablet-radial-compact-landscape');fs.mkdirSync(out,{recursive:true});
  const p=await browser.newPage({hasTouch:true,isMobile:true,viewport:{width:1152,height:584}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
  const shot=async name=>{await settled(p);await p.screenshot({path:path.join(out,name+'.png')})};
  const state=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),camera:JSON.stringify(camera),mode,first:JSON.stringify(first),saved:savedDocument,snap:JSON.stringify(snapOptions),snapEnabled,gridVisible,gridSize,storage:JSON.stringify(localStorage)}));
  const profiles=()=>p.evaluate(()=>[leftDrawingMenu,rightCommandMenu].map(m=>({profile:m.layout.profile,radius:m.layout.radius,extent:m.layout.verticalExtent})));
  const toggle=async side=>{
   const q=await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;return {x:m.layout.cx+(side==='left'?13:-13),y:m.layout.cy}},side);
   await p.touchscreen.tap(q.x,q.y);await settled(p);
  };
  // Check the actual rendered fill, including every interpolated roller position.
  // Analytic tangency and sampled 44px disks prove target size independently of
  // the production solver's fits flag; every path stays on-screen and off chrome.
  const geometry=async()=>{
   const result=await p.evaluate(()=>{
    const failures=[],sizes=[],top=tabletChromeBottom(true)+8,bottoms=[tabletLeftChromeTop(true)-8,tabletRightChromeTop(true)-8];
    [leftDrawingMenu,rightCommandMenu].forEach((m,index)=>{
     if(m.state.open){
      const expected=index===0?[4,leftDrawingCategories.find(c=>c.id===leftCategoryId).entries.length]:[6,2];
      m.state.rings.forEach((r,i)=>{const nodes=[...m.host.querySelectorAll('[data-roller-ring="'+r.id+'"]')];if(nodes.length!==expected[i]||nodes.some(g=>getComputedStyle(g).visibility!=='visible'||getComputedStyle(g).display==='none'))failures.push({type:'hidden-tools',side:index,ring:r.id})});
      if([...m.host.querySelectorAll('.semicircle-icon[transform],.roller-artwork')].some(g=>g.getAttribute('transform')?.includes('rotate')))failures.push({type:'rotated-artwork',side:index});
     }
     if(index===1&&(m.layout.contextRing.sectors.length!==4||m.layout.contextRing.middle[5].length!==5))failures.push({type:'context-reserve',side:index});
     const all=[...m.layout.rings.flatMap(r=>r.sectors),...(m.layout.contextRing?.sectors||[]),...(m.layout.contextRing?.middle?.flat()||[])];
     for(const s of all){
      const mid=(s.r0+s.r1)/2,tangent=mid*Math.sin((s.a1-s.a0)/2);
      if(s.r1-s.r0<44-1e-8||tangent<22-1e-8)failures.push({type:'target',side:index,width:s.r1-s.r0,tangent});
     }
     for(const hit of m.host.querySelectorAll('.semicircle-hit')){
      const matrix=hit.getScreenCTM(),length=hit.getTotalLength();
      for(let i=0;i<=96;i++){
       const q=hit.getPointAtLength(length*i/96),s=new DOMPoint(q.x,q.y).matrixTransform(matrix);
       if(s.x<-.01||s.x>innerWidth+.01||s.y<top-.01||s.y>bottoms[index]+.01)failures.push({type:'clearance',side:index,x:s.x,y:s.y,top,bottom:bottoms[index]});
      }
      if(hit.parentNode.dataset.demoId==='hub')continue;
      const sector=all.find(s=>s.path===hit.getAttribute('d'));
      if(!sector){failures.push({type:'missing-sector'});continue}
      const angle=(sector.a0+sector.a1)/2,mid=(sector.r0+sector.r1)/2;
      const cx=sector.cx+(sector.side==='left'?1:-1)*mid*Math.cos(angle),cy=sector.cy+mid*Math.sin(angle);
      for(let i=0;i<64;i++)if(!hit.isPointInFill(new DOMPoint(cx+(22-1e-6)*Math.cos(i*Math.PI/32),cy+(22-1e-6)*Math.sin(i*Math.PI/32))))failures.push({type:'44px-fill',side:index,id:hit.parentNode.dataset.demoId});
     }
    });
    for(const id of ['tabletBottomLeftBar','tabletBottomRightBar','gridSize','gridToggle','snapToggle','drawingScalesToggle']){const r=document.getElementById(id).getBoundingClientRect();sizes.push([r.width,r.height])}
    return {category:leftCategoryId,failures,sizes,mappings:[leftDrawingMenu,rightCommandMenu].map(m=>m.state.rings.map(r=>r.entries.map(e=>e.id)))};
   });
   assert.deepEqual(result.failures,[]);assert.deepEqual(result.mappings,[[['geometry','supports','loads','annotation'],left[['geometry','supports','loads','annotation'].indexOf(result.category)]],right]);
   assert.deepEqual(result.sizes,[[200,48],[208,48],[60,44],[44,44],[44,44],[44,44]]);
  };
  await p.evaluate(()=>saveDraft());const initial=await state(),rows=[];
  const viewports=[[1376,1032,true],[1280,800,true],[1152,720,true],[1152,700,true],[1152,680,true],[1152,620,true],[1152,584,true],[1032,1376,true],[800,1280,true],[800,776,true],[800,766,true],[800,600,true],[800,390,false],[432,800,true],[431,800,false],[390,800,false],[800,582,true],[800,558,true],[800,557,false],[800,581,true]];
  for(const [width,height,active]of viewports){
   await p.evaluate(()=>{leftDrawingMenu.close();rightCommandMenu.close()});await p.setViewportSize({width,height});await ownership(p,active);
   const layout=await profiles();
   if(active){
    const expected=height>=661?['normal','normal']:['normal','compact'];
    assert.deepEqual(layout.map(m=>m.profile),expected);
    assert.deepEqual(layout.map((m,i)=>m.radius),expected.map((s,i)=>s==='normal'?normal[i]:compact[i]));
    for(const side of ['left','right']){
     await toggle(side);await geometry();
     if(width===1152&&height===584)await shot('1152x584-'+side+'-open');
     for(const offset of [.13,.5,.99,1.5,3.99]){
      await p.evaluate(({side,offset})=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;for(const r of m.state.rings)r.offset=r.activeIndex+offset;m.refresh()},{side,offset});await geometry();
     }
     await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu;for(const r of m.state.rings)r.offset=r.activeIndex;m.refresh()},side);await toggle(side);
    }
   }
   assert.deepEqual(await state(),initial);
   if([[1152,584],[1280,800],[1376,1032],[800,390]].some(([w,h])=>w===width&&h===height))await shot(width+'x'+height+'-closed');
   rows.push({width,height,active,layout});
  }
  // Real production contextual subfunctions, with the existing pending command.
  await p.setViewportSize({width:1152,height:584});await ownership(p,true);
  await p.evaluate(()=>{setMode('bar');first={x:600,y:300};render()});const pending=await state();
  await toggle('left');await p.evaluate(()=>{selectLeftCategory('loads','moment');leftDrawingMenu.refresh()});
  assert.equal(await p.locator('.semicircle-left-menu [data-context-action]').count(),2);await geometry();await shot('1152x584-left-context');await toggle('left');
  await toggle('right');await geometry();await shot('1152x584-right-context');await toggle('right');assert.deepEqual(await state(),pending);
  // A captured touch drag selects one detent, keeps other rollers independent,
  // and never activates a drawing source or changes the pending first point.
  const cdp=await p.context().newCDPSession(p);
  for(const side of ['left','right']){
   await toggle(side);
   const q=await p.evaluate(side=>{const m=side==='left'?leftDrawingMenu:rightCommandMenu,r=m.state.rings[0],g=m.layout.rings[0],mid=(g.r0+g.r1)/2;r.offset=r.activeIndex=0;m.refresh();return {x:side==='left'?g.sectors[0].icon.x:m.layout.cx-mid,y:side==='left'?g.sectors[0].icon.y:m.layout.cy,toX:side==='left'?g.sectors[1].icon.x:m.layout.cx-mid*Math.cos(g.step),toY:side==='left'?g.sectors[1].icon.y:m.layout.cy-mid*Math.sin(g.step),others:m.state.rings.slice(1).map(r=>r.offset)}},side);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:0,x:q.x,y:q.y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:0,x:q.toX,y:q.toY}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await p.waitForFunction(side=>{const r=(side==='left'?leftDrawingMenu:rightCommandMenu).state.rings[0];return r.snapFrame===0&&r.activeIndex===1},side);
   assert.deepEqual(await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.rings.slice(1).map(r=>r.offset),side),q.others);
   await geometry();await toggle(side);assert.deepEqual(await state(),pending);
  }
  for(const [width,height]of [[1152,720],[1152,584],[1032,1376],[1152,584],[800,390],[1280,800],[1152,584]]){
   await p.setViewportSize({width,height});await ownership(p,height!==390);assert.deepEqual(await state(),pending);
   if(height===1376||height===584)await shot('transition-'+width+'x'+height);
  }
  // Visual-only browser shrink and safe-area changes use actual available bounds.
  await p.setViewportSize({width:1152,height:720});
  for(const [height,active]of [[584,true],[390,false],[584,true]]){
   await p.evaluate(height=>{Object.defineProperty(visualViewport,'height',{configurable:true,value:height});visualViewport.dispatchEvent(new Event('resize'))},height);await ownership(p,active);
   if(active){await toggle('left');await geometry();await toggle('left')}assert.deepEqual(await state(),pending);
  }
  await p.evaluate(()=>{delete visualViewport.height;visualViewport.dispatchEvent(new Event('resize'))});await p.setViewportSize({width:1152,height:584});await ownership(p,true);
  await p.evaluate(()=>{leftDrawingSafeProbe.style.paddingTop='240px';leftDrawingMenu.refresh()});await ownership(p,false);assert.deepEqual(await state(),pending);
  await p.evaluate(()=>{leftDrawingSafeProbe.style.removeProperty('padding-top');leftDrawingMenu.refresh()});await ownership(p,true);assert.deepEqual(await state(),pending);
  // An actual numeric capture survives normal/compact/fallback ownership moves.
  await p.evaluate(()=>{beginBarNumericInput({clientX:550,clientY:400,pointerType:'touch'});window.compactCapture=dynamicNumericCapture;window.compactFirst=first});
  await p.locator('#dynamicInputValue').focus();const numericBefore=await state(),valueBefore=await p.locator('#dynamicInputValue').inputValue();
  for(const [width,height]of [[1280,800],[1152,584],[800,390],[1152,584]]){
   await p.setViewportSize({width,height});await ownership(p,height!==390);assert.deepEqual(await state(),numericBefore);
   assert(await p.evaluate(()=>dynamicNumericCapture===compactCapture&&first===compactFirst));assert(await p.locator('#dynamicInputValue').isVisible());assert.equal(await p.locator('#dynamicInputValue').inputValue(),valueBefore);
  }
  // A panel intersects normal's radius but not compact's. Profile-specific
  // physical bounds must be stable regardless of the previous menu geometry.
  await p.setViewportSize({width:1280,height:800});
  await p.evaluate(()=>{Object.defineProperty(dynamicInput,'getBoundingClientRect',{configurable:true,value:()=>({left:148,right:248,top:200,bottom:450,width:100,height:250})});leftDrawingMenu.refresh();rightCommandMenu.refresh()});
  await ownership(p,true);assert.equal((await profiles())[0].profile,'compact');
  assert.deepEqual(await p.evaluate(()=>[leftDrawingBounds(undefined,undefined,'normal').top,leftDrawingBounds(undefined,undefined,'compact').top]),[458,100]);
  for(let i=0;i<4;i++){await p.evaluate(()=>{leftDrawingMenu.refresh();rightCommandMenu.refresh()});await ownership(p,true);assert.equal((await profiles())[0].profile,'compact')}
  assert.deepEqual(await state(),numericBefore);assert(await p.evaluate(()=>dynamicNumericCapture===compactCapture&&first===compactFirst));
  await p.evaluate(()=>{delete dynamicInput.getBoundingClientRect;leftDrawingMenu.refresh();rightCommandMenu.refresh()});await ownership(p,true);assert.equal((await profiles())[0].profile,'normal');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({rows,physical:'Android touch emulation; physical Xiaomi re-validation pending'},null,2));
  console.log('PASS adaptive normal/compact/fallback, 44px rendered targets and fractional sweeps, context reserve, chrome, mappings, touch detents, pending state, rotation and visualViewport');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
