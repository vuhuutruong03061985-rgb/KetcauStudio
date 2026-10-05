const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const expected={geometry:['bar','thin','dashed','curve'],supports:['hinge','linkBar','weld','pin','roller','fixed'],loads:['force','moment','udl'],annotation:['dim','text','person','section','rigidRegion','hatch','joint','diagram']};
const diagramChildren=['diagramM','diagramQ','diagramN','positive','negative'];
const sourceExpected={...expected,annotation:[...expected.annotation.slice(0,-1),...diagramChildren]};
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
   assert.equal(await p.evaluate(()=>leftDrawingCategories.map(g=>g.label).join('|')),'Vẽ|Liên kết|Tải trọng|Chú thích / biểu diễn');
   assert.deepEqual(await p.evaluate(()=>Object.fromEntries(leftDrawingCategories.map(g=>[g.id,g.entries.map(c=>c.id)]))),expected);
   const point=id=>p.evaluate(id=>{const m=leftDrawingMenu;if(id==='hub')return{x:m.layout.cx+13,y:m.layout.cy};const r=m.state.rings.find(r=>r.entries.some(e=>e.id===id));return m.layout.rings.find(l=>l.id===r.id).sectors[r.entries.findIndex(e=>e.id===id)].icon},id);
   const focusTool=async(id,pointer='touch')=>{const cat=await p.evaluate(id=>leftDrawingCategories.find(c=>c.entries.some(e=>e.id===id)).id,id);if(await p.evaluate(()=>leftCategoryId)!==cat){const q=await point(cat);if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)}const centered=await p.evaluate(id=>{const r=leftDrawingMenu.state.rings.find(r=>r.entries.some(e=>e.id===id));return r.focusedId===id},id);if(!centered){const q=await point(id);if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y)}};
   const activate=async(id,pointer='touch')=>{
    if(id==='region'||id==='connections'){await focusTool(id==='region'?'text':'fixed',pointer);return}
    if(diagramChildren.includes(id)){await focusTool('diagram',pointer);const q=await p.evaluate(id=>{const entries=leftContextEntries(leftDrawingMenu.state.focusedEntry);return leftDrawingMenu.layout.contextRing.sectors[[...leftDrawingMenu.host.querySelectorAll('[data-fixed-action]')].findIndex(e=>e.dataset.fixedAction===id)].icon},id);if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);return}
    if(id!=='hub')await focusTool(id,pointer);
    const q=await point(id);if(pointer==='touch')await p.touchscreen.tap(q.x,q.y);else await p.mouse.click(q.x,q.y);
   };
   const openGroup=async()=>{if(!await p.evaluate(()=>leftDrawingMenu.state.open))await activate('hub')};
   const reset=()=>p.evaluate(()=>{document.activeElement?.blur();cancelToSelection();selected=null;multiSelection.clear();closeSecondaryTools();closeMomentPalette();leftDrawingMenu.close()});
   const state=()=>p.evaluate(()=>({mode,selected,first,second,rotation:currentMomentRotation,support:$('support').value,secondary:secondaryTools.hidden,options:secondaryTools.textContent,load:loadPlacement,doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument}));
   // Compare every actual source click with a hit-tested radial touch, including option UI.
   for(const [group,children]of Object.entries(sourceExpected))for(const id of children){
    await reset();await p.evaluate(id=>{const c=leftDrawingGroups.flatMap(g=>g.children).find(c=>c.id===id);window.sourceClicks=0;c.source.addEventListener('click',()=>window.sourceClicks++);c.source.click()},id);
    const original=await state();await reset();await openGroup(group);await focusTool(diagramChildren.includes(id)?'diagram':id);
    const source=await p.evaluate(id=>{const c=leftDrawingGroups.flatMap(g=>g.children).find(c=>c.id===id);return {label:c.source.getAttribute('aria-label'),title:c.source.title,real:c.source.matches('button[data-mode],button[data-support-type]'),clicks:sourceClicks}},id);
    assert(source.real);assert.equal(await sector(id).getAttribute('aria-label'),source.label);assert.equal(await sector(id).locator('title').textContent(),source.title);
    await activate(id);assert.equal(await p.evaluate(()=>sourceClicks),source.clicks+1,id+' delegates one click');
    assert.deepEqual(await state(),original,id+' same behavior');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
    await activate('hub');assert.equal(await sector(id).getAttribute('aria-pressed'),'true',id);assert.equal(await sector(diagramChildren.includes(id)?'diagram':id).getAttribute('data-focused'),'true');
    if(['pin','roller','fixed'].includes(id))assert.equal(await p.evaluate(()=>$('support').value),id);
   }
   // Moment artwork follows the existing session choice, including CCW.
   await reset();await p.evaluate(()=>{currentMomentRotation='ccw';syncMomentDirection()});await openGroup('loads');await activate('moment');
   assert.equal(await p.evaluate(()=>currentMomentRotation),'ccw');await openGroup('loads');
   assert.equal(await sector('moment').locator('image').getAttribute('href'),await p.evaluate(()=>momentButton.style.getPropertyValue('--tool-icon').slice(5,-2)));
   // The original Moment palette also receives right-click, keyboard and hold.
   const momentPoint=()=>point('moment');
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
   await sector('force').focus();await p.keyboard.press('Enter');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>mode),'force');assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);
   // An in-progress drawing survives menu navigation and outside dismissal exactly.
   await reset();await p.evaluate(()=>{setMode('bar');first={x:300,y:300};selected=items[0].id;multiSelection=new Set([selected]);saveDraft()});
   const snapshot=()=>p.evaluate(()=>({doc:documentText(),items:JSON.stringify(items),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,selected,selection:[...multiSelection],geometryScale,internalForceScale,storage:JSON.stringify(localStorage)}));
   const before=await snapshot();await activate('hub');await activate('region');await activate('connections');await activate('hub');assert.deepEqual(await snapshot(),before);
   await activate('hub');await p.touchscreen.tap(viewport.width-220,viewport.height-220);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.open),false);assert.deepEqual(await snapshot(),before);
   await activate('hub','mouse');await p.mouse.click(viewport.width-220,viewport.height-220);assert.deepEqual(await snapshot(),before);
   // Every actual ring admits a 44px disk, preserves fan hit testing and upright icons.
   await reset();
   await openGroup();
   const geometry=await p.evaluate(()=>{const m=leftDrawingMenu,l=m.layout;return {fits:l.fits,radius:l.radius,safe:l.cy-l.radius>=l.bounds.top&&l.cy+l.radius<=l.bounds.bottom,
    targets:l.rings.every(r=>r.sectors.every(s=>{for(let a=0;a<2*Math.PI;a+=Math.PI/36)if(!semicircleEngine.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)))return false;return document.elementFromPoint(s.icon.x,s.icon.y)?.classList.contains('semicircle-hit')})),
    separation:l.rings.every((r,i)=>r.r0>=(i?l.rings[i-1].r1:l.hubRadius)+3-1e-8),
    centers:l.rings.every(r=>r.cx===l.cx&&r.cy===l.cy),
    upright:[...m.host.querySelectorAll('.semicircle-icon')].every(el=>!el.getAttribute('transform')?.includes('rotate'))}});
   assert(geometry.fits&&geometry.safe&&geometry.targets&&geometry.centers&&geometry.separation&&geometry.upright);assert(geometry.radius<310);assert.equal(await root.locator('.semicircle-roller-ring').count(),2);assert.equal(await root.locator('text,button').count(),0);console.log('GEOMETRY',viewport,geometry);
   await activate('bar');await openGroup();await focusTool('thin');await p.mouse.move(viewport.width-100,100);
   const styleOf=id=>sector(id).locator('.semicircle-hit').evaluate(el=>{const s=getComputedStyle(el);return{fill:s.fill,stroke:s.stroke,width:s.strokeWidth,dash:s.strokeDasharray}});
   const active=await styleOf('bar'),focusedTool=await styleOf('thin');assert.equal(active.fill,'rgb(184, 220, 224)');assert.notEqual(active.fill,focusedTool.fill);assert.equal(await sector('bar').getAttribute('aria-pressed'),'true');assert.equal(await sector('thin').getAttribute('aria-pressed'),'false');assert.equal(await sector('thin').getAttribute('data-focused'),'true');
   await sector('bar').focus();const focused=await styleOf('bar');assert.equal(focused.fill,active.fill);assert.equal(focused.width,'3px');assert.notEqual(focused.dash,'none');await p.evaluate(()=>document.activeElement.blur());
   const hoverPoint=await point('bar');await p.mouse.move(hoverPoint.x,hoverPoint.y);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.hoveredSector),'bar');await sector('bar').dispatchEvent('pointerenter',{pointerType:'pen'});assert.equal(await p.evaluate(()=>leftDrawingMenu.state.hoveredSector),'bar');assert(await sector('bar').locator('title').textContent());
   // Representative canvas workflows start immediately after radial selection.
   const tap=async(x,y)=>{const q=await p.evaluate(([x,y])=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},[x,y]);await p.touchscreen.tap(q.x,q.y)};
   for(const [group,id]of [['geometry','bar'],['loads','force'],['loads','moment'],['loads','udl'],['connections','roller'],['dimensions','dim'],['diagrams','diagramM']]){
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
