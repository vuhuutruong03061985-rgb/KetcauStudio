const {chromium}=require('../.test-tools/node_modules/playwright');const {pathToFileURL}=require('node:url'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage();await p.goto(pathToFileURL(path.resolve('index.html')).href);await p.waitForFunction(()=>items.length>0);
await p.evaluate(()=>editObjectLabel(items.find(o=>o.type==='force')));const input=p.getByRole('textbox',{name:'Sửa nhãn trên hình'});await input.fill('9');await input.selectText();
await p.locator('#mathSymbols').click();await p.locator('#mathSymbolsPanel').getByRole('button',{name:'√',exact:true}).click();assert.equal(await input.inputValue(),'sqrt(9)');assert(await input.isVisible());
await input.press('End');await p.locator('#mathSymbolsPanel').getByRole('button',{name:'+',exact:true}).click();await input.pressSequentially('7');await input.press('Enter');assert.equal(await p.evaluate(()=>items.find(o=>o.type==='force').label),'10');
await p.evaluate(()=>editObjectLabel(items.find(o=>o.type==='force')));await input.fill('M');await input.press('End');await p.locator('#mathSymbolsPanel').getByRole('button',{name:'xᵢ',exact:true}).click();await input.pressSequentially('K2');assert.equal(await input.inputValue(),'M_{K2}');await input.press('Escape');
console.log('PASS palette insertion, selection wrapping, caret, live calculation and subscript');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
