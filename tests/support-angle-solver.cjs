const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const start=source.indexOf('function solveSupportAngle('),end=source.indexOf('function rotateVector(',start);
assert(start>=0&&end>start);
// Isolated strict context proves the helper needs no DOM or application state.
const solve=vm.runInNewContext('"use strict";'+source.slice(start,end)+';solveSupportAngle');
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const origin=Object.freeze({x:0,y:0});
function check(anchor,cursor,expected){
 const before=JSON.stringify([anchor,cursor]);
 Object.freeze(anchor);Object.freeze(cursor);
 const result=solve(anchor,cursor);
 assert(result===null||Number.isFinite(result));
 if(expected===null)assert.equal(result,null);
 else{near(result,expected);assert(result>-180&&result<=180);assert(!Object.is(result,-0))}
 assert.equal(solve(anchor,cursor),result);
 assert.equal(JSON.stringify([anchor,cursor]),before);
 return result;
}
for(const [x,y,angle] of [[0,1,0],[0,-1,180],[-1,0,90],[1,0,-90],[1,1,-45],[-1,1,45],[1,-1,-135],[-1,-1,135]]){
 check(origin,{x,y},angle);
 check(origin,{x:x*1e150,y:y*1e150},angle);
 check({x:12,y:-34},{x:12+x,y:-34+y},angle);
}
// Non-cardinal directions: rotating local +Y must reproduce the unit cursor vector.
for(const [x,y] of [[2,7],[-3,11],[5,-13],[-17,-2]]){
 const angle=solve(origin,{x,y}),r=angle*Math.PI/180,length=Math.hypot(x,y);
 assert(Number.isFinite(angle)&&angle>-180&&angle<=180);
 near(-Math.sin(r),x/length);near(Math.cos(r),y/length);
}
check(origin,{x:0,y:0},null);
check(origin,{x:1e-10,y:-1e-10},null);
check(origin,{x:1e-9,y:0},null);
check(origin,{x:1.001e-9,y:0},-90);
check(origin,{x:-0,y:-1},180);
for(const invalid of [null,undefined,{}, {x:NaN,y:0},{x:0,y:Infinity},{x:'1',y:0}]){
 assert.equal(solve(origin,invalid),null);assert.equal(solve(invalid,origin),null);
}
assert.equal(solve({x:-Number.MAX_VALUE,y:0},{x:Number.MAX_VALUE,y:0}),null);
console.log('PASS support angle: axes, diagonals, long/translated vectors, SVG axis alignment, epsilon, canonical range, immutable inputs and finite/null results');
