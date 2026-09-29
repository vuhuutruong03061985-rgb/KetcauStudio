const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const start=source.indexOf('function getThinBarFrame('),end=source.indexOf('// Pure force-magnitude preview solver',start);
assert(start>=0&&end>start);
// Strict isolated context: no DOM, items, camera or runtime dependencies.
const {getThinBarFrame:frame,solveThinSectionPlacement:solve}=vm.runInNewContext(
 '"use strict";'+source.slice(start,end)+';({getThinBarFrame,solveThinSectionPlacement})');
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const point=(a,b)=>{near(a.x,b.x);near(a.y,b.y)};
const horizontal={x:0,y:0,x2:100,y2:0},vertical={x:0,y:0,x2:0,y2:100},diagonal={x:0,y:0,x2:100,y2:100};
const base={anchorPoint:{x:50,y:0},referenceBar:horizontal,cursorPoint:{x:70,y:0},screenScale:2,thresholdPx:8,offsetPx:6};
function check(input,along,normalDistance,side){
 const frozen={...input,anchorPoint:Object.freeze({...input.anchorPoint}),cursorPoint:Object.freeze({...input.cursorPoint}),referenceBar:Object.freeze({...input.referenceBar})};
 Object.freeze(frozen);const before=JSON.stringify(frozen),r=solve(frozen);assert(r);
 assert.deepEqual(Object.keys(r).sort(),['along','drawStartPoint','normal','normalDistance','sectionSide','tangent']);
 near(r.along,along);near(r.normalDistance,normalDistance);assert.equal(r.sectionSide,side);
 assert([r.along,r.normalDistance,r.sectionSide,r.tangent.x,r.tangent.y,r.normal.x,r.normal.y,r.drawStartPoint.x,r.drawStartPoint.y].every(Number.isFinite));
 const dx=r.drawStartPoint.x-input.anchorPoint.x,dy=r.drawStartPoint.y-input.anchorPoint.y;
 near(dx*r.normal.x+dy*r.normal.y,0);
 near(dx*r.tangent.x+dy*r.tangent.y,side*input.offsetPx/input.screenScale);
 near(Math.hypot(dx,dy),Math.abs(side)*input.offsetPx/input.screenScale);
 if(side===0)point(r.drawStartPoint,input.anchorPoint);
 assert.notEqual(r.drawStartPoint,frozen.anchorPoint);
 assert.equal(JSON.stringify(frozen),before);assert.deepEqual(solve(frozen),r);return r;
}
const f=frame(Object.freeze(horizontal));point(f.tangent,{x:1,y:0});point(f.normal,{x:0,y:1});near(f.length,100);
for(const dy of [-30,30])check({...base,cursorPoint:{x:50,y:dy}},0,dy,0);
for(const dx of [-20,20])check({...base,cursorPoint:{x:50+dx,y:0}},dx,0,Math.sign(dx));
console.log('PASS horizontal frame, above/below and left/right');

const vf=frame(vertical);point(vf.tangent,{x:0,y:1});point(vf.normal,{x:-1,y:0});
for(const dy of [-20,20])check({...base,referenceBar:vertical,anchorPoint:{x:0,y:50},cursorPoint:{x:0,y:50+dy}},dy,0,Math.sign(dy));
for(const dx of [-30,30])check({...base,referenceBar:vertical,anchorPoint:{x:0,y:50},cursorPoint:{x:dx,y:50}},0,-dx,0);
console.log('PASS vertical along/normal independence');

const df=frame(diagonal),q=Math.SQRT1_2;
point(df.tangent,{x:q,y:q});point(df.normal,{x:-q,y:q});near(df.length,Math.sqrt(20000));
near(Math.hypot(df.tangent.x,df.tangent.y),1);near(Math.hypot(df.normal.x,df.normal.y),1);near(df.tangent.x*df.normal.x+df.tangent.y*df.normal.y,0);
for(const sign of [-1,1]){
 check({...base,referenceBar:diagonal,anchorPoint:{x:50,y:50},cursorPoint:{x:50+20*sign,y:50+20*sign}},sign*20*Math.SQRT2,0,sign);
 check({...base,referenceBar:diagonal,anchorPoint:{x:50,y:50},cursorPoint:{x:50-20*sign,y:50+20*sign}},0,sign*20*Math.SQRT2,0);
}
const reversed={x:100,y:100,x2:0,y2:0};point(frame(reversed).tangent,{x:-q,y:-q});point(frame(reversed).normal,{x:q,y:-q});
check({...base,referenceBar:reversed,anchorPoint:{x:50,y:50},cursorPoint:{x:70,y:70}},-20*Math.SQRT2,0,-1);
console.log('PASS diagonal orthonormal frame, both sides, perpendicular, axial offset and reversal');

for(const bar of [horizontal,vertical,diagonal])for(const a of [-20,0,20])for(const n of [-40,40]){
 const {tangent:t,normal:norm}=frame(bar),anchorPoint={x:bar.x2/2,y:bar.y2/2};
 check({...base,referenceBar:bar,anchorPoint,cursorPoint:{x:anchorPoint.x+a*t.x+n*norm.x,y:anchorPoint.y+a*t.y+n*norm.y}},a,n,Math.sign(a));
}
console.log('PASS mixed cursor preserves both projections independently');

for(const sign of [-1,1])for(const px of [0,7.999,8,8.001]){
 const along=sign*px/base.screenScale;
 check({...base,cursorPoint:{x:50+along,y:10}},along,10,px<=8?0:sign);
}
check({...base,thresholdPx:0,cursorPoint:{x:50,y:10}},0,10,0);
check({...base,thresholdPx:0,cursorPoint:{x:50.001,y:10}},.001,10,1);
check({...base,offsetPx:0},20,0,1);
console.log('PASS exact threshold equality, strict exceedance, zero threshold/offset and fixed offset');

for(const screenScale of [.5,2,4])for(const px of [-16,-8,0,8,16]){
 const r=check({...base,screenScale,cursorPoint:{x:50+px/screenScale,y:12/screenScale}},px/screenScale,12/screenScale,Math.abs(px)<=8?0:Math.sign(px));
 near(Math.hypot(r.drawStartPoint.x-50,r.drawStartPoint.y)*screenScale,r.sectionSide===0?0:6);
}
console.log('PASS zoom invariance at three scales for side, dead zone and screen offset');

for(const bar of [null,undefined,{}, {x:0,y:0,x2:0,y2:0},{A:{x:0,y:0},B:{x:100,y:0}},
 ...['x','y','x2','y2'].flatMap(key=>[NaN,Infinity,-Infinity,'0',null,undefined].map(value=>({...horizontal,[key]:value}))),
 {x:-1e308,y:0,x2:1e308,y2:0}]){
 assert.equal(frame(bar),null);assert.equal(solve({...base,referenceBar:bar}),null);
}
for(const key of ['anchorPoint','cursorPoint'])for(const p of [null,undefined,{},...['x','y'].flatMap(axis=>[NaN,Infinity,-Infinity,'0',null,undefined].map(value=>({x:0,y:0,[axis]:value})))])assert.equal(solve({...base,[key]:p}),null);
for(const key of ['screenScale','thresholdPx','offsetPx'])for(const value of [NaN,Infinity,-Infinity,-1,'2',null,undefined])assert.equal(solve({...base,[key]:value}),null);
assert.equal(solve({...base,screenScale:0}),null);
for(const input of [undefined,null,{},
 {...base,anchorPoint:{x:-1e308,y:0},cursorPoint:{x:1e308,y:0}},
 {...base,screenScale:1e308},
 {...base,screenScale:Number.MIN_VALUE},
 {...base,anchorPoint:{x:1e308,y:0},cursorPoint:{x:1.1e308,y:0},screenScale:1,offsetPx:1e308}
])assert.equal(solve(input),null);
console.log('PASS invalid/malformed/degenerate/nonfinite inputs and arithmetic overflow; immutable deterministic pure helpers');
