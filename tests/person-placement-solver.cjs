const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const segment=source.slice(source.indexOf('function segmentContact('),source.indexOf('// Isolate all real roots'));
const solver=source.slice(source.indexOf('const PERSON_DEFAULT_SIZE='),source.indexOf('function validatePerson('));
// No DOM, document state, camera or event APIs exist in this context.
const solve=vm.runInNewContext(segment+solver+';solvePersonPlacement');
const near=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const horizontal={x:0,y:0,x2:100,y2:0},vertical={x:0,y:0,x2:0,y2:100};
function check(bar,p,q,n,size=2){
 const input={bar:Object.freeze({...bar}),candidatePoint:Object.freeze({...p}),size};Object.freeze(input);
 const before=JSON.stringify(input),r=solve(input);assert(r);assert.deepEqual(Object.keys(r).sort(),['angle','x','y']);assert(Object.values(r).every(Number.isFinite));
 const angle=r.angle*Math.PI/180,u={x:-Math.sin(angle),y:Math.cos(angle)};
 near(u.x,n.x);near(u.y,n.y);
 // The head stays on the outward normal through the contact point.
 near((r.x-q.x)*n.y-(r.y-q.y)*n.x,0);
 const l=Math.hypot(bar.x2-bar.x,bar.y2-bar.y);near(u.x*(bar.x2-bar.x)/l+u.y*(bar.y2-bar.y)/l,0);
 const signedHead=(r.x-q.x)*n.x+(r.y-q.y)*n.y;
 near(signedHead,20+2*size);near(signedHead-2*size,20);
 // Both actual feet have greater outward distance, including their local X spread.
 for(const localX of [-5,5]){const fx=r.x+size*(localX*Math.cos(angle)-20*Math.sin(angle)),fy=r.y+size*(localX*Math.sin(angle)+20*Math.cos(angle));assert((fx-q.x)*n.x+(fy-q.y)*n.y>signedHead)}
 assert.equal(JSON.stringify(input),before);assert.deepEqual(solve(input),r);return r;
}
for(const size of [1,2,3]){
 near(check(horizontal,{x:50,y:40},{x:50,y:0},{x:0,y:1},size).angle,0);
 near(check(horizontal,{x:50,y:-40},{x:50,y:0},{x:0,y:-1},size).angle,180);
 check(vertical,{x:40,y:50},{x:0,y:50},{x:1,y:0},size);check(vertical,{x:-40,y:50},{x:0,y:50},{x:-1,y:0},size);
}
for(const size of [1,2,3])for(const deg of [30,45,-30]){
 const a=deg*Math.PI/180,t={x:Math.cos(a),y:Math.sin(a)},n={x:-t.y,y:t.x},bar={x:10,y:20,x2:10+100*t.x,y2:20+100*t.y},q={x:10+50*t.x,y:20+50*t.y};
 const results=[];for(const sign of [1,-1])results.push(check(bar,{x:q.x+40*n.x*sign,y:q.y+40*n.y*sign},q,{x:n.x*sign,y:n.y*sign},size));near((results[1].angle-results[0].angle+360)%360,180);
 const reversed={x:bar.x2,y:bar.y2,x2:bar.x,y2:bar.y};const r=solve({bar:reversed,candidatePoint:{x:q.x+40*n.x,y:q.y+40*n.y},size});near(r.x,results[0].x);near(r.y,results[0].y);near(r.angle,results[0].angle);
}
for(const size of [1,2,3]){check(horizontal,{x:-20,y:40},{x:0,y:0},{x:0,y:1},size);check(horizontal,{x:120,y:-40},{x:100,y:0},{x:0,y:-1},size)}
for(const x of [-20,50,120])for(const y of [0,1e-7,-1e-7])assert.equal(solve({bar:horizontal,candidatePoint:{x,y}}),null);
for(const bar of [{x:0,y:0,x2:0,y2:0},{x:0,y:0,x2:1e-8,y2:0},{x:NaN,y:0,x2:1,y2:0},{x:0,y:0,x2:Infinity,y2:0},{x:-1e308,y:0,x2:1e308,y2:0}])assert.equal(solve({bar,candidatePoint:{x:50,y:40}}),null);
for(const size of [0,-1,NaN,Infinity,'2',null,1e308])assert.equal(solve({bar:horizontal,candidatePoint:{x:50,y:40},size}),null);
for(const candidatePoint of [null,{x:NaN,y:40},{x:50,y:Infinity},{x:'50',y:40}])assert.equal(solve({bar:horizontal,candidatePoint}),null);
assert.equal(solve(),null);assert.equal(solve({}),null);
console.log('PASS pure person solver: cardinal/diagonal/opposite sides, endpoint clamps, size/gap, outward +Y and feet, reversal, ambiguous/invalid/overflow, deterministic and immutable inputs');
