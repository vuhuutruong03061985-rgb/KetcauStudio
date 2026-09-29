const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/app.js','utf8');
const code=source.slice(source.indexOf('function getThinBarFrame('),source.indexOf('function thinReferenceOverrideAt('));
const api=vm.runInNewContext('"use strict";'+code+';({getReferenceBarFrame,normalizeReferenceAngle,globalPlacementAngleToReferenceAngle,referenceAngleToGlobalPlacementAngle,collectReferenceBars,resolveReferenceBar,hitReferenceOverride,collectThinReferenceBars,resolveThinReferenceBar,hitThinReferenceOverride})');
const {getReferenceBarFrame:frame,normalizeReferenceAngle:n,globalPlacementAngleToReferenceAngle:local,referenceAngleToGlobalPlacementAngle:global}=api;
const near=(a,b)=>assert(Math.abs(n(a-b))<1e-9,`${a} != ${b}`);
for(const [dx,dy]of [[100,0],[0,100],...[30,45,135].map(a=>[100*Math.cos(a*Math.PI/180),100*Math.sin(a*Math.PI/180)]),[1e-12,-100]]){
 const bar=Object.freeze({id:'a',type:'bar',x:12,y:17,x2:12+dx,y2:17+dy}),before=JSON.stringify(bar);
 const f=frame(bar),reverse=frame({x:bar.x2,y:bar.y2,x2:bar.x,y2:bar.y});assert.deepEqual(f,reverse);assert.equal(JSON.stringify(bar),before);
 assert(f.tangent.x>0||(f.tangent.x===0&&f.tangent.y>0));near(Math.hypot(f.tangent.x,f.tangent.y),1);
 for(const a of [0,-0,90,-90,180,-180,270,-270,360,-360,37.25,-135.5,721]){
  near(global(local(a,f),f),n(a));near(local(global(a,f),f),n(a));assert(!Object.is(local(a,f),-0));assert(!Object.is(global(a,f),-0));
  const g=global(a,f)*Math.PI/180,r=a*Math.PI/180;
  near(-Math.sin(g),f.tangent.x*Math.cos(r)+f.normal.x*Math.sin(r));near(Math.cos(g),f.tangent.y*Math.cos(r)+f.normal.y*Math.sin(r));
 }
}
const h=frame({x:0,y:0,x2:10,y2:0}),v=frame({x:0,y:0,x2:0,y2:10});
assert.equal(global(0,h),-90);assert.equal(global(0,v),0);assert.equal(global(90,h),0);assert.equal(global(-90,h),180);assert.equal(global(90,v),90);
for(const bad of [null,{}, {x:0,y:0,x2:0,y2:0},{x:NaN,y:0,x2:1,y2:1},{x:0,y:0,x2:Infinity,y2:1}])assert.equal(frame(bad),null);
for(const bad of [null,{}, {globalAngle:NaN}])assert.equal(local(30,bad),null);
for(const a of [NaN,Infinity,undefined]){assert.equal(local(a,h),null);assert.equal(global(a,h),null)}
assert.equal(n(270),-90);assert.equal(n(-270),90);assert.equal(n(360),0);assert.equal(n(-360),0);assert(!Object.is(n(-0),-0));
const bars=[Object.freeze({id:'h',type:'bar',x:0,y:0,x2:100,y2:0}),Object.freeze({id:'v',type:'bar',x:0,y:0,x2:0,y2:100})];
const options={bars,anchorPoint:{x:0,y:0},toleranceModel:1};const candidates=api.collectReferenceBars(options);assert.deepEqual(candidates,api.collectThinReferenceBars(options));
for(const list of [candidates,candidates.slice(0,1),[]]){const o={candidates:list,anchorPoint:{x:0,y:0},cursorPoint:{x:0,y:40},screenScale:1,activationThresholdPx:10};assert.equal(api.resolveReferenceBar(o),api.resolveThinReferenceBar(o))}
const override={bars,anchorPoint:{x:0,y:0},cursorPoint:{x:30,y:0},screenScale:1};assert.equal(api.hitReferenceOverride(override),api.hitThinReferenceOverride(override));
console.log('PASS generic frame: reversed endpoints, cardinal/diagonal axes, clockwise local sign, arbitrary round trips, normalization, invalid inputs, immutability and reference wrappers');
