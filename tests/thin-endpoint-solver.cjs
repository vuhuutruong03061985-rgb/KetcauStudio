const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const s=fs.readFileSync('assets/app.js','utf8');const solve=vm.runInNewContext(s.slice(s.indexOf('function solveThinEndpointFromValue'),s.indexOf('function renderThinConstraintPreview'))+';solveThinEndpointFromValue');
for(const [x,y]of [[1,0],[-1,0],[0,1],[0,-1],[3,4],[300,400]]){const p=solve({startPoint:{x:0,y:0},candidatePoint:{x,y},internalForceValue:110,internalForceScale:10});assert(Math.abs(Math.hypot(p.x,p.y)-11)<1e-10);assert(Math.abs(p.x*y-p.y*x)<1e-9)}
for(const [scale,length]of [[5,20],[20,5]])assert.equal(solve({startPoint:{x:0,y:0},candidatePoint:{x:1,y:0},internalForceValue:100,internalForceScale:scale}).x,length);
const base={startPoint:{x:0,y:0},candidatePoint:{x:1,y:0},internalForceValue:110,internalForceScale:10};
for(const key of ['internalForceValue','internalForceScale'])for(const value of [0,-1,NaN,Infinity,'10',null])assert.equal(solve({...base,[key]:value}),null);
assert.equal(solve({...base,candidatePoint:{x:0,y:0}}),null);assert.equal(solve({...base,candidatePoint:{x:1e-12,y:0}}),null);assert.equal(solve({...base,internalForceValue:1e308,internalForceScale:1e-308}),null);
console.log('PASS thin pure solver directions, fixed magnitude, division, invalid/degenerate/overflow');
