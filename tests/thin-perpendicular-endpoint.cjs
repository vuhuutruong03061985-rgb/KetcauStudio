const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const start=source.indexOf('function solveThinPerpendicularEndpoint('),end=source.indexOf('// Pure force-magnitude preview solver',start);
assert(start>=0&&end>start);
// No DOM, state, camera, anchor or runtime helpers exist in this strict context.
const solve=vm.runInNewContext('"use strict";'+source.slice(start,end)+';solveThinPerpendicularEndpoint');
const near=(a,b)=>assert(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const point=(actual,expected)=>{assert(actual);near(actual.x,expected.x);near(actual.y,expected.y)};
const base={drawStartPoint:{x:10,y:7},normal:{x:0,y:1},signedNormalDistance:20,valueMode:'live',internalForceValue:100,internalForceScale:10};
function check(input,expected,length){
 const frozen=Object.freeze({...input,drawStartPoint:Object.freeze({...input.drawStartPoint}),normal:Object.freeze({...input.normal})});
 const before=JSON.stringify(frozen),result=solve(frozen);
 point(result,expected);assert.deepEqual(Object.keys(result).sort(),['x','y']);assert(Object.values(result).every(Number.isFinite));
 const dx=result.x-input.drawStartPoint.x,dy=result.y-input.drawStartPoint.y,nl=Math.hypot(input.normal.x,input.normal.y);
 near(Math.hypot(dx,dy),length);near(dx*(input.normal.y/nl)-dy*(input.normal.x/nl),0);
 assert.notEqual(result,frozen.drawStartPoint);assert.equal(JSON.stringify(frozen),before);assert.deepEqual(solve(frozen),result);
 return result;
}
for(const normal of [{x:0,y:1},{x:-1,y:0},{x:-Math.SQRT1_2,y:Math.SQRT1_2}])for(const valueMode of ['live','locked'])for(const sign of [-1,1]){
 const length=valueMode==='live'?20:10,input={...base,normal,valueMode,signedNormalDistance:sign*20};
 const expected={x:10+normal.x*sign*length,y:7+normal.y*sign*length};
 const result=check(input,expected,length);
 point(check({...input,normal:{x:-normal.x,y:-normal.y},signedNormalDistance:-input.signedNormalDistance},expected,length),result);
}
console.log('PASS horizontal/vertical/diagonal LIVE and LOCKED on both sides, perpendicular direction, length and orientation reversal');

for(const [normal,unit] of [[{x:0,y:5},{x:0,y:1}],[{x:-3,y:4},{x:-.6,y:.8}]])for(const valueMode of ['live','locked'])for(const sign of [-1,1]){
 const length=valueMode==='live'?20:10;
 check({...base,normal,valueMode,signedNormalDistance:sign*20},{x:10+unit.x*sign*length,y:7+unit.y*sign*length},length);
}
for(const valueMode of ['live','locked'])check({...base,valueMode,drawStartPoint:{x:10,y:0},anchorPoint:{x:0,y:0}},{x:10,y:valueMode==='live'?20:10},valueMode==='live'?20:10);
console.log('PASS non-unit normal normalization and drawStartPoint offset as the actual origin');

check({...base,signedNormalDistance:0},base.drawStartPoint,0);
for(const signedNormalDistance of [-1e-10,1e-10])check({...base,signedNormalDistance},{x:10,y:7+signedNormalDistance},Math.abs(signedNormalDistance));
for(const signedNormalDistance of [0,-1e-10,1e-10,-1e-9,1e-9])assert.equal(solve({...base,valueMode:'locked',signedNormalDistance}),null);
for(const sign of [-1,1])for(const signedNormalDistance of [sign*1.001e-9,sign*20,sign*200])check({...base,valueMode:'locked',signedNormalDistance},{x:10,y:7+sign*10},10);
for(const [internalForceValue,internalForceScale,length] of [[110,10,11],[110,5,22],[55,10,5.5]])check({...base,valueMode:'locked',internalForceValue,internalForceScale},{x:10,y:7+length},length);
// LIVE ignores even missing or invalid force fields; only the actual projection sets length.
for(const value of [undefined,null,0,-1,NaN,Infinity,'bad'])check({...base,internalForceValue:value,internalForceScale:value},{x:10,y:27},20);
console.log('PASS LIVE zero/tiny distance and independence from force fields; LOCKED inclusive epsilon dead zone, cursor magnitude independence and value/scale division');

for(const key of ['drawStartPoint','normal'])for(const value of [undefined,null,{},...['x','y'].flatMap(axis=>[undefined,null,NaN,Infinity,-Infinity,'1'].map(v=>({x:1,y:1,[axis]:v})))])assert.equal(solve({...base,[key]:value}),null);
for(const normal of [{x:0,y:0},{x:0,y:1e-10},{x:0,y:1e-9},{x:Number.MAX_VALUE,y:Number.MAX_VALUE}])assert.equal(solve({...base,normal}),null);
check({...base,normal:{x:0,y:1.001e-9}},{x:10,y:27},20);
for(const signedNormalDistance of [undefined,null,NaN,Infinity,-Infinity,'20'])assert.equal(solve({...base,signedNormalDistance}),null);
for(const valueMode of [undefined,null,'','LIVE','other',0])assert.equal(solve({...base,valueMode}),null);
for(const key of ['internalForceValue','internalForceScale'])for(const value of [undefined,null,0,-1,NaN,Infinity,-Infinity,'10'])assert.equal(solve({...base,valueMode:'locked',[key]:value}),null);
for(const input of [undefined,null,{},
 {...base,valueMode:'locked',internalForceValue:1e308,internalForceScale:1e-308},
 {...base,valueMode:'locked',internalForceValue:Number.MIN_VALUE,internalForceScale:Number.MAX_VALUE},
 ...['live','locked'].map(valueMode=>({...base,valueMode,drawStartPoint:{x:0,y:1e308},signedNormalDistance:1e308,internalForceValue:1e308,internalForceScale:1}))
])assert.equal(solve(input),null);
console.log('PASS invalid inputs/modes, normal epsilon, nonfinite/overflow/underflow rejection, deterministic and immutable pure solver');
