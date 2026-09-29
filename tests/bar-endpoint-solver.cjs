const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');const start=source.indexOf('function solveBarEndpoint('),end=source.indexOf('// Refresh this transient decoration',start);
const solve=vm.runInNewContext(source.slice(start,end)+';solveBarEndpoint');
const origin={x:10,y:20},candidate={x:13,y:24};
const base={startPoint:origin,candidatePoint:candidate,geometryScale:100,distanceMode:'live',angleMode:'live'};
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const point=(p,x,y)=>{assert(p);near(p.x,x);near(p.y,y)};
point(solve(base),13,24);
for(const c of [{x:13,y:24},{x:310,y:420},{x:10,y:-5},{x:-20,y:20}]){
 const p=solve({...base,candidatePoint:c,distanceMode:'locked',distanceValue:5.5});near(Math.hypot(p.x-10,p.y-20),550);near((p.x-10)*(c.y-20)-(p.y-20)*(c.x-10),0);
}
for(const [a,x,y]of [[0,15,20],[90,10,15],[180,5,20],[-90,10,25],[450,10,15]])point(solve({...base,angleMode:'locked',angleValue:a}),x,y);
// Radial distance is 5, whereas projection onto horizontal is only 3.
near(solve({...base,angleMode:'locked',angleValue:0}).x-origin.x,5);
const locked={...base,distanceMode:'locked',distanceValue:5.5,angleMode:'locked',angleValue:30};
for(const c of [candidate,{x:2000,y:-1000},origin,null])point(solve({...locked,candidatePoint:c}),10+Math.cos(Math.PI/6)*550,20-275);
for(const value of [0,-1,NaN,Infinity,'5',null])assert.equal(solve({...locked,distanceValue:value}),null);
for(const scale of [0,-1,NaN,Infinity,'100',null])assert.equal(solve({...locked,geometryScale:scale}),null);
assert.equal(solve({...base,distanceMode:'locked',distanceValue:5.5,candidatePoint:origin}),null);
assert.equal(solve({...locked,angleValue:Infinity}),null);
assert.equal(solve({...locked,distanceValue:1e308}),null);
assert.equal(solve({...base,candidatePoint:{x:NaN,y:0}}),null);
point(solve({...base,geometryScale:NaN}),13,24); // Scale is irrelevant when no length conversion is needed.
assert.deepEqual(origin,{x:10,y:20});assert.deepEqual(candidate,{x:13,y:24});
console.log('PASS pure solver four states, radial distance, directions/cycles, invalid/degenerate/overflow safety, unchanged inputs');
