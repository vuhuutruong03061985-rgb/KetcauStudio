'use strict';
const $=id=>document.getElementById(id),svg=$('drawing'),NS='http://www.w3.org/2000/svg';
const modes={person:'H\u00ecnh ng\u01b0\u1eddi',select:'Chọn',hatch:'Hatch biểu đồ',extend:'Kéo dài tới biên',bar:'Thanh',thin:'Nét liền mảnh',dashed:'Nét đứt mảnh',support:'Gối tựa',hinge:'Khớp',force:'Lực',moment:'Mô men',udl:'Tải đều',dim:'Kích thước',text:'Chữ',positive:'Dấu (+)',negative:'Dấu (−)',diagramM:'Biểu đồ M',diagramQ:'Biểu đồ Q',diagramN:'Biểu đồ N'};
let hatchPoints=[];
let rigidPoints=[],rigidDrag=null;
let rigidPivot=null,rigidSnapHint=null;
const rigidRadians=o=>(o.rigidAngle||0)*Math.PI/180;
// Pure support orientation: SVG local +Y points toward the cursor.
// Degrees in (-180, 180], with positive zero; <= 1e-9 drawing units has no direction.
function solveSupportAngle(anchorPoint,cursorPoint){
 if(!anchorPoint||!cursorPoint||![anchorPoint.x,anchorPoint.y,cursorPoint.x,cursorPoint.y].every(Number.isFinite))return null;
 const dx=cursorPoint.x-anchorPoint.x,dy=cursorPoint.y-anchorPoint.y;
 if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.hypot(dx,dy)<=1e-9)return null;
 const angle=Math.atan2(-dx,dy)*180/Math.PI;
 return angle===-180?180:angle===0?0:angle;
}
let supportPlacementSession=null;
function supportReferenceCandidates(){
 const session=supportPlacementSession;if(!session)return [];
 const ids=new Set(session.referenceCandidates.map(c=>c.barId));
 return collectReferenceBars({bars:items.filter(o=>ids.has(o.id)),anchorPoint:session.anchorPoint,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/Math.abs(svg.getScreenCTM().a)});
}
function supportReferenceFrame(){
 const session=supportPlacementSession;if(!session?.referenceBarId)return null;
 const candidate=supportReferenceCandidates().find(c=>c.barId===session.referenceBarId);
 if(candidate)return getReferenceBarFrame(candidate.bar);
 session.referenceBarId=null;session.referenceCandidates=[];
 // Losing a reference preserves the last global orientation, now interpreted globally.
 session.angle.value=session.previewAngle??({down:0,up:180,left:90,right:-90}[session.direction]);
 svg.querySelector('[data-support-reference]')?.remove();
 return null;
}
function supportGlobalAngle(){
 const session=supportPlacementSession,frame=supportReferenceFrame();
 return frame?referenceAngleToGlobalPlacementAngle(session.angle.value,frame):session.angle.value;
}
function supportReferenceOverrideAt(cursorPoint){
 const candidates=supportReferenceCandidates();if(candidates.length<2)return null;
 const bar=hitReferenceOverride({bars:candidates.map(c=>c.bar),anchorPoint:supportPlacementSession.anchorPoint,cursorPoint,screenScale:Math.abs(svg.getScreenCTM().a)});
 return bar?.id!==supportPlacementSession.referenceBarId?bar:null;
}
function setSupportReference(barId){
 const session=supportPlacementSession,global=session.previewAngle??({down:0,up:180,left:90,right:-90}[session.direction]);
 session.referenceBarId=barId;const frame=supportReferenceFrame();
 if(session.angle.mode==='locked')session.previewAngle=frame?referenceAngleToGlobalPlacementAngle(session.angle.value,frame):session.angle.value;
 else session.angle.value=frame?globalPlacementAngleToReferenceAngle(global,frame):global;
}
function updateSupportOrientation(e){
 const session=supportPlacementSession;supportReferenceFrame();
 const raw=rawPoint(e);
 if(!session.referenceBarId){
  const candidate=resolveReferenceBar({candidates:supportReferenceCandidates(),anchorPoint:session.anchorPoint,cursorPoint:raw,screenScale:Math.abs(svg.getScreenCTM().a),activationThresholdPx:THIN_REFERENCE_ACTIVATION_PX});
  if(candidate)setSupportReference(candidate.barId);
 }
 if(session.angle.mode==='locked')return;
 // Preserve drawing intent while approaching an explicit reference target.
 if(supportReferenceOverrideAt(raw))return;
 const angle=solveSupportAngle(session.anchorPoint,raw);if(angle===null)return;
 session.previewAngle=angle;const frame=supportReferenceFrame();
 session.angle.value=frame?globalPlacementAngleToReferenceAngle(angle,frame):angle;
}
function renderSupportReference(){
 if(mode!=='support'||!supportReferenceFrame())return;
 const bar=items.find(o=>o.id===supportPlacementSession.referenceBarId);
 line(svg,bar.x,bar.y,bar.x2,bar.y2,{class:'thin-reference-highlight','data-support-reference':'true','pointer-events':'none','aria-hidden':'true'});
}
function clearSupportPlacement(){
 if(typeof endSupportNumericInput==='function')endSupportNumericInput();
 svg.querySelector('[data-support-reference]')?.remove();svg.querySelectorAll('.reference-override').forEach(marker=>marker.classList.remove('reference-override'));
 supportPlacementSession=null;svg.querySelector('[data-support-preview]')?.remove();svg.querySelector('.reference-angle-preview')?.remove();
}
function commitSupportPlacement(angle){
 const session=supportPlacementSession;if(!session||!Number.isFinite(angle))return false;
 const o=make('support',session.anchorPoint.x,session.anchorPoint.y,undefined,undefined,{support:session.supportSubtype,direction:session.direction,supportAngle:angle});
 checkpoint();items.push(o);selected=o.id;clearSupportPlacement();render();return true;
}
function placeSupport(e){
 if(!supportPlacementSession){
  supportPlacementSession={anchorPoint:{...drawingPoint(e)},supportSubtype:$('support').value,direction:$('direction').value,previewAngle:null,angle:{mode:'live',value:0},referenceCandidates:[],referenceBarId:null};
  const session=supportPlacementSession;session.referenceCandidates=collectReferenceBars({bars:items,anchorPoint:session.anchorPoint,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/Math.abs(svg.getScreenCTM().a)});
  if(session.referenceCandidates.length===1)setSupportReference(session.referenceCandidates[0].barId);
  if(typeof beginSupportNumericInput==='function')beginSupportNumericInput(e);
 }else{
  const override=supportReferenceOverrideAt(rawPoint(e));
  if(override){setSupportReference(override.id);if(typeof updateSupportNumericInput==='function')updateSupportNumericInput(e);render();return}
  if(typeof confirmSupportNumericInput==='function'&&!confirmSupportNumericInput())return;
  const session=supportPlacementSession,angle=session.angle.mode==='locked'?supportGlobalAngle():solveSupportAngle(session.anchorPoint,rawPoint(e));
  if(angle===null)return;
  commitSupportPlacement(angle);return;
 }
 render();
}
function renderSupportPlacement(){
 if(!supportPlacementSession)return;
 const session=supportPlacementSession,g=el('g',{'data-support-preview':'true','pointer-events':'none',stroke:'#087d95',fill:'none',opacity:0.7});
 drawSupport(g,{...session.anchorPoint,support:session.supportSubtype,direction:session.direction,supportAngle:session.previewAngle});
}
function rotateVector(p,a){return {x:Math.cos(a)*p.x-Math.sin(a)*p.y,y:Math.sin(a)*p.x+Math.cos(a)*p.y}}
function rigidWorld(o,p){const q=rotateVector(p,rigidRadians(o));return {x:o.x+q.x,y:o.y+q.y}}
function rigidLocal(o,p){return rotateVector({x:p.x-o.x,y:p.y-o.y},-rigidRadians(o))}
function rotateAround(p,c,a){const q=rotateVector({x:p.x-c.x,y:p.y-c.y},a);return {x:c.x+q.x,y:c.y+q.y}}
function rigidCentroid(o){const pts=o.points.map(p=>rigidWorld(o,p));return {x:pts.reduce((s,p)=>s+p.x,0)/pts.length,y:pts.reduce((s,p)=>s+p.y,0)/pts.length}}
function rotatedRigid(o,pivot,delta){return {...o,...rotateAround(o,pivot,delta),rigidAngle:(((o.rigidAngle||0)+delta*180/Math.PI)%360+360)%360}}
function rigidSegments(points){return points.map((b,i)=>{
 const n=points.length,a=points[(i+n-1)%n],c=points[(i+1)%n],e=points[(i+2)%n];
 return [b,{x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6},{x:c.x-(e.x-b.x)/6,y:c.y-(e.y-b.y)/6},c];
})}
const rigidDefaults={fillMode:'hatch',hatchStyle:'diagonal',fillColor:'#8ab6c4',fillOpacity:0.25,spacing:8};
const rigidPointLimit=256;
modes.rigidRegion='Miếng cứng tự do';
modes.linkBar='Thanh liên kết';
modes.weld='Liên kết hàn';
const drawingConnection=o=>o&&['linkBar','weld'].includes(o.type);
function validateConnection(o){
 for(const k of ['x','y',...(o.type==='linkBar'?['x2','y2']:[])])if(!Number.isFinite(o[k])||Math.abs(o[k])>10000)throw Error('Tọa độ liên kết không hợp lệ.');
 if(o.type==='linkBar'&&Math.hypot(o.x2-o.x,o.y2-o.y)<1)throw Error('Hai đầu thanh liên kết phải cách nhau ít nhất 1 đơn vị.');
}
// Only the new drawing-only connections get this transactional drag cleanup.
function cancelConnectionDrag(){
 if(drawingConnection(drag?.o)){items=drag.before;drag=null}
 if(groupDrag?.before.some(o=>groupDrag.ids.has(o.id)&&drawingConnection(o))){items=groupDrag.before;groupDrag=null}
}
// One cyclic uniform Catmull-Rom path is used for outline, interior, picking and export.
function generateRigidRegionPath(points){
 if(points.length<3)return '';
 const n=points.length;let d=`M${points[0].x} ${points[0].y}`;
 for(const [a,b,c,e]of rigidSegments(points))d+=` C${b.x} ${b.y} ${c.x} ${c.y} ${e.x} ${e.y}`;
 return d+' Z';
}
function validateRigidRegion(o){
 if(o.rigidAngle!==undefined&&(!Number.isFinite(o.rigidAngle)||Math.abs(o.rigidAngle)>360))throw Error('Góc miếng cứng không hợp lệ.');
 if(!Array.isArray(o.points)||o.points.length<3||o.points.length>rigidPointLimit||o.points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>10000||Math.abs(p.y)>10000||Math.abs(rigidWorld(o,p).x)>10000||Math.abs(rigidWorld(o,p).y)>10000))throw Error('Miếng cứng cần 3–256 điểm hợp lệ.');
 for(const [key,value]of Object.entries(rigidDefaults))if(o[key]===undefined)o[key]=value;
 if(!['hatch','color','none'].includes(o.fillMode)||!['diagonal','cross'].includes(o.hatchStyle)||!/^#[0-9a-f]{6}$/i.test(o.fillColor)||!Number.isFinite(o.fillOpacity)||o.fillOpacity<0||o.fillOpacity>1||!Number.isFinite(o.spacing)||o.spacing<3||o.spacing>50)throw Error('Kiểu miếng cứng không hợp lệ.');
 // Only control points are authoritative; imported derived geometry is never retained.
 for(const key of ['closed','path','splinePath','bezierPoints','hatchBoundary','fillPolygon','hitGeometry'])delete o[key];
}
function drawRigidRegion(g,o,clean=false){
 const style={...rigidDefaults,...o},d=generateRigidRegionPath(o.points);
 const h=el('g',{transform:`translate(${o.x} ${o.y})${o.rigidAngle?` rotate(${o.rigidAngle})`:''}`},g);
 let fill='none';
 if(style.fillMode==='hatch'){
  const id='rigid-pattern-'+svg.querySelectorAll('pattern').length;
  const pattern=el('pattern',{id,width:style.spacing,height:style.spacing,patternUnits:'userSpaceOnUse'},svg.querySelector('defs'));
  el('path',{d:`M${-style.spacing/2} ${style.spacing/2}L${style.spacing/2} ${-style.spacing/2} M0 ${style.spacing}L${style.spacing} 0 M${style.spacing/2} ${style.spacing*1.5}L${style.spacing*1.5} ${style.spacing/2}`,stroke:'black','stroke-width':0.8,fill:'none'},pattern);
  if(style.hatchStyle==='cross')line(pattern,0,0,style.spacing,style.spacing,{stroke:'black','stroke-width':0.8});
  fill=`url(#${id})`;
 }else if(style.fillMode==='color')fill=style.fillColor;
 el('path',{d,fill,'fill-opacity':style.fillMode==='color'?style.fillOpacity:1,stroke:objectColor(o),'stroke-width':1.8,'data-rigid-outline':'true'},h);
 if(!clean)el('path',{d,fill:'transparent',stroke:'transparent','stroke-width':18,'vector-effect':'non-scaling-stroke','pointer-events':'all','data-hit-area':'true'},h);
}
function cancelRigidDrag(){if(rigidDrag){items=rigidDrag.before;rigidPivot=rigidDrag.pivotBefore;rigidDrag=null}if(drag?.o.type==='rigidRegion'){items=drag.before;drag=null}rigidSnapHint=null}
function finishRigidRegion(){
 if(mode!=='rigidRegion'||rigidPoints.length<3){msg('Chọn ít nhất 3 điểm.');return}
 if(items.length>=2000){msg('Bản vẽ tối đa 2000 đối tượng.');return}
 const a=rigidPoints[0],o=make('rigidRegion',a.x,a.y,undefined,undefined,{...rigidDefaults,points:rigidPoints.map(p=>({x:p.x-a.x,y:p.y-a.y}))});
 try{validateRigidRegion(o)}catch(e){msg(e.message);return}
 checkpoint();items.push(o);setMode('select');selected=o.id;render();msg('Đã tạo miếng cứng tự do.');
}
function renderRigidControls(){
 if($('rigidActions')){$('rigidActions').hidden=mode!=='rigidRegion';$('finishRigidRegion').disabled=rigidPoints.length<3}
 if(mode==='rigidRegion'){
  const g=el('g',{'data-rigid-preview':'true','pointer-events':'none'});
  if(rigidPoints.length>=3)drawRigidRegion(g,{x:0,y:0,points:rigidPoints,...rigidDefaults},true);
  else el('polyline',{points:rigidPoints.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:'#087d95','stroke-dasharray':'4 3'},g);
  for(const p of rigidPoints)el('circle',{cx:p.x,cy:p.y,r:4,fill:'#087d95'},g);
 }
 const o=items.find(o=>o.id===selected);
 if(mode!=='select'||o?.type!=='rigidRegion'||selectedObjectIds().size>1){rigidPivot=null;return}
 if(rigidPivot?.id!==o.id)rigidPivot={id:o.id,...rigidCentroid(o)};
 const scale=Math.abs(svg.getScreenCTM()?.a)||1;
 for(let i=0;i<o.points.length;i++){
  const p=rigidWorld(o,o.points[i]),g=el('g',{'data-id':o.id,'data-rigid-point':i,cursor:'move'});
  el('circle',{cx:p.x,cy:p.y,r:22/scale,fill:'transparent',stroke:'none'},g);
  el('circle',{cx:p.x,cy:p.y,r:5/scale,fill:'white',stroke:'#087d95','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'},g);
 }
 const box=svg.querySelector(`[data-id="${o.id}"]`).getBBox();
 for(const [kind,p]of [['pivot',rigidPivot],['rotate',{x:box.x+box.width+32/scale,y:box.y-32/scale}]]){
  const g=el('g',{'data-id':o.id,'data-rigid-action':kind,cursor:'move'});
  el('circle',{cx:p.x,cy:p.y,r:22/scale,fill:'transparent',stroke:'none'},g);
  el('circle',{cx:p.x,cy:p.y,r:8/scale,fill:'white',stroke:'#087d95','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'},g);
  const mark=el('text',{x:p.x,y:p.y+4/scale,'text-anchor':'middle','font-size':12/scale,fill:'#087d95','pointer-events':'none'},g);mark.textContent=kind==='pivot'?'+':'↻';
  el('title',{},g).textContent=kind==='pivot'?'Kéo tâm xoay':'Kéo để xoay quanh tâm';
 }
 if(rigidSnapHint){const p=rigidSnapHint.point,r=6/scale,g=el('g',{'data-rigid-snap':rigidSnapHint.kind,'pointer-events':'none',stroke:'#087d95',fill:'none'});el('circle',{cx:p.x,cy:p.y,r,'vector-effect':'non-scaling-stroke'},g);if(rigidSnapHint.tangent){const v=rigidSnapHint.tangent;line(g,p.x-v.x*r*2,p.y-v.y*r*2,p.x+v.x*r*2,p.y+v.y*r*2)}}
}
let extendBoundary=null;
let multiSelection=new Set(),boxSelect=null,groupDrag=null;
// A cancel-only snapshot, never another live selection or serialized document field.
let cancelSelection=null;
function sectionForceAction(o){return !!o&&((o.type==='force'&&['N','Q'].includes(o.sectionAction))||(o.type==='moment'&&o.sectionAction==='M'))}
function hiddenSectionAction(o){return sectionForceAction(o)&&o.sectionVisible===false}
function selectedObjectIds(){const ids=new Set(multiSelection);if(selected)ids.add(selected);return new Set([...ids].filter(id=>items.some(o=>o.id===id)))}
function rememberCancelSelection(){
 if(mode==='select'&&!cancelSelection){const ids=[...selectedObjectIds()];if(ids.length)cancelSelection={ids,primary:selected}}
}
function updateSelection(ids,primary=null){
 multiSelection=new Set([...ids].filter(id=>items.some(o=>o.id===id)));
 selected=multiSelection.has(primary)?primary:items.find(o=>multiSelection.has(o.id))?.id||null;
 cancelSelection=null;
 if(selected){const o=items.find(o=>o.id===selected);for(const k of Object.keys(props()))$(k).value=o[k]??''}
}
let items=[],past=[],future=[],selected=null,mode='select',first=null,second=null,hover=null,drag=null;
// Per-drawing metadata: drawing units per metre, and internal-force units per pixel.
const defaultGeometryScale=100,defaultInternalForceScale=10;
let geometryScale=defaultGeometryScale,internalForceScale=defaultInternalForceScale;
function restoreDrawingScales(data={}){
 geometryScale=Number.isFinite(data.geometryScale)&&data.geometryScale>0?data.geometryScale:defaultGeometryScale;
 internalForceScale=Number.isFinite(data.internalForceScale)&&data.internalForceScale>0?data.internalForceScale:defaultInternalForceScale;
}
const newId=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
const copy=x=>JSON.parse(JSON.stringify(x)),msg=()=>{}; // Bottom status panel removed; keep notification calls harmless.
let snapEnabled=true;
const snapOptions={endpoint:true,midpoint:true,intersection:true,member:true,dimension:true,perpendicular:true,tangent:false};
try{const saved=JSON.parse(localStorage.getItem('ket-cau-snap-settings')||'null');if(saved){if(typeof saved.enabled==='boolean')snapEnabled=saved.enabled;for(const key of Object.keys(snapOptions))if(typeof saved.options?.[key]==='boolean')snapOptions[key]=saved.options[key]}}catch{}
modes.curve='Cong bậc 2 · 3 điểm';
function midpointSnap(p,excludeId=null){
 if(!snapEnabled||!snapOptions.midpoint)return null;
 const tolerance=12/Math.abs(svg.getScreenCTM().a);let best=null,distance=tolerance;
 for(const o of items){
  if(o.id===excludeId||!['bar','thin','dashed'].includes(o.type))continue;
  const q={x:(o.x+o.x2)/2,y:(o.y+o.y2)/2},d=Math.hypot(p.x-q.x,p.y-q.y);
  if(d<distance){best=q;distance=d}
 }
 return best;
}
function intersectionSnap(p,excludeId=null){
 if(!snapEnabled||!snapOptions.intersection)return null;
 const tolerance=12/Math.abs(svg.getScreenCTM().a);let best=null,distance=tolerance;
 const lines=items.filter(o=>o.id!==excludeId&&['bar','thin','dashed'].includes(o.type)&&p.x>=Math.min(o.x,o.x2)-tolerance&&p.x<=Math.max(o.x,o.x2)+tolerance&&p.y>=Math.min(o.y,o.y2)-tolerance&&p.y<=Math.max(o.y,o.y2)+tolerance);
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  const a=lines[i],b=lines[j],ux=a.x2-a.x,uy=a.y2-a.y,vx=b.x2-b.x,vy=b.y2-b.y,d=ux*vy-uy*vx;
  if(Math.abs(d)<1e-10*Math.max(1,Math.hypot(ux,uy)*Math.hypot(vx,vy)))continue;
  const rx=b.x-a.x,ry=b.y-a.y,t=(rx*vy-ry*vx)/d,s=(rx*uy-ry*ux)/d;
  if(t< -1e-8||t>1+1e-8||s< -1e-8||s>1+1e-8)continue;
  const q={x:a.x+t*ux,y:a.y+t*uy},gap=Math.hypot(p.x-q.x,p.y-q.y);
  if(gap<=distance){best=q;distance=gap}
 }
 return best;
}
function curvePath(o){
 const [middle,end]=o.curvePoints;
 return `M${o.x} ${o.y} Q${o.x+2*middle.x-end.x/2} ${o.y+2*middle.y-end.y/2} ${o.x+end.x} ${o.y+end.y}`;
}
function checkpoint(){if(typeof finishObjectColorEdit==='function')finishObjectColorEdit();past.push(copy(items));future=[];if(past.length>100)past.shift()}
function el(tag,a={},p=svg){const n=document.createElementNS(NS,tag);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));p.append(n);return n}
function line(g,x1,y1,x2,y2,a={}){el('line',{x1,y1,x2,y2,...a},g)}
function scriptRuns(value){
 const runs=[],pattern=/([_^])(?:\{([^{}]+)\}|([^\s_^{}]))/g;
 let start=0,match;
 while((match=pattern.exec(value))){
  if(match.index>start)runs.push({text:value.slice(start,match.index),shift:0});
  runs.push({text:match[2]??match[3],shift:match[1]==='_'?5:-7});start=pattern.lastIndex;
 }
 if(start<value.length)runs.push({text:value.slice(start),shift:0});return runs;
}
const validObjectColor=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const objectColor=o=>validObjectColor(o.strokeColor)?o.strokeColor:'black';
function txt(g,x,y,t){
 const foreground=g.closest('[data-object-color]')?.getAttribute('data-object-color')||'black';
 if(typeof renderEquation==='function'&&/(?:\\[A-Za-z]+|[∑∏∫])/.test(String(t))){try{const equation=renderEquation(g,x,y,String(t));if(foreground!=='black'){for(const node of equation.querySelectorAll('[fill="black"],[stroke="black"]')){if(node.getAttribute('fill')==='black')node.setAttribute('fill',foreground);if(node.getAttribute('stroke')==='black')node.setAttribute('stroke',foreground)}}return}catch{}}
 const text=el('text',{x,y,stroke:'none',fill:foreground,'font-family':'Times New Roman,serif','font-size':19,'text-anchor':'middle',cursor:'text'},g);
 let previous=0;
 for(const run of scriptRuns(String(t).replace(/\s*-->\s*/g,' ⇒ '))){el('tspan',{'font-size':run.shift?13:19,dy:run.shift-previous},text).textContent=run.text;previous=run.shift}
}
function arrow(g,x1,y1,x2,y2){line(g,x1,y1,x2,y2,{'marker-end':'url(#arrow)'})}
const loadVector=o=>Number.isFinite(o.loadAngle)?[Math.cos(o.loadAngle*Math.PI/180),-Math.sin(o.loadAngle*Math.PI/180)]:vec(o.direction);
const vec=d=>({down:[0,1],up:[0,-1],right:[1,0],left:[-1,0]})[d];
function dimensionGeometry(o){
 const dx=o.x2-o.x,dy=o.y2-o.y,len=Math.hypot(dx,dy)||1;
 const ux=dx/len,uy=dy/len,nx=-uy,ny=ux,offset=o.offset??0;
 let angle=Math.atan2(dy,dx)*180/Math.PI;
 if(angle>=90)angle-=180;if(angle< -90)angle+=180;
 return {ux,uy,nx,ny,offset,angle,ax:o.x+nx*offset,ay:o.y+ny*offset,bx:o.x2+nx*offset,by:o.y2+ny*offset};
}
function drawDimension(g,o){
 const d=dimensionGeometry(o),{ux,uy,nx,ny,ax,ay,bx,by,angle,offset}=d;
 const sign=offset<0?-1:1;
 g.setAttribute('stroke-width',1);
 line(g,ax-ux*12,ay-uy*12,bx+ux*12,by+uy*12);
 for(const [x,y,a,b]of [[o.x,o.y,ax,ay],[o.x2,o.y2,bx,by]]){
  // Keep extension strokes local to the dimension line, clear of the member.
  const reach=Math.min(24,Math.max(0,Math.abs(offset)-6));
  line(g,a-nx*sign*reach,b-ny*sign*reach,a+nx*sign*8,b+ny*sign*8);
  line(g,a-(ux-nx)*6,b-(uy-ny)*6,a+(ux-nx)*6,b+(uy-ny)*6);
 }
 const t=el('g',{transform:`translate(${(ax+bx)/2} ${(ay+by)/2}) rotate(${angle})`},g);
 txt(t,0,-9,o.label);
}
function rawPoint(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse())}
function geometricPoints(o){
 if(o.type==='linkBar')return [{x:o.x,y:o.y},{x:o.x2,y:o.y2}];
 if(o.type==='weld')return [{x:o.x,y:o.y}];
 if(o.type==='rigidRegion')return o.points.map(p=>rigidWorld(o,p));
 if(['hinge','support'].includes(o.type))return [{x:o.x,y:o.y}];
 if(!['bar','thin','dashed','curve'].includes(o.type))return [];
 return [{x:o.x,y:o.y},o.type==='curve'?{x:o.x+o.curvePoints[1].x,y:o.y+o.curvePoints[1].y}:{x:o.x2,y:o.y2}];
}
function endpointSnap(p,excludeId=null){
 if(!snapEnabled||!snapOptions.endpoint)return null;
 const tolerance=14/Math.abs(svg.getScreenCTM().a);let best=null,distance=tolerance;
 for(const o of items){
  if(o.id===excludeId)continue;
  for(const q of geometricPoints(o)){
   const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<=distance){best=q;distance=d}
  }
 }
 return best;
}
function snapToBar(p,excludeId=null){
 if(!snapEnabled)return null;
 const intersection=intersectionSnap(p,excludeId);if(intersection)return intersection;
 const endpoint=endpointSnap(p,excludeId);if(endpoint)return endpoint;
 const midpoint=midpointSnap(p,excludeId);if(midpoint)return midpoint;
 const tolerance=14/Math.abs(svg.getScreenCTM().a);let best=null,distance=tolerance;
 const bars=items.filter(o=>o.type==='bar'&&o.id!==excludeId);
 if(!snapOptions.member)return null;
 for(const b of bars){const q=segmentContact(p,b,{x:b.x2,y:b.y2});if(!q)continue;
 const d=Math.hypot(p.x-q.x,p.y-q.y);if(d<=distance){best=q;distance=d}}
 return best;
}
function segmentContact(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;if(!l)return null;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l));return {x:a.x+t*dx,y:a.y+t*dy}}
// Isolate all real roots on [0,1] using derivative roots, then bisection.
function unitPolynomialRoots(c){
 const scale=Math.max(...c.map(Math.abs));if(!scale)return [];c=c.map(v=>v/scale);
 while(c.length>1&&Math.abs(c.at(-1))<1e-13)c.pop();if(c.length<2)return [];
 if(c.length===2){const t=-c[0]/c[1];return t>=0&&t<=1?[t]:[]}
 const value=t=>c.reduceRight((s,v)=>s*t+v,0),cuts=[0,...unitPolynomialRoots(c.slice(1).map((v,i)=>v*(i+1))),1].sort((a,b)=>a-b),out=[];
 for(const t of cuts)if(Math.abs(value(t))<1e-10)out.push(t);
 for(let i=1;i<cuts.length;i++){let a=cuts[i-1],b=cuts[i],fa=value(a);if(fa*value(b)>=0)continue;for(let j=0;j<48;j++){const m=(a+b)/2,f=value(m);if(fa*f<=0)b=m;else{a=m;fa=f}}out.push((a+b)/2)}
 return out;
}
function cubicContact(p,controls){
 const [a,b,c,d]=controls,coeff=k=>[a[k],3*(b[k]-a[k]),3*(c[k]-2*b[k]+a[k]),d[k]-3*c[k]+3*b[k]-a[k]],x=coeff('x'),y=coeff('y');
 const polynomial=Array(6).fill(0);
 for(const [v,offset]of [[x,p.x],[y,p.y]])for(let i=0;i<4;i++)for(let j=1;j<4;j++)polynomial[i+j-1]+=(v[i]-(i===0?offset:0))*j*v[j];
 let best=null;
 for(const t of [0,1,...unitPolynomialRoots(polynomial)]){
  const at=v=>((v[3]*t+v[2])*t+v[1])*t+v[0],dx=(3*x[3]*t+2*x[2])*t+x[1],dy=(3*y[3]*t+2*y[2])*t+y[1],len=Math.hypot(dx,dy);if(len<1e-10)continue;
  const point={x:at(x),y:at(y)},distance=Math.hypot(point.x-p.x,point.y-p.y);
  if(!best||distance<best.distance)best={point,tangent:{x:dx/len,y:dy/len},distance,t};
 }return best;
}
function tangentSnap(p,excludeId=null){
 if(!snapEnabled||!snapOptions.tangent)return null;
 let best=null;const tolerance=14/Math.abs(svg.getScreenCTM().a);
 for(const o of items){if(o.id===excludeId)continue;let candidates=[];
  if(['bar','thin','dashed'].includes(o.type)){const q=segmentContact(p,o,{x:o.x2,y:o.y2}),l=Math.hypot(o.x2-o.x,o.y2-o.y);if(q)candidates=[{point:q,tangent:{x:(o.x2-o.x)/l,y:(o.y2-o.y)/l},distance:Math.hypot(q.x-p.x,q.y-p.y)}]}
  if(o.type==='rigidRegion')candidates=rigidSegments(o.points).map(s=>cubicContact(p,s.map(q=>rigidWorld(o,q))));
  if(o.type==='curve'){const [m,e]=o.curvePoints,a={x:o.x,y:o.y},b={x:o.x+2*m.x-e.x/2,y:o.y+2*m.y-e.y/2},d={x:o.x+e.x,y:o.y+e.y};candidates=[cubicContact(p,[a,{x:a.x+(b.x-a.x)*2/3,y:a.y+(b.y-a.y)*2/3},{x:d.x+(b.x-d.x)*2/3,y:d.y+(b.y-d.y)*2/3},d])]}
  for(const c of candidates)if(c&&c.distance<=tolerance&&(!best||c.distance<best.distance))best={...c,kind:'tangent',targetId:o.id};
 }return best;
}
function geometricSnap(p,exclude=null){
 for(const [kind,fn]of [['intersection',intersectionSnap],['endpoint',endpointSnap],['midpoint',midpointSnap]]){const q=fn(p,exclude);if(q)return {point:q,kind}}
 const tangent=tangentSnap(p,exclude);if(tangent)return tangent;
 const q=snapToBar(p,exclude);if(q)return {point:q,kind:'member'};
 return null;
}
function translatedRigid(o,delta){
 const moved={...o,x:o.x+delta.x,y:o.y+delta.y},best=translationSnap(o.points.map(local=>rigidWorld(moved,local)),o.id);
 if(best){moved.x+=best.point.x-best.source.x;moved.y+=best.point.y-best.source.y}rigidSnapHint=best;return moved;
}
function translationSnap(sources,excludeId){
 let best=null;
 // Discrete targets win over contact; equal candidates retain control-point order.
 const rank={intersection:0,endpoint:1,midpoint:2,tangent:3,member:3};
 for(const source of sources){const hit=geometricSnap(source,excludeId);if(!hit)continue;const distance=Math.hypot(hit.point.x-source.x,hit.point.y-source.y);if(!best||rank[hit.kind]<rank[best.kind]||rank[hit.kind]===rank[best.kind]&&distance<best.distance-1e-9)best={...hit,source,distance}}
 return best;
}
function offsetAt(a,b,p){const dx=b.x-a.x,dy=b.y-a.y;return ((p.x-a.x)*(-dy)+(p.y-a.y)*dx)/(Math.hypot(dx,dy)||1)}
function snapDimensionOffset(a,b,offset,exclude=null){
 if(!snapEnabled||!snapOptions.dimension)return offset;
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(!length)return offset;
 const ux=dx/length,uy=dy/length;
 const tolerance=12/Math.abs(svg.getScreenCTM().a);
 let best=offset,distance=tolerance;
 for(const target of items){
  if(target.type!=='dim'||target.id===exclude)continue;
  const g=dimensionGeometry(target);
  if(Math.abs(ux*g.uy-uy*g.ux)>0.01)continue;
  const candidate=offsetAt(a,b,{x:g.ax,y:g.ay}),gap=Math.abs(candidate-offset);
  if(gap<distance){best=candidate;distance=gap}
 }
 return best;
}
let autosaveReady=false,autosaveTimer=null,autosaveFailed=false;
const draftKey='ket-cau-studio-last-drawing-v1';
function saveDraft(){
 if(!autosaveReady)return;
 clearTimeout(autosaveTimer);
 try{localStorage.setItem(draftKey,JSON.stringify({format:'ket-cau-studio',version:1,items,geometryScale,internalForceScale}));autosaveFailed=false}
 catch{autosaveFailed=true;msg('Không tự lưu được. Hãy dùng Lưu JSON để giữ bản vẽ.')}
}
function closedRegionAt(point){
 const boundaries=items.filter(o=>['bar','thin','dashed','curve'].includes(o.type));
 if(boundaries.length>500)return null;
 const segments=[];
 for(const o of boundaries){
  if(o.type!=='curve'){segments.push({a:{x:o.x,y:o.y},b:{x:o.x2,y:o.y2},cuts:[0,1]});continue}
  // Approximate the same quadratic used by SVG; keep error below 0.1 drawing units.
  const [middle,end]=o.curvePoints,c={x:2*middle.x-end.x/2,y:2*middle.y-end.y/2};
  const count=Math.max(2,2*Math.ceil(Math.sqrt(Math.hypot(end.x-2*c.x,end.y-2*c.y)/0.4)/2));
  if(count>2000)return null;
  let a={x:o.x,y:o.y};
  for(let i=1;i<=count;i++){
   const t=i/count,b={x:o.x+2*(1-t)*t*c.x+t*t*end.x,y:o.y+2*(1-t)*t*c.y+t*t*end.y};
   segments.push({a,b,cuts:[0,1]});a=b;
  }
 }
 if(segments.length>4000)return null;
 const cross=(a,b)=>a.x*b.y-a.y*b.x;
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const s=segments[i],other=segments[j];
  if(Math.max(s.a.x,s.b.x)+1e-8<Math.min(other.a.x,other.b.x)||Math.max(other.a.x,other.b.x)+1e-8<Math.min(s.a.x,s.b.x)||Math.max(s.a.y,s.b.y)+1e-8<Math.min(other.a.y,other.b.y)||Math.max(other.a.y,other.b.y)+1e-8<Math.min(s.a.y,s.b.y))continue;
  const a=segments[i],b=segments[j],u={x:a.b.x-a.a.x,y:a.b.y-a.a.y},v={x:b.b.x-b.a.x,y:b.b.y-b.a.y},r={x:b.a.x-a.a.x,y:b.a.y-a.a.y},d=cross(u,v);
  if(Math.abs(d)<1e-9)continue;
  const t=cross(r,v)/d,q=cross(r,u)/d;
  if(t>=-1e-8&&t<=1+1e-8&&q>=-1e-8&&q<=1+1e-8){a.cuts.push(Math.max(0,Math.min(1,t)));b.cuts.push(Math.max(0,Math.min(1,q)))}
 }
 const nodes=new Map(),key=p=>`${Math.round(p.x*1000)},${Math.round(p.y*1000)}`;
 function node(p){const k=key(p);if(!nodes.has(k))nodes.set(k,{...p,key:k,next:new Set()});return nodes.get(k)}
 for(const s of segments){const cuts=[...new Set(s.cuts)].sort((a,b)=>a-b);for(let i=1;i<cuts.length;i++){
  const at=t=>({x:s.a.x+(s.b.x-s.a.x)*t,y:s.a.y+(s.b.y-s.a.y)*t}),a=node(at(cuts[i-1])),b=node(at(cuts[i]));if(a!==b){a.next.add(b);b.next.add(a)}
 }}
 for(const n of nodes.values())n.sorted=[...n.next].sort((a,b)=>Math.atan2(a.y-n.y,a.x-n.x)-Math.atan2(b.y-n.y,b.x-n.x));
 const visited=new Set(),faces=[];
 const contains=poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }return inside};
 for(const start of nodes.values())for(const first of start.sorted){
  let a=start,b=first,poly=[],closed=false;
  for(let step=0;step<nodes.size*8;step++){
   const k=a.key+'>'+b.key;if(visited.has(k))break;visited.add(k);poly.push({x:a.x,y:a.y});
   const n=b.sorted.indexOf(a),c=b.sorted[(n-1+b.sorted.length)%b.sorted.length];a=b;b=c;
   if(a===start&&b===first){closed=true;break}
  }
  const area=poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p.x*q.y-q.x*p.y},0)/2;
  if(closed&&poly.length<=1000&&area>0.01&&contains(poly))faces.push({poly,area});
 }
 faces.sort((a,b)=>a.area-b.area);return faces[0]?.poly||null;
}
function hatchSegments(points,spacing,horizontal){
 const pts=points.map(p=>horizontal?{x:p.y,y:p.x}:p),out=[];
 const lo=Math.min(...pts.map(p=>p.x)),hi=Math.max(...pts.map(p=>p.x));
 for(let x=lo+spacing/2;x<hi;x+=spacing){
  const cuts=[];
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];if((a.x<=x&&b.x>x)||(b.x<=x&&a.x>x))cuts.push(a.y+(x-a.x)*(b.y-a.y)/(b.x-a.x))}
  cuts.sort((a,b)=>a-b);
  for(let i=0;i+1<cuts.length;i+=2)out.push(horizontal?[cuts[i],x,cuts[i+1],x]:[x,cuts[i],x,cuts[i+1]]);
 }
 return out;
}
function automaticHatchSegments(o){
 const points=o.points.map(p=>({x:o.x+p.x,y:o.y+p.y}));
 let angle=0,best=0,fallback=0;
 for(let i=0;i<points.length;i++){
  const a=points[i],b=points[(i+1)%points.length],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);
  if(len>fallback){fallback=len;if(!best)angle=Math.atan2(dy,dx)}
  if(len<.001)continue;
  for(const bar of items){
   if(bar.type!=='bar')continue;
   const ux=bar.x2-bar.x,uy=bar.y2-bar.y,L=Math.hypot(ux,uy);if(L<.001)continue;
   if(Math.abs(dx*uy-dy*ux)>len*L*.001)continue;
   if(Math.abs((a.x-bar.x)*uy-(a.y-bar.y)*ux)/L>.3)continue;
   const t1=((a.x-bar.x)*ux+(a.y-bar.y)*uy)/L,t2=((b.x-bar.x)*ux+(b.y-bar.y)*uy)/L;
   const overlap=Math.max(0,Math.min(L,Math.max(t1,t2))-Math.max(0,Math.min(t1,t2)));
   if(overlap>best){best=overlap;angle=Math.atan2(uy,ux)}
  }
 }
 if(Number.isFinite(o.hatchAngle))angle=o.hatchAngle;
 const c=Math.cos(angle),s=Math.sin(angle);
 const local=o.points.map(p=>({x:p.x*c+p.y*s,y:-p.x*s+p.y*c}));
 return hatchSegments(local,o.spacing||8,false).map(([x,y,x2,y2])=>[x*c-y*s,x*s+y*c,x2*c-y2*s,x2*s+y2*c]);
}
function drawSupport(g,o){const {x,y}=o;const s=el('g',{transform:`translate(${x} ${y}) rotate(${Number.isFinite(o.supportAngle)?o.supportAngle:{down:0,up:180,right:-90,left:90}[o.direction]})`},g);if(o.support==='fixed'){line(s,-24,0,24,0,{'stroke-width':3});for(let i=-24;i<24;i+=8)line(s,i,0,i-8,14)}else if(['roller','roller-plain'].includes(o.support)){
// Two vertically aligned circles joined by a link, matching the supplied support symbol.
el('circle',{cx:0,cy:7,r:7,fill:'white'},s);
line(s,0,14,0,24);
el('circle',{cx:0,cy:31,r:7,fill:'white'},s);
line(s,-24,38,24,38);
if(o.support!=='roller-plain')for(let i=-22;i<=20;i+=6)line(s,i,38,i+7,53);
}else{
// Circular hinge with two inclined legs and a hatched foundation.
line(s,-3.7,13, -19,38);
line(s,3.7,13,19,38);
el('circle',{cx:0,cy:7,r:7,fill:'white'},s);
line(s,-24,38,24,38);
if(o.support!=='pin-plain')for(let i=-20;i<=22;i+=6)line(s,i,38,i-7,53);
}}
// Pure model-space solver. Null means no safe constrained preview is available.
function solveBarEndpoint({startPoint:s,candidatePoint:c,geometryScale:scale,distanceMode='live',distanceValue,angleMode='live',angleValue}){
 const finitePoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!finitePoint(s)||!['live','locked'].includes(distanceMode)||!['live','locked'].includes(angleMode))return null;
 const dl=distanceMode==='locked',al=angleMode==='locked';
 if(!dl&&!al)return finitePoint(c)?{x:c.x,y:c.y}:null;
 if(dl&&(!Number.isFinite(distanceValue)||distanceValue<=0||!Number.isFinite(scale)||scale<=0))return null;
 if(al&&!Number.isFinite(angleValue))return null;
 if((!dl||!al)&&!finitePoint(c))return null;
 const dx=c?c.x-s.x:0,dy=c?c.y-s.y:0,radial=Math.hypot(dx,dy);
 const length=dl?distanceValue*scale:radial;
 if(!Number.isFinite(length)||(!al&&(!Number.isFinite(radial)||radial<1e-9)))return null;
 const radians=al?(angleValue%360)*Math.PI/180:0;
 const ux=al?Math.cos(radians):dx/radial,uy=al?-Math.sin(radians):dy/radial;
 const endpoint={x:s.x+ux*length,y:s.y+uy*length};
 return finitePoint(endpoint)?endpoint:null;
}
// Pure bar frame: tangent follows A -> B; normal is the fixed +90 degree rotation.
function getThinBarFrame(bar){
 if(!bar||![bar.x,bar.y,bar.x2,bar.y2].every(Number.isFinite))return null;
 const dx=bar.x2-bar.x,dy=bar.y2-bar.y,length=Math.hypot(dx,dy);
 if(!Number.isFinite(length)||length<=0)return null;
 const tangent={x:dx/length,y:dy/length},normal={x:-tangent.y,y:tangent.x};
 return {tangent,normal,length};
}
// Generic user-angle foundation; no runtime tool/session dependencies.
function normalizeReferenceAngle(angle){
 if(!Number.isFinite(angle))return null;
 let value=angle%360;if(value<=-180)value+=360;if(value>180)value-=360;
 return value===0?0:value;
}
function getReferenceBarFrame(bar){
 const frame=getThinBarFrame(bar);if(!frame)return null;
 // Exact vertical means dx === 0. Otherwise always face increasing screen X.
 const flip=frame.tangent.x<0||(frame.tangent.x===0&&frame.tangent.y<0);
 const x=(flip?-frame.tangent.x:frame.tangent.x)||0,y=(flip?-frame.tangent.y:frame.tangent.y)||0;
 const tangent={x,y},normal={x:-y||0,y:x};
 return {tangent,normal,length:frame.length,globalAngle:normalizeReferenceAngle(Math.atan2(-x,y)*180/Math.PI)};
}
// Positive local angles rotate clockwise in screen space, toward normal=(-ty,tx).
// Horizontal: local 0 -> right (-90 global), local +90 -> down (0 global).
function globalPlacementAngleToReferenceAngle(globalAngle,referenceFrame){
 const angle=normalizeReferenceAngle(globalAngle),base=normalizeReferenceAngle(referenceFrame?.globalAngle);
 return angle===null||base===null?null:normalizeReferenceAngle(angle-base);
}
function referenceAngleToGlobalPlacementAngle(referenceAngle,referenceFrame){
 const angle=normalizeReferenceAngle(referenceAngle),base=normalizeReferenceAngle(referenceFrame?.globalAngle);
 return angle===null||base===null?null:normalizeReferenceAngle(angle+base);
}
// Pure preview geometry. Radius/anchor share caller units; runtime converts CSS pixels.
// The existing signed local angle selects the sweep, including canonical +180.
function solveReferenceAnglePreviewGeometry({anchor,referenceFrame,globalPlacementAngle,localAngle,radius=30}={}){
 const finite=p=>p&&[p.x,p.y].every(Number.isFinite);
 const signedAngle=normalizeReferenceAngle(localAngle);
 if(!finite(anchor)||!finite(referenceFrame?.tangent)||!(referenceFrame.length>1e-9)||
  !Number.isFinite(referenceFrame.globalAngle)||!Number.isFinite(globalPlacementAngle)||signedAngle===null||!Number.isFinite(radius)||radius<=0)return null;
 const startDirection=referenceFrame.tangent;
 if(Math.abs(Math.hypot(startDirection.x,startDirection.y)-1)>1e-8)return null;
 const radians=globalPlacementAngle*Math.PI/180;
 const endDirection={x:-Math.sin(radians),y:Math.cos(radians)};
 const arcMidDirection=rotateVector(startDirection,signedAngle*Math.PI/360);
 const at=d=>({x:anchor.x+radius*d.x,y:anchor.y+radius*d.y});
 return {startDirection:{...startDirection},endDirection,signedAngle,arcStart:at(startDirection),arcEnd:at(endDirection),arcMidDirection,arcMidPoint:at(arcMidDirection),radius};
}
// Read placement state only: no independent angle or drawing/history state.
function activeReferenceAnglePreview(){
 let anchor,frame,global,local;
 if(mode==='support'&&supportPlacementSession){
  frame=supportReferenceFrame();anchor=supportPlacementSession.anchorPoint;
  local=supportPlacementSession.angle.value;global=supportGlobalAngle();
 }else if(['force','udl'].includes(mode)&&loadPlacement?.type===mode&&(mode!=='udl'||loadPlacement.b)){
  // UDL resolves references at its midpoint; only the visual center uses spanEnd.
  frame=loadReferenceFrame();anchor=mode==='udl'?loadPlacement.b:loadPlacement.a;
  local=loadPlacement.uiAngle.value;global=loadPlacement.globalPlacementAngle;
 }else return null;
 const scale=Math.hypot(svg.getScreenCTM()?.a,svg.getScreenCTM()?.b);
 if(!frame||!Number.isFinite(scale)||scale<=0)return null;
 const geometry=solveReferenceAnglePreviewGeometry({anchor,referenceFrame:frame,globalPlacementAngle:global,localAngle:local,radius:30/scale});
 if(!geometry)return null;
 return {...geometry,inputAnchor:{x:anchor.x+42/scale*geometry.arcMidDirection.x,y:anchor.y+42/scale*geometry.arcMidDirection.y}};
}
function renderReferenceAnglePreview(){
 svg.querySelector('.reference-angle-preview')?.remove();
 const geometry=activeReferenceAnglePreview();
 if(geometry&&Math.abs(geometry.signedAngle)>1e-9){
  const {arcStart:a,arcEnd:b,radius:r,signedAngle}=geometry;
  el('path',{class:'reference-angle-preview',d:`M${a.x} ${a.y} A${r} ${r} 0 0 ${signedAngle>0?1:0} ${b.x} ${b.y}`,
   stroke:'#14B8A6','stroke-width':1.1,'stroke-dasharray':'4 3',opacity:0.8,fill:'none',
   'vector-effect':'non-scaling-stroke','pointer-events':'none','aria-hidden':'true'});
 }
 if(typeof updateReferenceAngleInputAnchor==='function')updateReferenceAngleInputAnchor(geometry);
}
// Preserve proven candidate metadata and normal-alignment resolution policy.
// Use getReferenceBarFrame(candidate.bar) for endpoint-invariant user-angle axes.
function collectReferenceBars(options){return collectThinReferenceBars(options)}
function resolveReferenceBar(options){return resolveThinReferenceBar(options)}
function hitReferenceOverride(options){return hitThinReferenceOverride(options)}
// Along selects the section side; normalDistance remains an independent model distance.
// Only the visual start moves: the mechanical anchor is never modified.
function solveThinSectionPlacement(options={}){
 if(!options)return null;
 const {anchorPoint:s,referenceBar,cursorPoint:c,screenScale,thresholdPx,offsetPx}=options;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!finite(s)||!finite(c)||![screenScale,thresholdPx,offsetPx].every(Number.isFinite)||screenScale<=0||thresholdPx<0||offsetPx<0)return null;
 const frame=getThinBarFrame(referenceBar);if(!frame)return null;
 const {tangent,normal}=frame,dx=c.x-s.x,dy=c.y-s.y;
 const along=dx*tangent.x+dy*tangent.y,normalDistance=dx*normal.x+dy*normal.y;
 const alongPx=along*screenScale,offsetModel=offsetPx/screenScale;
 if(![along,normalDistance,alongPx,offsetModel].every(Number.isFinite))return null;
 // Equality belongs to the dead zone on both sides.
 const sectionSide=alongPx < -thresholdPx?-1:alongPx > thresholdPx?1:0;
 const drawStartPoint={x:s.x+tangent.x*sectionSide*offsetModel,y:s.y+tangent.y*sectionSide*offsetModel};
 return finite(drawStartPoint)?{tangent,normal,along,normalDistance,sectionSide,drawStartPoint}:null;
}
// Pure finite-segment candidates, in input order; bar is the original read-only reference.
function collectThinReferenceBars(options={}){
 if(!options)return [];
 const {bars,anchorPoint:p,toleranceModel}=options;
 if(!Array.isArray(bars)||!p||![p.x,p.y,toleranceModel].every(Number.isFinite)||toleranceModel<0)return [];
 const candidates=[];
 for(const bar of bars){
  if(!bar||bar.type!=='bar')continue;
  const frame=getThinBarFrame(bar);if(!frame)continue;
  const {tangent,normal}=frame,dx=p.x-bar.x,dy=p.y-bar.y;
  // Scale AB before the dot products: avoid squared-length overflow and unit-frame roundoff.
  const abx=bar.x2-bar.x,aby=bar.y2-bar.y,scale=Math.max(Math.abs(abx),Math.abs(aby));
  const ux=abx/scale,uy=aby/scale,uRaw=((dx/scale)*ux+(dy/scale)*uy)/(ux*ux+uy*uy);
  if(!Number.isFinite(uRaw))continue;
  const parameter=Math.max(0,Math.min(1,uRaw));
  const contactPoint=parameter===0?{x:bar.x,y:bar.y}:parameter===1?{x:bar.x2,y:bar.y2}:{x:bar.x+parameter*(bar.x2-bar.x),y:bar.y+parameter*(bar.y2-bar.y)};
  const distance=Math.hypot(p.x-contactPoint.x,p.y-contactPoint.y);
  if(![contactPoint.x,contactPoint.y,distance].every(Number.isFinite)||distance>toleranceModel)continue;
  candidates.push({barId:bar.id,bar,contactPoint,parameter,distance,tangent,normal});
 }
 return candidates;
}
// Pure resolution only: null means invalid, inactive or geometrically ambiguous; no lock/state.
function resolveThinReferenceBar(options={}){
 if(!options)return null;
 const {candidates,anchorPoint:s,cursorPoint:p,screenScale,activationThresholdPx}=options;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!Array.isArray(candidates)||!candidates.length||!finite(s)||!finite(p)||![screenScale,activationThresholdPx].every(Number.isFinite)||screenScale<=0||activationThresholdPx<0)return null;
 // Reject malformed candidate lists instead of silently changing the competing set.
 for(const c of candidates){
  if(!c||!c.bar||c.bar.type!=='bar'||!getThinBarFrame(c.bar)||!finite(c.contactPoint)||!finite(c.tangent)||!finite(c.normal)||![c.parameter,c.distance].every(Number.isFinite)||c.parameter<0||c.parameter>1||c.distance<0||Math.abs(Math.hypot(c.normal.x,c.normal.y)-1)>1e-9)return null;
 }
 if(candidates.length===1)return candidates[0];
 const dx=p.x-s.x,dy=p.y-s.y,distance=Math.hypot(dx,dy),distancePx=distance*screenScale;
 if(!Number.isFinite(distance)||!Number.isFinite(distancePx)||distance===0||distancePx<=activationThresholdPx)return null;
 const direction={x:dx/distance,y:dy/distance};
 let winner=null,topScore=-Infinity,secondScore=-Infinity;
 for(const candidate of candidates){
  const score=Math.abs(direction.x*candidate.normal.x+direction.y*candidate.normal.y);
  if(score>topScore){secondScore=topScore;topScore=score;winner=candidate}
  else if(score>secondScore)secondScore=score;
 }
 // Collinear members are also ambiguous-equivalent; array order must never break a tie.
 return topScore-secondScore<=1e-9?null:winner;
}
// Pure perpendicular endpoint: LIVE uses the signed model distance; LOCKED uses positive force magnitude.
function solveThinPerpendicularEndpoint(options={}){
 if(!options)return null;
 const {drawStartPoint:s,normal:n,signedNormalDistance:d,valueMode,internalForceValue:value,internalForceScale:scale}=options;
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y),epsilon=1e-9;
 if(!finite(s)||!finite(n)||!Number.isFinite(d))return null;
 const normalLength=Math.hypot(n.x,n.y);
 if(!Number.isFinite(normalLength)||normalLength<=epsilon)return null;
 let distance;
 if(valueMode==='live')distance=d;
 else if(valueMode==='locked'){
  if(!Number.isFinite(value)||value<=0||!Number.isFinite(scale)||scale<=0||Math.abs(d)<=epsilon)return null;
  const length=value/scale;
  if(!Number.isFinite(length)||length<=0)return null;
  distance=(d>0?1:-1)*length;
 }else return null;
 const endpoint={x:s.x+n.x/normalLength*distance,y:s.y+n.y/normalLength*distance};
 return finite(endpoint)?endpoint:null;
}
// Pure force-magnitude preview solver; one model unit represents scale force units.
function solveThinEndpointFromValue({startPoint:s,candidatePoint:c,internalForceValue:value,internalForceScale:scale}){
 const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(!finite(s)||!finite(c)||!Number.isFinite(value)||value<=0||!Number.isFinite(scale)||scale<=0)return null;
 const dx=c.x-s.x,dy=c.y-s.y,d=Math.hypot(dx,dy),length=value/scale;
 if(!Number.isFinite(d)||d<1e-9||!Number.isFinite(length)||length<=0)return null;
 const endpoint={x:s.x+dx/d*length,y:s.y+dy/d*length};
 return finite(endpoint)?endpoint:null;
}
// Transient per-segment reference only; never part of items or document serialization.
const THIN_REFERENCE_TOLERANCE_PX=10;
const THIN_REFERENCE_ACTIVATION_PX=10;
const THIN_SECTION_SIDE_THRESHOLD_PX=10;
const THIN_SECTION_OFFSET_PX=3;
const THIN_REFERENCE_OVERRIDE_RADIUS_PX=40;
const THIN_REFERENCE_OVERRIDE_HIT_PX=10;
const THIN_REFERENCE_OVERRIDE_TIE_PX=1;
// Pure finite-bar hit test. The central hit-width disk carries no directional intent.
function hitThinReferenceOverride({bars,anchorPoint,cursorPoint,screenScale}={}){
 if(!anchorPoint||!cursorPoint||![anchorPoint.x,anchorPoint.y,cursorPoint.x,cursorPoint.y,screenScale].every(Number.isFinite)||screenScale<=0)return null;
 const radius=Math.hypot(cursorPoint.x-anchorPoint.x,cursorPoint.y-anchorPoint.y)*screenScale;
 if(radius<=THIN_REFERENCE_OVERRIDE_HIT_PX||radius>THIN_REFERENCE_OVERRIDE_RADIUS_PX)return null;
 const hits=collectThinReferenceBars({bars,anchorPoint:cursorPoint,toleranceModel:THIN_REFERENCE_OVERRIDE_HIT_PX/screenScale})
  .filter(c=>Math.hypot(c.contactPoint.x-anchorPoint.x,c.contactPoint.y-anchorPoint.y)*screenScale<=THIN_REFERENCE_OVERRIDE_RADIUS_PX)
  .sort((a,b)=>a.distance-b.distance);
 if(!hits.length||(hits.length>1&&(hits[1].distance-hits[0].distance)*screenScale<=THIN_REFERENCE_OVERRIDE_TIE_PX))return null;
 return hits[0].bar;
}
function thinReferenceOverrideAt(cursorPoint){
 const session=thinReferenceSession;if(!session||session.candidates.length<2)return null;
 const screenScale=Math.abs(svg.getScreenCTM()?.a),ids=new Set(session.candidates.map(c=>c.barId));
 // Refresh by ID and recheck contact with the anchor; never select a stale or unrelated bar.
 const candidates=collectThinReferenceBars({bars:items.filter(o=>ids.has(o.id)),anchorPoint:session.anchorPoint,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/screenScale});
 return hitThinReferenceOverride({bars:candidates.map(c=>c.bar),anchorPoint:session.anchorPoint,cursorPoint,screenScale});
}
function overrideThinReference(e){
 if(mode!=='thin'||!first||e.button!==0||![e.clientX,e.clientY].every(Number.isFinite))return false;
 syncThinReferenceSession();
 const bar=thinReferenceOverrideAt(rawPoint(e));if(!bar)return false;
 const session=thinReferenceSession;
 session.referenceBarId=bar.id;session.referenceBarLocked=true;
 // A reference-selection tap is not a new drawing endpoint or a numeric confirmation.
 session.rawCursorPoint={...(session.overrideCursorPoint||session.anchorPoint)};
 // Keyboard commit must use the same retained drawing intent as the refreshed preview.
 const numeric=typeof thinNumericSession!=='undefined'?thinNumericSession:null;
 if(numeric?.first===first&&typeof dynamicNumericCapture!=='undefined'&&dynamicNumericCapture===numeric.capture){
  const cursor=new DOMPoint(session.rawCursorPoint.x,session.rawCursorPoint.y).matrixTransform(svg.getScreenCTM());
  updateDynamicNumericInputAnchor(cursor.x,cursor.y);
 }
 render();return true;
}
function resolveThinConstrainedGeometry(options={}){
 if(!options)return null;
 const {anchorPoint,referenceBar,rawCursorPoint,screenScale,valueMode,internalForceValue,internalForceScale}=options;
 const placement=solveThinSectionPlacement({anchorPoint,referenceBar,cursorPoint:rawCursorPoint,screenScale,thresholdPx:THIN_SECTION_SIDE_THRESHOLD_PX,offsetPx:THIN_SECTION_OFFSET_PX});
 if(!placement)return null;
 const {drawStartPoint,sectionSide,normal,normalDistance:signedNormalDistance}=placement;
 const endpoint=solveThinPerpendicularEndpoint({drawStartPoint,normal,signedNormalDistance,valueMode,internalForceValue,internalForceScale});
 return endpoint?{drawStartPoint,endpoint,sectionSide,normal,signedNormalDistance}:null;
}
function getThinConstrainedGeometry(referenceBar,rawCursorPoint=thinReferenceSession?.rawCursorPoint){
 const numeric=typeof thinNumericSession!=='undefined'&&thinNumericSession?.first===first?thinNumericSession:null;
 return resolveThinConstrainedGeometry({anchorPoint:thinReferenceSession?.anchorPoint,referenceBar,rawCursorPoint,screenScale:Math.abs(svg.getScreenCTM()?.a),valueMode:numeric?.valueMode||'live',internalForceValue:numeric?.value,internalForceScale});
}
var thinReferenceSession=null;
function endThinReferenceSession(){thinReferenceSession=null;svg.querySelector('.thin-reference-highlight')?.remove();svg.querySelectorAll('.reference-override').forEach(marker=>marker.classList.remove('reference-override'))}
function beginThinReferenceSession(){
 endThinReferenceSession();
 if(mode!=='thin'||!first)return;
 const screenScale=Math.abs(svg.getScreenCTM()?.a);
 const anchorPoint={x:first.x,y:first.y};
 const candidates=collectThinReferenceBars({bars:items,anchorPoint,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/screenScale});
 thinReferenceSession={anchorPoint,candidates,referenceBarId:candidates.length===1?candidates[0].barId:null,referenceBarLocked:candidates.length===1,segmentFirst:first,rawCursorPoint:{...anchorPoint}};
}
function getThinReferenceBar(){
 const session=thinReferenceSession;if(!session?.referenceBarLocked)return null;
 const bar=items.find(o=>o.id===session.referenceBarId);
 if(bar?.type==='bar'&&getThinBarFrame(bar))return bar;
 session.referenceBarId=null;session.referenceBarLocked=false;session.candidates=[];
 return null;
}
function syncThinReferenceSession(){
 if(thinReferenceSession&&(mode!=='thin'||first!==thinReferenceSession.segmentFirst))endThinReferenceSession();
 if(thinReferenceSession?.referenceBarLocked)getThinReferenceBar();
}
function updateThinReferenceSession(e){
 syncThinReferenceSession();
 const session=thinReferenceSession;
 if(!session||!e||![e.clientX,e.clientY].every(Number.isFinite))return;
 const screenScale=Math.abs(svg.getScreenCTM()?.a);
 if(!Number.isFinite(screenScale)||screenScale<=0)return;
 const rawCursorPoint=rawPoint(e);
 session.rawCursorPoint={x:rawCursorPoint.x,y:rawCursorPoint.y};
 // Keep the last drawing intent while the pointer approaches a reference-selection target.
 if(!thinReferenceOverrideAt(rawCursorPoint))session.overrideCursorPoint={...session.rawCursorPoint};
 if(session.referenceBarLocked||session.candidates.length<2)return;
 // Refresh by ID from current items; candidate object references are not authoritative.
 const ids=new Set(session.candidates.map(c=>c.barId));
 session.candidates=collectThinReferenceBars({bars:items.filter(o=>ids.has(o.id)),anchorPoint:session.anchorPoint,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/screenScale});
 const candidate=resolveThinReferenceBar({candidates:session.candidates,anchorPoint:session.anchorPoint,cursorPoint:rawCursorPoint,screenScale,activationThresholdPx:THIN_REFERENCE_ACTIVATION_PX});
 if(candidate){session.referenceBarId=candidate.barId;session.referenceBarLocked=true}
}
function renderThinReferenceHighlight(){
 svg.querySelector('.thin-reference-highlight')?.remove();
 if(mode!=='thin'||!first||!thinReferenceSession?.referenceBarLocked)return;
 const bar=items.find(o=>o.id===thinReferenceSession.referenceBarId);
 if(bar?.type!=='bar'||!getThinBarFrame(bar))return;
 line(svg,bar.x,bar.y,bar.x2,bar.y2,{class:'thin-reference-highlight','pointer-events':'none','aria-hidden':'true'});
}
function renderThinConstraintPreview(){
 svg.querySelector('[data-thin-preview]')?.remove();
 if(mode!=='thin'||!first)return;
 const referenceBar=getThinReferenceBar();
 const geometry=referenceBar?getThinConstrainedGeometry(referenceBar):null;
 const start=referenceBar?geometry?.drawStartPoint:first;
 const endpoint=referenceBar?geometry?.endpoint:typeof thinNumericSession!=='undefined'&&thinNumericSession?.valueMode==='locked'?thinNumericSession.endpoint:hover;
 if(!endpoint)return;
 const g=el('g',{'data-thin-preview':'true','pointer-events':'none',stroke:'#087d95','stroke-dasharray':'5 4'});
 line(g,start.x,start.y,endpoint.x,endpoint.y);
}
// Refresh this transient decoration without rendering objects or scheduling autosave.
function renderBarConstraintPreview(){
 svg.querySelector('[data-bar-preview]')?.remove();
 if(mode!=='bar'||!first)return;
 const endpoint=typeof barNumericSession!=='undefined'&&barNumericSession?barNumericSession.endpoint:hover;
 if(!endpoint)return;
 const g=el('g',{'data-bar-preview':'true','pointer-events':'none',stroke:'#087d95','stroke-dasharray':'5 4'});
 line(g,first.x,first.y,endpoint.x,endpoint.y);
}
// Person origin is the head center; local +Y points from head to feet.
// size is a uniform model-unit multiplier; angle is SVG degrees (clockwise on screen).
const PERSON_DEFAULT_SIZE=2;
const PERSON_HEAD_RADIUS=2;
const PERSON_BAR_GAP=20;
const PERSON_PLACEMENT_TOLERANCE=1e-6; // Model units, independent of camera zoom.
function solvePersonPlacement({bar,candidatePoint:p,size=PERSON_DEFAULT_SIZE}={}){
 if(!bar||!p||![bar.x,bar.y,bar.x2,bar.y2,p.x,p.y,size].every(Number.isFinite)||size<=0)return null;
 const dx=bar.x2-bar.x,dy=bar.y2-bar.y,length=Math.hypot(dx,dy);
 if(!Number.isFinite(length)||length<=PERSON_PLACEMENT_TOLERANCE||!Number.isFinite(dx*dx+dy*dy))return null;
 const q=segmentContact(p,bar,{x:bar.x2,y:bar.y2});
 if(!q||![q.x,q.y].every(Number.isFinite))return null;
 let nx=-dy/length,ny=dx/length;
 const side=(p.x-q.x)*nx+(p.y-q.y)*ny;
 if(!Number.isFinite(side)||Math.abs(side)<=PERSON_PLACEMENT_TOLERANCE)return null;
 if(side<0){nx=-nx;ny=-ny}
 // SVG rotation maps local +Y to (-sin(angle), cos(angle)): feet point outward.
 const angle=(Math.atan2(ny,nx)*180/Math.PI-90+360)%360;
 const offset=PERSON_BAR_GAP+PERSON_HEAD_RADIUS*size;
 const x=q.x+nx*offset,y=q.y+ny*offset;
 return [offset,x,y,angle].every(Number.isFinite)?{x,y,angle}:null;
}
const PERSON_HIT_TOLERANCE=24; // CSS pixels, converted at the interaction boundary.
function findNearestBar(candidatePoint,tolerance){
 if(!candidatePoint||![candidatePoint.x,candidatePoint.y,tolerance].every(Number.isFinite)||tolerance<0)return null;
 let nearest=null,distance=tolerance;
 for(const bar of items){
  if(bar.type!=='bar'||![bar.x,bar.y,bar.x2,bar.y2].every(Number.isFinite)||Math.hypot(bar.x2-bar.x,bar.y2-bar.y)<=PERSON_PLACEMENT_TOLERANCE)continue;
  const q=segmentContact(candidatePoint,bar,{x:bar.x2,y:bar.y2});if(!q)continue;
  const d=Math.hypot(candidatePoint.x-q.x,candidatePoint.y-q.y);
  if(Number.isFinite(d)&&d<=tolerance&&(!nearest||d<distance-1e-9)){nearest=bar;distance=d}
 }return nearest;
}
function personPlacementAt(e){
 const p=rawPoint(e),scale=Math.abs(svg.getScreenCTM().a);
 if(!scale)return null;
 const bar=findNearestBar(p,PERSON_HIT_TOLERANCE/scale);
 // Subpixel pointer conversion must not choose an arbitrary side on the bar.
 if(bar){const q=segmentContact(p,bar,{x:bar.x2,y:bar.y2});if(q&&Math.hypot(p.x-q.x,p.y-q.y)<=.5/scale)return null}
 const placement=bar&&solvePersonPlacement({bar,candidatePoint:p,size:PERSON_DEFAULT_SIZE});
 if(!placement)return null;
 try{validatePerson({...placement,size:PERSON_DEFAULT_SIZE})}catch{return null}
 return placement;
}
function personTransform(o){return `translate(${o.x} ${o.y}) rotate(${o.angle}) scale(${o.size})`}
function clearPersonPreview(){svg.querySelector('[data-person-preview]')?.remove()}
function paintPersonPreview(e){
 clearPersonPreview();const placement=personPlacementAt(e);if(!placement)return;
 if(!svg.querySelector('#personSymbol'))definePersonSymbol(svg.querySelector('defs'));
 el('use',{href:'#personSymbol',transform:personTransform({...placement,size:PERSON_DEFAULT_SIZE}),opacity:.45,'pointer-events':'none','data-person-preview':'true'});
}
function validatePerson(o){
 if(!Number.isFinite(o.x)||!Number.isFinite(o.y)||Math.abs(o.x)>10000||Math.abs(o.y)>10000||!Number.isFinite(o.angle)||!Number.isFinite(o.size)||o.size<=0)throw Error('Invalid person');
}
function definePersonSymbol(defs){
 const symbol=el('symbol',{id:'personSymbol',overflow:'visible',stroke:'black','stroke-width':1,'stroke-linecap':'round',fill:'none'},defs);
 el('circle',{cx:0,cy:0,r:PERSON_HEAD_RADIUS},symbol);
 for(const [x1,y1,x2,y2]of [[0,2,0,12],[0,5,-5,9],[0,5,5,9],[0,12,-5,20],[0,12,5,20]])line(symbol,x1,y1,x2,y2);
}
function render(clean=false){
 syncThinReferenceSession();
 if(typeof syncBarNumericInput==='function')syncBarNumericInput();
 if(typeof syncThinNumericInput==='function')syncThinNumericInput();
 if(typeof syncObjectColorControls==='function')syncObjectColorControls();
 if(typeof syncSectionVisibilityControls==='function')syncSectionVisibilityControls();
 if(typeof updateDrawingEquations==='function')updateDrawingEquations(items);
 if($('mirrorObjects')){const active=mode==='mirror'||!!mirrorSelecting;$('mirrorObjects').classList.toggle('active',active);$('mirrorObjects').setAttribute('aria-pressed',String(active))}
 if($('resetView')){$('resetView').classList.toggle('active',mode==='select');$('resetView').setAttribute('aria-pressed',String(mode==='select'))}
 if(typeof syncSupportChoices==='function')syncSupportChoices();
 if(typeof updateFileStatus==='function')updateFileStatus();
 if(typeof refreshLineStyle==='function')refreshLineStyle();
 if($('editSelected')){$('editSelected').classList.toggle('active',mode==='labelEdit');$('editSelected').setAttribute('aria-pressed',String(mode==='labelEdit'))}
 if(autosaveReady&&!clean){clearTimeout(autosaveTimer);autosaveTimer=setTimeout(saveDraft,200)}
svg.replaceChildren();const defs=el('defs'),marker=el('marker',{id:'arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto'},defs);el('path',{d:'M0 0L10 5L0 10Z',fill:'black'},marker);const momentMarker=el('marker',{id:'momentArrow',viewBox:'0 0 10 10',refX:0,refY:5,markerWidth:7,markerHeight:7,orient:'auto',overflow:'visible'},defs);el('path',{d:'M0 0L10 5L0 10Z',fill:'black'},momentMarker);el('rect',{width:1100,height:720,fill:'white'});
if(items.some(o=>o.type==='person'))definePersonSymbol(defs);
for(const o of [...items].sort((a,b)=>Number(['positive','negative','diagramM','diagramQ','diagramN'].includes(a.type))-Number(['positive','negative','diagramM','diagramQ','diagramN'].includes(b.type)))){if(o.type==='person'){try{validatePerson(o)}catch{continue}}if(hiddenSectionAction(o))continue;const {x,y,x2,y2}=o,g=el('g',{'data-id':o.id,...(validObjectColor(o.strokeColor)?{'data-object-color':o.strokeColor}:{}),stroke:objectColor(o),'stroke-width':1.8,fill:'none'});
if(o.type==='person'){
 const instance=el('g',{transform:personTransform(o)},g);
 el('use',{href:'#personSymbol'},instance);
 if(!clean)el('rect',{x:-6,y:-3,width:12,height:24,fill:'transparent',stroke:'none','pointer-events':'all','data-hit-area':'true'},instance);
}
if(o.type==='bar')line(g,x,y,x2,y2,{'stroke-width':3.5});
if(o.type==='curve'){
 el('path',{d:curvePath(o),'stroke-width':1},g);
 if(!clean)el('path',{d:curvePath(o),stroke:'transparent','stroke-width':18,'vector-effect':'non-scaling-stroke','pointer-events':'stroke','data-hit-area':'true'},g);
}
if(o.type==='rigidRegion')drawRigidRegion(g,o,clean);
if(o.type==='hatch'){
 const h=el('g',{transform:`translate(${x} ${y})`,'stroke-width':0.8},g);
 for(const segment of automaticHatchSegments(o))line(h,...segment);
 if(!clean)el('polygon',{points:o.points.map(p=>`${p.x},${p.y}`).join(' '),fill:'transparent',stroke:'none','pointer-events':'all'},h);
}

if(o.type==='thin'||o.type==='dashed'){
 let a={x,y},b={x:x2,y:y2};
 if(o.sectionMark){const len=Math.hypot(x2-x,y2-y);if(len>0&&len<64){const cx=(x+x2)/2,cy=(y+y2)/2,dx=(x2-x)/len*32,dy=(y2-y)/len*32;a={x:cx-dx,y:cy-dy};b={x:cx+dx,y:cy+dy}}}
 line(g,a.x,a.y,b.x,b.y,{'stroke-width':o.sectionMark?2.5:1,'stroke-dasharray':o.type==='dashed'?'8 5':'none'});
}
if(o.type==='linkBar'){line(g,x,y,x2,y2,{'stroke-width':3.5});for(const [cx,cy]of [[x,y],[x2,y2]])el('circle',{cx,cy,r:6,fill:'white','stroke-width':1.8},g)}
if(o.type==='weld'){if(!clean)el('rect',{x:x-6,y:y-6,width:12,height:12,fill:'transparent',stroke:'transparent','stroke-width':18,'vector-effect':'non-scaling-stroke','pointer-events':'all','data-hit-area':'true'},g);el('rect',{x:x-6,y:y-6,width:12,height:12,fill:objectColor(o),stroke:'none'},g)}
if(o.type==='hinge')el('circle',{cx:x,cy:y,r:6,fill:'white'},g);
if(o.type==='text')txt(g,x,y,o.label);
if(o.type==='positive'||o.type==='negative'){
 el('circle',{cx:x,cy:y,r:10,fill:'white','stroke-width':1},g);
 line(g,x-5,y,x+5,y,{'stroke-width':1.3});
 if(o.type==='positive')line(g,x,y-5,x,y+5,{'stroke-width':1.3});
}
if(['diagramM','diagramQ','diagramN'].includes(o.type)){
 el('circle',{cx:x,cy:y,r:16,fill:'white','stroke-width':1},g);
 txt(g,x,y+6,o.type.slice(-1));
 const label=el('g',{},g);txt(label,x,y+38,o.label);
 const box=label.getBBox();const bg=el('rect',{x:box.x-3,y:box.y-2,width:box.width+6,height:box.height+4,fill:'white',stroke:'none'},label);label.prepend(bg);
}

if(o.type==='support')drawSupport(g,o);
if(o.sectionAction&&o.sectionVector&&['force','moment'].includes(o.type)){
 const u=o.sectionVector;
 if(o.type==='force'){
  if(o.sectionAction==='Q'){
   const cx=x+u.y*10,cy=y-u.x*10;
   arrow(g,cx-u.x*26,cy-u.y*26,cx+u.x*26,cy+u.y*26);
   txt(g,cx+u.x*40,cy+u.y*40,o.label);
  }else{
  arrow(g,x+u.x*16,y+u.y*16,x+u.x*68,y+u.y*68);
  txt(g,x+u.x*78-u.y*10,y+u.y*78+u.x*10,o.label);
  }
 }else{
  const cx=x+u.x*23,cy=y+u.y*23,r=23,sign=o.sectionSign===-1?1:-1;
  const angle=Math.atan2(u.y,u.x),start=angle-sign*Math.PI*.42,end=angle+sign*Math.PI*.42;
  el('path',{d:`M${cx+r*Math.cos(start)} ${cy+r*Math.sin(start)} A${r} ${r} 0 0 ${sign>0?1:0} ${cx+r*Math.cos(end)} ${cy+r*Math.sin(end)}`,'marker-end':'url(#momentArrow)'},g);
  txt(g,cx+u.y*36,cy-u.x*36,o.label);
 }
}
if(o.type==='force'&&!o.sectionAction){
 const [dx,dy]=loadVector(o),tailX=x-dx*75,tailY=y-dy*75;
 arrow(g,tailX,tailY,x,y);
 txt(g,tailX,tailY+(dy===-1?22:-8),o.label);
}
if(o.type==='moment'&&!o.sectionAction){
// The free end of the straight radial segment is the insertion / snap point.
const side=o.rotation==='cw'?1:-1;
const mg=el('g',{transform:`rotate(${-(o.loadAngle||0)} ${x} ${y})`},g);
line(mg,x,y,x-side*20,y+28);
el('path',{d:`M${x-side*20} ${y+28} A34 34 0 0 ${side===1?1:0} ${x+side*12} ${y-32}`,'marker-end':'url(#momentArrow)'},mg);
txt(g,x-side*26,y-38,o.label);
}
if(o.type==='udl'){const [dx,dy]=loadVector(o);line(g,x-dx*55,y-dy*55,x2-dx*55,y2-dy*55);const n=Math.max(2,Math.ceil(Math.hypot(x2-x,y2-y)/25));for(let i=0;i<=n;i++){const a=x+(x2-x)*i/n,b=y+(y2-y)*i/n;arrow(g,a-dx*55,b-dy*55,a,b)}let angle=Math.atan2(y2-y,x2-x)*180/Math.PI;
if(angle>=90)angle-=180;if(angle< -90)angle+=180;
const radians=angle*Math.PI/180,nx=-Math.sin(radians),ny=Math.cos(radians);
const outside=(-dx*nx-dy*ny)>0?1:-1;
const labelGroup=el('g',{transform:`translate(${(x+x2)/2-dx*55} ${(y+y2)/2-dy*55}) rotate(${angle})`},g);
txt(labelGroup,0,outside>0?24:-8,o.label)}
if(o.type==='dim')drawDimension(g,o);
// Colored markers are scoped by color; default and temporary arrows keep their own markers.
if(validObjectColor(o.strokeColor))for(const shape of g.querySelectorAll('[marker-end]')){
 const base=shape.getAttribute('marker-end')==='url(#momentArrow)'?'momentArrow':'arrow';
 const id=base+'-'+o.strokeColor.slice(1).toLowerCase();
 if(!defs.querySelector('#'+id)){const marker=defs.querySelector('#'+base).cloneNode(true);marker.id=id;marker.querySelector('path').setAttribute('fill',o.strokeColor);defs.append(marker)}
 shape.setAttribute('marker-end',`url(#${id})`);
}
if(!clean&&['dim','force','moment','udl','bar','thin','dashed','linkBar'].includes(o.type)){
 // Wide invisible strokes improve picking without changing the printed drawing.
 const hit=el('g',{'data-hit-area':'true',cursor:'pointer'},g);
 for(const shape of [...g.querySelectorAll('line,path')]){
  const target=shape.cloneNode(true);
  target.removeAttribute('marker-end');target.removeAttribute('marker-start');
  target.setAttribute('stroke','transparent');target.setAttribute('stroke-width','18');
  target.setAttribute('vector-effect','non-scaling-stroke');
  target.setAttribute('fill','none');target.setAttribute('pointer-events','stroke');
  hit.append(target);
 }
 g.prepend(hit);
}
if(!clean&&(selected===o.id||multiSelection.has(o.id))){const b=g.getBBox();el('rect',{x:b.x-7,y:b.y-7,width:b.width+14,height:b.height+14,stroke:'#15889c','stroke-dasharray':'5 4','pointer-events':'none','data-selection-decoration':'true'},g)}}if(!clean&&mode==='dim'&&first&&second&&hover){const g=el('g',{stroke:'#15889c',fill:'none','pointer-events':'none'});drawDimension(g,{...first,x2:second.x,y2:second.y,offset:snapDimensionOffset(first,second,offsetAt(first,second,hover)),label:'L'})}if(!clean&&(mode==='dim'||mode==='moment')&&hover&&!second)el('circle',{cx:hover.x,cy:hover.y,r:8,fill:'none',stroke:'#15889c','pointer-events':'none'});if(first&&!clean)el('circle',{cx:first.x,cy:first.y,r:6,fill:'#15889c'});
if(!clean&&hatchPoints.length){
 el('polyline',{points:hatchPoints.map(p=>`${p.x},${p.y}`).join(' '),fill:'none',stroke:'#087d95','stroke-dasharray':'4 3','pointer-events':'none'});
 for(const p of hatchPoints)el('circle',{cx:p.x,cy:p.y,r:4,fill:'#087d95','pointer-events':'none'});
}
if(!clean&&mode==='extend'&&extendBoundary){
 for(const o of items){
  if(o.id===extendBoundary||!['bar','thin','dashed'].includes(o.type))continue;
  for(const [end,cx,cy]of [['start',o.x,o.y],['end',o.x2,o.y2]]){
   const h=el('g',{'data-id':o.id,'data-extend-end':end,cursor:'pointer'});
   el('circle',{cx,cy,r:9,fill:'white',stroke:'#087d95','stroke-width':2},h);
   el('circle',{cx,cy,r:3,fill:'#087d95','pointer-events':'none'},h);
   el('title',{},h).textContent=end==='start'?'Kéo dài đầu này':'Kéo dài cuối này';
  }
 }
}
if(!clean&&mode==='select'&&selectedObjectIds().size<2){
 const o=items.find(o=>o.id===selected);
 if(o&&!hiddenSectionAction(o)){
  const resizable=['bar','dim','udl','thin','dashed','linkBar'].includes(o.type);
 const regionBox=o.type==='rigidRegion'?svg.querySelector(`[data-id="${o.id}"]`).getBBox():null;
 const shortLink=o.type==='linkBar'&&Math.hypot(o.x2-o.x,o.y2-o.y)*(Math.abs(svg.getScreenCTM().a)||1)<60;
 const moveX=regionBox?regionBox.x-26/(Math.abs(svg.getScreenCTM().a)||1):resizable?(o.x+o.x2)/2:o.x,moveY=shortLink?(o.y+o.y2)/2-36/(Math.abs(svg.getScreenCTM().a)||1):regionBox?regionBox.y-26/(Math.abs(svg.getScreenCTM().a)||1):resizable?(o.y+o.y2)/2:o.y;
 const h=el('g',{'data-id':o.id,'data-move-anchor':'true',transform:`translate(${moveX} ${moveY})`,cursor:'move',stroke:'#087d95','stroke-width':1.6,fill:'white'});
  el('title',{},h).textContent='Move insertion point';
  el('circle',{r:17,fill:'white','fill-opacity':0.9},h);
  el('path',{d:'M-13 0H13 M0 -13V13 M-9 -4L-13 0L-9 4 M9 -4L13 0L9 4 M-4 -9L0 -13L4 -9 M-4 9L0 13L4 9',fill:'none','pointer-events':'none'},h);
  el('circle',{r:3,fill:'#087d95','pointer-events':'none'},h);
  if(resizable){
   for(const [end,ex,ey]of [['start',o.x,o.y],['end',o.x2,o.y2]]){
    const scale=Math.abs(svg.getScreenCTM().a)||1,len=Math.hypot(o.x2-o.x,o.y2-o.y),sign=end==='start'?-1:1;
    const cx=shortLink?ex+sign*(o.x2-o.x)/len*26/scale:ex,cy=shortLink?ey+sign*(o.y2-o.y)/len*26/scale:ey;
    if(shortLink)line(svg,ex,ey,cx,cy,{stroke:'#087d95','pointer-events':'none','data-endpoint-guide':'true'});
    const handle=el('g',{'data-id':o.id,'data-endpoint':end,cursor:'crosshair'});
    el('circle',{cx,cy,r:o.type==='linkBar'?22/scale:12,fill:'white','fill-opacity':0.8,stroke:'#087d95'},handle);
    el('rect',{x:cx-4,y:cy-4,width:8,height:8,fill:'#087d95','pointer-events':'none'},handle);
    el('title',{},handle).textContent=end==='start'?'Kéo điểm đầu':'Kéo điểm cuối';
   }
  }else if(o.x2!==undefined)el('circle',{cx:o.x2,cy:o.y2,r:4,fill:'white',stroke:'#087d95','pointer-events':'none'});
 }
}
 if(!clean&&mode==='curve'&&second)el('circle',{cx:second.x,cy:second.y,r:6,fill:'#15889c','pointer-events':'none'});
 if(!clean&&mode==='support')renderSupportPlacement();
 if(!clean&&mode==='bar')renderBarConstraintPreview();
 if(!clean){renderThinReferenceHighlight();if(mode==='thin')renderThinConstraintPreview();renderSupportReference();renderLoadReference();if(['force','moment','udl'].includes(mode)&&loadPlacement?.type===mode)paintLoadPreview();renderReferenceAnglePreview()}
 if(!clean&&first&&hover&&['dashed','udl','linkBar'].includes(mode)){const g=el('g',{'pointer-events':'none',stroke:'#087d95','stroke-dasharray':'5 4'});line(g,first.x,first.y,hover.x,hover.y);}
 if(!clean&&mode==='joint'&&typeof drawJointHandles==='function')drawJointHandles();
 if(!clean)renderRigidControls();
}
// Capture visible geometry once per rectangle, independently of selection/hit overlays.
const selectionGeometry=(()=>{
 const eps=1e-6,step=.5;
 const inside=(p,r)=>p.x>=r.left-eps&&p.x<=r.right+eps&&p.y>=r.top-eps&&p.y<=r.bottom+eps;
 const corners=r=>[{x:r.left,y:r.top},{x:r.right,y:r.top},{x:r.right,y:r.bottom},{x:r.left,y:r.bottom}];
 function segment(a,b,r){
  let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;
  for(const [p,q]of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]){
   if(Math.abs(p)<eps){if(q< -eps)return false;continue}
   const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi+eps)return false;
  }return true;
 }
 function contains(points,p){let yes=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;
 }return yes}
 function bounds(points,pad){let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const p of points){left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y)}
  return {left:left-pad,right:right+pad,top:top-pad,bottom:bottom+pad};
 }
 const overlap=(a,b)=>a.left<=b.right+eps&&a.right>=b.left-eps&&a.top<=b.bottom+eps&&a.bottom>=b.top-eps;
 function matches(parts,r,crossing){
  if(!parts.length)return false;
  if(!crossing)return parts.every(p=>p.bounds.left>=r.left-eps&&p.bounds.right<=r.right+eps&&p.bounds.top>=r.top-eps&&p.bounds.bottom<=r.bottom+eps);
  return parts.some(p=>{
   if(!overlap(p.bounds,r))return false;
   if(p.circle){
    const {x,y,radius,inner}=p.circle,near=Math.hypot(x-Math.max(r.left,Math.min(r.right,x)),y-Math.max(r.top,Math.min(r.bottom,y)));
    return near<=radius+eps&&(p.fill||corners(r).some(q=>Math.hypot(q.x-x,q.y-y)>=inner-eps));
   }
   const box={left:r.left-p.pad,right:r.right+p.pad,top:r.top-p.pad,bottom:r.bottom+p.pad};
   if(p.points.some(q=>inside(q,box)))return true;
   for(let i=1;i<p.points.length;i++)if(segment(p.points[i-1],p.points[i],box))return true;
   if(p.closed&&segment(p.points.at(-1),p.points[0],box))return true;
   return p.fill&&corners(r).some(q=>contains(p.points,q));
  });
 }
 function capture(){
  const inverse=svg.getScreenCTM().inverse(),out=[];
  for(const group of svg.querySelectorAll(':scope > g[data-id]')){
   if(['data-endpoint','data-move-anchor','data-rigid-point','data-rigid-action'].some(k=>group.hasAttribute(k)))continue;
   const parts=[],add=(points,closed,fill,pad)=>{if(points.length)parts.push({points,closed,fill,pad,bounds:bounds(points,pad)})};
   for(const node of group.querySelectorAll('line,path,polyline,polygon,rect,circle,ellipse,text,use')){
    if(node.closest('[data-hit-area],defs')||node.hasAttribute('data-selection-decoration'))continue;
    const style=getComputedStyle(node);
    if(style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0)continue;
    const painted=c=>c!=='none'&&c!=='transparent'&&!/rgba\([^)]*,\s*0\)/.test(c);
    const stroke=painted(style.stroke)&&Number(style.strokeOpacity)>0,fill=painted(style.fill)&&Number(style.fillOpacity)>0;
    if(!stroke&&!fill)continue;
    const matrix=inverse.multiply(node.getScreenCTM()),scale=Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d));
    const map=p=>new DOMPoint(p.x,p.y).matrixTransform(matrix);
    const pad=stroke?parseFloat(style.strokeWidth)*scale/2:0;
    if(node.tagName==='circle'){
     const c=map({x:node.cx.baseVal.value,y:node.cy.baseVal.value}),radius=node.r.baseVal.value*scale;
     parts.push({circle:{...c,radius:radius+pad,inner:Math.max(0,radius-pad)},fill,bounds:{left:c.x-radius-pad,right:c.x+radius+pad,top:c.y-radius-pad,bottom:c.y+radius+pad}});continue;
    }
    if(node.tagName==='use'){const b=node.getBBox();add(corners({left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height}).map(map),true,true,scale/2);continue}
    if(node.tagName==='text'||node.tagName==='rect'){
     const b=node.getBBox();add(corners({left:b.x,right:b.x+b.width,top:b.y,bottom:b.y+b.height}).map(map),true,fill,pad);continue;
    }
    if(node.tagName==='line')add([{x:node.x1.baseVal.value,y:node.y1.baseVal.value},{x:node.x2.baseVal.value,y:node.y2.baseVal.value}].map(map),false,false,pad);
    else if(node.tagName==='polygon'||node.tagName==='polyline')add([...node.points].map(map),node.tagName==='polygon',fill,pad);
    else{
     // Renderers use absolute M subpaths. Never connect separate strokes.
     // Arc-length intervals <= .5 model units bound chord error by .25 units.
     const paths=node.tagName==='path'?(node.getAttribute('d').match(/M[^M]*/g)||[]):[null];
     for(const d of paths){
      const shape=d===null?node:document.createElementNS(NS,'path');if(d!==null)shape.setAttribute('d',d);
      const length=shape.getTotalLength(),n=Math.max(1,Math.ceil(length*scale/step)),points=[];
      for(let i=0;i<=n;i++)points.push(map(shape.getPointAtLength(length*i/n)));
      add(points,d===null||/z\s*$/i.test(d),fill,pad+step/2);
     }
    }
    // Markers are omitted by getBBox: include the existing rendered arrowhead.
    const markerId=node.getAttribute('marker-end')?.match(/#([^)]*)/)?.[1],marker=markerId&&svg.querySelector('[id="'+markerId+'"]');
    if(marker&&typeof node.getTotalLength==='function'){
     const length=node.getTotalLength(),end=node.getPointAtLength(length),prior=node.getPointAtLength(Math.max(0,length-.01)),angle=Math.atan2(end.y-prior.y,end.x-prior.x);
     const k=marker.markerWidth.baseVal.value/marker.viewBox.baseVal.width*(marker.getAttribute('markerUnits')==='userSpaceOnUse'?1:parseFloat(style.strokeWidth));
     for(const path of marker.querySelectorAll('path')){
      const length=path.getTotalLength(),n=Math.max(3,Math.ceil(length)),points=[];
      for(let i=0;i<=n;i++){const q=path.getPointAtLength(length*i/n),x=(q.x-marker.refX.baseVal.value)*k,y=(q.y-marker.refY.baseVal.value)*k;points.push(map({x:end.x+x*Math.cos(angle)-y*Math.sin(angle),y:end.y+x*Math.sin(angle)+y*Math.cos(angle)}))}
      add(points,true,true,0);
     }
    }
   }
   if(parts.length)out.push({id:group.dataset.id,parts});
  }return out;
 }
 return {capture,matches,segment,contains};
})();
function cancelMarquee(){
 if(!boxSelect)return;
 const before=boxSelect.before;boxSelect=null;updateSelection(before.ids,before.primary);svg.querySelector('[data-marquee]')?.remove();
}
function paintMarquee(){
 svg.querySelector('[data-marquee]')?.remove();if(!boxSelect||!boxSelect.dragged)return;
 const {start:a,end:b}=boxSelect,crossing=b.x<a.x,color=crossing?'#16846a':'#286caa';
 el('rect',{'data-marquee':'true',x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(b.x-a.x),height:Math.abs(b.y-a.y),'data-selection-kind':crossing?'crossing':'window',fill:color, 'fill-opacity':0.08,stroke:color,'stroke-dasharray':crossing?'5 3':'none','pointer-events':'none'});
}
svg.addEventListener('pointerdown',e=>{
 if(!['select','erase'].includes(mode)||e.button!==0)return;
 const id=e.target.closest('[data-id]')?.dataset.id;
 // Erase on an object retains its immediate pointer-down deletion path.
 if(mode==='erase'&&id)return;
 cancelSelection=null;
 if(!id){
  e.stopImmediatePropagation();
  const before={ids:[...selectedObjectIds()],primary:selected},geometry=selectionGeometry.capture();
  boxSelect={start:rawPoint(e),end:rawPoint(e),screenStart:{x:e.clientX,y:e.clientY},before,geometry,toggle:e.ctrlKey,dragged:false};
  svg.setPointerCapture(e.pointerId);paintMarquee();return;
 }
 if(selectedObjectIds().size>1&&selectedObjectIds().has(id)){
  e.stopImmediatePropagation();groupDrag={start:items.some(o=>selectedObjectIds().has(o.id)&&o.type==='person')?rawPoint(e):point(e),freeMove:items.some(o=>selectedObjectIds().has(o.id)&&o.type==='person'),before:copy(items),ids:selectedObjectIds(),moved:false,...(e.pointerType==='mouse'?{clickId:id,screenStart:{x:e.clientX,y:e.clientY},thresholdPassed:false}:{})};svg.setPointerCapture(e.pointerId);return;
 }
 multiSelection.clear();
},true);
svg.addEventListener('pointermove',e=>{
 if(boxSelect){e.stopImmediatePropagation();boxSelect.end=rawPoint(e);boxSelect.dragged=Math.hypot(e.clientX-boxSelect.screenStart.x,e.clientY-boxSelect.screenStart.y)>=4;paintMarquee();return}
 if(!groupDrag)return;e.stopImmediatePropagation();
 if(groupDrag.screenStart&&!groupDrag.thresholdPassed){if(Math.hypot(e.clientX-groupDrag.screenStart.x,e.clientY-groupDrag.screenStart.y)<4)return;groupDrag.thresholdPassed=true}
 const p=groupDrag.freeMove?rawPoint(e):point(e),dx=p.x-groupDrag.start.x,dy=p.y-groupDrag.start.y;
 groupDrag.moved=groupDrag.moved||!!(dx||dy);
 for(const original of [...groupDrag.before,...(groupDrag.sectionAdded||[])]){if(!groupDrag.ids.has(original.id))continue;const o=items.find(o=>o.id===original.id);if(!o)continue;
 o.x=original.x+dx;o.y=original.y+dy;if(original.x2!==undefined){o.x2=original.x2+dx;o.y2=original.y2+dy}}
 render();
},true);
function finishMulti(e){
 if(e.type==='pointercancel'&&groupDrag?.before.some(o=>groupDrag.ids.has(o.id)&&drawingConnection(o))){e.stopImmediatePropagation();cancelConnectionDrag();render();return}
 if(e.type==='pointercancel'&&groupDrag?.sectionAdded){e.stopImmediatePropagation();items=groupDrag.before;groupDrag=null;multiSelection.clear();selected=null;render();return}
 if(boxSelect){
  e.stopImmediatePropagation();
  if(e.type==='pointercancel'){cancelMarquee();render();return}
  const state=boxSelect,a=state.start,b=rawPoint(e),r={left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)};
  const dragged=Math.hypot(e.clientX-state.screenStart.x,e.clientY-state.screenStart.y)>=4;
  const erase=mode==='erase',toggle=state.toggle&&!erase;
  const ids=new Set(dragged&&toggle?state.before.ids:[]);
  if(dragged)for(const entry of state.geometry)if(selectionGeometry.matches(entry.parts,r,b.x<a.x)){if(toggle&&ids.has(entry.id))ids.delete(entry.id);else ids.add(entry.id)}
  if(erase){
   boxSelect=null;
   if(ids.size){checkpoint();items=items.filter(o=>!ids.has(o.id))}
   updateSelection([]);render();return;
  }
  boxSelect=null;updateSelection(ids,state.before.primary);render();return;
 }
 if(groupDrag){e.stopImmediatePropagation();if(e.type==='pointerup'&&groupDrag.clickId&&!groupDrag.thresholdPassed)updateSelection([groupDrag.clickId],groupDrag.clickId);if(groupDrag.moved){past.push(groupDrag.before);future=[]}groupDrag=null;render()}
}
svg.addEventListener('pointerup',finishMulti,true);
svg.addEventListener('pointercancel',finishMulti,true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){extendBoundary=null;multiSelection.clear();boxSelect=null;groupDrag=null;render()}});
function setMode(m){clearSupportPlacement();if(m!=='select')rememberCancelSelection();else cancelSelection=null;cancelConnectionDrag();cancelRigidDrag();rigidPoints=[];if(typeof mirrorSelecting!=='undefined')mirrorSelecting=false;if(typeof cancelLoadPlacement==='function')cancelLoadPlacement();hatchPoints=[];extendBoundary=null;multiSelection.clear();mode=m;first=null;second=null;hover=null;for(const b of document.querySelectorAll('button[data-mode]')){const active=b.dataset.mode===m;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}if($('delete')){$('delete').classList.toggle('active',m==='erase');$('delete').setAttribute('aria-pressed',String(m==='erase'))}svg.classList.toggle('erase-cursor',m==='erase');svg.style.cursor='';$('help').textContent=m==='curve'?'Chọn điểm đầu, điểm đi qua, rồi điểm cuối.':m==='erase'?'Bấm trực tiếp vào đối tượng để xóa. Esc để thoát; Hoàn tác để khôi phục.':m==='hatch'?'Bấm các điểm bao vùng biểu đồ. Enter để hoàn tất; Esc để hủy.':m==='extend'?'Chọn đường biên, rồi bấm gần đầu nét cần kéo dài. Shift + bấm để đổi biên.':m==='dim'?'Chọn hai điểm trên thanh, sau đó bấm vị trí đặt đường kích thước.':m==='select'?'Bấm chọn hoặc kéo đối tượng.':['bar','udl','dim','thin','dashed'].includes(m)?'Bấm hai điểm để tạo đối tượng.':'';$('help').hidden=!$('help').textContent;render()}
for(const [m,title]of Object.entries(modes)){const b=document.createElement('button');b.textContent=title;b.dataset.mode=m;b.onclick=()=>chooseToolOptions(m);$('tools').append(b)}
function props(){return Object.fromEntries(['label','support','direction','rotation'].map(k=>[k,$(k).value]))}
function make(type,x,y,x2,y2,p={}){if(type==='person')return {id:newId(),type,x,y,angle:p.angle??0,size:p.size??PERSON_DEFAULT_SIZE};return {id:newId(),type,x,y,...(x2===undefined?{}:{x2,y2}),...props(),label:({force:'P',moment:'M',udl:'q',dim:'L',text:'A',diagramM:'kN.m',diagramQ:'kN',diagramN:'kN'})[type]||'',...p}}
function point(e,exclude=rigidDrag?.kind==='pivot'?null:(rigidDrag?.id||(drag?selected:null))){const p=rawPoint(e);
 const hit=geometricSnap(p,exclude);if(hit)return hit.point;
 // The visible canvas can extend beyond the original page after panning/zooming.
 const coordinate=value=>Math.max(-10000,Math.min(10000,value));
 return {x:coordinate(p.x),y:coordinate(p.y)};
}
function orthogonalPoint(anchor,p){
 return Math.abs(p.x-anchor.x)>=Math.abs(p.y-anchor.y)?{x:p.x,y:anchor.y}:{x:anchor.x,y:p.y};
}
function drawingPoint(e){
 const construction=constructionSnap(e);if(construction)return construction.point;
 const p=['moment','thin','dashed'].includes(mode)?(snapToBar(rawPoint(e))||point(e)):point(e);
 return e.shiftKey&&first&&['bar','thin','dashed','udl','linkBar'].includes(mode)?orthogonalPoint(first,p):p;
}
function extensionPoint(line,boundary,start){
 const ax=start?line.x2:line.x,ay=start?line.y2:line.y;
 const dx=(start?line.x:line.x2)-ax,dy=(start?line.y:line.y2)-ay;
 const ex=boundary.x2-boundary.x,ey=boundary.y2-boundary.y;
 const cross=dx*ey-dy*ex,scale=Math.hypot(dx,dy)*Math.hypot(ex,ey);
 if(!scale||Math.abs(cross)<scale*1e-9)return null;
 const rx=boundary.x-ax,ry=boundary.y-ay;
 const t=(rx*ey-ry*ex)/cross,u=(rx*dy-ry*dx)/cross;
 if(t<=1+1e-8||u< -1e-8||u>1+1e-8)return null;
 return {x:ax+t*dx,y:ay+t*dy};
}
// Shared click/tap/keyboard path: one solver, object creation and checkpoint.
function commitBarCandidate(candidate,anchor){
 if(mode!=='bar'||!first)return false;
 let p=candidate;
if(mode==='bar'&&first&&typeof barNumericSession!=='undefined'&&barNumericSession?.first===first){
 const state=barNumericSession.state;
 if(state.distance.mode==='locked'||state.angle.mode==='locked'){
  p=solveBarEndpoint({startPoint:first,candidatePoint:p,geometryScale,distanceMode:state.distance.mode,
   distanceValue:state.distance.value,angleMode:state.angle.mode,angleValue:state.angle.value});
  if(!p)return;
 }
}
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||(first.x===p.x&&first.y===p.y))return false;
 checkpoint();items.push(make('bar',first.x,first.y,p.x,p.y));
 if(typeof endBarNumericInput==='function')endBarNumericInput();
 first={...p};hover=null;
 if(typeof beginBarNumericInput==='function')beginBarNumericInput(anchor);
 selected=items.at(-1).id;render();msg('Đã thêm đối tượng.');return true;
}
// One event can visit capture, numeric confirmation and the canvas handler: consume it once.
const thinReferenceConsumedEvents=new WeakSet();
function consumeThinReferenceOverride(e){
 if(thinReferenceConsumedEvents.has(e))return true;
 if(!overrideThinReference(e))return false;
 thinReferenceConsumedEvents.add(e);
 e.preventDefault();e.stopImmediatePropagation();return true;
}
svg.addEventListener('pointerdown',consumeThinReferenceOverride,true);
// Shared thin-line commit: click/tap and keyboard retain one history/model path.
function commitThinCandidate(candidate,anchor){
 if(mode!=='thin'||!first)return false;
 updateThinReferenceSession(anchor);
 const referenceBar=getThinReferenceBar();
 let p=candidate,start=first;
 if(referenceBar){
  // Recompute from this commit's raw event; an active but ambiguous normal is not free drawing.
  const raw=anchor&&[anchor.clientX,anchor.clientY].every(Number.isFinite)?rawPoint(anchor):null;
  const geometry=getThinConstrainedGeometry(referenceBar,raw);
  if(!geometry)return false;
  start=geometry.drawStartPoint;p=geometry.endpoint;
  // Screen/model conversion can leave roundoff when the cursor lies exactly on the bar.
  if(Math.hypot(p.x-start.x,p.y-start.y)<=1e-9)return false;
 }else if(mode==='thin'&&first&&typeof thinNumericSession!=='undefined'&&thinNumericSession?.first===first&&thinNumericSession.valueMode==='locked'){
 p=solveThinEndpointFromValue({startPoint:first,candidatePoint:p,internalForceValue:thinNumericSession.value,internalForceScale});
 if(!p)return;
}

 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||(p.x===start.x&&p.y===start.y))return false;
 checkpoint();items.push(make('thin',start.x,start.y,p.x,p.y));
 if(typeof endThinNumericInput==='function')endThinNumericInput();
 first={...p};hover=null;
 beginThinReferenceSession();
 if(typeof beginThinNumericInput==='function')beginThinNumericInput(anchor);
 selected=items.at(-1).id;render();msg('Đã thêm đối tượng.');return true;
}
svg.onpointerdown=e=>{if(e.button!==0||mode==='labelEdit')return;
if(consumeThinReferenceOverride(e))return;
if(mode==='curve'){
 const p=snapToBar(rawPoint(e))||point(e);
 if(!first){first=p;render();msg('Chọn điểm thứ hai mà đường cong đi qua.');return}
 if(Math.hypot(p.x-first.x,p.y-first.y)<0.01){msg('Chọn ba điểm phân biệt.');return}
 if(!second){second=p;render();msg('Chọn điểm cuối của đường cong.');return}
 if(Math.hypot(p.x-second.x,p.y-second.y)<0.01){msg('Chọn ba điểm phân biệt.');return}
 const cross=(second.x-first.x)*(p.y-first.y)-(second.y-first.y)*(p.x-first.x);
 if(Math.abs(cross)<1e-6){msg('Ba điểm thẳng hàng; hãy chọn điểm cuối khác để tạo đường cong.');return}
 checkpoint();const o=make('curve',first.x,first.y,undefined,undefined,{curvePoints:[{x:second.x-first.x,y:second.y-first.y},{x:p.x-first.x,y:p.y-first.y}]});
 items.push(o);selected=o.id;first={...p};second=null;render();msg('Chọn điểm đi qua và điểm cuối để nối tiếp đường cong.');return;
}
if(mode==='erase'){
 const id=e.target.closest('[data-id]')?.dataset.id;
 if(id&&items.some(o=>o.id===id)){checkpoint();items=items.filter(o=>o.id!==id);selected=null;multiSelection.clear();render();}
 return;
}

if(mode==='hatch'){
 if($('hatchMethod').value==='closed'){
  const polygon=closedRegionAt(rawPoint(e));
  if(!polygon){msg('Không tìm thấy vùng kín. Kiểm tra các nét biên đã nối kín.');return}
  const origin=polygon[0];checkpoint();const o=make('hatch',origin.x,origin.y,undefined,undefined,{points:polygon.map(p=>({x:p.x-origin.x,y:p.y-origin.y})),spacing:Math.max(3,Math.min(50,Number($('hatchSpacing').value)||8))});
  items.push(o);selected=o.id;render();return;
 }
 const p=snapToBar(rawPoint(e))||point(e);hatchPoints.push(p);render();return;
}

if(mode==='extend'){
 const id=e.target.closest('[data-id]')?.dataset.id,o=items.find(o=>o.id===id);
 if(!o||!['bar','thin','dashed'].includes(o.type)){msg('Chọn thanh, nét liền hoặc nét đứt là đoạn thẳng.');return}
 if(!extendBoundary||e.shiftKey||!items.some(o=>o.id===extendBoundary)){
 extendBoundary=id;selected=id;render();msg('Đã chọn biên. Bấm gần đầu nét cần kéo dài.');return;
 }
 if(id===extendBoundary)return;
 const boundary=items.find(o=>o.id===extendBoundary),p=rawPoint(e);
 const endpoint=e.target.closest('[data-extend-end]')?.dataset.extendEnd;
 const start=endpoint?endpoint==='start':Math.hypot(p.x-o.x,p.y-o.y)<Math.hypot(p.x-o.x2,p.y-o.y2);
 const hit=extensionPoint(o,boundary,start);
 if(!hit){msg('Không có giao điểm phía kéo dài trên đoạn biên. Thử đầu kia hoặc đổi biên.');return}
 checkpoint();if(start){o.x=hit.x;o.y=hit.y}else{o.x2=hit.x;o.y2=hit.y}
 selected=extendBoundary;render();msg('Đã kéo dài tới biên. Có thể chọn tiếp nét khác.');return;
}

if(mode==='select'&&e.target.closest('text')){
 const id=e.target.closest('[data-id]')?.dataset.id;
 const o=items.find(o=>o.id===id);
 if(o){selected=id;Object.keys(props()).forEach(k=>$(k).value=o[k]);if(o.labelFormula){e.preventDefault();editLabel(o,e.target.closest('text'));return}render();return}
}
if(mode==='person'){
 const placement=personPlacementAt(e);clearPersonPreview();if(!placement)return;
 checkpoint();const o=make('person',placement.x,placement.y,undefined,undefined,{angle:placement.angle});items.push(o);selected=o.id;render();return;
}
if(mode==='support'){placeSupport(e);return}
let p=drawingPoint(e);
if(mode==='thin'&&first){commitThinCandidate(p,e);return}
if(mode==='bar'&&first){commitBarCandidate(p,e);return}
if(mode==='select'){selected=e.target.closest('[data-id]')?.dataset.id||null;const o=items.find(o=>o.id===selected);if(o){if(o.type!=='person')Object.keys(props()).forEach(k=>$(k).value=o[k]);drag={p:o.type==='person'||o.type==='rigidRegion'||drawingConnection(o)?rawPoint(e):p,o:copy(o),before:copy(items),moved:false,endpoint:e.target.closest('[data-endpoint]')?.dataset.endpoint,anchor:o.type!=='rigidRegion'&&!drawingConnection(o)&&!!e.target.closest('[data-move-anchor]')};svg.setPointerCapture(e.pointerId)}render();return}if(mode==='dim'){
 if(!second){const q=snapToBar(rawPoint(e))||point(e);if(!q){msg('Đưa chuột gần đầu thanh hoặc một điểm trên thanh.');return}
 if(!first){first=q;render();msg('Chọn điểm đo thứ hai trên thanh.');return}
 if(Math.hypot(q.x-first.x,q.y-first.y)<0.01)return;
 second=q;hover=q;render();msg('Di chuyển chuột và bấm để đặt đường kích thước.');return}
 checkpoint();items.push(make('dim',first.x,first.y,second.x,second.y,{offset:snapDimensionOffset(first,second,offsetAt(first,second,point(e)))}));
 first=null;second=null;hover=null;selected=items.at(-1).id;render();msg('Đã tạo kích thước.');return;
 }if(mode==='linkBar'){if(!first){first=p;render();return}if(Math.hypot(p.x-first.x,p.y-first.y)<1)return;const o=make('linkBar',first.x,first.y,p.x,p.y);try{validateConnection(o)}catch{return}checkpoint();items.push(o);first=null;hover=null;selected=o.id;render();return}if(['bar','udl','thin','dashed'].includes(mode)){if(!first){first=p;if(mode==='bar'&&typeof beginBarNumericInput==='function')beginBarNumericInput(e);if(mode==='thin'){beginThinReferenceSession();if(typeof beginThinNumericInput==='function')beginThinNumericInput(e)}render();msg('Bấm điểm thứ hai.');return}if(first.x===p.x&&first.y===p.y)return;checkpoint();items.push(make(mode,first.x,first.y,p.x,p.y));first={...p};hover=null}else{checkpoint();items.push(make(mode,p.x,p.y))}selected=items.at(-1).id;render();msg('Đã thêm đối tượng.');if(mode==='text'){e.preventDefault();editObjectLabel(items.at(-1))}};
svg.onpointermove=e=>{if(mode==='support'&&supportPlacementSession&&!drag){updateSupportOrientation(e);if(typeof updateSupportNumericInput==='function')updateSupportNumericInput(e);render();return}if(mode==='thin'&&!drag)updateThinReferenceSession(e);if(mode==='person'&&!drag){paintPersonPreview(e);return}if(!drag){if(first&&['bar','thin','dashed','udl','linkBar'].includes(mode)){hover=drawingPoint(e);render();return;}if(mode==='dim'||mode==='moment'){hover=second?point(e):(snapToBar(rawPoint(e))||point(e));render()}return;}const o=items.find(o=>o.id===selected);if(!o)return;
if(o.type==='person'){
 const p=rawPoint(e),x=drag.o.x+p.x-drag.p.x,y=drag.o.y+p.y-drag.p.y;
 try{validatePerson({...o,x,y})}catch{return}
 o.x=x;o.y=y;drag.moved=x!==drag.o.x||y!==drag.o.y;render();return;
}
if(drawingConnection(o)){
 const next=copy(drag.o),raw=rawPoint(e);
 if(drag.endpoint){const q=point(e,o.id),start=drag.endpoint==='start';next[start?'x':'x2']=q.x;next[start?'y':'y2']=q.y}
 else{let dx=raw.x-drag.p.x,dy=raw.y-drag.p.y;const sources=geometricPoints(drag.o).map(p=>({x:p.x+dx,y:p.y+dy})),hit=translationSnap(sources,o.id);if(hit){dx+=hit.point.x-hit.source.x;dy+=hit.point.y-hit.source.y}next.x+=dx;next.y+=dy;if(next.x2!==undefined){next.x2+=dx;next.y2+=dy}}
 try{validateConnection(next)}catch{return}Object.assign(o,next);drag.moved=JSON.stringify(next)!==JSON.stringify(drag.o);render();return;
}
if(o.type==='rigidRegion'){const p=rawPoint(e),next=translatedRigid(drag.o,{x:p.x-drag.p.x,y:p.y-drag.p.y});try{validateRigidRegion(next)}catch{rigidSnapHint=null;render();return}drag.moved=next.x!==drag.o.x||next.y!==drag.o.y;o.x=next.x;o.y=next.y;render();return;}
let p=(drag.anchor||drag.endpoint)?(snapToBar(rawPoint(e),o.id)||point(e)):point(e);
if(drag.endpoint){
 const start=drag.endpoint==='start',otherX=start?o.x2:o.x,otherY=start?o.y2:o.y;
 if(e.shiftKey&&['bar','thin','dashed','udl'].includes(o.type))p=orthogonalPoint({x:otherX,y:otherY},p);
 if(Math.hypot(p.x-otherX,p.y-otherY)<1)return;
 const keyX=start?'x':'x2',keyY=start?'y':'y2';
 drag.moved=drag.moved||o[keyX]!==p.x||o[keyY]!==p.y;
 o[keyX]=p.x;o[keyY]=p.y;render();return;
} 
const dx=p.x-(drag.anchor?(['bar','dim','udl','thin','dashed'].includes(o.type)?(drag.o.x+drag.o.x2)/2:drag.o.x):drag.p.x),dy=p.y-(drag.anchor?(['bar','dim','udl','thin','dashed'].includes(o.type)?(drag.o.y+drag.o.y2)/2:drag.o.y):drag.p.y);
drag.moved=drag.moved||!!(dx||dy);if(o.type==='dim'&&!drag.anchor){o.offset=snapDimensionOffset(drag.o,{x:drag.o.x2,y:drag.o.y2},(drag.o.offset??0)+offsetAt(drag.o,{x:drag.o.x2,y:drag.o.y2},{x:drag.o.x+dx,y:drag.o.y+dy}),o.id);render();return}o.x=drag.o.x+dx;o.y=drag.o.y+dy;if(o.x2!==undefined){o.x2=drag.o.x2+dx;o.y2=drag.o.y2+dy}render()};
svg.addEventListener('pointerleave',clearPersonPreview);
svg.addEventListener('pointercancel',clearPersonPreview);
svg.onpointerup=svg.onpointercancel=e=>{if(e.type==='pointercancel')cancelConcentratedLoadPlacement();if(e.type==='pointercancel')clearSupportPlacement();if(e.type==='pointercancel'&&drag?.o.type==='person'){items=drag.before;drag=null;render();return}if(e.type==='pointercancel'&&drawingConnection(drag?.o)){cancelConnectionDrag();render();return}const rigid=drag?.o.type==='rigidRegion';if(e.type==='pointercancel'&&rigid){cancelRigidDrag();render();return}rigidSnapHint=null;if(drag?.moved){past.push(drag.before);if(rigid&&past.length>100)past.shift();future=[]}drag=null;if(rigid)render()};
function lengthValue(label){
 const m=label.trim().match(/(?:^|=)\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|m)?\s*$/i);
 return m?{value:Number(m[1].replace(',','.')),unit:(m[2]||'').toLowerCase()}:null;
}
function onMember(p,b){
 const dx=b.x2-b.x,dy=b.y2-b.y,l=dx*dx+dy*dy;if(!l)return false;
 const t=((p.x-b.x)*dx+(p.y-b.y)*dy)/l;
 return t>=-0.00001&&t<=1.00001&&Math.hypot(p.x-b.x-t*dx,p.y-b.y-t*dy)<1;
}
function resizeFromLabel(o,label){
 if(o.type!=='dim')return;
 const before=lengthValue(o.label),after=lengthValue(label);
 if(!before||!after||before.unit!==after.unit||before.value<=0||after.value<=0)return;
 const ratio=after.value/before.value;if(ratio===1)return;
 const dx=o.x2-o.x,dy=o.y2-o.y,len=Math.hypot(dx,dy);if(len<1)return;
 const origin={x:o.x,y:o.y},ux=dx/len,uy=dy/len;
 const bars=items.filter(e=>e.type==='bar').map(copy),connected=[];
 const endpoints=b=>[{x:b.x,y:b.y},{x:b.x2,y:b.y2}];
 for(const b of bars)if(onMember(origin,b)||onMember({x:o.x2,y:o.y2},b))connected.push(b);
 let changed=true;
 while(changed){changed=false;for(const b of bars){if(connected.includes(b))continue;
 if(connected.some(c=>endpoints(b).some(p=>onMember(p,c))||endpoints(c).some(p=>onMember(p,b)))){connected.push(b);changed=true}}}
 const attached=p=>connected.some(b=>onMember(p,b));
 const transform=p=>{const t=(p.x-origin.x)*ux+(p.y-origin.y)*uy;
 const shift=Math.max(0,Math.min(len,t))*(ratio-1);
 return {x:p.x+ux*shift,y:p.y+uy*shift};};
 for(const e of items){
  const p={x:e.x,y:e.y},q=e.x2===undefined?null:{x:e.x2,y:e.y2};
  const moveP=e===o||attached(p),moveQ=q&&(e===o||attached(q));
  if(moveP)Object.assign(e,transform(p));
  if(moveQ){const r=transform(q);e.x2=r.x;e.y2=r.y;}
 }
}
for(const key of ['support','direction','rotation'])$(key).onchange=()=>{
 const o=items.find(o=>o.id===selected);if(!o)return;
 const relevant=key==='support'?o.type==='support':key==='rotation'?o.type==='moment':['support','force','udl'].includes(o.type);
 if(!relevant||o[key]===$(key).value)return;
 checkpoint();o[key]=$(key).value;render();
};
function template(t){checkpoint();items=[];restoreDrawingScales();const add=(...a)=>items.push(make(...a));if(t==='frame'){add('bar',280,500,280,260);add('bar',280,260,760,260);add('bar',760,260,760,500);add('support',280,500,undefined,undefined,{support:'pin',direction:'down'});add('support',760,500,undefined,undefined,{support:'roller',direction:'down'});add('udl',280,260,760,260,{label:'q = 10 kN/m',direction:'down'});add('dim',280,500,760,500,{label:'L = 6 m',offset:100})}else{add('bar',220,340,880,340);add('support',220,340,undefined,undefined,{support:'pin',direction:'down'});add('support',t==='gerber'?660:880,340,undefined,undefined,{support:'roller',direction:'down'});if(t==='gerber'){add('bar',880,340,1000,340);add('hinge',800,340);add('support',1000,340,undefined,undefined,{support:'roller',direction:'down'})}add('force',540,340,undefined,undefined,{label:'P = 20 kN',direction:'down'});add('udl',240,340,440,340,{label:'q = 10 kN/m',direction:'down'});add('dim',220,340,880,340,{label:'L = 6 m',offset:120})}selected=null;setMode('select')}
for(const b of document.querySelectorAll('[data-template]'))b.onclick=()=>template(b.dataset.template);
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),5000)}
function exportSVG(){render(true);try{const out=svg.cloneNode(true);out.setAttribute('viewBox','0 0 1100 720');out.setAttribute('width','1100');out.setAttribute('height','720');return new XMLSerializer().serializeToString(out)}finally{render()}}
const actions={undo:['↶ Hoàn tác',()=>{cancelConcentratedLoadPlacement();clearSupportPlacement();endThinReferenceSession();clearPersonPreview();if(typeof finishObjectColorEdit==='function')finishObjectColorEdit();if(!past.length)return;future.push(copy(items));items=past.pop();selected=null;first=null;second=null;hover=null;render()}],redo:['↷ Làm lại',()=>{cancelConcentratedLoadPlacement();clearSupportPlacement();endThinReferenceSession();clearPersonPreview();if(typeof finishObjectColorEdit==='function')finishObjectColorEdit();if(!future.length)return;past.push(copy(items));items=future.pop();selected=null;first=null;second=null;hover=null;render()}],delete:['Tẩy',()=>{selected=null;setMode(mode==='erase'?'select':'erase')}],clear:['Bản vẽ trống',()=>{clearSupportPlacement();checkpoint();items=[];restoreDrawingScales();selected=null;first=null;second=null;hover=null;render()}],save:['Lưu JSON',()=>download(new Blob([JSON.stringify({format:'ket-cau-studio',version:1,items,geometryScale,internalForceScale},null,2)],{type:'application/json'}),'ket-cau.json')],open:['Mở JSON',()=>$('file').click()],svg:['Xuất SVG',()=>download(new Blob([exportSVG()],{type:'image/svg+xml;charset=utf-8'}),'ket-cau.svg')],png:['Xuất PNG',()=>{const u=URL.createObjectURL(new Blob([exportSVG()],{type:'image/svg+xml;charset=utf-8'})),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=3300;c.height=2160;c.getContext('2d').drawImage(im,0,0,3300,2160);URL.revokeObjectURL(u);c.toBlob(b=>b?download(b,'ket-cau.png'):msg('Không xuất được PNG.'))};im.onerror=()=>{URL.revokeObjectURL(u);msg('Không xuất được PNG. Hãy thử SVG.')};im.src=u}]};
for(const [id,[title,fn]]of Object.entries(actions)){const b=document.createElement('button');b.id=id;b.textContent=title;b.onclick=fn;$('actions').append(b)}
function validate(d){if(!d||d.format!=='ket-cau-studio'||d.version!==1||!Array.isArray(d.items)||d.items.length>2000)throw Error('Sai định dạng.');const ids=new Set();for(const o of d.items){if(!o||(!Object.hasOwn(modes,o.type)&&o.type!=='person')||['select','extend'].includes(o.type)||typeof o.id!=='string'||ids.has(o.id))throw Error('Đối tượng không hợp lệ.');ids.add(o.id);if(o.type==='person'){validatePerson(o);continue}if(o.sectionVisible!==undefined&&(typeof o.sectionVisible!=='boolean'||!sectionForceAction(o)))throw Error('Invalid section visibility');if(drawingConnection(o))validateConnection(o);if(o.strokeColor!==undefined&&!validObjectColor(o.strokeColor))throw Error('Invalid object strokeColor');if(o.type==='rigidRegion')validateRigidRegion(o);if(o.loadAngle!==undefined&&(!Number.isFinite(o.loadAngle)||Math.abs(o.loadAngle)>360))throw Error('Invalid load angle');if(o.labelFormula!==undefined&&(typeof o.labelFormula!=='string'||o.labelFormula.length>500||!['deg','rad'].includes(o.labelAngle)))throw Error('Invalid label expression');if(o.type==='curve'&&(!Array.isArray(o.curvePoints)||o.curvePoints.length!==2||o.curvePoints.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>10000||Math.abs(p.y)>10000)))throw Error('Đường cong không hợp lệ.');if(o.type==='hatch'&&(!Array.isArray(o.points)||o.points.length<3||o.points.length>1000||o.points.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>10000||Math.abs(p.y)>10000)||!Number.isFinite(o.spacing)||o.spacing<3||o.spacing>50))throw Error('Invalid hatch');if(o.offset!==undefined&&(!Number.isFinite(o.offset)||Math.abs(o.offset)>10000))throw Error('Khoảng cách đường kích thước không hợp lệ.');for(const k of ['x','y',...(['bar','udl','dim','thin','dashed'].includes(o.type)?['x2','y2']:[])])if(!Number.isFinite(o[k])||Math.abs(o[k])>10000)throw Error('Tọa độ không hợp lệ.');if(typeof o.label!=='string'||o.label.length>100||!['pin','roller','fixed','pin-plain','roller-plain'].includes(o.support)||!['down','up','left','right'].includes(o.direction)||!['cw','ccw'].includes(o.rotation))throw Error('Thuộc tính không hợp lệ.')}return d.items}
$('file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>2000000)throw Error('Tệp quá lớn.');const data=JSON.parse(await f.text()),next=validate(data);checkpoint();items=next;restoreDrawingScales(data);selected=null;first=null;second=null;hover=null;render();msg('Đã mở bản vẽ.')}catch(err){msg('Không mở được: '+err.message)}e.target.value=''};
let wordBridgeToken=null;
const wordButton=document.createElement('button');wordButton.hidden=true;wordButton.textContent='Chèn vào Word';$('actions').append(wordButton);
wordButton.onclick=async()=>{
 if(!items.length){msg('Bản vẽ trống.');return}
 const token=wordBridgeToken;
 if(!token||location.hostname!=='localhost'){msg('Hãy mở Mo-ung-dung-Word.cmd trong thư mục ứng dụng để kết nối Word.');return}
 wordButton.disabled=true;
 try{
  render(true);
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const g of svg.querySelectorAll('[data-id]')){const b=g.getBBox();left=Math.min(left,b.x);top=Math.min(top,b.y);right=Math.max(right,b.x+b.width);bottom=Math.max(bottom,b.y+b.height)}
  const out=svg.cloneNode(true),w=Math.max(1,right-left+40),h=Math.max(1,bottom-top+40);
  out.setAttribute('viewBox',`${left-20} ${top-20} ${w} ${h}`);out.setAttribute('width',w);out.setAttribute('height',h);out.setAttribute('preserveAspectRatio','xMidYMid meet');out.removeAttribute('style');render();
  const widthPt=Math.min(340,480*w/h),heightPt=widthPt*h/w;
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(out));
  await image.decode();
  const canvas=document.createElement('canvas');canvas.width=Math.ceil(widthPt/72*600);canvas.height=Math.ceil(heightPt/72*600);
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  const scale=Math.min(canvas.width/w,canvas.height/h);ctx.drawImage(image,0,0,w*scale,h*scale);
  const response=await fetch('/insert-word',{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Token':token},body:JSON.stringify({png:canvas.toDataURL('image/png').split(',')[1]})});
  const result=await response.json();if(!response.ok)throw Error(result.error);
  msg('Đã chèn hình vào Word.');
 }catch(err){render();msg('Không chèn được. Mở Word, đặt con trỏ trong tài liệu và thử lại. '+err.message)}
 finally{wordButton.disabled=false}
};
let inlineEditor=null;
function editLabel(o,target){
 if(inlineEditor)inlineEditor.finish(true);
 const box=target.getBoundingClientRect(),input=document.createElement('input');
 input.type='text';input.value=o.labelFormula?.endsWith('-->')?o.label:o.labelFormula?(/^(giai|solve)\(/i.test(o.labelFormula)?o.labelFormula+' ⇒ '+o.label:o.labelFormula+' = '+o.label.replace(/^[^=]*=\s*/, '')): o.label;input.maxLength=600;input.title='Nhập biểu thức rồi nhấn = để tính. Nhãn chữ hỗ trợ M_A, m^2.';
 input.setAttribute('aria-label','Sửa nhãn trên hình');
 input.style.cssText=`position:fixed;left:${Math.max(4,Math.min(box.left,window.innerWidth-244))}px;top:${Math.max(4,box.top-5)}px;width:${Math.min(320,Math.max(180,box.width+40))}px;z-index:1000;margin:0;border:2px solid #087d95;background:white;font:20px 'Times New Roman',serif;box-shadow:0 3px 15px #0003`;
 document.body.append(input);
 const fullLabel=document.createElement('div');
 fullLabel.setAttribute('data-label-expression','true');
 fullLabel.style.cssText='position:fixed;z-index:1001;padding:8px 10px;background:#edf5f6;border:1px solid #b9d5da;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere;font:16px system-ui;max-height:30vh;overflow:auto;pointer-events:none';
 document.body.append(fullLabel);
 let finished=false,calculation=null,liveCalculation=null,positionFrame=0,lastTargetRect=box;
 const editorViewport=window.visualViewport;
 function positionInlineEditor(){
  if(finished||!input.isConnected)return;
  const vv=window.visualViewport,valid=vv&&[vv.width,vv.height,vv.offsetLeft,vv.offsetTop].every(Number.isFinite)&&vv.width>0&&vv.height>0;
  const left=valid?vv.offsetLeft:0,top=valid?vv.offsetTop:0,width=valid?vv.width:window.innerWidth,height=valid?vv.height:window.innerHeight;
  if(target.isConnected){const r=target.getBoundingClientRect();if([r.left,r.top,r.width,r.height].every(Number.isFinite)&&(r.width>0||r.height>0))lastTargetRect=r}
  const marginX=Math.min(8,width/4),marginY=Math.min(8,height/4),availableWidth=Math.max(1,width-2*marginX);
  const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
  input.style.boxSizing='border-box';input.style.minWidth='0';
  input.style.width=Math.min(availableWidth,Math.max(280,input.value.length*11+30))+'px';
  const inputHeight=input.getBoundingClientRect().height;
  // Sacrifice margins before input visibility on a viewport smaller than the normal control.
  const verticalMargin=height>=inputHeight+2*marginY?marginY:0;
  input.style.left=clamp(lastTargetRect.left,left+marginX,left+width-marginX-input.getBoundingClientRect().width)+'px';
  input.style.top=clamp(lastTargetRect.top-5,top+verticalMargin,top+height-verticalMargin-inputHeight)+'px';
  const rect=input.getBoundingClientRect();
  fullLabel.style.boxSizing='border-box';fullLabel.style.minHeight='0';
  fullLabel.style.left=rect.left+'px';fullLabel.style.width=rect.width+'px';
  fullLabel.style.maxHeight=Math.max(0,height*.3)+'px';
  const desired=fullLabel.getBoundingClientRect().height;
  const below=Math.max(0,top+height-marginY-rect.bottom-5),above=Math.max(0,rect.top-top-marginY-5);
  const useAbove=desired>below&&above>below,space=useAbove?above:below;
  fullLabel.style.maxHeight=Math.min(height*.3,space)+'px';
  // Padding/borders can exceed max-height in a nearly closed viewport; clip the preview, not the input.
  fullLabel.style.clipPath=space<fullLabel.getBoundingClientRect().height?`inset(0 0 ${fullLabel.getBoundingClientRect().height-space}px 0)`:'none';
  const previewHeight=Math.min(space,fullLabel.getBoundingClientRect().height);
  fullLabel.style.top=(useAbove?rect.top-5-previewHeight:rect.bottom+5)+'px';
 }
 const scheduleEditorPosition=()=>{if(!finished&&!positionFrame)positionFrame=requestAnimationFrame(()=>{positionFrame=0;positionInlineEditor()})};
 window.addEventListener('resize',scheduleEditorPosition);
 editorViewport?.addEventListener('resize',scheduleEditorPosition);
 editorViewport?.addEventListener('scroll',scheduleEditorPosition);
 const showFullLabel=()=>{
  fullLabel.textContent=input.value.replace(/\s*-->\s*/g,' ⇒ ');fullLabel.hidden=!o.labelFormula&&!input.value.includes('=');
  positionInlineEditor();
 };
 const evaluateInput=()=>{
  if(engineeringValueLabel(input.value))throw Error('Nhãn giá trị');
  if(/(?:\\[A-Za-z]+|[∑∏∫])/.test(input.value))throw Error('Công thức trình bày');
  const direct=directEquation(input.value.trim());
  if(direct){
   const result=previewDependentEquation(direct+'-->',items,o.id).replace(/\s*=\s*/g,'=');
   const value=direct+'-->'+result;if(value.length>100)throw Error('Nhãn tối đa 100 ký tự.');
   return {expression:direct+'-->',angle:'deg',value,result,full:true};
  }
  if(input.value.includes('-->')){
   const equation=input.value.split('-->')[0].trim(),result=previewDependentEquation(equation+'-->',items,o.id).replace(/\s*=\s*/g,'=');
   const value=equation+'-->'+result;if(value.length>100)throw Error('Nhãn tối đa 100 ký tự.');
   return {expression:equation+'-->',angle:'deg',value,result,full:true};
  }
  const equation=input.value.trim().split(' ⇒ ')[0];
  if(/^(giai|solve)\(/i.test(equation)){
   const result=previewDependentEquation(equation,items,o.id);if(result.length>100)throw Error('Kết quả quá dài cho nhãn (100 ký tự).');
   return {expression:equation,angle:'deg',value:result,result};
  }
  const expression=input.value.trim(),prefix=expression.match(/^([A-Za-z_{}\s]+)=\s*/);
  const math=(prefix?expression.slice(prefix[0].length):expression).split('=')[0].trim();
  const angle=o.labelAngle||$('calcAngle')?.value||'deg';
  const result=String(Number(calculateExpression(math,angle).toPrecision(12)));
  const lead=prefix?prefix[1].trim()+' = ':'';
  return {expression:lead+math,angle,value:lead+result,result};
 };
 input.addEventListener('input',()=>{
  liveCalculation=null;showFullLabel();
  if(engineeringValueLabel(input.value))return;
  if(/(?:\\[A-Za-z]+|[∑∏∫])/.test(input.value)){
   fullLabel.hidden=false;fullLabel.replaceChildren();
   try{const layout=equationLayout(input.value),preview=document.createElementNS(NS,'svg');preview.setAttribute('viewBox',`0 0 ${layout.w+20} ${layout.h+layout.d+20}`);preview.style.cssText='width:100%;max-height:160px;border:0';fullLabel.append(preview);layout.draw(preview,10,layout.h+10)}catch(error){fullLabel.textContent=error.message}
   positionInlineEditor();return;
  }
  try{
   if(o.labelFormula||/[=+*/^()]|\d\s*-\s*\d/.test(input.value)){
    liveCalculation=evaluateInput();
    fullLabel.hidden=false;fullLabel.textContent=liveCalculation.full?liveCalculation.value.replace(/\s*-->\s*/g,' ⇒ '):liveCalculation.expression+(/^(giai|solve)\(/i.test(liveCalculation.expression)?' ⇒ ':' = ')+liveCalculation.result;
   }
  }catch{fullLabel.hidden=false;fullLabel.textContent=input.value+' — Chưa tính được biểu thức';}
  positionInlineEditor();
 });showFullLabel();
 const initialValue=input.value;
 const finish=save=>{
  if(save&&!calculation&&directEquation(input.value.trim())){try{liveCalculation=evaluateInput()}catch(error){msg(error.message);return}}
  if(save&&(/^(giai|solve)\(/i.test(input.value.trim())||input.value.includes('-->'))&&input.value!==initialValue&&!liveCalculation&&!calculation){msg('Phương trình chưa hợp lệ. Sửa lại hoặc nhấn Esc để hủy.');input.focus();return}
  if(finished)return;finished=true;
  window.removeEventListener('resize',scheduleEditorPosition);
  editorViewport?.removeEventListener('resize',scheduleEditorPosition);
  editorViewport?.removeEventListener('scroll',scheduleEditorPosition);
  if(positionFrame)cancelAnimationFrame(positionFrame);positionFrame=0;
  let value=input.value.trim();
  if(save&&liveCalculation&&!calculation){calculation=liveCalculation;value=liveCalculation.value}
  input.remove();fullLabel.remove();inlineEditor=null;
  if(save&&(value!==initialValue||calculation)){
   if(value.length>100&&!calculation){msg('Nhãn tối đa 100 ký tự. Hãy tính biểu thức trước.');return}
   checkpoint();
   if(calculation){o.labelFormula=calculation.expression;o.labelAngle=calculation.angle}
   else{delete o.labelFormula;delete o.labelAngle;resizeFromLabel(o,value)}
   o.label=value;selected=o.id;$('label').value=value;render();
  }
 };
 inlineEditor={finish};
 input.addEventListener('keydown',e=>{
  if(e.key===' '&&!e.isComposing){
   const start=input.selectionStart,end=input.selectionEnd,before=input.value.slice(0,start);
   const command=before.match(/\\(sum|prod|int)$/);
   if(command&&start===end){
    e.preventDefault();e.stopImmediatePropagation();
    const symbol={sum:'∑',prod:'∏',int:'∫'}[command[1]],at=start-command[0].length;
    input.setRangeText(symbol+'{□}',at,end,'end');input.setSelectionRange(at+2,at+3);
    input.dispatchEvent(new Event('input',{bubbles:true}));return;
   }
  }
  if(e.key!=='='||e.isComposing)return;
  if(/(?:\\[A-Za-z]+|[∑∏∫])/.test(input.value))return;
  if(/^(giai|solve)\(/i.test(input.value.trim())){
   const source=input.value.trim().split(' ⇒ ')[0];
   if(!source.endsWith(')')||[...source].reduce((n,c)=>n+(c==='('?1:c===')'?-1:0),0)!==0)return;
   e.preventDefault();e.stopImmediatePropagation();
   try{calculation=evaluateInput();input.value=calculation.value;finish(true)}catch(error){msg(error.message)}return;
  }
  let expression=input.value.trim();
  if(expression.includes('-->'))return;
  if(!expression.includes('=')&&/[A-Za-z]/.test(expression.replace(/\b(sin|cos|tan|sqrt|abs|log|ln|exp|pi|e)\b/gi,'')))return;
  // Allow typing the first '=' in a conventional label such as P = ... .
  if(/^[A-Za-z_{}\s]+$/.test(expression)&&!['pi','e'].includes(expression))return;
  e.preventDefault();e.stopImmediatePropagation();
  try{
   if(typeof calculateExpression!=='function')throw Error('Hãy cập nhật ứng dụng để tải công cụ tính.');
   if(o.labelFormula&&expression===initialValue)expression=o.labelFormula;
   const prefix=expression.match(/^([A-Za-z_{}\s]+)=\s*/);
   let math=prefix?expression.slice(prefix[0].length):expression;
   math=math.split('=')[0].trim();
   const angle=o.labelAngle||$('calcAngle')?.value||'deg';
   const result=String(Number(calculateExpression(math,angle).toPrecision(12)));
   calculation={expression:(prefix?prefix[1].trim()+' = ':'')+math,angle};
   input.value=(prefix?prefix[1].trim()+' = ':'')+result;finish(true);
  }catch(error){msg('Không tính được: '+error.message);input.focus()}
 },true);
 input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true)}if(e.key==='Escape'){e.preventDefault();finish(false);if(mode==='labelEdit')setMode('select')}};
 input.onblur=()=>finish(true);input.focus();input.select();scheduleEditorPosition();
}
svg.addEventListener('dblclick',e=>{if(mode==='erase')return;
 const text=e.target.closest('text');if(!text)return;
 const id=text.closest('[data-id]')?.dataset.id;
 const o=items.find(o=>o.id===id);if(!o||!['force','moment','udl','dim','text','diagramM','diagramQ','diagramN'].includes(o.type))return;
 e.preventDefault();drag=null;editLabel(o,text);
});
document.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.detail!==2||mode!=='select'||!e.target.closest('[data-equation]'))return;
 const o=items.find(o=>o.id===e.target.closest('[data-id]')?.dataset.id);if(!o)return;
 e.preventDefault();e.stopImmediatePropagation();drag=null;editLabel(o,e.target.closest('[data-equation]'));
},true);
const hatchPanel=document.createElement('div');
hatchPanel.innerHTML='<label>Cách tạo hatch<select id="hatchMethod"><option value="closed">Chọn vùng hatch</option><option value="points">Chọn các điểm biên</option></select></label><label>Bước hatch (px)<input id="hatchSpacing" type="number" min="3" max="50" value="8"></label>';
$('tools').after(hatchPanel);
for(const key of ['hatchSpacing'])$(key).onchange=()=>{
 const spacing=Number($('hatchSpacing').value);if(!Number.isFinite(spacing)||spacing<3||spacing>50){$('hatchSpacing').value=8;return}
 const o=items.find(o=>o.id===selected);if(o?.type==='hatch'){checkpoint();o.spacing=spacing;render()}
};
document.addEventListener('keydown',e=>{
 if(mode!=='hatch'||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
 if(e.key==='Escape'){hatchPoints=[];render()}
 if(e.key==='Enter'){
  e.preventDefault();if(hatchPoints.length<3){msg('Chọn ít nhất 3 điểm.');return}
  const origin=hatchPoints[0];const spacing=Math.max(3,Math.min(50,Number($('hatchSpacing').value)||8));
  checkpoint();const o=make('hatch',origin.x,origin.y,undefined,undefined,{points:hatchPoints.map(p=>({x:p.x-origin.x,y:p.y-origin.y})),spacing});
  items.push(o);hatchPoints=[];setMode('select');selected=o.id;render();
 }
});
document.addEventListener('keydown',e=>{
 const arrows={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
 if(!arrows[e.key]||e.ctrlKey||e.metaKey||e.altKey||mode!=='select')return;
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable)return;
 const ids=new Set(multiSelection);if(selected)ids.add(selected);
 const chosen=items.filter(o=>ids.has(o.id));if(!chosen.length)return;
 e.preventDefault();
 const step=(e.shiftKey?5:1),[vx,vy]=arrows[e.key];
 checkpoint();for(const o of chosen){o.x+=vx*step;o.y+=vy*step;if(o.x2!==undefined){o.x2+=vx*step;o.y2+=vy*step}}
 render();
});
window.onkeydown=e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='Escape'){if(mode==='erase')setMode('select');first=null;second=null;hover=null;selected=null;render()}if(e.key==='Delete'){const ids=new Set(multiSelection);if(selected)ids.add(selected);if(ids.size){checkpoint();items=items.filter(o=>!ids.has(o.id));selected=null;multiSelection.clear();render()}}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();actions[e.shiftKey?'redo':'undo'][1]()}};
window.onbeforeunload=e=>{if(inlineEditor)inlineEditor.finish(true);saveDraft();if(autosaveFailed){e.preventDefault();e.returnValue=''}};
window.addEventListener('pagehide',saveDraft);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraft()});
template('beam');past=[];
try{
 const raw=localStorage.getItem(draftKey);
 if(raw){const draft=JSON.parse(raw);const restored=validate(draft);
 items=restored;restoreDrawingScales(draft);
 selected=null;first=null;second=null;hover=null;render();
 msg('Đã khôi phục bản vẽ gần nhất.');
 }else msg('Bản vẽ sẽ tự lưu khi chỉnh sửa.');
}catch{msg('Không khôi phục được bản vẽ gần nhất. Có thể mở lại tệp JSON.');}
autosaveReady=true;




const toolDefaultsKey='ket-cau-studio-tool-defaults-v1';
let toolDefaults={};
try{toolDefaults=JSON.parse(localStorage.getItem(toolDefaultsKey)||'{}')||{}}catch{}
const toolOptionFields={hatch:['hatchMethod','hatchSpacing'],support:['support','direction'],force:['direction'],udl:['direction'],moment:['rotation']};
const secondaryTools=document.createElement('div');secondaryTools.id='secondaryTools';secondaryTools.hidden=true;
secondaryTools.style.cssText='position:fixed;z-index:2000;width:max-content;max-width:calc(100vw - 16px);padding:8px;background:white;border:1px solid #b8ced8;border-radius:12px;box-shadow:0 6px 24px #17364d40;display:flex;gap:6px;flex-direction:column;max-height:calc(100dvh - 16px);overflow:auto';
document.body.append(secondaryTools);
secondaryTools.setAttribute('role','toolbar');
secondaryTools.setAttribute('aria-label','Tool options');
for(const key of ['support','direction','rotation'])$(key).parentElement.hidden=true;
hatchPanel.hidden=true;
function rememberToolOption(m,key,value){
 toolDefaults[m]??={};toolDefaults[m][key]=value;$(key).value=value;
 try{localStorage.setItem(toolDefaultsKey,JSON.stringify(toolDefaults))}catch{}
 if(m==='hatch')$('help').textContent=$('hatchMethod').value==='closed'?'B\u1ea5m trong v\u00f9ng k\u00edn \u0111\u1ec3 t\u1ea1o hatch.':'B\u1ea5m c\u00e1c \u0111i\u1ec3m bi\u00ean, Enter \u0111\u1ec3 ho\u00e0n t\u1ea5t.';
}
function secondaryIcon(key,value,tool){
 let body='';
 if(key==='direction'){
  const angle={up:0,right:90,down:180,left:270}[value];
  body=tool==='udl'?`<g transform="rotate(${angle} 20 20)"><path d="M6 33H34M8 33V7M4 12L8 7L12 12M20 33V7M16 12L20 7L24 12M32 33V7M28 12L32 7L36 12"/></g>`:`<g transform="rotate(${angle} 20 20)"><path d="M20 33V7M12 15L20 7L28 15"/></g>`;
 }else if(key==='rotation'){
  body=`<g transform="${value==='ccw'?'translate(40 0) scale(-1 1)':''}"><path d="M11 30A14 14 0 1 1 32 12M25 12H33V4"/></g>`;
 }else if(key==='hatchMethod'){
  body='<path d="M7 8H33V32H7Z M12 10V30 M18 10V30 M24 10V30 M30 10V30"/>';
  body+=value==='closed'?'<circle cx="20" cy="20" r="5" fill="white"/><path d="M20 16V24M16 20H24"/>':'<g fill="white"><rect x="4" y="5" width="6" height="6"/><rect x="30" y="5" width="6" height="6"/><rect x="4" y="29" width="6" height="6"/><rect x="30" y="29" width="6" height="6"/></g>';
 }else if(key==='sectionMethod'){
  body=value==='open'?'<path d="M4 12H36M4 28H36"/><path d="M25 3L15 37" stroke-dasharray="5 3"/><path d="M20 4H26L28 9M12 31L14 36H20"/>':'<path d="M3 14H37M3 27H37"/><path d="M10 5H30V35H10Z" stroke-dasharray="5 3"/><path d="M15 20H25M21 16L25 20L21 24"/>';
 }else if(key==='support'){
  if(value==='fixed')body='<path d="M6 17H34M10 17L5 29M18 17L13 29M26 17L21 29M34 17L29 29M20 4V17"/>';
  else if(value==='roller')body='<circle cx="20" cy="9" r="5"/><path d="M20 14V19"/><circle cx="20" cy="24" r="5"/><path d="M5 29H35M10 29L7 36M18 29L15 36M26 29L23 36M34 29L31 36"/>';
  else body='<circle cx="20" cy="9" r="5"/><path d="M17 13L8 29H32L23 13M5 29H35M10 29L7 36M18 29L15 36M26 29L23 36M34 29L31 36"/>';
 }else body='<path d="M10 6V34M30 6V34M10 20H30M15 16L10 20L15 24M25 16L30 20L25 24"/>';
 return `<svg aria-hidden="true" viewBox="0 0 40 40" style="width:32px;height:32px;border:0;background:none;pointer-events:none" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}
function chooseToolOptions(m){rememberCancelSelection();if(m==='rigidRegion'){openRigidOptions();return}if(['force','moment','udl'].includes(m)){selected=null;closeSecondaryTools();setMode(m);msg('Ch\u1ecdn \u0111i\u1ec3m \u0111\u1eb7t, r\u1ed3i r\u00ea chu\u1ed9t ch\u1ecdn h\u01b0\u1edbng. Shift: ngang/d\u1ecdc.');return}
 if(mode==='select'&&['bar','thin','dashed'].includes(m)&&typeof selectedLines==='function'){
  const lines=selectedLines();
  if(lines.length){
   const changed=lines.filter(o=>o.type!==m);
   if(changed.length){checkpoint();for(const o of changed)o.type=m}
   closeSecondaryTools();render();msg('Đã đổi nét cho '+lines.length+' đối tượng.');return;
  }
 }
 selected=null;setMode(m);secondaryTools.replaceChildren();secondaryTools.hidden=!toolOptionFields[m];
 for(const button of $('tools').querySelectorAll('[data-mode]'))button.setAttribute('aria-expanded',String(button.dataset.mode===m&&!!toolOptionFields[m]));
 if(!toolOptionFields[m])return;
 secondaryTools.classList.toggle('section-flyout',m==='section');
 if(m!=='section'){const heading=document.createElement('strong');heading.textContent=modes[m];secondaryTools.append(heading);}
 const main=$('tools').querySelector(`[data-mode="${m}"]`);secondaryTools.dataset.anchorMode=m;
 for(const key of toolOptionFields[m]){
  const source=$(key),saved=toolDefaults[m]?.[key];
  if(saved!==undefined){if(source.tagName==='SELECT'){if([...source.options].some(o=>o.value===saved))source.value=saved}else if(Number(saved)>=Number(source.min)&&Number(saved)<=Number(source.max))source.value=saved}
  const group=document.createElement('div');group.style.cssText='display:flex;gap:4px;flex-wrap:wrap;width:100%';secondaryTools.append(group);
  if(source.tagName==='SELECT'){
   for(const option of source.options){
    const button=document.createElement('button');button.type='button';button.dataset.optionKey=key;button.dataset.optionValue=option.value;
    button.innerHTML=secondaryIcon(key,option.value,m);
    button.title=option.textContent;button.setAttribute('aria-label',option.textContent);
    button.style.cssText='width:48px;height:48px;padding:6px;display:grid;place-items:center';
    const active=source.value===option.value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    button.onclick=()=>{rememberToolOption(m,key,option.value);for(const b of group.children){const on=b===button;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))}};
    group.append(button);
   }
  }else{
   const label=document.createElement('label');label.innerHTML=secondaryIcon('spacing','');label.title='B\u01b0\u1edbc hatch (px)';label.style.margin='0';
   const input=source.cloneNode();input.id='secondary-'+key;input.value=source.value;input.style.width='70px';input.setAttribute('aria-label','B\u01b0\u1edbc hatch (px)');
   input.onchange=()=>{if(!input.checkValidity()||!input.value){input.value=source.value;return}rememberToolOption(m,key,input.value)};
   label.append(input);group.append(label);
  }
 }
 if(m==='hatch')rememberToolOption(m,'hatchMethod',$('hatchMethod').value);
 positionSecondaryTools();
}

function positionSecondaryTools(){
 if(secondaryTools.hidden)return;
 const anchor=document.querySelector(`button[data-mode="${secondaryTools.dataset.anchorMode}"]`);
 if(!anchor){closeSecondaryTools();return}
 const box=anchor.getBoundingClientRect(),width=secondaryTools.offsetWidth,height=secondaryTools.offsetHeight;
 let left=secondaryTools.dataset.anchorMode==='section'?box.left:box.right+8,top=secondaryTools.dataset.anchorMode==='section'?box.bottom+6:box.top;
 if(left+width>window.innerWidth-8){left=Math.min(box.left,window.innerWidth-width-8);top=box.bottom+8;}
 if(top+height>window.innerHeight-8)top=Math.max(8,window.innerHeight-height-8);
 secondaryTools.style.left=Math.max(8,left)+'px';secondaryTools.style.top=Math.max(8,top)+'px';
}
function closeSecondaryTools(){
 secondaryTools.hidden=true;
 for(const button of $('tools').querySelectorAll('[aria-expanded]'))button.setAttribute('aria-expanded','false');
}
document.addEventListener('pointerdown',e=>{
 if(secondaryTools.hidden||secondaryTools.contains(e.target))return;
 if(e.target.closest('[data-mode]'))return;
 closeSecondaryTools();
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSecondaryTools()});
window.addEventListener('resize',positionSecondaryTools);
document.addEventListener('scroll',e=>{if(!secondaryTools.contains(e.target))positionSecondaryTools()},true);

// A short delay lets the pointer cross the gap between a tool and its panel.
function autoHideSecondary(panel,anchors,isOpen,close){
 let timer=null;
 const cancel=()=>{clearTimeout(timer);timer=null};
 document.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||!isOpen()){cancel();return}
  if(panel.contains(e.target)||anchors().some(a=>a?.contains(e.target))){cancel();return}
  if(timer===null)timer=setTimeout(()=>{timer=null;close()},250);
 });
 document.addEventListener('pointerdown',e=>{
  cancel();
  if(isOpen()&&!panel.contains(e.target)&&!anchors().some(a=>a?.contains(e.target)))close();
 },true);
 window.addEventListener('blur',()=>{cancel();close()});
}
function constructionSnap(e){
 if(!snapEnabled||!first||!['bar','thin','dashed','udl'].includes(mode))return null;
 const raw=rawPoint(e),p=e.shiftKey?orthogonalPoint(first,raw):raw;
 const dx=p.x-first.x,dy=p.y-first.y,tolerance=12/Math.abs(svg.getScreenCTM().a);
 let best=null,distance=tolerance;
 const consider=(q,kind)=>{
  if(Math.hypot(q.x-first.x,q.y-first.y)<1e-6)return;
  if(e.shiftKey&&Math.hypot(orthogonalPoint(first,q).x-q.x,orthogonalPoint(first,q).y-q.y)>1e-6)return;
  const gap=Math.hypot(q.x-p.x,q.y-p.y);
  if(gap<=tolerance&&((kind==='perpendicular'&&best?.kind!=='perpendicular')||((kind==='perpendicular'||best?.kind!=='perpendicular')&&gap<=distance))){distance=gap;best={point:q,kind}}
 };
 for(const o of items){
  if(!['bar','thin','dashed'].includes(o.type))continue;
  const ux=o.x2-o.x,uy=o.y2-o.y,l=ux*ux+uy*uy;if(l<1e-12)continue;
  const cross=dx*uy-dy*ux;
  if(snapOptions.intersection&&Math.abs(cross)>1e-9*Math.max(1,Math.hypot(dx,dy)*Math.sqrt(l))){
   const rx=o.x-first.x,ry=o.y-first.y,t=(rx*uy-ry*ux)/cross,s=(rx*dy-ry*dx)/cross;
   if(t>0&&s>=0&&s<=1)consider({x:first.x+t*dx,y:first.y+t*dy},'pendingIntersection');
  }
  if(snapOptions.perpendicular){
   const t=((first.x-o.x)*ux+(first.y-o.y)*uy)/l;
   if(t>=0&&t<=1)consider({x:o.x+t*ux,y:o.y+t*uy},'perpendicular');
  }
 }
 return best;
}
autoHideSecondary(secondaryTools,()=>[$('tools').querySelector(`[data-mode="${secondaryTools.dataset.anchorMode}"]`)],()=>!secondaryTools.hidden,closeSecondaryTools);

var loadPlacement=null;
function loadReferenceCandidates(){
 const session=loadPlacement;if(!session?.referenceCandidates)return [];
 const ids=new Set(session.referenceCandidates.map(c=>c.barId));
 return collectReferenceBars({bars:items.filter(o=>ids.has(o.id)),anchorPoint:session.referenceAnchor||session.a,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/Math.abs(svg.getScreenCTM().a)});
}
function loadReferenceFrame(){
 const session=loadPlacement;if(!session?.referenceBarId)return null;
 const candidate=loadReferenceCandidates().find(c=>c.barId===session.referenceBarId);
 if(candidate)return getReferenceBarFrame(candidate.bar);
 session.referenceBarId=null;session.referenceCandidates=[];session.uiAngle.value=session.globalPlacementAngle;
 if(session.type==='udl')svg.querySelectorAll('.reference-override').forEach(marker=>marker.classList.remove('reference-override'));
 if(session.type==='udl'&&typeof loadNumericSession!=='undefined'&&loadNumericSession?.session===session){delete $('dynamicInputValue').dataset.editing;updateDynamicInput({value:session.uiAngle.value})}
 svg.querySelector('[data-load-reference]')?.remove();return null;
}
function loadReferenceOverrideAt(cursorPoint){
 const candidates=loadReferenceCandidates();if(candidates.length<2)return null;
 const bar=hitReferenceOverride({bars:candidates.map(c=>c.bar),anchorPoint:loadPlacement.referenceAnchor||loadPlacement.a,cursorPoint,screenScale:Math.abs(svg.getScreenCTM().a)});
 return bar?.id!==loadPlacement.referenceBarId?bar:null;
}
function resolveLoadUserAngle(){
 const session=loadPlacement,frame=loadReferenceFrame();
 const global=frame?referenceAngleToGlobalPlacementAngle(session.uiAngle.value,frame):session.uiAngle.value;
 session.globalPlacementAngle=global;session.angle=loadUIToInternal(session.type,global,session.rotation);
}
function setLoadReference(barId){
 const session=loadPlacement,global=session.globalPlacementAngle;
 session.referenceBarId=barId;const frame=loadReferenceFrame();
 if(session.uiAngle.mode==='locked')resolveLoadUserAngle();
 else session.uiAngle.value=frame?globalPlacementAngleToReferenceAngle(global,frame):global;
}
function beginLoadReference(){
 const session=loadPlacement;session.globalPlacementAngle=0;session.referenceBarId=null;
 if(session.type==='udl')session.referenceAnchor={x:(session.a.x+session.b.x)/2,y:(session.a.y+session.b.y)/2};
 session.referenceCandidates=collectReferenceBars({bars:items,anchorPoint:session.referenceAnchor||session.a,toleranceModel:THIN_REFERENCE_TOLERANCE_PX/Math.abs(svg.getScreenCTM().a)});
 if(session.referenceCandidates.length===1)setLoadReference(session.referenceCandidates[0].barId);
 else if(session.type==='udl'&&session.referenceCandidates.length>1){
  const span=getReferenceBarFrame({x:session.a.x,y:session.a.y,x2:session.b.x,y2:session.b.y});
  const ranked=session.referenceCandidates.map(c=>{const t=getReferenceBarFrame(c.bar).tangent;return {id:c.barId,score:Math.abs(span.tangent.x*t.x+span.tangent.y*t.y)}}).sort((a,b)=>b.score-a.score);
  // A tie stays global until an explicit override; cursor direction never selects UDL reference.
  if(ranked[0].score-ranked[1].score>1e-9)setLoadReference(ranked[0].id);
 }
}
function renderLoadReference(){
 svg.querySelector('[data-load-reference]')?.remove();
 if(!loadReferenceFrame())return;
 const bar=items.find(o=>o.id===loadPlacement.referenceBarId);
 line(svg,bar.x,bar.y,bar.x2,bar.y2,{class:'thin-reference-highlight','data-load-reference':'true','pointer-events':'none','aria-hidden':'true'});
}
function cancelLoadPlacement(){svg.querySelector('.reference-angle-preview')?.remove();svg.querySelector('[data-load-reference]')?.remove();svg.querySelectorAll('.reference-override').forEach(marker=>marker.classList.remove('reference-override'));if(typeof endLoadNumericInput==='function')endLoadNumericInput();loadPlacement=null;svg.querySelector('[data-load-preview]')?.remove()}
// UI ray follows the visible body. Force tail = anchor - 75 * loadVector,
// so its internal tail-to-head vector is opposite the ray; moment uses SVG rotation.
function loadUIToInternal(type,angle,rotation='cw'){
 // The radius-34 semicircle has center (-4*side,-2) and arc midpoint (-34*side,-18).
 // Align that body ray with UI local +Y, independently of rotational sense.
 const base=(type==='force'||type==='udl')?90:Math.atan2(rotation==='cw'?34:-34,-18)*180/Math.PI;
 return ((base-angle)%360+360)%360;
}
function updateLoadOrientation(e){
 const session=loadPlacement;if(!session||!session.uiAngle)return false;
 loadReferenceFrame();
 if(typeof readLoadNumericEdit==='function')readLoadNumericEdit();
 if(session.uiAngle.mode==='locked'){resolveLoadUserAngle();return true}
 if(session.type==='udl')return updateUDLOrientation(e);
 const p=rawPoint(e),dx=p.x-session.a.x,dy=p.y-session.a.y;
 if(!session.referenceBarId){const candidate=resolveReferenceBar({candidates:loadReferenceCandidates(),anchorPoint:session.a,cursorPoint:p,screenScale:Math.abs(svg.getScreenCTM().a),activationThresholdPx:THIN_REFERENCE_ACTIVATION_PX});if(candidate)setLoadReference(candidate.barId)}
 if(loadReferenceOverrideAt(p))return false;
 let angle=solveSupportAngle(session.a,p);if(angle===null)return false;

 if(e.shiftKey){angle=Math.round(angle/90)*90;if(angle===-180)angle=180}
 session.globalPlacementAngle=angle;const frame=loadReferenceFrame();session.uiAngle.value=frame?globalPlacementAngleToReferenceAngle(angle,frame):angle;session.angle=loadUIToInternal(session.type,angle,session.rotation);return true;
}
function cancelConcentratedLoadPlacement(){if(loadPlacement?.uiAngle||loadPlacement?.type==='udl')cancelLoadPlacement()}
// UDL arrowheads stay on the span; tails extend opposite the stored load vector.
function updateUDLOrientation(e){
 const session=loadPlacement;if(session?.type!=='udl'||!session.b)return false;
 if(session.uiAngle?.mode==='locked')return true;
 const anchor={x:(session.a.x+session.b.x)/2,y:(session.a.y+session.b.y)/2};
 if(loadReferenceOverrideAt(rawPoint(e)))return false;
 let angle=solveSupportAngle(anchor,rawPoint(e));if(angle===null)return false;
 if(e.shiftKey){angle=Math.round(angle/90)*90;if(angle===-180)angle=180}
 session.placementAngle=angle;session.globalPlacementAngle=angle;const frame=loadReferenceFrame();if(session.uiAngle)session.uiAngle.value=frame?globalPlacementAngleToReferenceAngle(angle,frame):angle;
 session.angle=((90-angle)%360+360)%360;
 return true;
}
function placeLoadObject(){
 if(!loadPlacement)return;
 const p=loadPlacement,a=p.a,b=p.b;
 checkpoint();const o=make(p.type,a.x,a.y,b?.x,b?.y,{loadAngle:p.angle,rotation:p.rotation});
 items.push(o);selected=o.id;cancelLoadPlacement();render();
}
function paintLoadPreview(){renderLoadReference();renderReferenceAnglePreview();
 svg.querySelector('[data-load-preview]')?.remove();if(!loadPlacement)return;
 const p=loadPlacement,g=el('g',{'data-load-preview':'true','pointer-events':'none',stroke:'#087d95',fill:'none','stroke-width':1.5});
 const {x,y}=p.a;el('circle',{cx:x,cy:y,r:4,fill:'white'},g);
 if(p.type==='udl'&&!p.b){if(p.hover)line(g,x,y,p.hover.x,p.hover.y);return}
 const [dx,dy]=loadVector({loadAngle:p.angle});
 if(p.type==='moment'){
  const h=el('g',{transform:`rotate(${-p.angle} ${x} ${y})`},g),side=p.rotation==='cw'?1:-1;
  line(h,x,y,x-side*20,y+28);el('path',{d:`M${x-side*20} ${y+28} A34 34 0 0 ${side===1?1:0} ${x+side*12} ${y-32}`,'marker-end':'url(#momentArrow)'},h);
 }else if(p.type==='force'){arrow(g,x-dx*75,y-dy*75,x,y)}
 else{const b=p.b;line(g,x-dx*55,y-dy*55,b.x-dx*55,b.y-dy*55);const n=Math.max(2,Math.ceil(Math.hypot(b.x-x,b.y-y)/25));for(let i=0;i<=n;i++){const xx=x+(b.x-x)*i/n,yy=y+(b.y-y)*i/n;arrow(g,xx-dx*55,yy-dy*55,xx,yy)}}
}
svg.addEventListener('pointerdown',e=>{
 if(e.button!==0||!['force','moment','udl'].includes(mode)||typeof panEnabled!=='undefined'&&panEnabled)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(!loadPlacement){loadPlacement={type:mode,a:snapToBar(rawPoint(e))||point(e),angle:mode==='moment'?0:270,rotation:mode==='moment'?currentMomentRotation:$('rotation').value};if(mode!=='udl'){loadPlacement.uiAngle={mode:'live',value:0};loadPlacement.angle=loadUIToInternal(mode,0,loadPlacement.rotation);beginLoadReference();beginLoadNumericInput(e)}}
 else if(mode==='udl'&&!loadPlacement.b){const b=snapToBar(rawPoint(e))||point(e);if(Math.hypot(b.x-loadPlacement.a.x,b.y-loadPlacement.a.y)<1)return;loadPlacement.b=b;loadPlacement.uiAngle={mode:'live',value:0};loadPlacement.angle=90;beginLoadReference();beginLoadNumericInput(e)}
 else{const override=loadReferenceOverrideAt(rawPoint(e));if(override){setLoadReference(override.id);updateLoadNumericInput(e);paintLoadPreview();return}if(loadPlacement.uiAngle){if(!confirmLoadNumericInput()||!updateLoadOrientation(e))return}else if(loadPlacement.type==='udl'&&!updateUDLOrientation(e))return;placeLoadObject();return}
 paintLoadPreview();
},true);
svg.addEventListener('pointermove',e=>{
 if(!loadPlacement)return;if(loadPlacement.type==='udl'&&!loadPlacement.b)e.stopImmediatePropagation();
 if(loadPlacement.uiAngle){updateLoadOrientation(e);updateLoadNumericInput(e);paintLoadPreview();return}
 if(loadPlacement.type==='udl'&&!loadPlacement.b){loadPlacement.hover=drawingPoint(e);paintLoadPreview();return}

},true);

// Region interactions share the SVG pointer pipeline; document-level pan/pinch takes precedence.
svg.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;
 if(mode==='rigidRegion'){
  e.preventDefault();e.stopImmediatePropagation();
  if(rigidPoints.length>=rigidPointLimit){msg('Tối đa 256 điểm.');return}
  const p=point(e);if(Math.abs(p.x)>10000||Math.abs(p.y)>10000)return;
  rigidPoints.push({x:p.x,y:p.y});render();return;
 }
 const handle=e.target.closest('[data-rigid-point],[data-rigid-action]');
 if(mode!=='select'||!handle)return;
 e.preventDefault();e.stopImmediatePropagation();
 const kind=handle.dataset.rigidAction||'point',pivot={...rigidPivot},p=rawPoint(e);
 rigidDrag={kind,id:handle.dataset.id,index:Number(handle.dataset.rigidPoint),pointerId:e.pointerId,before:copy(items),pivotBefore:copy(rigidPivot),pivot,startAngle:Math.atan2(p.y-pivot.y,p.x-pivot.x)};
 svg.setPointerCapture(e.pointerId);
},true);
svg.addEventListener('pointermove',e=>{
 if(!rigidDrag||rigidDrag.pointerId!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 const o=items.find(o=>o.id===rigidDrag.id);if(!o)return;
 if(rigidDrag.kind==='rotate'){const p=rawPoint(e),c=rigidDrag.pivot;if(Math.hypot(p.x-c.x,p.y-c.y)<1e-8)return;const original=rigidDrag.before.find(o=>o.id===rigidDrag.id),next=rotatedRigid(original,c,Math.atan2(p.y-c.y,p.x-c.x)-rigidDrag.startAngle);try{validateRigidRegion(next)}catch{return}Object.assign(o,next);rigidSnapHint=null;render();return}
 const exclude=rigidDrag.kind==='pivot'?null:o.id;rigidSnapHint=geometricSnap(rawPoint(e),exclude);
 const p=point(e,exclude);if(rigidDrag.kind==='pivot'){rigidPivot={id:o.id,...p};render();return}
 const q=rigidLocal(o,p);
 if([p.x,p.y,q.x,q.y].some(v=>!Number.isFinite(v)||Math.abs(v)>10000))return;
 o.points[rigidDrag.index]=q;render();
},true);
function endRigidDrag(e){
 if(!rigidDrag||rigidDrag.pointerId!==e.pointerId)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.type==='pointercancel')cancelRigidDrag();
 else{const before=rigidDrag.before;rigidDrag=null;rigidSnapHint=null;if(JSON.stringify(before)!==JSON.stringify(items)){past.push(before);if(past.length>100)past.shift();future=[]}}
 render();
}
svg.addEventListener('pointerup',endRigidDrag,true);
svg.addEventListener('pointercancel',endRigidDrag,true);
document.addEventListener('keydown',e=>{
 if(mode==='rigidRegion'&&e.key==='Enter'&&!e.isComposing&&!e.target.matches('input,select,textarea')){e.preventDefault();finishRigidRegion()}
});
function openRigidOptions(){
 const object=mode==='select'?items.find(o=>o.id===selected&&o.type==='rigidRegion'):null;
 if(!object&&mode!=='rigidRegion'){selected=null;setMode('rigidRegion')}
 const values={...rigidDefaults,...object};
 secondaryTools.replaceChildren();secondaryTools.hidden=false;secondaryTools.dataset.anchorMode='rigidRegion';
 const main=document.querySelector('[data-mode="rigidRegion"]');main.setAttribute('aria-expanded','true');
 const title=document.createElement('strong');title.textContent=modes.rigidRegion;secondaryTools.append(title);
 for(const [key,name,options]of [['fillMode','Kiểu tô',[['hatch','Hatch'],['color','Màu'],['none','Không tô']]],['hatchStyle','Kiểu hatch',[['diagonal','Chéo'],['cross','Chéo kép']]],['spacing','Bước hatch'],['fillColor','Màu tô'],['fillOpacity','Độ đậm']]){
  const label=document.createElement('label');label.textContent=name;label.style.margin='2px';
  const input=document.createElement(options?'select':'input');input.id='rigid-'+key;input.setAttribute('aria-label',name);
  if(options)for(const [value,text]of options){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option)}
  else if(key==='fillColor')input.type='color';
  else{input.type='number';input.min=key==='spacing'?3:0;input.max=key==='spacing'?50:1;input.step=key==='spacing'?1:.05}
  input.value=values[key];
  input.onchange=()=>{
   const value=['spacing','fillOpacity'].includes(key)?Number(input.value):input.value;
   const next={...(object||rigidDefaults),[key]:value};
   try{validateRigidRegion({...next,x:0,y:0,points:[{x:0,y:0},{x:1,y:0},{x:0,y:1}]})}catch{input.value=(object||rigidDefaults)[key];return}
   if(object){if(!items.includes(object))return;if(object[key]!==value){checkpoint();object[key]=value}}
   else rigidDefaults[key]=value;
   render();positionSecondaryTools();
  };
  label.append(input);secondaryTools.append(label);
 }
 positionSecondaryTools();
 if(!object)msg('Chạm/bấm ít nhất 3 điểm; Hoàn tất để tạo, Hủy để bỏ.');
}
