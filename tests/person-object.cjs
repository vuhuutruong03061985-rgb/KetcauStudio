const {chromium}=require('../.test-tools/node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 const legacy=await p.evaluate(()=>JSON.parse(documentText()));
 const objects=await p.evaluate(()=>{items=[make('bar',10,20,200,20),make('person',100,120),make('person',300,200,undefined,undefined,{angle:90,size:3})];render();return copy(items)});
 assert.equal(objects[1].size,2);assert.equal(objects[1].angle,0);assert.deepEqual(Object.keys(objects[1]).sort(),['angle','id','size','type','x','y']);
 assert.equal(await p.locator('[data-mode="person"]').count(),1);assert.equal(await p.evaluate(()=>Object.hasOwn(modes,'person')),true);
 assert.equal(await p.locator('use').nth(1).evaluate(u=>u.parentElement.getAttribute('transform')),'translate(300 200) rotate(90) scale(3)');
 const matrix=await p.locator('use').nth(1).evaluate(u=>{const m=u.parentElement.transform.baseVal.consolidate().matrix;const head=new DOMPoint(0,0).matrixTransform(m),foot=new DOMPoint(0,20).matrixTransform(m);return {head:{x:head.x,y:head.y},foot:{x:foot.x,y:foot.y}}});
 assert.deepEqual(matrix,{head:{x:300,y:200},foot:{x:240,y:200}});
 for(const w of [550,2200,1100]){await p.evaluate(w=>{camera.w=w;applyCamera();render()},w);assert.deepEqual(await p.evaluate(()=>items),objects)}
 const invalid=await p.evaluate(()=>{const base=make('person',100,120);return [['x',NaN],['y',Infinity],['angle',undefined],['angle','90'],['size',0],['size',-1],['size',Infinity],['size','2']].map(([key,value])=>{try{validate({format:'ket-cau-studio',version:1,items:[{...base,[key]:value}]});return false}catch{return true}})});assert(invalid.every(Boolean));
 await p.evaluate(()=>{window.disk='';window.showSaveFilePicker=async()=>({name:'person.json',getFile:async()=>new File([disk],'person.json'),createWritable:async()=>({write:async text=>disk=text,close:async()=>{},abort:async()=>{}})})});
 assert.equal(await p.evaluate(()=>saveDocument(true)),true);const saved=await p.evaluate(()=>JSON.parse(disk));assert.equal(saved.version,1);assert(!('grid' in saved));assert(!('gridSize' in saved));assert.deepEqual(saved.items,objects);
 await p.evaluate(async data=>loadDocument(new File([JSON.stringify(data)],'person.json')),saved);assert.deepEqual(await p.evaluate(()=>items),objects);assert.equal(await p.locator('use[href="#personSymbol"]').count(),2);assert.equal(await p.evaluate(()=>savedDocument===documentText()),true);
 await p.evaluate(()=>saveDraft());await p.reload();assert.deepEqual(await p.evaluate(()=>items),objects);
 const before=await p.evaluate(()=>documentText());await assert.rejects(()=>p.evaluate(async data=>loadDocument(new File([JSON.stringify(data)],'invalid.json')),{...saved,items:[{...objects[1],size:0}]}));assert.equal(await p.evaluate(()=>documentText()),before);
 await p.evaluate(async data=>loadDocument(new File([JSON.stringify(data)],'legacy.json')),legacy);assert.deepEqual(await p.evaluate(()=>items),legacy.items);
 await p.evaluate(()=>{items.push({id:'invalid',type:'person',x:0,y:0,angle:NaN,size:0});render()});assert.equal(await p.locator('use[href="#personSymbol"]').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS person defaults/schema, transforms, zoom/model invariance, validation, Save/load/draft, v1 legacy and no grid');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
