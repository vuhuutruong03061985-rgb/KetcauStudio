const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 await p.evaluate(()=>{items=[make('text',400,300)];editObjectLabel(items[0])});const input=p.getByRole('textbox',{name:'Sửa nhãn trên hình'});
 const formula='M_{K2}=\\frac{P L}{2}+\\sqrt{x^2+y^2}';await input.fill(formula);assert(await p.locator('[data-label-expression] svg').isVisible());await input.press('Enter');
 assert.equal(await p.evaluate(()=>items[0].label),formula);assert(await p.locator('[data-equation]').isVisible());
 assert(await p.evaluate(()=>exportSVG().includes('data-equation')));
 await p.evaluate(()=>editObjectLabel(items[0]));assert.equal(await input.inputValue(),formula);await input.press('Escape');
 assert.equal(await p.evaluate(()=>validate(JSON.parse(documentText())).length),1);
 await p.evaluate(()=>editObjectLabel(items[0]));await input.fill('');await input.pressSequentially('\\sum');await input.press('Space');
 assert.equal(await input.inputValue(),'∑{□}');assert.equal(await input.evaluate(e=>e.value.slice(e.selectionStart,e.selectionEnd)),'□');
 await input.pressSequentially('F_i');assert.equal(await input.inputValue(),'∑{F_i}');await input.press('Enter');
 assert(await p.locator('[data-equation]').isVisible());assert((await p.locator('[data-equation]').textContent()).includes('∑'));
 console.log('PASS fraction/root layout, live preview, save, reopen and SVG export');
 // Exercise the shared layout directly: plain x_{123} does not select the Equation editor path.
 const cases=['\\beta_i','\\alpha_i','x_{123}','x_{i+1}','\\sum_i','\\int_i','x_i^2','\\frac{x_i}{y_i}'];
 const measurements=await p.evaluate(async sources=>{
  await document.fonts.ready;
  const results=[];
  for(const source of sources)for(const size of [19,28]){
   const layout=equationLayout(source,size),preview=document.createElementNS('http://www.w3.org/2000/svg','svg');
   // Match the preview's padding and viewBox construction without changing application code.
   const width=layout.w+20,height=layout.h+layout.d+20;
   preview.setAttribute('viewBox',`0 0 ${width} ${height}`);document.body.append(preview);
   try{
    layout.draw(preview,10,layout.h+10);
    const box=n=>{const r=n.getBBox();return {x:r.x,y:r.y,w:r.width,h:r.height}};
    results.push({source,size,width,height,layout:{w:layout.w,h:layout.h,d:layout.d},bounds:box(preview),
     texts:[...preview.querySelectorAll('text')].map(n=>({text:n.textContent,x:+n.getAttribute('x'),y:+n.getAttribute('y'),size:+n.getAttribute('font-size'),bounds:box(n)})),
     lines:[...preview.querySelectorAll('line')].map(n=>({y:+n.getAttribute('y1')}))});
   }finally{preview.remove()}
  }
  return results;
 },cases);
 const between=(value,min,max,message)=>assert(Number.isFinite(value)&&value>=min&&value<=max,`${message}: ${value} outside [${min}, ${max}]`);
 for(const m of measurements){
  const label=`${m.source} (${m.size})`,tolerance=m.size*.12;
  for(const [key,value]of Object.entries({...m.layout,width:m.width,height:m.height}))assert(Number.isFinite(value)&&value>0,`${label}: invalid ${key}`);
  for(const bounds of [m.bounds,...m.texts.map(t=>t.bounds)]){
   for(const value of Object.values(bounds))assert(Number.isFinite(value),`${label}: nonfinite SVG bounds`);
   assert(bounds.x>=-tolerance&&bounds.y>=-tolerance&&bounds.x+bounds.w<=m.width+tolerance&&bounds.y+bounds.h<=m.height+tolerance,`${label}: viewport clipping`);
  }
  const checkScript=(base,sub)=>{
   between(sub.size/base.size,.60,.70,`${label}: script scale`);
   between((sub.y-base.y)/base.size,.18,.35,`${label}: ordinary baseline`);
   between((sub.x-base.x)/base.size,.45,.70,`${label}: script horizontal placement`);
  };
  const [base,...rest]=m.texts;
  if(m.source==='\\sum_i'||m.source==='\\int_i'){
   assert.equal(m.texts.map(t=>t.text).join(''),m.source==='\\sum_i'?'∑i':'∫i');
   const sub=rest[0];
   between(sub.size/base.size,.45,.55,`${label}: operator script scale`);
   between((sub.y-base.y)/m.size,.78,.95,`${label}: preserved operator baseline`);
   between((sub.x-base.x)/base.size,.50,.65,`${label}: preserved operator side spacing`);
   assert(sub.bounds.y>=base.bounds.y+base.bounds.h-tolerance,`${label}: operator/subscript clearance`);
  }else if(m.source==='\\frac{x_i}{y_i}'){
   assert.equal(m.texts.map(t=>t.text).join(''),'xiyi');assert.equal(m.lines.length,1);
   checkScript(m.texts[0],m.texts[1]);checkScript(m.texts[2],m.texts[3]);
   const bar=m.lines[0].y;
   for(const t of m.texts.slice(0,2))assert(t.bounds.y+t.bounds.h<=bar+tolerance,`${label}: numerator crosses bar`);
   for(const t of m.texts.slice(2))assert(t.bounds.y>=bar-tolerance,`${label}: denominator crosses bar`);
  }else if(m.source==='x_i^2'){
   const sub=rest.find(t=>t.text==='i'),sup=rest.find(t=>t.text==='2');assert(sub&&sup);
   checkScript(base,sub);between((base.y-sup.y)/base.size,.60,.85,`${label}: superscript baseline`);
   assert(sup.bounds.y+sup.bounds.h<=sub.bounds.y+tolerance,`${label}: scripts overlap`);
  }else{
   const expected={'\\beta_i':'βi','\\alpha_i':'αi','x_{123}':'x123','x_{i+1}':'xi+1'};
   assert.equal(m.texts.map(t=>t.text).join(''),expected[m.source]);
   checkScript(base,rest[0]);
   for(const sub of rest){
    between(sub.size/base.size,.60,.70,`${label}: script character scale`);
    assert(Math.abs(sub.y-rest[0].y)<=m.size*.02,`${label}: inconsistent subscript baseline`);
   }
   for(let i=1;i<rest.length;i++)assert(rest[i].x>rest[i-1].x,`${label}: subscript order`);
  }
 }
 console.log('PASS subscript geometry: 8 expressions at two sizes, operator spacing, fraction clearance and viewport bounds');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
