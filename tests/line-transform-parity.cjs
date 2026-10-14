'use strict';
// Run the accepted native R1/R2/Pivot/Move assertions with only the selected
// standalone segment fixture type changed. Keep original tests untouched.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const suites=['bar-rotation-r1','bar-rotation-r2','bar-pivot-interaction','move-smart-snap'];
const cp=require('node:child_process');
if(process.env.LINE_TRANSFORM_SUITE){
 const [type,suite]=process.env.LINE_TRANSFORM_SUITE.split(':');
 let source=fs.readFileSync(path.join(__dirname,suite+'.cjs'),'utf8');
 // Convert selected A/B fixtures, retaining stationary snap targets as Bars.
 source=source.replace(/make\('bar',(?:(?!make\()[^\n])*?\{id:'[AB]'/g,(match)=>match.replace("make('bar'","make('"+type+"'"));
 if(!source.includes("make('"+type+"'"))throw Error('Selected fixture was not converted');
 if(suite==='bar-pivot-interaction')source=source.replace('await p.evaluate(()=>render());','await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>{render();r()}))));');
 // R2's final Bar drawing isolation fixture must still draw an ordinary Bar.
 const m=new Module(path.join(__dirname,'line-'+type+'-'+suite+'.cjs'),module);
 m.filename=path.join(__dirname,'line-'+type+'-'+suite+'.cjs');m.paths=module.paths;m._compile(source,m.filename);
}else{
 for(const type of ['thin','dashed'])for(const suite of suites){
  const r=cp.spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,LINE_TRANSFORM_SUITE:type+':'+suite},encoding:'utf8',timeout:180000});
  process.stdout.write(r.stdout);process.stderr.write(r.stderr);console.log(type,suite,r.status===0?'PASS':'FAIL');if(r.status!==0){process.exitCode=1;break}
 }
}
