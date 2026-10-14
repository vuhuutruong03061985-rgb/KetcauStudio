'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require('../.test-tools/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.resolve('index.html')).href);
 await p.waitForFunction(()=>typeof transformableLine==='function');
 // Legacy Bar eligibility is exactly the accepted no-sectionGroup rule, even
 // when optional old drawings carry unrelated/orphan section flags.
 assert(await p.evaluate(()=>[{}, {sectionExtract:true},{sectionMark:true},{sectionAction:'N'},{sectionGroup:'G'}].every(flags=>{
  const o=make('bar',0,0,100,0,{...flags,pivot:{along:10,normal:20}});
  if(o.sectionGroup)return !transformableLine(o)&&objectPivot(o)===null;
  return transformableLine(o)&&JSON.stringify(validate({format:'ket-cau-studio',version:1,items:[o]})[0])===JSON.stringify(o);
 })));
 for(const type of ['thin','dashed']){
  const result=await p.evaluate(type=>{
   cancelToSelection();geometryScale=37;internalForceScale=83;
   items=[make(type,250,310,550,310,{id:'A',label:'V=-12.5',strokeColor:'#123456',loadAngle:12.5,offset:7,pivot:{along:30,normal:75}})];past=[];future=[];updateSelection(['A'],'A');render();
   const before=copy(items),center=objectPivot(items[0]),scales=[geometryScale,internalForceScale];
   const old=validate({format:'ket-cau-studio',version:1,items:[make(type,250,310,550,310)]})[0];
   beginSmartMove(center,{pointerType:'mouse'});Object.assign(smartMoveSession,{rotating:true,rotationPivot:Object.freeze(center),rotationAngle:0,rotationTablet:false,rotationPreview:copy(items[0]),valid:true,pending:{kind:'rotation'}});
   applyBarRotationAngle(smartMoveSession,-Math.PI/2);const preview=copy(smartMoveSession.rotationPreview),unchanged=JSON.stringify(items)===JSON.stringify(before);commitBarRotation();
   const after=copy(items),history=past.length;actions.undo[1]();const undone=copy(items);actions.redo[1]();const redone=copy(items);
   const roundtrip=validate(JSON.parse(JSON.stringify({format:'ket-cau-studio',version:1,items})));
   const mirrored=mirroredObjects(before,{x:0,y:0},{x:0,y:1})[0],mirrorPivot=objectPivot(mirrored);
   const invalid=[null,{},[],{along:'1',normal:0},{along:30001,normal:0}].map(pivot=>{try{validate({format:'ket-cau-studio',version:1,items:[make(type,0,0,100,0,{pivot})]});return false}catch{return true}});
   const blocked=['sectionGroup','sectionExtract','sectionMark','sectionAction'].map(key=>{const o=make(type,0,0,100,0,{[key]:true});return !transformableLine(o)&&objectPivot(o)===null});
   const clean=exportSVG();
   const document=captureDrawing();restoreDrawing(document);
   return {before,after,preview,unchanged,history,undone,redone,roundtrip,center,afterPivot:objectPivot(after[0]),mirrorPivot,oldPivot:objectPivot(old),invalid,blocked,scales,afterScales:[geometryScale,internalForceScale],clean};
  },type);
  assert(result.unchanged);assert.equal(result.history,1);assert.deepEqual(result.undone,result.before);assert.deepEqual(result.redone,result.after);assert.deepEqual(result.roundtrip,result.after);assert.deepEqual(result.afterScales,result.scales);
  const strip=o=>Object.fromEntries(Object.entries(o).filter(([k])=>!['x','y','x2','y2'].includes(k)));
  assert.deepEqual(strip(result.after[0]),strip(result.before[0]));assert.deepEqual(result.after[0],result.preview);
  assert(Math.abs(Math.hypot(result.after[0].x2-result.after[0].x,result.after[0].y2-result.after[0].y)-300)<1e-9);
  assert(Math.hypot(result.afterPivot.x-result.center.x,result.afterPivot.y-result.center.y)<1e-9);assert.deepEqual(result.oldPivot,{x:400,y:310});
  assert.deepEqual(result.mirrorPivot,{x:-result.center.x,y:result.center.y});assert(result.invalid.every(Boolean));assert(result.blocked.every(Boolean));assert(!result.clean.includes('data-hit-area'));assert(!result.clean.includes('data-bar-rotation'));
  console.log('PASS '+type+' data: numerical attributes/scales, frozen preview, length/Pivot, history, JSON v1, Mirror and dependent exclusion');
 }
 assert.deepEqual(errors,[]);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
