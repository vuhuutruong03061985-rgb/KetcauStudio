'use strict';
const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {ownership,settled}=require('./tablet-radial-ownership.cjs');

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const p=await browser.newPage({hasTouch:true,viewport:{width:1152,height:584}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await ownership(p,true);
  await p.evaluate(()=>{
   window.radialCalls={};window.radialSources=[];
   const watch=(id,source,event='click')=>{
    radialSources.push({id,source,handler:source.onclick});
    source.addEventListener(event,e=>{if(event!=='keydown'||e.key==='ArrowDown')radialCalls[id]=(radialCalls[id]||0)+1});
   };
   for(const entry of leftDrawingCategories.flatMap(c=>c.entries))if(entry.source)watch('left:'+entry.id,entry.source);
   for(const entry of Object.values(leftContextOptions).flat())watch('context:'+entry.id,entry.source);
   for(const id of ['resetView','extend','snapOptions'])watch('right:'+id,rightCommandSource(id),id==='snapOptions'?'keydown':'click');
  });
  const calls=()=>p.evaluate(()=>({...radialCalls}));
  const snapshot=()=>p.evaluate(()=>({doc:documentText(),past:JSON.stringify(past),future:JSON.stringify(future),mode,first,second}));
  const reset=async()=>{
   await p.evaluate(()=>{
    document.activeElement?.blur();cancelToSelection();leftDrawingMenu.close();rightCommandMenu.close();closeMomentPalette();
    snapPanel.open=false;snapEnabled=true;updateSnapControls();items=[];past=[];future=[];selected=null;render();radialCalls={};
   });await settled(p);
  };
  const tap=async(type,q)=>{
   if(type==='touch')await p.touchscreen.tap(q.x,q.y);
   else if(type==='mouse')await p.mouse.click(q.x,q.y);
   else{
    const cdp=await p.context().newCDPSession(p);
    await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...q,button:'left',buttons:1,clickCount:1,pointerType:'pen'});
    await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...q,button:'left',buttons:0,clickCount:1,pointerType:'pen'});await cdp.detach();
   }
   await settled(p);
  };
  const point=(side,id)=>p.evaluate(({side,id})=>{
   const m=side==='left'?leftDrawingMenu:rightCommandMenu;
   if(id==='hub')return {x:m.layout.cx+(side==='left'?13:-13),y:m.layout.cy};
   const ring=m.state.rings.find(r=>r.entries.some(e=>e.id===id));
   if(ring)return m.layout.rings.find(r=>r.id===ring.id).sectors[ring.entries.findIndex(e=>e.id===id)].icon;
   const index=[...m.host.querySelectorAll('[data-fixed-action]')].findIndex(el=>el.dataset.fixedAction===id);
   if(index<0)throw new Error('Missing radial entry '+id);return m.layout.contextRing.sectors[index].icon;
  },{side,id});
  const open=async(side,type)=>{
   if(!await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.open,side))await tap(type,await point(side,'hub'));
   assert.equal(await p.evaluate(side=>(side==='left'?leftDrawingMenu:rightCommandMenu).state.open,side),true);
  };
  const category=async(id,type)=>{await open('left',type);await tap(type,await point('left',id));assert.equal(await p.evaluate(()=>leftCategoryId),id)};
  const drag=async(type,side,from,to)=>{
   const a=await point(side,from),b=await point(side,to),cdp=await p.context().newCDPSession(p);
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...a,button:'left',buttons:1,clickCount:1,pointerType:type});
   for(let i=1;i<=8;i++){
    const q={x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8};
    if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[q]});
    else await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',...q,button:'left',buttons:1,pointerType:type});
   }
   if(type==='touch')await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   else await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',...b,button:'left',buttons:0,clickCount:1,pointerType:type});
   await cdp.detach();await settled(p);
  };
  for(const type of ['touch','mouse','pen']){
   await reset();await open('left',type);const beforeCategory=await snapshot();await category('loads',type);
   assert.deepEqual(await snapshot(),beforeCategory);assert.deepEqual(await calls(),{});
   // The canonical regression begins with no focused Tool, not a pre-focused sector.
   await category('geometry',type);assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].focusedId),null);
   const before=await p.evaluate(()=>({focused:leftDrawingMenu.state.rings[1].focusedId,mode,calls:{...radialCalls}}));
   await tap(type,await point('left','bar'));
   const after=await p.evaluate(()=>({focused:leftDrawingMenu.state.rings[1].focusedId,mode,calls:{...radialCalls}}));
   console.log(`${type} single Bar tap: ${JSON.stringify({before,after})}`);
   assert.deepEqual(after.calls,{'left:bar':1},'One intentional Bar tap must invoke the real source exactly once');assert.equal(after.mode,'bar');
   for(const [id,cat,expectedMode]of [['thin','geometry','thin'],['force','loads','force'],['moment','loads','moment'],['pin','supports','support']]){
    await reset();await category(cat,type);await tap(type,await point('left',id));assert.deepEqual(await calls(),{['left:'+id]:1},id);assert.equal(await p.evaluate(()=>mode),expectedMode);
   }
   await reset();await category('geometry',type);const idle=await snapshot();await drag(type,'left','bar','thin');
   assert.equal(await p.evaluate(()=>leftDrawingMenu.state.rings[1].focusedId),'thin');assert.deepEqual(await calls(),{});assert.deepEqual(await snapshot(),idle);
   await tap(type,await point('left','thin'));assert.deepEqual(await calls(),{'left:thin':1});assert.equal(await p.evaluate(()=>mode),'thin');
   // Drag is also a real focus-only route to the context ring; no Tool source fires.
   await reset();await category('loads',type);await drag(type,'left','force','moment');assert.deepEqual(await calls(),{});
   await tap(type,await point('left','moment-ccw'));assert.deepEqual(await calls(),{'context:moment-ccw':1});assert.equal(await p.evaluate(()=>mode),'moment');
   await reset();await open('right',type);await tap(type,await point('right','resetView'));assert.deepEqual(await calls(),{'right:resetView':1});
   await reset();await open('right',type);const snapBefore=await p.evaluate(()=>({...snapOptions}));await tap(type,await point('right','snapOptions'));
   assert.deepEqual(await calls(),{'right:snapOptions':1});assert.equal(await p.evaluate(()=>snapPanel.open),true);assert.deepEqual(await p.evaluate(()=>({...snapOptions})),snapBefore);
   // A fresh independent gesture after RIGHT activation must reach LEFT immediately.
   await open('left',type);await category('geometry',type);await tap(type,await point('left','bar'));assert.deepEqual(await calls(),{'right:snapOptions':1,'left:bar':1});
   await reset();await open('right',type);await drag(type,'right','resetView','extend');assert.deepEqual(await calls(),{});
   assert.equal(await p.evaluate(()=>rightCommandMenu.state.rings[0].focusedId),'extend');await tap(type,await point('right','extend'));assert.deepEqual(await calls(),{'right:extend':1});
   await reset();await category('geometry',type);await p.evaluate(()=>{document.querySelector('button[data-mode="bar"]').disabled=true;leftDrawingMenu.refresh()});await settled(p);
   assert.equal(await p.locator('.semicircle-left-menu [data-demo-id="bar"]').getAttribute('aria-disabled'),'true');
   await tap(type,await point('left','bar'));assert.deepEqual(await calls(),{});assert.equal(await p.evaluate(()=>mode),'select');
   await p.evaluate(()=>{document.querySelector('button[data-mode="bar"]').disabled=false;leftDrawingMenu.refresh()});
   console.log(`PASS ${type}: Category navigation only; Tool/Context/RIGHT exactly once; drag focus only; fresh gesture; disabled source; Snap popup unchanged`);
  }
  for(const key of ['Enter','Space']){
   await reset();await category('geometry','touch');await p.locator('.semicircle-left-menu [data-demo-id="bar"]').focus();await p.keyboard.press(key);await settled(p);
   assert.deepEqual(await calls(),{'left:bar':1});assert.equal(await p.evaluate(()=>mode),'bar');
   await reset();await open('right','touch');await p.locator('.semicircle-right-menu [data-demo-id="extend"]').focus();await p.keyboard.press(key);await settled(p);
   assert.deepEqual(await calls(),{'right:extend':1});assert.equal(await p.evaluate(()=>mode),'extend');
   await open('left','touch');await category('geometry','touch');await tap('touch',await point('left','bar'));assert.deepEqual(await calls(),{'right:extend':1,'left:bar':1});
  }
  assert(await p.evaluate(()=>radialSources.every(({source,handler})=>source.isConnected&&source.onclick===handler)));
  assert.deepEqual(errors,[]);console.log('PASS Enter/Space once, first LEFT touch after RIGHT keyboard, source identity/handlers; physical Android acceptance pending');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
