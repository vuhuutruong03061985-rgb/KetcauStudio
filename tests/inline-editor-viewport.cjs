const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const settle=p=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const snapshot=p=>p.evaluate(()=>{
 const input=document.querySelector('input[aria-label="Sửa nhãn trên hình"]'),preview=document.querySelector('[data-label-expression]');
 return {model:JSON.stringify(items),history:JSON.stringify([past,future]),camera:JSON.stringify(camera),viewBox:svg.getAttribute('viewBox'),value:input.value,selection:[input.selectionStart,input.selectionEnd,input.selectionDirection],focus:document.activeElement===input,preview:preview.innerHTML,hidden:preview.hidden};
});
async function visible(p){
 const geometry=await p.evaluate(()=>{
  const v=window.visualViewport,valid=v&&[v.width,v.height,v.offsetLeft,v.offsetTop].every(Number.isFinite)&&v.width>0&&v.height>0;
  const viewport=valid?{x:v.offsetLeft,y:v.offsetTop,w:v.width,h:v.height}:{x:0,y:0,w:innerWidth,h:innerHeight};
  const rect=n=>{const r=n.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height}};
  const preview=document.querySelector('[data-label-expression]');
  return {viewport,input:rect(document.querySelector('input[aria-label="Sửa nhãn trên hình"]')),preview:preview.hidden?null:rect(preview)};
 });
 const v=geometry.viewport;
 for(const [name,r]of Object.entries({input:geometry.input,preview:geometry.preview}))if(r){
  assert(r.x>=v.x-1&&r.y>=v.y-1&&r.x+r.w<=v.x+v.w+1&&r.y+r.h<=v.y+v.h+1,`${name} outside viewport: ${JSON.stringify(geometry)}`);
 }
 if(geometry.preview){const a=geometry.input,b=geometry.preview;assert(b.y+b.h<=a.y+1||b.y>=a.y+a.h-1,'preview covers input')}
}
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const variant of ['native','fallback','synthetic']){
   const page=await browser.newPage({viewport:{width:800,height:1280}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   if(variant!=='native')await page.addInitScript(kind=>{
    if(kind==='fallback')Object.defineProperty(window,'visualViewport',{value:undefined,configurable:true});
    else{const v=new EventTarget();Object.assign(v,{width:800,height:1280,offsetLeft:0,offsetTop:0});Object.defineProperty(window,'visualViewport',{value:v,configurable:true})}
   },variant);
   await page.goto(pathToFileURL(path.resolve('index.html')).href);
   await page.waitForFunction(()=>typeof editLabel==='function'&&typeof equationLayout==='function');
   // Track only listeners installed during editor lifetime, not application startup listeners.
   await page.evaluate(()=>{
    window.editorListeners=new Set();for(const target of [window,window.visualViewport].filter(Boolean)){
     const add=target.addEventListener.bind(target),remove=target.removeEventListener.bind(target);
     target.addEventListener=(type,fn,...args)=>{if(['resize','scroll'].includes(type))editorListeners.add(fn);return add(type,fn,...args)};
     target.removeEventListener=(type,fn,...args)=>{if(['resize','scroll'].includes(type))editorListeners.delete(fn);return remove(type,fn,...args)};
    }
   });
   async function open(value){
    await page.setViewportSize({width:800,height:1280});
    if(variant==='synthetic')await page.evaluate(()=>Object.assign(visualViewport,{width:800,height:1280,offsetLeft:0,offsetTop:0}));
    await page.evaluate(value=>{
     items=[make('text',400,650)];items[0].label=value==='Plain label = note'?value:'Original';render();
     const target=document.createElement('span');target.id='editor-test-anchor';target.textContent='Anchor';target.style.cssText='position:fixed;left:700px;top:1100px';document.body.append(target);
     editLabel(items[0],target);const input=document.querySelector('input[aria-label="Sửa nhãn trên hình"]');
     input.value=value;
     // Initial label preview is plain text; subsequent input may invoke calculation handling.
     if(value!=='Plain label = note')input.dispatchEvent(new Event('input',{bubbles:true}));
     input.setSelectionRange(1,Math.min(4,value.length),'backward');
    },value);await settle(page);
   }
   async function resize(width,height){
    if(variant==='synthetic')await page.evaluate(({width,height})=>{Object.assign(visualViewport,{width,height,offsetLeft:17,offsetTop:31});for(let i=0;i<5;i++){visualViewport.dispatchEvent(new Event('resize'));visualViewport.dispatchEvent(new Event('scroll'))}},{width,height});
    else await page.setViewportSize({width,height});
    await settle(page);
   }
   for(const value of ['Plain label = note','\\frac{x_i}{y_i}','2*3','\\unknown{','Words '.repeat(45)+'=']){
    await open(value);
    if(value.includes('frac'))assert.equal(await page.locator('[data-label-expression] svg').count(),1);
    if(value==='2*3')assert.match(await page.locator('[data-label-expression]').textContent(),/6/);
    const before=await snapshot(page);
    for(const [w,h]of [[400,300],[1280,800],[800,1280]]){await resize(w,h);await visible(page);assert.deepEqual(await snapshot(page),before,`${variant}: state changed on resize (${value})`)}
    // Losing the SVG/DOM target must retain its last usable rectangle.
    await page.evaluate(()=>document.getElementById('editor-test-anchor').remove());await resize(500,350);await visible(page);
    assert.deepEqual(await snapshot(page),before);
    await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));inlineEditor.finish(false)});await settle(page);
    assert.equal(await page.locator('[data-label-expression]').count(),0);assert.equal(await page.evaluate(()=>editorListeners.size),0);
   }
   // This exceeds the existing direct-equation label limit, a completion rejection that keeps editing active.
   await open('x+'.repeat(60)+'x=1');await page.getByRole('textbox',{name:'Sửa nhãn trên hình'}).press('Enter');
   assert.equal(await page.evaluate(()=>!!inlineEditor),true);assert(await page.evaluate(()=>editorListeners.size>0));
   const invalid=await snapshot(page);await resize(450,320);await visible(page);assert.deepEqual(await snapshot(page),invalid);
   await page.evaluate(()=>inlineEditor.finish(false));
   await open('M');await resize(500,400);
   const input=page.getByRole('textbox',{name:'Sửa nhãn trên hình'});await input.press('End');
   await page.locator('#mathSymbols').click();await page.locator('#mathSymbolsPanel').getByRole('button',{name:'xᵢ',exact:true}).click();
   await input.pressSequentially('K2');assert.equal(await input.inputValue(),'M_{K2}');assert(await input.evaluate(n=>n===document.activeElement));
   await input.press('Escape');assert.equal(await page.evaluate(()=>editorListeners.size),0);
   assert.deepEqual(errors,[]);console.log(`PASS ${variant}: resize/orientation, previews, state preservation, validation, cleanup and palette`);await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
