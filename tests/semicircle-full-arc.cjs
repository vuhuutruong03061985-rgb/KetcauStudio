'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Load the real engine without booting the DOM or any production menu.
const source=fs.readFileSync(path.resolve(__dirname,'../assets/tablet.js'),'utf8');
const engine=source.match(/const semicircleEngine=\(\(\)=>\{[\s\S]*?\r?\n\}\)\(\);/);
assert(engine,'radial engine declaration');
const E=vm.runInNewContext(engine[0]+'\nsemicircleEngine;',Object.create(null));
const plain=value=>JSON.parse(JSON.stringify(value));
const near=(actual,expected,tolerance=1e-12)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);
const A=-Math.PI/2,B=Math.PI/2;
const options={startAngle:A,endAngle:B,innerRadius:54.04759747124507,outerRadius:98.04759747124507};
const allocate=(itemCount,extra={})=>E.computeRadialSectors({...options,itemCount,...extra});
const widths=[152.09519494249014,107.54754372972465,76.04759747124506,58.20431124682957,47,39.36513311969704,33.84436482887061,29.672300558436202];
const expectedSafety=[true,true,true,true,true,false,false,false],results=[];
for(let n=0;n<=8;n++){
 const sectors=allocate(n),before=JSON.stringify(sectors);
 assert.equal(sectors.length,n);assert(Object.isFrozen(sectors));
 assert.deepEqual(plain(sectors),plain(allocate(n)),'deterministic output');
 for(const [i,s]of sectors.entries()){
  assert.equal(s.index,i);assert(Object.isFrozen(s));
  assert.deepEqual(Object.keys(s),['index','startAngle','endAngle','centerAngle','innerRadius','outerRadius']);
  assert.equal(s.innerRadius,options.innerRadius);assert.equal(s.outerRadius,options.outerRadius);
  assert(s.endAngle>s.startAngle);near(s.endAngle-s.startAngle,Math.PI/n);
  near(s.centerAngle,(s.startAngle+s.endAngle)/2);
  near(s.startAngle,-sectors[n-1-i].endAngle);
  if(i)assert.equal(sectors[i-1].endAngle,s.startAngle,'exact shared boundary');
  // Geometry is side-independent; the existing coordinate adapter mirrors it.
  const geometry={r0:s.innerRadius,r1:s.outerRadius,a0:s.startAngle,a1:s.endAngle,cy:300};
  const left=E.sectorIconPosition({...geometry,side:'left',cx:0}),right=E.sectorIconPosition({...geometry,side:'right',cx:1152});
  near(left.x+right.x,1152);assert.equal(left.y,right.y);
 }
 if(n){assert.equal(sectors[0].startAngle,A);assert.equal(sectors.at(-1).endAngle,B);near(sectors.reduce((sum,s)=>sum+s.endAngle-s.startAngle,0),Math.PI)}
 const assessment=E.assessRadialTargets(sectors);
 assert.equal(assessment.safe,n===0||expectedSafety[n-1]);assert.equal(assessment.sectors.length,n);
 assert(Object.isFrozen(assessment)&&Object.isFrozen(assessment.sectors));
 if(n){for(const s of assessment.sectors){assert(Object.isFrozen(s));near(s.thickness,44);near(s.tangentialWidth,widths[n-1]);assert.equal(s.safe,expectedSafety[n-1])}near(assessment.minimumWidth,Math.min(44,widths[n-1]))}
 else assert.equal(assessment.minimumWidth,null);
 assert.equal(JSON.stringify(sectors),before,'assessment must not resize or mutate');
 results.push({n,safe:assessment.safe,minimumWidth:assessment.minimumWidth});
}
assert.equal(allocate(1)[0].startAngle,A);assert.equal(allocate(1)[0].endAngle,B);assert.equal(allocate(1)[0].centerAngle,0);
assert.equal(allocate(2)[0].endAngle,0);assert.equal(allocate(2)[1].startAngle,0);
for(const [n,bounds]of [[3,[A,-Math.PI/6,Math.PI/6,B]],[4,[A,-Math.PI/4,0,Math.PI/4,B]]]){
 const sectors=allocate(n);sectors.forEach((s,i)=>{near(s.startAngle,bounds[i]);near(s.endAngle,bounds[i+1])});
}
// Generic shifted/partial/full-circle arcs, high counts, and direct boundaries.
for(const [startAngle,endAngle]of [[.37,2.19],[4,4+Math.PI],[-5,-5+2*Math.PI]])for(const itemCount of [1,2,8,257]){
 const sectors=allocate(itemCount,{startAngle,endAngle}),span=endAngle-startAngle;
 assert.equal(sectors[0].startAngle,startAngle);assert.equal(sectors.at(-1).endAngle,endAngle);
 for(let i=1;i<itemCount;i++){assert.equal(sectors[i].startAngle,startAngle+span*i/itemCount);assert.equal(sectors[i-1].endAngle,sectors[i].startAngle)}
}
// Explicit nonzero gaps are supported, but never inserted by default.
for(const n of [1,2,3,8]){
 const gap=.02,sectors=allocate(n,{angularGap:gap}),span=(Math.PI-(n-1)*gap)/n;
 assert.equal(sectors[0].startAngle,A);assert.equal(sectors.at(-1).endAngle,B);
 sectors.forEach((s,i)=>{near(s.endAngle-s.startAngle,span);near(s.startAngle,-sectors[n-1-i].endAngle);if(i)near(s.startAngle-sectors[i-1].endAngle,gap)});
 near(sectors.reduce((sum,s)=>sum+s.endAngle-s.startAngle,0)+(n-1)*gap,Math.PI);
}
const tools=allocate(8,{innerRadius:99.04759747124507,outerRadius:143.04759747124507});
assert(E.assessRadialTargets(tools).safe);for(const s of E.assessRadialTargets(tools).sectors)near(s.tangentialWidth,47.230429539887744);
// Radial and tangential constraints independently reject unsafe targets.
assert.equal(E.assessRadialTargets(allocate(1,{innerRadius:99,outerRadius:142})).safe,false);
const chordTrap=allocate(1,{startAngle:-.45,endAngle:.45,innerRadius:28,outerRadius:72});
assert(50*.9>44);assert.equal(E.assessRadialTargets(chordTrap).safe,false,'arc length cannot replace chord width');
assert.equal(E.assessRadialTargets(allocate(1,{innerRadius:0,outerRadius:44})).safe,true,'exact 44px boundary');
assert.equal(E.assessRadialTargets(tools,{minimumDiameter:45}).safe,false);
const frozen=allocate(2);assert.throws(()=>{frozen[0].startAngle=0},{name:'TypeError'});assert.throws(()=>frozen.push({}),{name:'TypeError'});
for(const extra of [{itemCount:-1},{itemCount:1.5},{itemCount:Infinity},{itemCount:Number.MAX_SAFE_INTEGER+1},{startAngle:NaN},{endAngle:A},{endAngle:A-1},{endAngle:A+7},{innerRadius:-1},{outerRadius:54},{outerRadius:Infinity},{angularGap:-1},{angularGap:NaN},{angularGap:Math.PI},{startAngle:1e16,endAngle:1e16+2,itemCount:8}])assert.throws(()=>allocate(2,extra),{name:'RangeError'});
for(const [sectors,settings]of [[null,{}],[[],{minimumDiameter:0}],[[],{minimumDiameter:NaN}],[[{startAngle:0,endAngle:0,innerRadius:1,outerRadius:45}],{}],[[{startAngle:0,endAngle:1,innerRadius:-1,outerRadius:45}],{}],[[{startAngle:0,endAngle:1,innerRadius:1,outerRadius:NaN}],{}]])assert.throws(()=>E.assessRadialTargets(sectors,settings),{name:'RangeError'});
console.log('PASS full-arc N=0..8, exact closure/shared boundaries, generic angles, gaps, mirroring, immutable geometry, validation and disk/chord safety',JSON.stringify({category:results,toolN8:E.assessRadialTargets(tools).safe}));
