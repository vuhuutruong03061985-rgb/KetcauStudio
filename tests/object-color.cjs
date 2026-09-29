const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await browser.newPage({viewport:{width:1500,height:1100}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 const seed=()=>p.evaluate(()=>{
  finishObjectColorEdit();setMode('select');snapEnabled=false;
  items=[...colorObjectTypes].map((type,i)=>{
   const extra=type==='curve'?{curvePoints:[{x:60,y:-30},{x:120,y:0}]}:['hatch','rigidRegion'].includes(type)?{points:[{x:0,y:0},{x:120,y:0},{x:60,y:100}],spacing:8,...(type==='rigidRegion'?rigidDefaults:{})}:{};
   return make(type,150+(i%4)*220,180+Math.floor(i/4)*100,...(['bar','thin','dashed','udl','dim','linkBar'].includes(type)?[270+(i%4)*220,180+Math.floor(i/4)*100]:[undefined,undefined]),extra);
  });past=[];future=[];selected=null;multiSelection.clear();render();return copy(items);
 });
 const original=await seed();
 assert.equal(await p.locator('#resetObjectColor').count(),0);assert.equal(await p.locator('#objectColorControls button').count(),0);assert.equal(await p.locator('#objectColorControls').innerText(),'');
 assert.deepEqual(await p.locator('#objectColorPresets option').evaluateAll(es=>es.map(e=>e.value)),['#000000','#d32f2f','#1976d2','#388e3c','#f57c00','#7b1fa2','#757575']);
 assert(await p.locator('#objectColor').isDisabled());assert(!original.some(o=>'strokeColor' in o));
 const artwork=await p.locator('#objectColor').evaluate(e=>getComputedStyle(e).backgroundImage);
 const palette=await p.locator('#objectColor').evaluate(e=>decodeURIComponent(e.style.getPropertyValue('--palette-artwork')));
 assert.equal((palette.match(/<rect /g)||[]).length,6);for(const color of ['#000000','#d32f2f','#1976d2','#388e3c','#f57c00','#7b1fa2'])assert(palette.includes(color));
 assert.equal(await p.locator('#objectColorControls input[type=color]').count(),1);
 assert(await p.locator('#objectColor').getAttribute('aria-label'));assert(await p.locator('#objectColor').getAttribute('title'));
 await p.evaluate(()=>{multiSelection=new Set(items.map(o=>o.id));render()});
 for(const color of ['#d32f2f','#1976d2','#388e3c'])await p.locator('#objectColor').evaluate((e,color)=>{e.value=color;e.dispatchEvent(new Event('input',{bubbles:true}))},color);
 await p.locator('#objectColor').dispatchEvent('change');assert.equal(await p.evaluate(()=>past.length),1);
 const colored=await p.evaluate(()=>copy(items));assert(colored.every(o=>o.strokeColor==='#388e3c'));assert.deepEqual(colored.map(({strokeColor,...o})=>o),original);
 assert.equal(await p.locator('#objectColor').evaluate(e=>getComputedStyle(e).backgroundImage),artwork);
 const rendering=await p.evaluate(()=>{
  const doc=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');
  return items.map(o=>{const g=[...doc.querySelectorAll('[data-id]')].find(g=>g.dataset.id===o.id);
   return {type:o.type,stroke:g.getAttribute('stroke'),text:[...g.querySelectorAll('text')].map(t=>t.getAttribute('fill')),markers:[...g.querySelectorAll('[marker-end]')].map(a=>doc.querySelector(a.getAttribute('marker-end').slice(4,-1)+' path').getAttribute('fill')),dash:g.querySelector('[stroke-dasharray]')?.getAttribute('stroke-dasharray'),outline:g.querySelector('[data-rigid-outline]')?.getAttribute('stroke')};
  });
 });
 for(const r of rendering){assert.equal(r.stroke,'#388e3c');assert(r.text.every(c=>c==='#388e3c'));assert(r.markers.every(c=>c==='#388e3c'))}
 assert.equal(rendering.find(r=>r.type==='dashed').dash,'8 5');assert.equal(rendering.find(r=>r.type==='rigidRegion').outline,'#388e3c');
 await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items)),original);
 await p.evaluate(()=>actions.redo[1]());assert.deepEqual(await p.evaluate(()=>copy(items)),colored);
 await p.evaluate(()=>{multiSelection=new Set(items.map(o=>o.id));render()});await p.locator('#objectColor').fill('#000000');
 assert((await p.evaluate(()=>copy(items))).every(o=>o.strokeColor==='#000000'));assert.equal(await p.evaluate(()=>past.length),2);
 await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items)),colored);
 // Mixed previous colors are restored individually; native picker noise is one operation.
 await seed();await p.evaluate(()=>{items=items.slice(0,3);items[0].strokeColor='#d32f2f';items[1].strokeColor='#1976d2';multiSelection=new Set(items.map(o=>o.id));render()});
 assert.equal(await p.locator('#objectColorState').textContent(),'Nhi\u1ec1u m\u00e0u');
 const mixed=await p.evaluate(()=>copy(items));await p.locator('#objectColor').fill('#388e3c');assert.equal(await p.evaluate(()=>past.length),1);
 await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items)),mixed);await p.evaluate(()=>actions.redo[1]());assert((await p.evaluate(()=>items.map(o=>o.strokeColor))).every(c=>c==='#388e3c'));
 await p.evaluate(()=>{actions.undo[1]();multiSelection.clear();selected=items[0].id;render()});assert.equal(await p.locator('#objectColor').inputValue(),'#d32f2f');
 await p.evaluate(()=>{applyObjectColor('#111111');applyObjectColor('#d32f2f');finishObjectColorEdit()});assert.equal(await p.evaluate(()=>past.length),0);assert.equal(await p.evaluate(()=>future.length),1);
 await p.evaluate(()=>{applyObjectColor('#222222');checkpoint();items[0].x+=10;render()});assert.equal(await p.evaluate(()=>past.length),2);
 await p.evaluate(()=>actions.undo[1]());assert.equal(await p.evaluate(()=>items[0].strokeColor),'#222222');await p.evaluate(()=>actions.undo[1]());assert.deepEqual(await p.evaluate(()=>copy(items)),mixed);
 // A new picker interaction/selection must not absorb the preceding history entry.
 await p.evaluate(()=>{selected=items[0].id;multiSelection.clear();render();applyObjectColor('#111111');selected=items[1].id;render();applyObjectColor('#222222');finishObjectColorEdit()});
 assert.equal(await p.evaluate(()=>past.length),2);await p.locator('#objectColor').focus();await p.keyboard.press('Control+z');assert.equal(await p.evaluate(()=>items[1].strokeColor),'#1976d2');assert.equal(await p.evaluate(()=>items[0].strokeColor),'#111111');
 // Shared markers must not recolor differently colored or default arrows.
 await p.evaluate(()=>{items=[make('force',200,200,undefined,undefined,{strokeColor:'#d32f2f'}),make('force',400,200,undefined,undefined,{strokeColor:'#1976d2'}),make('force',600,200),make('support',800,200,undefined,undefined,{strokeColor:'#388e3c'})];selected=items[0].id;multiSelection.clear();render()});
 assert.deepEqual(await p.evaluate(()=>items.slice(0,3).map(o=>{const g=svg.querySelector(`[data-id="${o.id}"]`),marker=g.querySelector('[marker-end]').getAttribute('marker-end');return svg.querySelector(marker.slice(4,-1)+' path').getAttribute('fill')})),['#d32f2f','#1976d2','black']);
 assert(await p.evaluate(()=>{const g=svg.querySelector(`[data-id="${items[3].id}"]`);return [...g.querySelectorAll('circle')].every(n=>n.getAttribute('fill')==='white')}));
 assert(await p.evaluate(()=>[...svg.querySelectorAll('[data-hit-area] line')].every(n=>n.getAttribute('stroke')==='transparent')));
 // Validation, actual JSON input and generic cloning/transforms.
 await seed();await p.evaluate(()=>{multiSelection=new Set(items.map(o=>o.id));render();applyObjectColor('#123456');finishObjectColorEdit()});const json=await p.evaluate(()=>documentText());
 assert((await p.evaluate(()=>['red','#abc','#12345678','url(#x)','var(--x)',null,42,{},''].map(value=>{const d=JSON.parse(documentText());d.items[0].strokeColor=value;try{validate(d);return false}catch{return true}}))).every(Boolean));
 await p.locator('#file').setInputFiles({name:'colors.json',mimeType:'application/json',buffer:Buffer.from(json)});await p.waitForFunction(()=>documentName==='colors.json');assert.deepEqual(await p.evaluate(()=>copy(items)),JSON.parse(json).items);
 assert(await p.evaluate(()=>{const d=JSON.parse(documentText());d.items.forEach(o=>delete o.strokeColor);return validate(d).every(o=>!Object.hasOwn(o,'strokeColor'))}));
 await p.evaluate(()=>{multiSelection.clear();selected=items.find(o=>o.type==='text').id;render();copySelection();objectClipboard=copy(pendingCopy);clipboardBase={x:0,y:0};placeClipboard({x:100,y:100})});
 const pasted=await p.evaluate(()=>{const source=items.find(o=>o.type==='text'),pasted=items.at(-1);const color=pasted.strokeColor;applyObjectColor('#654321');finishObjectColorEdit();return {color,source:source.strokeColor,pasted:pasted.strokeColor}});assert.deepEqual(pasted,{color:'#123456',source:'#123456',pasted:'#654321'});
 assert(await p.evaluate(()=>mirroredObjects(items,{x:0,y:0},{x:0,y:100}).every((o,i)=>o.strokeColor===items[i].strokeColor)));
 // Equation glyphs, fraction strokes and roots; preserve editing workflow.
 await p.evaluate(()=>{const o=items.find(o=>o.type==='text');o.label='\\frac{x_i}{2}+\\sqrt{y}';selected=o.id;multiSelection.clear();render();editObjectLabel(o)});await p.locator('body > input[type=text]').press('Enter');
 assert(await p.evaluate(()=>{const out=new DOMParser().parseFromString(exportSVG(),'image/svg+xml'),g=out.querySelector('[data-equation]');return g&&[...g.querySelectorAll('text')].every(n=>n.getAttribute('fill')==='#123456')&&[...g.querySelectorAll('line')].every(n=>n.getAttribute('stroke')==='#123456')}));
 // Interior styles and outline remain independent during live control-point deformation.
 await p.evaluate(()=>{items=[items.find(o=>o.type==='rigidRegion')];selected=items[0].id;multiSelection.clear();render()});
 for(const fillMode of ['hatch','color','none']){
  await p.evaluate(fillMode=>{items[0].fillMode=fillMode;items[0].fillColor='#abcdef';items[0].fillOpacity=.4;items[0].hatchStyle='cross';render()},fillMode);
  const interior=await p.evaluate(()=>{const {strokeColor,...o}=items[0];return o});await p.locator('#objectColor').fill('#765432');assert.deepEqual(await p.evaluate(()=>{const {strokeColor,...o}=items[0];return o}),interior);
  assert.equal(await p.locator('[data-rigid-outline]').getAttribute('stroke'),'#765432');const out=await p.evaluate(()=>exportSVG());
  if(fillMode==='color')assert(out.includes('fill="#abcdef" fill-opacity="0.4"'));if(fillMode==='hatch')assert(out.includes('stroke="black" stroke-width="0.8"'));if(fillMode==='none')assert.equal(await p.locator('[data-rigid-outline]').getAttribute('fill'),'none');
  const q=await p.locator('[data-rigid-point="1"]').boundingBox(),old=await p.locator('[data-rigid-outline]').getAttribute('d');await p.mouse.move(q.x+q.width/2,q.y+q.height/2);await p.mouse.down();await p.mouse.move(q.x+q.width/2+20,q.y+q.height/2+10,{steps:3});
  assert.notEqual(await p.locator('[data-rigid-outline]').getAttribute('d'),old);assert.equal(await p.locator('[data-rigid-outline]').getAttribute('d'),await p.locator('[data-id] [data-hit-area]').first().getAttribute('d'));await p.mouse.up();assert.equal(await p.evaluate(()=>items[0].strokeColor),'#765432');
  await p.locator('[data-mode="rigidRegion"]').click();await p.locator('#rigid-fillColor').fill('#fedcba');await p.locator('#rigid-fillColor').dispatchEvent('change');assert.equal(await p.evaluate(()=>items[0].strokeColor),'#765432');await p.evaluate(()=>closeSecondaryTools());
 }
 assert.equal(await p.locator('[data-rigid-point] circle[stroke="#087d95"]').first().getAttribute('stroke'),'#087d95');assert(!/data-rigid-point|data-move-anchor|data-hit-area|#15889c|#087d95/.test(await p.evaluate(()=>exportSVG())));
 // Actual PNG action: decode the output and sample colored/default stroke pixels.
 await p.evaluate(()=>{items=[make('bar',100,100,400,100,{strokeColor:'#1976d2'}),make('bar',100,200,400,200)];selected=items[0].id;render();window.pngResult=null;download=async(blob,name)=>{const bitmap=await createImageBitmap(blob),c=document.createElement('canvas');c.width=bitmap.width;c.height=bitmap.height;const ctx=c.getContext('2d');ctx.drawImage(bitmap,0,0);window.pngResult={name,w:c.width,h:c.height,color:[...ctx.getImageData(600,300,1,1).data],normal:[...ctx.getImageData(600,600,1,1).data]};bitmap.close()}});
 await p.locator('#png').click();await p.waitForFunction(()=>window.pngResult);assert.deepEqual(await p.evaluate(()=>pngResult),{name:'ket-cau.png',w:3300,h:2160,color:[25,118,210,255],normal:[0,0,0,255]});
 assert.deepEqual(errors,[]);console.log('PASS object color: 20 types, defaults/ordinary black, mixed history, JSON, equations/arrows, rigid styles/deformation, copy/mirror, SVG and PNG pixels');
 const ctx=await browser.newContext({viewport:{width:800,height:1280},hasTouch:true,isMobile:true}),t=await ctx.newPage();await t.goto(pathToFileURL(path.resolve('index.html')).href);await t.waitForFunction(()=>items.length>0);
 await t.evaluate(()=>{items=[make('bar',200,300,600,300)];setMode('select');render()});const pt=await t.evaluate(()=>{const q=new DOMPoint(350,300).matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y}});await t.touchscreen.tap(pt.x,pt.y);
 assert(await t.locator('#objectColor').isEnabled());const bounds=await t.locator('#objectColor').boundingBox();assert(bounds.width>=44&&bounds.height>=44);
 await t.locator('#objectColor').fill('#d32f2f');assert.equal(await t.evaluate(()=>items[0].strokeColor),'#d32f2f');await t.locator('#objectColor').fill('#000000');assert.equal(await t.evaluate(()=>items[0].strokeColor),'#000000');
 for(const viewport of [{width:1280,height:800},{width:1200,height:1920},{width:1920,height:1200},{width:800,height:1280}]){await t.setViewportSize(viewport);assert(await t.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
 await ctx.close();console.log('PASS touch selection/ordinary black, native-picker events and four tablet layouts (not physical Android picker validation)');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
