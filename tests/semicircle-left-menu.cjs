const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const expected={geometry:['bar','thin','dashed','curve','extend'],region:['hatch','rigidRegion','joint'],connections:['hinge','linkBar','weld','pin','roller','fixed'],loads:['force','moment','udl'],annotation:['dim','text','person'],diagrams:['positive','negative','diagramM','diagramQ','diagramN']};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const desktop=await browser.newPage({viewport:{width:1280,height:800}});
  await desktop.goto(pathToFileURL(path.resolve('index.html')).href);
  assert.equal(await desktop.locator('.semicircle-left-menu,.semicircle-prototype').count(),0);
  assert(await desktop.locator('#toolPanel').isVisible());assert.equal(await desktop.locator('#commandRibbon').count(),0);await desktop.close();
  for(const viewport of [{width:1280,height:800},{width:800,height:1280}]){
   const p=await browser.newPage({viewport,hasTouch:true,isMobile:true}),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
   const root=p.locator('.semicircle-left-menu'),sector=id=>root.locator(`[data-demo-id="${id}"]`);
   assert.equal(await root.count(),1);assert.equal(await p.locator('.semicircle-prototype').count(),0);
   assert.deepEqual(await p.evaluate(()=>Object.fromEntries(leftDrawingGroups.map(g=>[g.id,g.children.map(c=>c.id)]))),expected);
   const activate=async(id,pointer='touch')=>{
    const q=await p.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return {x:m.layout.cx+12,y:m.layout.cy};const g=leftDrawingGroups.findIndex(g=>g.id===id);return g>=0?m.layout.inner[g].icon:m.layout.outer[leftDrawingGroups.find(g=>g.id===m.state.activeGroup).children.findIndex(c=>c.id===id)].icon},id);
    if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
   };
   const openGroup=async group=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await activate('hub');if(await p.evaluate(()=>leftDrawingMenu.state.activeGroup)!==group)await activate(group)};
   const reset=()=>p.evaluate(()=>{document.activeElement?.blur();cancelToSelection();selected=null;multiSelection.clear();closeSecondaryTools();closeMomentPalette();leftDrawingMenu.close()});
   const state=()=>p.evaluate(()=>({mode,selected,first,second,rotation:currentMomentRotation,support:$('support').value,secondary:secondaryTools.hidden,options:secondaryTools.textContent,load:loadPlacement,doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument}));
   // Compare every actual source click with a hit-tested radial touch, including option UI.
   for(const [group,children]of Object.entries(expected))for(const id of children){
    await reset();await p.evaluate(id=>{const c=leftDrawingGroups.flatMap(g=>g.children).find(c=>c.id===id);window.sourceClicks=0;c.source.addEventListener('click',()=>window.sourceClicks++);c.source.click()},id);
    const original=await state();await reset();await openGroup(group);
    const source=await p.evaluate(id=>{const c=leftDrawingGroups.flatMap(g=>g.children).find(c=>c.id===id);return {label:c.source.getAttribute('aria-label'),title:c.source.title,real:c.source.matches('button[data-mode],button[data-support-type]'),clicks:sourceClicks}},id);
    assert(source.real);assert.equal(await sector(id).getAttribute('aria-label'),source.label);assert.equal(await sector(id).locator('title').textContent(),source.title);
    await activate(id);assert.equal(await p.evaluate(()=>sourceClicks),source.clicks+1,id+' delegates one click');
    assert.deepEqual(await state(),original,id+' same behavior');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
    await activate('hub');assert.equal(await sector(id).getAttribute('aria-pressed'),'true',id);assert((await sector(group).getAttribute('class')).includes('has-active-child'));
    if(['pin','roller','fixed'].includes(id))assert.equal(await p.evaluate(()=>$('support').value),id);
   }
   // Moment artwork follows the existing session choice, including CCW.
   await reset();await p.evaluate(()=>{currentMomentRotation='ccw';syncMomentDirection()});await openGroup('loads');await activate('moment');
   assert.equal(await p.evaluate(()=>currentMomentRotation),'ccw');await openGroup('loads');
   assert.equal(await sector('moment').locator('image').getAttribute('href'),await p.evaluate(()=>momentButton.style.getPropertyValue('--tool-icon').slice(5,-2)));
   // The original Moment palette also receives right-click, keyboard and hold.
   const momentPoint=()=>p.evaluate(()=>leftDrawingMenu.layout.outer[1].icon);
   let mp=await momentPoint();await p.mouse.click(mp.x,mp.y,{button:'right'});
   assert(await p.locator('#momentDirectionPalette').evaluate(el=>el.open));assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
   await p.locator('#momentDirectionPalette input[value=cw]').check();assert.equal(await p.evaluate(()=>currentMomentRotation),'cw');
   await openGroup('loads');await sector('moment').focus();await p.keyboard.press('ArrowDown');assert(await p.locator('#momentDirectionPalette').evaluate(el=>el.open));await p.evaluate(()=>closeMomentPalette());
   await openGroup('loads');mp=await momentPoint();const cdp=await p.context().newCDPSession(p);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:mp.x,y:mp.y}]});await p.waitForTimeout(600);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   assert(await p.locator('#momentDirectionPalette').evaluate(el=>el.open));assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
   await p.locator('#momentDirectionPalette input[value=ccw]').check();await openGroup('loads');
   // Disabled state, keyboard focus and source option expansion are mirrored.
   await p.evaluate(()=>{document.querySelector('button[data-mode=force]').disabled=true});
   assert.equal(await sector('force').getAttribute('aria-disabled'),'true');assert.equal(await sector('force').getAttribute('tabindex'),'-1');await activate('force');assert.equal(await p.evaluate(()=>mode),'moment');
   await p.evaluate(()=>{document.querySelector('button[data-mode=force]').disabled=false});
   await sector('force').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>mode),'force');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
   // An in-progress drawing survives menu navigation and outside dismissal exactly.
   await reset();await p.evaluate(()=>{setMode('bar');first={x:300,y:300};selected=items[0].id;multiSelection=new Set([selected]);saveDraft()});
   const snapshot=()=>p.evaluate(()=>({doc:documentText(),items:JSON.stringify(items),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,selected,selection:[...multiSelection],geometryScale,internalForceScale,storage:JSON.stringify(localStorage)}));
   const before=await snapshot();await activate('hub');await activate('region');await activate('connections');await activate('hub');assert.deepEqual(await snapshot(),before);
   await activate('hub');await p.touchscreen.tap(viewport.width-220,viewport.height-220);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await snapshot(),before);
   await activate('hub','mouse');await p.mouse.click(viewport.width-220,viewport.height-220);assert.deepEqual(await snapshot(),before);
   // Every actual ring admits a 44px disk, preserves fan hit testing and upright icons.
   await reset();
   const spans={};
   for(const group of Object.keys(expected)){
    await openGroup(group);assert.equal(await root.locator('text,button').count(),0);
    const geometry=await p.evaluate(()=>{const m=leftDrawingMenu,l=m.layout;return {fits:l.fits,radius:l.radius,inner:l.inner[0].r1,span:l.outer.at(-1).a1-l.outer[0].a0,safe:l.cy-l.radius>=l.bounds.top&&l.cy+l.radius<=l.bounds.bottom,targets:[...l.inner,...l.outer].every(s=>{
     for(let a=0;a<Math.PI*2;a+=Math.PI/36)if(!semicircleEngine.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)))return false;
     return document.elementFromPoint(s.icon.x,s.icon.y)?.classList.contains('semicircle-hit');
    })}});
    assert(geometry.fits&&geometry.safe&&geometry.targets);assert(geometry.radius<170);if(group==='loads')assert(geometry.span<Math.PI*.8);
    spans[expected[group].length]=geometry.span;
    const refinement=await p.evaluate(()=>{
     const m=leftDrawingMenu,l=m.layout,parent=l.inner[leftDrawingGroups.findIndex(g=>g.id===m.state.activeGroup)],outer=l.outer;
     const center=(outer[0].a0+outer.at(-1).a1)/2,step=(outer[0].a0+outer[0].a1)/2-(outer[1].a0+outer[1].a1)/2;
     const limit=(Math.PI-Math.abs(step)*outer.length)/2,anchor=(parent.a0+parent.a1)/2;
     const gaps=ring=>ring.slice(1).map((s,i)=>2*(s.r0+s.r1)/2*Math.sin((s.a0-ring[i].a1)/2));
     const paths=[...m.host.querySelectorAll('.semicircle-hit')];
     return {gaps:[...gaps(l.inner),...gaps(outer)],radialGap:outer[0].r0-l.inner[0].r1,hub:l.hubRadius,anchorError:Math.abs(center-Math.max(-limit,Math.min(anchor,limit))),
      pathHits:paths.every(el=>getComputedStyle(el).pointerEvents==='fill'),
      upright:[...m.host.querySelectorAll('.semicircle-icon')].every(el=>!el.getAttribute('transform')?.includes('rotate')),
      icons:[...m.host.querySelectorAll('.semicircle-control:not([data-demo-id="hub"]) .semicircle-icon')].map(el=>el.tagName==='path'?24*Math.hypot(el.getCTM().a,el.getCTM().b):Number(el.getAttribute('width')))};
    });
    assert(refinement.gaps.every(g=>Math.abs(g-3)<1e-8),'consistent 3px angular separators');
    assert.equal(refinement.radialGap,3);assert.equal(refinement.hub,26);assert(refinement.anchorError<1e-8,'nearest safe parent alignment');
    assert(refinement.pathHits&&refinement.upright);assert(refinement.icons.every(size=>Math.abs(size-28)<.001),'28px icon frames: '+JSON.stringify(refinement.icons));
    console.log('GEOMETRY',viewport,group,geometry);
    for(const icon of await root.locator('.semicircle-icon').all())assert.equal(await icon.evaluate(e=>getComputedStyle(e).pointerEvents),'none');
   }
   assert(spans[3]<spans[5]&&spans[5]<spans[6]);assert(spans[3]<Math.PI/2);assert(spans[6]<Math.PI*.81);
   await openGroup('geometry');await activate('bar');await openGroup('geometry');await p.mouse.move(viewport.width-100,100);
   const styleOf=id=>sector(id).locator('.semicircle-hit').evaluate(el=>{const s=getComputedStyle(el);return {fill:s.fill,stroke:s.stroke,width:s.strokeWidth,dash:s.strokeDasharray}});
   const active=await styleOf('bar'),parent=await styleOf('geometry'),passive=await styleOf('region');
   assert.equal(active.fill,'rgb(184, 220, 224)');assert.notEqual(active.fill,parent.fill);assert.notEqual(active.stroke,parent.stroke);
   assert.equal(parent.width,'1.5px');assert.equal(passive.width,'1px');
   await sector('bar').focus();const focused=await styleOf('bar');assert.equal(focused.fill,active.fill);assert.equal(focused.width,'3px');assert.notEqual(focused.dash,'none');
   await p.evaluate(()=>document.activeElement.blur());
   await openGroup('geometry');const point=await p.evaluate(()=>leftDrawingMenu.layout.outer[0].icon);await p.mouse.move(point.x,point.y);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.hoveredSector),'bar');
   await sector('bar').dispatchEvent('pointerenter',{pointerType:'pen'});assert.equal(await p.evaluate(()=>leftDrawingMenu.state.hoveredSector),'bar');assert(await sector('bar').locator('title').textContent());
   // Representative canvas workflows start immediately after radial selection.
   const tap=async(x,y)=>{const q=await p.evaluate(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},[x,y]);await p.touchscreen.tap(q.x,q.y)};
   for(const [group,id]of [['geometry','bar'],['loads','force'],['loads','moment'],['loads','udl'],['connections','roller'],['annotation','dim'],['diagrams','diagramM']]){
    await reset();await p.evaluate(()=>{items=[];past=[];future=[];snapEnabled=false;render()});await openGroup(group);await activate(id);await tap(300,300);
    assert.equal(await p.evaluate(()=>mode),id==='roller'?'support':id);
    if(id==='diagramM')assert.equal(await p.evaluate(()=>items.at(-1)?.type),'diagramM');
    else assert(await p.evaluate(()=>!!(first||loadPlacement||supportPlacementSession)),id+' starts workflow');
    if(['force','moment','roller','bar'].includes(id))assert(await p.locator('#dynamicInput').isVisible(),id+' Dynamic Input');
    if(id==='bar'){const q=await p.evaluate(()=>{const q=new DOMPoint(500,350).matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y}});await p.mouse.move(q.x,q.y);assert(await p.locator('[data-bar-preview]').count());}
    if(id==='udl'){await tap(500,300);assert(await p.evaluate(()=>!!loadPlacement));assert.equal(await p.evaluate(()=>items.length),0)}
    if(['force','moment'].includes(id)){await p.locator('#dynamicInputValue').fill('35');await p.locator('#dynamicInputValue').press('Enter');assert.equal(await p.evaluate(()=>items.at(-1).type),id)}
   }
   // Contextual finish/cancel and both fallback surfaces remain usable.
   await reset();await p.evaluate(()=>{items=[];past=[];future=[];render()});await openGroup('region');await activate('hatch');await p.evaluate(()=>{$('hatchMethod').value='points'});await tap(300,300);await tap(500,300);await tap(450,450);
   await p.locator('#commandControls button').last().tap();assert.equal(await p.evaluate(()=>items.length),1);
   await openGroup('region');await activate('hatch');await tap(300,300);await p.locator('#commandControls button').first().tap();assert.equal(await p.evaluate(()=>items.length),1);
   await p.evaluate(()=>{rightCommandSafeProbe.style.paddingRight='calc(100vw - 60px)';rightCommandMenu.refresh()});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='false');
   await p.locator('#toggleTools').tap();await p.locator('button[data-mode=bar]').tap();assert.equal(await p.evaluate(()=>mode),'bar');assert(await p.locator('#toolPanel').isHidden());
   await p.locator('#ribbonToggle').tap();await p.locator('#ribbonToggle').tap();assert(await p.locator('#ribbonScroll').isVisible());
   await p.evaluate(()=>{rightCommandSafeProbe.style.removeProperty('padding-right');rightCommandMenu.refresh()});await p.waitForFunction(()=>document.body.dataset.radialPrimary==='true');
   await reset();await openGroup('connections');await activate('roller');await openGroup('connections');await p.mouse.move(viewport.width-100,100);await p.screenshot({path:`tests/semicircle-left-${viewport.width}.png`});
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
   await p.evaluate(()=>showDynamicInput({clientX:0,clientY:leftDrawingMenu.layout.cy,value:'30',focus:true}));
   assert(await p.evaluate(()=>{const m=leftDrawingMenu,l=m.layout,r=$('dynamicInput').getBoundingClientRect();return m.host.hidden||l.cy+l.radius<r.top||l.cy-l.radius>r.bottom}));
   await p.evaluate(()=>hideDynamicInput());
   // A small visual viewport falls back to the old palette instead of shrinking targets.
   await p.evaluate(()=>{const vv=new EventTarget();Object.assign(vv,{offsetLeft:0,offsetTop:0,width:800,height:250});Object.defineProperty(window,'visualViewport',{configurable:true,value:vv});leftDrawingMenu.refresh()});
   assert(await root.isHidden());assert(await p.locator('#toggleTools').isVisible());
   await p.evaluate(()=>{visualViewport.height=40;leftDrawingMenu.refresh()});assert(await root.isHidden());assert.deepEqual(errors,[]);
   console.log('PASS production left menu: all mappings, source parity, state isolation, accessibility, touch/mouse/pen, preview and fallback UI',viewport);await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
