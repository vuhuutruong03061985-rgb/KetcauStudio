const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const context=await browser.newContext({viewport:{width:1500,height:1100},hasTouch:true}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>typeof sectionVisibilityDefaults!=='undefined');
 assert.equal(await p.locator('#sectionVisibility > span').textContent(),'N\u1ed9i l\u1ef1c:');
 assert.equal(await p.locator('#sectionVisibility').getAttribute('aria-label'),'N\u1ed9i l\u1ef1c');
 for(const k of ['N','Q','M'])assert.equal(await p.locator('#section-visible-'+k).getAttribute('aria-label'),'Hi\u1ec7n n\u1ed9i l\u1ef1c '+k+' c\u1ee7a nh\u00f3m m\u1eb7t c\u1eaft');
 const check=async(action,value)=>p.locator('#section-visible-'+action).setChecked(value);
 const states=()=>p.evaluate(()=>Object.fromEntries(['N','Q','M'].map(k=>{const e=$('section-visible-'+k);return [k,{checked:e.checked,mixed:e.indeterminate,disabled:e.disabled}]})));
 const seed=()=>p.evaluate(()=>{
  cancelToSelection();sectionVisibilityDefaults={N:true,Q:true,M:true};localStorage.removeItem(sectionVisibilityKey);snapEnabled=false;
  items=[make('bar',150,200,550,200),make('bar',150,400,550,400),make('bar',150,200,150,400)];past=[];future=[];updateSelection([]);sectionPoints=[{x:350,y:100},{x:350,y:500}];setMode('section');finishSection();
 });
 const screen=(x,y)=>p.evaluate(({x,y})=>{const q=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}},{x,y});
 async function click(x,y){const q=await screen(x,y);await p.mouse.click(q.x,q.y)}
 await seed();await click(250,200);await p.locator('#sectionNames button[type="submit"]').click();await click(250,200);
 assert.equal(await p.evaluate(()=>items.filter(sectionForceAction).length),6);
 assert.equal(await p.evaluate(()=>selectedSectionGroups().size),1);
 // Legacy without metadata, including JSON v1, remains visible.
 await p.evaluate(()=>{for(const o of items)delete o.sectionVisible;validate(JSON.parse(documentText()));render();past=[]});
 assert(await p.evaluate(()=>items.filter(sectionForceAction).every(o=>svg.querySelector(`[data-id="${o.id}"]`))));
 const original=await p.evaluate(()=>copy(items));await check('N',false);
 assert(await p.evaluate(()=>items.filter(o=>o.sectionAction==='N').every(o=>o.sectionVisible===false&&!svg.querySelector(`[data-id="${o.id}"]`))));
 assert(await p.evaluate(()=>items.filter(o=>['Q','M'].includes(o.sectionAction)).every(o=>svg.querySelector(`[data-id="${o.id}"]`))));assert.equal(await p.evaluate(()=>past.length),1);
 await check('M',false);await check('N',true);await check('N',false);await check('Q',false);
 assert(await p.evaluate(()=>items.filter(sectionForceAction).every(o=>!svg.querySelector(`[data-id="${o.id}"]`))));
 assert(await p.evaluate(()=>{const doc=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');return items.filter(sectionForceAction).every(o=>!doc.querySelector(`[data-id="${o.id}"]`))}));
 await click(900,600);await click(220,200);assert.equal(await p.locator('#sectionVisibility').isVisible(),true);assert.equal(await p.evaluate(()=>selectedSectionGroups().size),1);
 for(const k of ['N','Q','M'])await check(k,true);
 assert.deepEqual(await p.evaluate(()=>items.map(o=>{const q=copy(o);delete q.sectionVisible;return q})),original);
 // Partial selection identifies the entire group; hidden primary has no SVG or move handle.
 await p.evaluate(()=>{const o=items.find(o=>o.sectionAction==='Q');updateSelection([o.id],o.id);render()});await check('Q',false);
 assert(await p.evaluate(()=>!svg.querySelector(`[data-id="${selected}"]`)&&!svg.querySelector('[data-move-anchor]')&&items.some(o=>o.id===selected)));
 await check('Q',true);
 // Clone group with differing state, plus unrelated drawing objects.
 await p.evaluate(()=>{
  const source=items.filter(o=>o.sectionGroup),clones=copy(source);for(const o of clones){o.id=newId();o.sectionGroup='G2';o.x+=400;if(o.x2!==undefined)o.x2+=400;if(o.sectionAction==='N')o.sectionVisible=false}items.push(...clones);
  const extra=[make('bar',50,600,150,600),make('linkBar',200,600,300,600),make('weld',450,600),make('force',600,600)];items.push(...extra);
  updateSelection([...source.filter(sectionForceAction).map(o=>o.id),clones.find(sectionForceAction).id,...extra.map(o=>o.id)]);render();past=[];window.prefBefore=localStorage.getItem(sectionVisibilityKey);
 });
 assert.equal(await p.evaluate(()=>selectedSectionGroups().size),2);assert.equal((await states()).N.mixed,true);await check('N',true);
 assert.equal(await p.evaluate(()=>past.length),1);assert(await p.evaluate(()=>localStorage.getItem(sectionVisibilityKey)===window.prefBefore));assert(await p.evaluate(()=>items.filter(o=>!sectionForceAction(o)).every(o=>o.sectionVisible===undefined)));
 await p.evaluate(()=>actions.undo[1]());assert.equal((await states()).N.mixed,true);await p.evaluate(()=>actions.redo[1]());assert.equal((await states()).N.checked,true);
 await p.evaluate(()=>setSectionActionVisibility('N',true));assert.equal(await p.evaluate(()=>past.length),1);
 // Intra-group mixture, missing actions and unique-group preference.
 await p.evaluate(()=>{const group=items.find(o=>o.sectionAction==='N').sectionGroup;const ns=items.filter(o=>o.sectionGroup===group&&o.sectionAction==='N');ns[0].sectionVisible=false;updateSelection(ns.map(o=>o.id));render()});assert.equal((await states()).N.mixed,true);assert.equal(await p.evaluate(()=>selectedSectionGroups().size),1);
 await check('N',true);assert.equal((await states()).N.mixed,false);
 await p.evaluate(()=>{const g=[...selectedSectionGroups()][0];const q=items.find(o=>o.sectionGroup===g&&o.sectionAction==='Q');items=items.filter(o=>o!==q);render()});const count=await p.evaluate(()=>items.length);await check('Q',false);await check('Q',true);assert.equal(await p.evaluate(()=>items.length),count);
 await p.evaluate(()=>{const g=[...selectedSectionGroups()][0];items=items.filter(o=>!(o.sectionGroup===g&&o.sectionAction==='Q'));render()});assert.equal((await states()).Q.disabled,true);await p.evaluate(()=>setSectionActionVisibility('Q',true));assert.equal(await p.evaluate(()=>items.length),count-1);
 await check('M',false);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem(sectionVisibilityKey)).M),false);
 // Formula data remains in items and equation updating even while hidden.
 await p.evaluate(()=>{const o=items.find(o=>o.sectionAction==='M'&&selectedSectionGroups().has(o.sectionGroup));o.label='6';o.labelFormula='2*3';o.labelAngle='deg';render();window.dataBefore=copy(o)});
 await check('M',true);await check('M',false);assert(await p.evaluate(()=>{const o=items.find(o=>o.id===dataBefore.id);return ['label','labelFormula','labelAngle','sectionVector','sectionSign'].every(k=>JSON.stringify(o[k])===JSON.stringify(dataBefore[k]))}));
 // New section defaults apply to every action, without omitting any.
 await p.evaluate(()=>{sectionPoints=[{x:300,y:100},{x:300,y:500}];setMode('section');finishSection();chooseSectionComponent(sectionPending.graph.candidates[0])});assert(await p.evaluate(()=>sectionPending.groups.flat().filter(sectionForceAction).every(o=>o.sectionVisible===sectionVisibilityDefaults[o.sectionAction])));await p.keyboard.press('Escape');
 // JSON rejects invalid/new-field misuse, but preserves existing fields and false values.
 assert(await p.evaluate(()=>{const o=items.find(sectionForceAction);for(const value of ['false',0,null]){try{validate({format:'ket-cau-studio',version:1,items:[{...o,sectionVisible:value}]});return false}catch{}}try{validate({format:'ket-cau-studio',version:1,items:[{...items.find(o=>o.type==='bar'),sectionVisible:false}]});return false}catch{}return JSON.stringify(validate(JSON.parse(documentText())))===JSON.stringify(items)}));
 // Copy and all mirror axes preserve flags independently of current creation defaults.
 assert(await p.evaluate(()=>{const source=items.filter(o=>o.sectionGroup===items.find(sectionForceAction).sectionGroup);for(const axis of [[{x:0,y:0},{x:1,y:0}],[{x:0,y:0},{x:0,y:1}],[{x:10,y:20},{x:100,y:80}]]){const result=mirroredObjects(source,...axis);if(result.some((o,i)=>o.sectionVisible!==source[i].sectionVisible))return false}updateSelection(source.map(o=>o.id));copySelection();objectClipboard=copy(pendingCopy);clipboardBase={x:0,y:0};const before=items.length;placeClipboard({x:0,y:100});return items.slice(before).every((o,i)=>o.sectionVisible===source[i].sectionVisible)}));
 // SVG and actual PNG raster must lose the complete action, not just its label.
 await p.evaluate(()=>{items=[make('force',300,300,undefined,undefined,{sectionGroup:'pixel',sectionAction:'N',sectionVector:{x:1,y:0},label:'N'}),make('bar',100,100,200,100)];updateSelection([items[0].id]);render();download=async blob=>{const im=await createImageBitmap(blob),c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);window.pixel=[...ctx.getImageData(340*3,300*3,1,1).data];im.close()}});
 await p.locator('#png').click();await p.waitForFunction(()=>window.pixel);assert((await p.evaluate(()=>pixel))[0]<100);await check('N',false);
 assert(await p.evaluate(()=>{const d=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');return !d.querySelector(`[data-id="${items[0].id}"]`)}));await p.evaluate(()=>pixel=null);await p.locator('#png').click();await p.waitForFunction(()=>pixel);assert.deepEqual(await p.evaluate(()=>pixel),[255,255,255,255]);
 // Shared clean-render/crop input consumed by Word omits hidden objects too.
 assert(await p.evaluate(()=>{render(true);try{return !svg.querySelector(`[data-id="${items[0].id}"]`)&&[...svg.querySelectorAll('[data-id]')].every(g=>Number.isFinite(g.getBBox().width))}finally{render()}}));
 // Touch checkbox follows normal input; no touch selection gesture is introduced.
 const label=p.locator('#section-visible-N').locator('..');const box=await label.boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);assert.equal((await states()).N.checked,true);
 // Startup preference validation; reload has no production edits.
 for(const value of [null,'bad JSON',JSON.stringify({N:false,Q:0,M:true})]){await p.evaluate(value=>{if(value===null)localStorage.removeItem(sectionVisibilityKey);else localStorage.setItem(sectionVisibilityKey,value)},value);await p.reload();await p.waitForFunction(()=>typeof sectionVisibilityDefaults!=='undefined');assert.deepEqual(await p.evaluate(()=>sectionVisibilityDefaults),{N:true,Q:true,M:true})}
 await p.evaluate(()=>localStorage.setItem(sectionVisibilityKey,JSON.stringify({N:false,Q:true,M:false})));await p.reload();await p.waitForFunction(()=>typeof sectionVisibilityDefaults!=='undefined');assert.deepEqual(await p.evaluate(()=>sectionVisibilityDefaults),{N:false,Q:true,M:false});
 assert.deepEqual(errors,[]);console.log('PASS section-group visibility: multiple cuts, partial/mixed selections, bulk/indeterminate/history, missing actions, defaults, formula/JSON/copy/mirror, SVG/PNG/Word clean rendering and emulated touch');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
