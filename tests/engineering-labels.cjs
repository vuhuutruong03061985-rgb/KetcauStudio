const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
 const input=p.getByRole('textbox',{name:'Sửa nhãn trên hình'});
 for(const label of ['P=20 kN','P = 45 kN','q=10 kN/m','L=6 m','E=200 GPa','A=2000 mm²','I=5000000 mm⁴','α=30°','M=25 kN·m','V=-1.2e3 customUnit/s²']){
  await p.evaluate(()=>{items=[make('text',300,300)];setMode('select');editObjectLabel(items[0])});
  await input.fill(label);assert(!(await p.locator('[data-label-expression]').textContent()).includes('Chờ dữ kiện'));await input.press('Enter');
  assert.equal(await p.evaluate(()=>items[0].label),label);assert.equal(await p.evaluate(()=>items[0].labelFormula),undefined);
  await p.evaluate(()=>editObjectLabel(items[0]));assert.equal(await input.inputValue(),label);await input.press('Enter');assert.equal(await p.evaluate(()=>items[0].label),label);
  assert.equal(await p.evaluate(()=>{const d=new DOMParser().parseFromString(exportSVG(),'image/svg+xml');return d.querySelector('g[data-id] text').textContent}),label);
  await p.evaluate(()=>{selected=items[0].id;copySelection();objectClipboard=copy(pendingCopy);clipboardBase={x:0,y:0};placeClipboard({x:40,y:40})});assert.equal(await p.evaluate(()=>items.at(-1).label),label);
 }
 for(const [source,expected] of [['2*3','6'],['P = 4*5','P = 20'],['2*x=6','2*x=6-->x=3'],['x+y=3','x+y=3-->Chờ dữ kiện'],['solve(x+y=3)','Chờ dữ kiện'],['x=2*y-->','x=2*y-->Chờ dữ kiện']]){
  await p.evaluate(()=>{items=[make('text',300,300)];setMode('select');editObjectLabel(items[0])});await input.fill(source);await input.press('Enter');assert.equal(await p.evaluate(()=>items[0].label),expected);
 }
 console.log('PASS engineering value classification, reopen, copy, SVG, arithmetic and explicit/implicit solver intent');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
