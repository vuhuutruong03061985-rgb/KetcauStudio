const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const start=source.indexOf('function getThinBarFrame('),end=source.indexOf('// Pure force-magnitude preview solver',start);
assert(start>=0&&end>start);
// No DOM, selected, items, snapping, camera or event APIs are available.
const {collectThinReferenceBars:collect,resolveThinReferenceBar:resolve}=vm.runInNewContext(
 '"use strict";'+source.slice(start,end)+';({collectThinReferenceBars,resolveThinReferenceBar})');
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const h={id:'h',type:'bar',x:-100,y:0,x2:100,y2:0};
const v={id:'v',type:'bar',x:0,y:-100,x2:0,y2:100};
const d={id:'d',type:'bar',x:-100,y:-100,x2:100,y2:100};
const anchor={x:0,y:0};
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value}
function gather(bars,anchorPoint=anchor,toleranceModel=0){
 const input=freeze({bars,anchorPoint,toleranceModel}),before=JSON.stringify(input),result=collect(input);
 assert.equal(JSON.stringify(input),before);assert.deepEqual(collect(input),result);
 for(const c of result){
  assert.deepEqual(Object.keys(c).sort(),['bar','barId','contactPoint','distance','normal','parameter','tangent']);
  assert(bars.includes(c.bar));assert.equal(c.barId,c.bar.id);
  assert([c.contactPoint.x,c.contactPoint.y,c.parameter,c.distance,c.tangent.x,c.tangent.y,c.normal.x,c.normal.y].every(Number.isFinite));
  assert(c.parameter>=0&&c.parameter<=1);assert(c.distance<=toleranceModel);
 }
 return freeze(result);
}
function pick(candidates,cursorPoint,extra={}){
 const input=freeze({candidates,anchorPoint:anchor,cursorPoint,screenScale:2,activationThresholdPx:8,...extra});
 const before=JSON.stringify(input),result=resolve(input);
 assert.equal(JSON.stringify(input),before);assert.equal(resolve(input),result);
 if(result)assert(candidates.includes(result));return result;
}
const one=gather([h]);assert.equal(one.length,1);near(one[0].parameter,.5);near(one[0].distance,0);
near(one[0].contactPoint.x,0);near(one[0].contactPoint.y,0);
for(const [x,u] of [[-100,0],[100,1]]){const c=gather([h],{x,y:0});assert.equal(c.length,1);near(c[0].parameter,u)}
for(const x of [-102,102])assert.equal(gather([h],{x,y:0},1).length,0);
for(const [y,count] of [[.999,1],[1,1],[1.001,0]])assert.equal(gather([h],{x:0,y},1).length,count);
for(const x of [-100.5,100.5]){const c=gather([h],{x,y:0},.5);assert.equal(c.length,1);near(c[0].distance,.5);near(c[0].parameter,x<0?0:1)}
const hv=gather([h,v]);assert.equal(hv.length,2);assert.equal(hv[0].bar,h);assert.equal(hv[1].bar,v);
assert.equal(gather([{...h,type:'thin'},null,h,{...v,type:'linkBar'},v]).length,2);
assert.equal(pick(one,anchor),one[0]);assert.equal(pick(one,{x:1,y:1}),one[0]);assert.equal(pick([],anchor),null);
console.log('PASS collect midpoint/endpoints/finite segment/inclusive tolerance/order/type filter; single candidate resolves immediately');

for(const sign of [-1,1]){
 for(const y of [0,3.999,4])assert.equal(pick(hv,{x:0,y:y*sign}),null);
 assert.equal(pick(hv,{x:0,y:4.001*sign}).barId,'h');
 assert.equal(pick(hv,{x:1*sign,y:30*sign}).barId,'h');
 assert.equal(pick(hv,{x:30*sign,y:1*sign}).barId,'v');
}
assert.equal(pick(hv,anchor,{activationThresholdPx:0}),null);
assert.equal(pick(hv,{x:0,y:.001},{activationThresholdPx:0}).barId,'h');
const hd=gather([h,d]);
for(const sign of [-1,1])assert.equal(pick(hd,{x:-20*sign,y:20*sign}).barId,'d');
for(const scale of [.5,2,4]){
 assert.equal(pick(hv,{x:0,y:8/scale},{screenScale:scale}),null);
 assert.equal(pick(hv,{x:0,y:9/scale},{screenScale:scale}).barId,'h');
}
console.log('PASS multiple candidates, exact activation dead zone, horizontal/vertical/diagonal, both normal signs and zoom');

const reverse=b=>({...b,x:b.x2,y:b.y2,x2:b.x,y2:b.y});
for(const bars of [[h,v],[h,d]])for(const flags of [[true,false],[false,true],[true,true]]){
 const original=gather(bars),flipped=gather(bars.map((b,i)=>flags[i]?reverse(b):b));
 for(let i=0;i<2;i++)for(const key of ['tangent','normal'])for(const axis of ['x','y'])near(flipped[i][key][axis],original[i][key][axis]*(flags[i]?-1:1));
 for(const cursor of [{x:1,y:30},{x:30,y:1},{x:-20,y:20},{x:20,y:-20}])assert.equal(pick(flipped,cursor)?.barId,pick(original,cursor)?.barId);
}
for(const list of [hv,[...hv].reverse()]){
 assert.equal(pick(list,{x:20,y:20}),null);
 assert.equal(pick(list,{x:20,y:20+1e-9}),null);
 assert.equal(pick(list,{x:20,y:20.001}).barId,'h');
 assert.equal(pick(list,{x:20.001,y:20}).barId,'v');
}
// The two best scores can tie after a lower-scoring candidate was seen first.
const duplicate={...h,id:'h2'};
for(const bars of [[v,h,duplicate],[h,duplicate,v],[duplicate,v,h]])assert.equal(pick(gather(bars),{x:0,y:20}),null);
const collinear=gather([{...h,x2:0},{...h,id:'right',x:0}]);
assert.equal(collinear.length,2);
for(const cursor of [{x:0,y:20},{x:0,y:-20},{x:20,y:0}])assert.equal(pick(collinear,cursor),null);
console.log('PASS endpoint-order invariance, exact/epsilon ties, candidate-order independence and collinear ambiguous-equivalent case');

const invalidBars=[null,{}, {...h,x2:h.x},...['x','y','x2','y2'].flatMap(key=>[NaN,Infinity,-Infinity,'0',undefined].map(value=>({...h,[key]:value}))),{...h,x:-1e308,x2:1e308}];
assert.equal(gather(invalidBars).length,0);assert.equal(gather([...invalidBars,h]).length,1);
for(const input of [undefined,null,{}, {bars:null,anchorPoint:anchor,toleranceModel:1},
 ...[NaN,Infinity,-1,'1',null].map(toleranceModel=>({bars:[h],anchorPoint:anchor,toleranceModel})),
 ...[null,{}, {x:NaN,y:0},{x:0,y:Infinity}].map(anchorPoint=>({bars:[h],anchorPoint,toleranceModel:1}))])assert.equal(collect(input).length,0);
const valid={candidates:hv,anchorPoint:anchor,cursorPoint:{x:0,y:20},screenScale:2,activationThresholdPx:8};
for(const candidates of [null,{},[null],[{}],new Array(2),[{...one[0],normal:{x:0,y:0}}],[{...one[0],normal:{x:0,y:Infinity}}],[{...one[0],bar:{...h,x:NaN}}],[{...one[0],parameter:2}],[{...one[0],distance:-1}],[{...one[0],contactPoint:{x:NaN,y:0}}],[one[0],{}]])assert.equal(resolve({...valid,candidates}),null);
for(const key of ['screenScale','activationThresholdPx'])for(const value of [NaN,Infinity,-Infinity,-1,'2',null,undefined])assert.equal(resolve({...valid,[key]:value}),null);
assert.equal(resolve({...valid,screenScale:0}),null);
for(const key of ['anchorPoint','cursorPoint'])for(const value of [null,{}, {x:NaN,y:0},{x:0,y:Infinity}])assert.equal(resolve({...valid,[key]:value}),null);
for(const input of [undefined,null,{}, {...valid,screenScale:1e308},{...valid,anchorPoint:{x:-1e308,y:0},cursorPoint:{x:1e308,y:0}}])assert.equal(resolve(input),null);
console.log('PASS malformed/degenerate/nonfinite/overflow inputs without crash, pure deterministic helpers and immutable inputs');
