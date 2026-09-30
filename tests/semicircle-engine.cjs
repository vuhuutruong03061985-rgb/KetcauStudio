const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const touch of [false,true]){
   const p=await browser.newPage({viewport:{width:800,height:1100},hasTouch:touch,isMobile:touch}),errors=[];
   p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
   assert.equal(await p.locator('.semicircle-prototype').count(),0);
   const geometry=await p.evaluate(()=>{
    const E=semicircleEngine,fail=[],check=(ok,label)=>{if(!ok)fail.push(label)};
    for(const bounds of [{left:0,right:390,top:52,bottom:828},{left:12,right:788,top:70,bottom:1068},{left:20,right:1340,top:60,bottom:770}]){
     for(const innerCount of [1,2,3,6,7])for(const outerCount of [0,2,6]){
      const l=E.solveSemicircleLayout({bounds,innerCount,outerCount,centerY:-100}),r=E.solveSemicircleLayout({side:'right',bounds,innerCount,outerCount,centerY:-100}),mirror=E.mirrorSemicircleLayout(l);
      check(l.fits&&r.fits,'fits');check(l.cy-l.radius>=bounds.top-1e-8&&l.cy+l.radius<=bounds.bottom+1e-8,'vertical clamp');
      check(l.radius<(bounds.bottom-bounds.top)*.4,'compact');
      for(const ring of ['inner','outer']){
       check(l[ring].length===(ring==='inner'?innerCount:outerCount),'count');
       l[ring].forEach((s,i)=>{
        const q=r[ring][i];check([s.cx,s.cy,s.r0,s.r1,s.a0,s.a1,s.icon.x,s.icon.y].every(Number.isFinite),'finite');
        check(s.icon.x>l.cx&&q.icon.x<r.cx,'inward');check(Math.abs(s.icon.x+q.icon.x-bounds.left-bounds.right)<1e-8&&s.icon.y===q.icon.y,'mirror');
        check(mirror[ring][i].path===q.path,'mirror path');check(i===0||s.icon.y>l[ring][i-1].icon.y,'order');
        const shape=document.createElementNS(NS,'path');shape.setAttribute('d',s.path);check(shape.getTotalLength()>0&&!/NaN|Infinity/.test(s.path),'valid path');
        check(s.r1-s.r0>=44,'thickness');check(E.hitTestRadialSector(s,s.icon.x,s.icon.y),'icon inside');
        // Every point on the boundary of a 44px target disk is inside the sector.
        for(let a=0;a<Math.PI*2;a+=Math.PI/36)check(E.hitTestRadialSector(s,s.icon.x+22*Math.cos(a),s.icon.y+22*Math.sin(a)),'44px disk');
        if(i)check(Math.hypot(s.icon.x-l[ring][i-1].icon.x,s.icon.y-l[ring][i-1].icon.y)>=44,'centroid spacing');
        check(!E.hitTestRadialSector(s,s.cx,s.cy),'hub excluded');
       });
      }
     }
    }
    const bounds={left:0,right:800,top:52,bottom:1000};
    const three=E.solveSemicircleLayout({bounds,innerCount:3}),six=E.solveSemicircleLayout({bounds,innerCount:6});
    check(three.radius<six.radius,'3 smaller than 6');check(three.inner.at(-1).a1-three.inner[0].a0<Math.PI*.8,'3 clustered');
    check(E.solveSemicircleLayout({bounds:{...bounds,bottom:2000},innerCount:6}).radius===six.radius,'no height stretching');
    check(!E.solveSemicircleLayout({bounds:{left:0,right:60,top:0,bottom:90},innerCount:6}).fits,'impossible viewport explicit');
    check(E.solveSemicircleLayout({bounds,innerCount:0}).inner.length===0,'empty');
    check(E.solveSemicircleLayout({bounds:{...bounds,bottom:400},preferred:{inner:500}}).fits,'preference yields to bounds');
    for(const options of [{innerCount:-1},{innerCount:1.5},{side:'bottom'},{minTarget:20},{centerY:NaN}]){let threw=false;try{E.solveSemicircleLayout({bounds,...options})}catch{threw=true}check(threw,'invalid rejected')}
    return {fail,three:three.radius,six:six.radius};
   });assert.deepEqual(geometry.fail,[]);console.log('PASS pure geometry',geometry.three,geometry.six);
   await p.evaluate(()=>{setMode('bar');first={x:300,y:300};selected=items[0].id;multiSelection=new Set([selected]);saveDraft();window.demo=showSemicircleDemo()});
   const snapshot=()=>p.evaluate(()=>({doc:documentText(),items:JSON.stringify(items),past:JSON.stringify(past),future:JSON.stringify(future),saved:savedDocument,mode,first,selected,selection:[...multiSelection],camera:JSON.stringify(camera),storage:JSON.stringify(localStorage)}));
   const before=await snapshot();
   const root=p.locator('.semicircle-prototype[data-side=left]'),hub=root.locator('[data-demo-id=hub]');
   const activate=async id=>{const pt=await p.evaluate(id=>{const m=demo.menus[0],s=m.layout;if(id==='hub')return {x:s.cx+12,y:s.cy};const g=m.host.querySelector(`[data-demo-id="${id}"] .semicircle-icon`).getAttribute('transform').match(/translate\(([^ ]+) ([^)]+)\)/);return {x:Number(g[1])+12,y:Number(g[2])+12}},id);if(touch)await p.touchscreen.tap(pt.x,pt.y);else await p.mouse.click(pt.x,pt.y)};
   const hubBox=await hub.boundingBox();assert(hubBox.height>=48&&hubBox.height<=52,JSON.stringify(hubBox));
   const hubShape=await hub.locator('.semicircle-hit').evaluate(e=>({x:e.getBBox().x,height:e.getBBox().height}));assert.equal(hubShape.x,0);assert.equal(hubShape.height,48);
   await activate('hub');assert.equal(await root.locator('[role=button]').count(),4);assert.equal(await root.locator('[data-demo-id=child-a]').count(),0);
   await activate('group');assert.equal(await root.locator('[role=button]').count(),6);assert.deepEqual(await hub.boundingBox(),hubBox);
   assert.equal(await root.locator('text,button').count(),0);
   assert(await root.locator('[data-demo-id=group]').getAttribute('aria-expanded')==='true');
   const hit=await p.evaluate(()=>{
    const m=demo.menus[0];return [...m.layout.inner,...m.layout.outer].every(s=>{
     // Clickable far from the 24px icon as well as at the icon center.
     return [0,18].every(d=>{const a=(s.a0+s.a1)/2,x=s.icon.x+d*Math.cos(a),y=s.icon.y+d*Math.sin(a),n=document.elementFromPoint(x,y);return n?.classList.contains('semicircle-hit')&&n.parentElement.getAttribute('role')==='button'})
    })
   });assert(hit);
   for(const el of await root.locator('[role=button]').all()){assert(await el.getAttribute('aria-label'));assert(await el.locator('title').textContent());assert.equal(await el.locator('.semicircle-icon').evaluate(e=>getComputedStyle(e).pointerEvents),'none')}
   await activate('child-a');assert.equal(await hub.getAttribute('aria-expanded'),'false');
   await activate('hub');await activate('disabled');assert.equal(await hub.getAttribute('aria-expanded'),'true');
   const toggle=root.locator('[data-demo-id=toggle]');const tint=await toggle.locator('.semicircle-hit').evaluate(e=>getComputedStyle(e).fill);
   await activate('toggle');await activate('hub');assert.equal(await toggle.getAttribute('aria-pressed'),'true');assert((await toggle.getAttribute('class')).includes('active'));
   assert.equal(await toggle.locator('.semicircle-hit').evaluate(e=>getComputedStyle(e).fill),'rgb(204, 227, 232)');assert.notEqual(tint,'rgb(204, 227, 232)');
   // State flags work independently; both override the decorative tint.
   await p.evaluate(()=>demo.menus[0].setState('toggle',{isActive:false,isPressed:true}));assert.equal(await toggle.locator('.semicircle-hit').evaluate(e=>getComputedStyle(e).fill),'rgb(204, 227, 232)');
   await p.evaluate(()=>demo.menus[0].setState('toggle',{isActive:true,isPressed:false}));assert.equal(await toggle.locator('.semicircle-hit').evaluate(e=>getComputedStyle(e).fill),'rgb(204, 227, 232)');
   await p.evaluate(()=>demo.menus[0].setState('toggle',{isActive:false,isPressed:false}));assert.equal(await toggle.locator('.semicircle-hit').evaluate(e=>getComputedStyle(e).fill),tint);
   const hoverStates=await toggle.evaluate(el=>{el.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'pen'}));const pen=demo.menus[0].state.hoveredSector;el.dispatchEvent(new PointerEvent('pointerleave',{pointerType:'pen'}));el.dispatchEvent(new PointerEvent('pointerenter',{pointerType:'touch'}));return [pen,demo.menus[0].state.hoveredSector]});assert.deepEqual(hoverStates,['toggle',null]);
   // Genuine CDP pen pointer sequence, including browser hit testing.
   const session=await p.context().newCDPSession(p);const pen=await p.evaluate(()=>demo.menus[0].layout.inner[1].icon);
   await session.send('Input.dispatchMouseEvent',{type:'mousePressed',x:pen.x,y:pen.y,button:'left',clickCount:1,pointerType:'pen'});
   await session.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pen.x,y:pen.y,button:'left',clickCount:1,pointerType:'pen'});assert.equal(await hub.getAttribute('aria-expanded'),'false');
   await hub.focus();await p.keyboard.press('Enter');assert.equal(await hub.getAttribute('aria-expanded'),'true');
   await root.locator('[data-demo-id=group]').focus();await p.keyboard.press('Space');assert.equal(await root.locator('[data-demo-id=child-a]').count(),1);
   assert.equal(await root.locator('[data-demo-id=group] .semicircle-hit').evaluate(e=>getComputedStyle(e).strokeWidth),'3px');
   // Outside tap on canvas must not become the next point of the active bar.
   if(touch)await p.touchscreen.tap(400,650);else await p.mouse.click(400,650);
   assert.equal(await hub.getAttribute('aria-expanded'),'false');assert.deepEqual(await snapshot(),before);
   for(const viewport of [{width:390,height:844},{width:800,height:1100},{width:1366,height:800}]){
    await p.setViewportSize(viewport);await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await activate('hub');await activate('group');
    const safe=await p.evaluate(()=>demo.menus.every(m=>{const l=m.layout;return l.fits&&l.cy-l.radius>=l.bounds.top&&l.cy+l.radius<=l.bounds.bottom&&l.radius<180}));assert(safe);
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await activate('hub');
   }
   // Right uses the same interaction paths and maintains icon orientation.
   const right=p.locator('.semicircle-prototype[data-side=right]');await right.locator('[data-demo-id=hub]').focus();await p.keyboard.press('Enter');
   assert.equal(await right.locator('[role=button]').count(),4);await right.locator('[data-demo-id=group]').focus();await p.keyboard.press('Enter');assert.equal(await right.locator('[role=button]').count(),6);
   assert(!await right.locator('.semicircle-icon').first().getAttribute('transform').then(t=>t.includes('rotate')));
   assert.deepEqual(await snapshot(),before);
   await p.evaluate(()=>demo.destroy());assert.equal(await p.locator('.semicircle-prototype,.semicircle-safe-probe').count(),0);
   await p.evaluate(()=>{showSemicircleDemo();showSemicircleDemo()});assert.equal(await p.locator('.semicircle-prototype').count(),2);await p.evaluate(()=>semicircleDemo.destroy());
   assert.deepEqual(errors,[]);console.log('PASS semicircle DOM/state/isolation/bounds/keyboard/mouse/touch/pen',touch?'touch':'mouse');await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
