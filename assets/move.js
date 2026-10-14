'use strict';

// Standalone Bar/Thin/Dashed transaction. Preview never writes to the drawing model.
let smartMoveSession=null;
let smartMoveMenuPointer=null;
let smartMoveMenuClickPointer=null;
const moveObjects=document.createElement('button'),moveBasePoint=document.createElement('button');
for(const [button,id,label,icon]of [[moveObjects,'moveObjects','Di chuyển đối tượng','moveObjects'],[moveBasePoint,'moveBasePoint','Chọn điểm gốc','moveBasePoint']]){
 button.id=id;button.type='button';button.textContent=label;button.title=label;
 button.setAttribute('aria-label',label);button.setAttribute('aria-pressed','false');button.dataset.toolbarIcon=icon;
 $('editToolbar').append(button);
}
moveObjects.onclick=()=>beginSmartMove();
moveBasePoint.onclick=selectSmartMoveBase;
decorateToolIcons();
refreshRightCommandEntries();
for(const source of [moveObjects,moveBasePoint])rightCommandObserver.observe(source,{attributes:true,attributeOldValue:true,attributeFilter:['class','aria-pressed','disabled']});
rightCommandMenu?.refresh();
// A handled canvas drag may suppress the next compatibility click. During Pan
// or Move, own only touch hub taps and delegate to the existing action once.
function handleMovementMenuPointer(e){
 if(e.type==='pointerdown'){
  smartMoveMenuPointer=null;smartMoveMenuClickPointer=null;
  const hub=e.target.closest('[data-demo-id="hub"]');
  if(e.pointerType!=='touch'||e.button!==0||(!smartMoveSession&&!panEnabled)||!hub||!rightCommandMenu?.host.contains(hub))return false;
  smartMoveMenuPointer={id:e.pointerId,x:e.clientX,y:e.clientY,menu:rightCommandMenu,dragging:false};return true;
 }
 const contact=smartMoveMenuPointer;if(!contact||contact.id!==e.pointerId)return false;
 contact.dragging||=semicircleEngine.classifyTapVsDrag(Math.hypot(e.clientX-contact.x,e.clientY-contact.y));
 if(e.type==='pointermove')return true;
 smartMoveMenuPointer=null;
 if(e.type==='pointerup'&&!contact.dragging&&(smartMoveSession||panEnabled)&&contact.menu===rightCommandMenu){
  const hub=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-demo-id="hub"]');
  if(hub&&contact.menu.host.contains(hub))hub.dispatchEvent(new MouseEvent('click',{bubbles:true}));
 }
 smartMoveMenuClickPointer=contact.id;return true;
}
window.addEventListener('click',e=>{
 if(e.detail>0&&e.pointerId===smartMoveMenuClickPointer){smartMoveMenuClickPointer=null;e.preventDefault();e.stopImmediatePropagation()}
},true);
// A touch drag can suppress compatibility clicks. Move owns its Bubble contact
// exactly once, like the existing pen adapter; other placement types keep their handlers.
penConnectionBubble.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='touch'||e.button!==0||penConnectionPlacement?.type!=='move')return;
 const action=e.target.closest('[data-pen-connection-action]')?.dataset.penConnectionAction;if(!action)return;
 e.preventDefault();e.stopImmediatePropagation();penConnectionSuppressClick=true;activatePenConnectionButton(action,e);
});

function movableBars(ids){return ids.size>0&&[...ids].every(id=>items.some(o=>o.id===id&&transformableLine(o)))}
// Rotation shares the existing cancel/history/Bubble lifecycle, but never enters
// Move's snap solver. Only the dedicated handle may acquire this transaction.
function rotationBar(){
 const ids=selectedObjectIds();return mode==='select'&&ids.size===1&&movableBars(ids)?items.find(o=>ids.has(o.id)):null;
}
function barRotationHandlePoint(o,pivot){
 const matrix=svg.getScreenCTM(),p=new DOMPoint(pivot.x,pivot.y).matrixTransform(matrix),box=svg.getBoundingClientRect();
 const vv=window.visualViewport,left=Math.max(box.left,vv?.offsetLeft||0),top=Math.max(box.top,vv?.offsetTop||0),
  right=Math.min(box.right,(vv?.offsetLeft||0)+(vv?.width||innerWidth)),bottom=Math.min(box.bottom,(vv?.offsetTop||0)+(vv?.height||innerHeight));
 const obstacles=[{x:p.x,y:p.y,r:22}];
 for(const node of svg.querySelectorAll('[data-endpoint] circle,[data-move-anchor],[data-pivot-hit]')){
  const r=node.getBoundingClientRect();obstacles.push({x:r.x+r.width/2,y:r.y+r.height/2,r:Math.hypot(r.width,r.height)/2});
 }
 const normal=Math.atan2(o.y2-o.y,o.x2-o.x)-Math.PI/2;
 // Prefer the perpendicular side, then the opposite side and successive rings.
 // Check the complete 44px target, including chrome, rather than just its icon.
 for(const radius of [64,96,144,208,304,448,640,896])for(const turn of [0,Math.PI,Math.PI/2,-Math.PI/2,Math.PI/4,-Math.PI/4,3*Math.PI/4,-3*Math.PI/4]){
  const q={x:p.x+radius*Math.cos(normal+turn),y:p.y+radius*Math.sin(normal+turn)};
  if(q.x-24<left||q.x+24>right||q.y-24<top||q.y+24>bottom||obstacles.some(a=>Math.hypot(q.x-a.x,q.y-a.y)<a.r+32))continue;
  let clear=true;
  for(const dx of [-22,0,22])for(const dy of [-22,0,22]){
   const hit=document.elementFromPoint(q.x+dx,q.y+dy);if(!hit||!svg.contains(hit))clear=false;
  }
  if(clear)return rawPoint({clientX:q.x,clientY:q.y});
 }
 return null; // No safely reachable target in the visible drawing area.
}
function beginBarRotation(e){
 const o=rotationBar();
 if(!o||e.button!==0||e.ctrlKey||e.altKey||panEnabled||gesture||inlineEditor||document.querySelector('dialog[open]')||dynamicInputUI.isOpen())return false;
 const pivot=objectPivot(o),p=rawPoint(e);
 if(!beginSmartMove(p,e))return false;
 Object.assign(smartMoveSession,{rotating:true,state:'ROTATE_BAR',rotationPivot:Object.freeze(pivot),
  rotationAngle:0,rotationLastAngle:Math.atan2(p.y-pivot.y,p.x-pivot.x),rotationHandle:p,
  rotationPreview:copy(o),valid:true,rotationTablet:['touch','pen'].includes(e.pointerType)});
 Object.freeze(smartMoveSession.originals[0]);
 showRotationNumericInput();svg.setPointerCapture(e.pointerId);render();return true;
}
function ownsRotationNumericInput(s=smartMoveSession){return !!s?.rotating&&!!s.rotationNumeric&&dynamicInputUI.owns(s.rotationNumeric.confirm)}
function rotationPreviewAt(s,angle){
 const o=s.originals[0],c=s.rotationPivot,a=rotateAround(o,c,angle),b=rotateAround({x:o.x2,y:o.y2},c,angle);
 return {...o,x:a.x,y:a.y,x2:b.x,y2:b.y};
}
function validRotationPreview(o){return [o.x,o.y,o.x2,o.y2].every(v=>Number.isFinite(v)&&Math.abs(v)<=10000)}
function applyBarRotationAngle(s,angle){
 s.rotationAngle=angle;s.rotationPreview=rotationPreviewAt(s,angle);s.valid=validRotationPreview(s.rotationPreview);
}
// Same sign as R1's Δθ: SVG y grows downward, so positive mathematical
// counterclockwise input uses a negative SVG rotation. Always solve from originals.
function normalizeRotationDegrees(value){const angle=value%360;return Object.is(angle,-0)?0:angle}
function rotationDraftValid(s,value){
 const text=$('dynamicInputValue').value.trim();
 return /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(text)&&Number.isFinite(value)&&validRotationPreview(rotationPreviewAt(s,-normalizeRotationDegrees(value)*Math.PI/180));
}
function rotationNumericObstacles(){return [penConnectionBubble,$('tabletNumericKeypad'),$('commandControls'),svg.querySelector('[data-bar-pivot]'),svg.querySelector('[data-bar-rotation-handle]')]}
function showRotationNumericInput(){
 const s=smartMoveSession;if(!s?.rotating)return;
 const numeric=s.rotationNumeric||={field:{mode:'live',value:0},locked:false,confirm:()=>{}};
 numeric.field.value=-s.rotationAngle*180/Math.PI;
 const box=svg.getBoundingClientRect();
 showDynamicInput({compact:true,clientX:box.left+box.width/2,clientY:box.top+12,suffix:'°',tabletKeypad:s.rotationTablet,
  onConfirm:numeric.confirm,onCancel:()=>{cancelSmartMove();render()},
  keypadAvoid:()=>[penConnectionBubble,svg.querySelector('[data-bar-pivot]'),svg.querySelector('[data-bar-rotation-handle]')],
  fields:{values:[numeric.field],label:'Δθ — góc xoay tương đối',displayLabel:'Δθ',labels:['Δθ'],unitLocks:true,keyboardFocusOnly:true,
   selectionAware:true,keypadOnEdit:true,tabletPlacement:s.rotationTablet,positionAvoid:rotationNumericObstacles,
   invalidMessage:'Nhập góc Δθ hữu hạn hợp lệ; xác nhận bằng ✓.',validate:(_,value)=>rotationDraftValid(s,value),
   onEdit:()=>updateCommandControls(),
   onConfirm:(_,value)=>{
    if(smartMoveSession!==s)return;
    const degrees=normalizeRotationDegrees(value);numeric.field.value=degrees;numeric.field.mode='locked';numeric.locked=true;
    applyBarRotationAngle(s,-degrees*Math.PI/180);releaseSmartMovePointer();clearSmartMovePoint();
    if(s.rotationTablet)freezeSmartMovePoint('rotation',s.rotationPivot);
    else{s.pending={kind:'rotation'};s.state='CONFIRM_ROTATION';render()}
   },
   onConfirmed:()=>{updateCommandControls();positionPenConnectionBubble();tabletInputKeypad.position()}}});
}
function syncRotationNumericInput(s){
 if(!ownsRotationNumericInput(s))return;
 if(!s.rotationNumeric.locked)s.rotationNumeric.field.value=-s.rotationAngle*180/Math.PI;
 updateDynamicInput();tabletInputKeypad.position();
}
function rotationHasDraft(s=smartMoveSession){return ownsRotationNumericInput(s)&&dynamicInputUI.hasPendingEdit()}
function resumeBarRotation(e,s){
 if(e.button!==0||e.ctrlKey||e.altKey||panEnabled||gesture||s.pointerId!==null)return false;
 const p=rawPoint(e),c=s.rotationPivot;
 clearSmartMovePoint();hideDynamicInput();
 s.rotationNumeric.locked=false;s.rotationNumeric.field.mode='live';s.rotationTablet=['touch','pen'].includes(e.pointerType);
 s.rotationHandle=rotateAround(p,c,-s.rotationAngle);s.rotationLastAngle=Math.atan2(p.y-c.y,p.x-c.x);
 s.pointerId=e.pointerId;s.screenStart={x:e.clientX,y:e.clientY};s.state='ROTATE_BAR';
 showRotationNumericInput();svg.setPointerCapture(e.pointerId);render();return true;
}
function updateBarRotation(p){
 const s=smartMoveSession;if(!s?.rotating||s.pending||s.rotationNumeric?.locked||rotationHasDraft(s))return;
 const c=s.rotationPivot;if(Math.hypot(p.x-c.x,p.y-c.y)<1e-9)return;
 const angle=Math.atan2(p.y-c.y,p.x-c.x),step=angle-s.rotationLastAngle;
 // Accumulate the shortest signed step, keeping continuous feedback across ±π.
 applyBarRotationAngle(s,s.rotationAngle+Math.atan2(Math.sin(step),Math.cos(step)));s.rotationLastAngle=angle;
}
function hasBarRotationConfirmation(){return !!smartMoveSession?.rotating&&smartMoveSession.pending?.kind==='rotation'&&!smartMoveSession.rotationTablet}
function canFinishBarRotation(){return hasBarRotationConfirmation()&&!rotationHasDraft()}
function commitBarRotation(){
 const s=smartMoveSession;if(!s?.rotating||s.pending?.kind!=='rotation'||!s.valid)return false;
 if(rotationHasDraft(s)){
  const input=$('dynamicInputValue');input.setCustomValidity('Xác nhận Δθ bằng ✓ trước khi hoàn tất.');input.reportValidity();return false;
 }
 if(JSON.stringify(items)!==s.document){cancelSmartMove();render();return false}
 const o=s.originals[0],next=s.rotationPreview,changed=Math.max(Math.hypot(next.x-o.x,next.y-o.y),Math.hypot(next.x2-o.x2,next.y2-o.y2))>1e-9;
 cancelSmartMove();
 if(changed){checkpoint();Object.assign(items.find(item=>item.id===o.id),{x:next.x,y:next.y,x2:next.x2,y2:next.y2})}
 render();return changed;
}
function handleBarRotationPointer(e,s){
 if(s.pending||e.pointerId!==s.pointerId)return true;
 if(e.type==='pointermove'||e.type==='pointerup'){updateBarRotation(rawPoint(e));render()}
 if(e.type==='pointerup'){
  releaseSmartMovePointer();
  if(!s.valid){cancelSmartMove();render();return true}
  if(s.rotationTablet)freezeSmartMovePoint('rotation',s.rotationPivot);
  else{s.pending={kind:'rotation'};s.state='CONFIRM_ROTATION';render();updateCommandControls()}
 }
 return true;
}
function renderBarRotation(){
 const s=smartMoveSession,o=rotationBar();if(!o||s&&!s.rotating)return;
 const pivot=s?.rotating?s.rotationPivot:objectPivot(o),scale=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b)||1;
 const point=s?.rotating?(s.pending?barRotationHandlePoint(s.rotationPreview,pivot):rotateAround(s.rotationHandle,pivot,s.rotationAngle)):barRotationHandlePoint(o,pivot);
 const g=el('g',{'data-bar-rotation':'true'});
 // PC keeps its existing midpoint Move target; this Pivot marker is display-only.
 if(!tabletPivotInteraction()){
  const marker=el('g',{'data-rotation-pivot':'true','pointer-events':'none'},g);
  el('circle',{cx:pivot.x,cy:pivot.y,r:8/scale,fill:'white',stroke:'#9451a3','stroke-width':2,'vector-effect':'non-scaling-stroke'},marker);
  el('path',{d:`M${pivot.x-5/scale} ${pivot.y}h${10/scale}M${pivot.x} ${pivot.y-5/scale}v${10/scale}`,stroke:'#9451a3','vector-effect':'non-scaling-stroke'},marker);
 }
 if(s?.rotating){
  const a=s.rotationPreview,color=s.valid?'#c66b08':'#b42318';
  line(g,a.x,a.y,a.x2,a.y2,{stroke:color,'stroke-width':3.5,'stroke-dasharray':'6 3','vector-effect':'non-scaling-stroke','pointer-events':'none','data-rotation-preview':'true'});
 }
 if(s?.rotating)syncRotationNumericInput(s);
 if(!point)return;
 line(g,pivot.x,pivot.y,point.x,point.y,{stroke:'#c66b08','stroke-dasharray':'3 4','vector-effect':'non-scaling-stroke','pointer-events':'none'});
 const h=el('g',{'data-bar-rotation-handle':'true',transform:`translate(${point.x} ${point.y}) scale(${1/scale})`,role:'button','aria-label':s?.pending?'Kéo để mở khóa Δθ và xoay tiếp':'Xoay thanh quanh Pivot',cursor:'grab','pointer-events':s&&!s.pending?'none':'all'},g);
 el('rect',{x:-22,y:-22,width:44,height:44,fill:'transparent','data-rotation-hit':'true'},h);
 el('circle',{r:11,fill:'white',stroke:'#c66b08','stroke-width':2,'pointer-events':'none'},h);
 el('path',{d:'M6 -2A6 6 0 1 0 4 5M2 -3L7 -2L6 -7',fill:'none',stroke:'#c66b08','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round','pointer-events':'none'},h);
 el('title',{},h).textContent='Xoay thanh quanh Pivot';
 if(s?.rotating){
  // Mathematical positive rotation is counterclockwise; SVG's y axis points down.
  const degrees=-s.rotationAngle*180/Math.PI,label=`Δθ = ${degrees>=0?'+':''}${degrees.toFixed(1)}°`;
  el('text',{x:point.x,y:point.y-29/scale,'text-anchor':'middle','font-size':13/scale,'font-family':'Arial,sans-serif',fill:'#9c5000',stroke:'white','stroke-width':3/scale,'paint-order':'stroke','pointer-events':'none','data-rotation-angle':'true',role:'status'},g).textContent=label;
 }
}
let temporaryBarPivot=null;
function tabletPivotInteraction(){return floatingToolsMedia.matches}
function barSelectionSignature(objects){return JSON.stringify(objects.map(o=>[o.id,o.x,o.y,o.x2,o.y2]).sort((a,b)=>a[0].localeCompare(b[0])))}
function selectionPivot(objects=items.filter(o=>selectedObjectIds().has(o.id))){
 if(!objects.length||objects.some(o=>!objectPivot(o)))return null;
 if(objects.length===1)return objectPivot(objects[0]);
 const signature=barSelectionSignature(objects);
 if(temporaryBarPivot?.signature===signature)return {...temporaryBarPivot.point};
 return {x:(Math.min(...objects.flatMap(o=>[o.x,o.x2]))+Math.max(...objects.flatMap(o=>[o.x,o.x2])))/2,
  y:(Math.min(...objects.flatMap(o=>[o.y,o.y2]))+Math.max(...objects.flatMap(o=>[o.y,o.y2])))/2};
}
function pivotCandidateAt(p,s){
 let best=null;const rank={endpoint:0,midpoint:1,intersection:2,pivot:3};
 if(snapEnabled)for(const q of s.pivotCandidates){
  if(q.kind!=='pivot'&&!snapOptions[q.kind])continue;
  const distance=moveScreenDistance(p,q);if(distance>moveSnapTolerance(q.kind))continue;
  if(!best||distance<best.distance-2||Math.abs(distance-best.distance)<=2&&rank[q.kind]<rank[best.point.kind])best={point:q,distance};
 }
 if(best)return {...best.point};
 if(snapEnabled&&snapOptions.member)for(const bar of s.pivotBars){
  const q=segmentContact(p,bar,{x:bar.x2,y:bar.y2});if(!q)continue;
  const distance=moveScreenDistance(p,q);if(distance<=14&&(!best||distance<best.distance))best={point:{...q,kind:'projected'},distance};
 }
 return best?.point||{x:Math.max(-10000,Math.min(10000,p.x)),y:Math.max(-10000,Math.min(10000,p.y)),kind:'custom'};
}
function beginBarPivot(e){
 if(!tabletPivotInteraction()||mode!=='select'||e.button!==0||e.ctrlKey||e.altKey||panEnabled||gesture)return false;
 if(!beginSmartMove(rawPoint(e),e))return false;
 const s=smartMoveSession;
 s.pivotEditing=true;s.pivotBefore=selectionPivot(s.originals);s.pivotCandidate={...s.pivotBefore};
 s.pivotCandidates=moveSnapPoints(items,true);s.pivotBars=copy(items.filter(transformableLine));s.state='ADJUST_PIVOT';
 svg.setPointerCapture(e.pointerId);render();return true;
}
function commitBarPivot(){
 const s=smartMoveSession;if(!s?.pivotEditing)return false;
 if(JSON.stringify(items)!==s.document){cancelSmartMove();render();return false}
 const point=s.pivotCandidate,changed=moveScreenDistance(point,s.pivotBefore)>1e-6;
 if(changed){
  if(s.originals.length===1){
   const o=items.find(o=>o.id===s.originals[0].id),pivot=barPivotLocal(o,point);
   validateBarPivot({...o,pivot});
   // Persistent metadata uses the existing document Undo architecture, never a Move commit.
   checkpoint();o.pivot=pivot;
  }else temporaryBarPivot={signature:barSelectionSignature(s.originals),point:{x:point.x,y:point.y}};
 }
 cancelSmartMove();render();return changed;
}
function handleBarPivotPointer(e,s){
 if(s.pending)return true;
 if(e.pointerId!==s.pointerId)return true;
 if(e.type==='pointermove'&&Math.hypot(e.clientX-s.screenStart.x,e.clientY-s.screenStart.y)>=4){
  s.moved=true;s.pivotCandidate=pivotCandidateAt(rawPoint(e),s);render();
 }
 if(e.type==='pointerup'){
  if(!s.moved){cancelSmartMove();render();return true}
  s.pivotCandidate=pivotCandidateAt(rawPoint(e),s);releaseSmartMovePointer();
  if(e.pointerType==='touch'||e.pointerType==='pen')freezeSmartMovePoint('pivot',s.pivotCandidate);else commitBarPivot();
 }
 return true;
}
function renderBarPivot(){
 const ids=selectedObjectIds(),objects=items.filter(o=>ids.has(o.id));
 if(temporaryBarPivot&&barSelectionSignature(objects)!==temporaryBarPivot.signature)temporaryBarPivot=null;
 if(!tabletPivotInteraction()||mode!=='select'||!movableBars(ids))return;
 const s=smartMoveSession;
 // Explicit PC/legacy Base commands retain their existing presentation.
 if(s?.command)return;
 svg.querySelector('[data-move-anchor]')?.remove();
 const origin=s?.pivotEditing?s.pivotCandidate:selectionPivot(objects);if(!origin)return;
 const delta=s&&!s.pivotEditing?s.delta:{x:0,y:0},p={x:origin.x+delta.x,y:origin.y+delta.y};
 const scale=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b)||1;
 const endpoints=[...svg.querySelectorAll('[data-endpoint]')];
 let radius=8;
 // Endpoint handles keep pointer priority. A surrounding Pivot ring remains reachable.
 for(const h of endpoints){const c=h.querySelector('circle'),q={x:Number(c.getAttribute('cx')),y:Number(c.getAttribute('cy'))};
  if(moveScreenDistance(p,q)<22)radius=Math.max(radius,Number(c.getAttribute('r'))*scale+4);
 }
 const snapped=s?.pivotEditing?s.pivotCandidate.kind&&s.pivotCandidate.kind!=='custom':s?.pair?.source.kind==='pivot';
 const hit=Math.max(22,radius+6),state=snapped?'snapped':s?.pivotEditing?'dragging':'selected';
 const g=el('g',{'data-bar-pivot':'true','data-pivot-state':state,transform:`translate(${p.x} ${p.y})`,role:'button','aria-label':'Kéo điểm tâm Pivot',cursor:'crosshair'});
 el('rect',{x:-hit/scale,y:-hit/scale,width:2*hit/scale,height:2*hit/scale,fill:'transparent','pointer-events':s?.pending||s?.rotating?'none':'all','data-pivot-hit':'true'},g);
 const color=state==='snapped'?'#16845b':state==='dragging'?'#ba6b12':'#9451a3';
 el('circle',{r:radius/scale,fill:'white',stroke:color,'stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'},g);
 el('path',{d:`M${-5/scale} 0H${5/scale}M0 ${-5/scale}V${5/scale}`,stroke:color,'stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'},g);
 el('title',{},g).textContent='Kéo điểm tâm Pivot';
 if(endpoints[0])svg.insertBefore(g,endpoints[0]);
 if(s?.pivotEditing&&s.pivotCandidate.kind&&s.pivotCandidate.kind!=='custom')el('rect',{x:p.x-4/scale,y:p.y-4/scale,width:8/scale,height:8/scale,fill:'none',stroke:'#087d95','data-pivot-target':s.pivotCandidate.kind,'pointer-events':'none','vector-effect':'non-scaling-stroke'});
}
function beginSmartMove(anchor=null,event=null){
 const ids=selectedObjectIds();if(!movableBars(ids))return false;
 deactivateCanvasPan();
 const primary=selected;
 if(!anchor){setMode('move');updateSelection(ids,primary)}
 smartMoveSession={ids:new Set(ids),originals:copy(items.filter(o=>ids.has(o.id))),anchor,
  command:!anchor,state:'MOVE_AUTOMATIC',base:null,pickingBase:false,pair:null,delta:{x:0,y:0},pending:null,
  pointerId:event?.pointerId??null,clickId:event?.target?.closest('[data-id]')?.dataset.id,
  screenStart:event?{x:event.clientX,y:event.clientY}:null,moved:false};
 // Geometry stays fixed for the transaction: do not rebuild all intersections per pointer frame.
 smartMoveSession.document=JSON.stringify(items);
 smartMoveSession.pivot=anchor&&tabletPivotInteraction()&&['touch','pen'].includes(event?.pointerType)?selectionPivot(smartMoveSession.originals):null;
 smartMoveSession.sources=moveSnapPoints(smartMoveSession.originals);
 smartMoveSession.targets=moveSnapPoints(items.filter(o=>!ids.has(o.id)),!!smartMoveSession.pivot);
 render();return true;
}
function selectSmartMoveBase(){
 let s=smartMoveSession;if(!s)return;
 releaseSmartMovePointer();
 // Selecting an explicit source after a drag retires the old pointer/destination.
 if(!s.command){beginSmartMove();s=smartMoveSession}
 clearSmartMovePoint();
 Object.assign(s,{state:'SELECT_BASE_POINT',pickingBase:true,base:null,anchor:null,pair:null,
  delta:{x:0,y:0},moved:false,valid:true,pointerId:null,screenStart:null});
 s.baseSources=moveBaseCandidates(s);render();
}
function moveBaseCandidates(s){
 const points=[...s.sources];
 // An intersection can belong to a selected Bar and stationary geometry. It is
 // a source choice only: it must never enter automatic Mode B source pairing.
 const stationary=items.filter(o=>!s.ids.has(o.id)&&['bar','thin','dashed'].includes(o.type));
 for(const bar of s.originals)for(const other of stationary){
  const point=segmentIntersectionPoint(bar,other);
  if(point)points.push({...point,kind:'intersection',key:bar.id+':base:'+other.id+':i'});
 }
 return points;
}
function smartMoveBaseAt(p){
 const s=smartMoveSession;if(!s?.pickingBase)return null;
 const rank={endpoint:0,midpoint:1,intersection:2};let best=null;
 for(const q of s.baseSources){
  const distance=moveScreenDistance(p,q);if(distance>moveSnapTolerance(q.kind))continue;
  if(!best||distance<best.distance-2||Math.abs(distance-best.distance)<=2&&rank[q.kind]<rank[best.point.kind])best={point:q,distance};
 }
 if(best)return best.point;
 // Reuse the drawing segment projector; accept only a nearby point on a Bar.
 for(const bar of s.originals){
  const q=segmentContact(p,bar,{x:bar.x2,y:bar.y2});if(!q)continue;
  const distance=moveScreenDistance(p,q);
  if(distance<=moveSnapTolerance('endpoint')&&(!best||distance<best.distance))best={point:{...q,kind:'projected',key:bar.id+':projected'},distance};
 }
 return best?.point||null;
}
function acceptSmartMoveBase(point){
 const s=smartMoveSession;if(!s)return;
 Object.assign(s,{state:'MOVE_WITH_BASE_POINT',base:Object.freeze({...point}),pickingBase:false,
  pointerId:null,screenStart:null,pair:null,delta:{x:0,y:0},moved:false,valid:true});
 s.anchor=s.base;
}
let smartMoveBubblePresentation=null;
function setSmartMoveBubblePresentation(kind){
 const controls=[penConnectionBubble,...penConnectionBubble.querySelectorAll('button')];
 smartMoveBubblePresentation=controls.map(control=>({control,label:control.getAttribute('aria-label'),title:control.getAttribute('title')}));
 const base=kind==='base'||kind==='pivot',label=kind==='pivot'?'Xác nhận Pivot':base?'Xác nhận Base Point':'Xác nhận Move';
 penConnectionBubble.setAttribute('aria-label',label);
 for(const button of controls.slice(1)){
  const name=button.dataset.penConnectionAction==='confirm'?label:kind==='pivot'?'Hủy Pivot':base?'Hủy Base Point':'Hủy điểm đích';
  button.setAttribute('aria-label',name);button.title=name;
 }
 if(kind==='rotation'){
  penConnectionBubble.setAttribute('aria-label','Xác nhận xoay thanh');
  for(const button of controls.slice(1)){const label=button.dataset.penConnectionAction==='confirm'?'Xác nhận xoay thanh':'Hủy xoay thanh';button.setAttribute('aria-label',label);button.title=label}
 }
}
function clearSmartMovePoint(){
 if(penConnectionPlacement?.type==='move')clearPenConnectionPlacement();
 if(smartMoveBubblePresentation){
  for(const {control,label,title}of smartMoveBubblePresentation)for(const [name,value]of [['aria-label',label],['title',title]]){
   if(value===null)control.removeAttribute(name);else control.setAttribute(name,value);
  }
  smartMoveBubblePresentation=null;
 }
 if(smartMoveSession)smartMoveSession.pending=null;
}
function releaseSmartMovePointer(){
 const s=smartMoveSession,id=s?.pointerId;if(!s)return;
 s.pointerId=null;s.screenStart=null;
 if(id!==null&&id!==undefined&&svg.hasPointerCapture(id))svg.releasePointerCapture(id);
}
function cancelSmartMove(){
 smartMoveMenuPointer=null;smartMoveMenuClickPointer=null;
 releaseSmartMovePointer();
 const s=smartMoveSession,primary=selected;if(ownsRotationNumericInput(s))hideDynamicInput();clearSmartMovePoint();smartMoveSession=null;
 svg.querySelector('[data-move-preview]')?.remove();
 svg.querySelector('[data-bar-rotation]')?.remove();
 if(s?.command&&mode==='move'){setMode('select');updateSelection(s.ids,primary)}
 syncSmartMoveControls();
}
function syncSmartMoveControls(){
 const active=!!smartMoveSession;
 moveObjects.disabled=!active&&!movableBars(selectedObjectIds());moveBasePoint.disabled=!active||!!smartMoveSession?.rotating;
 for(const [button,on]of [[moveObjects,active],[moveBasePoint,active&&(smartMoveSession.pickingBase||!!smartMoveSession.base)]]){
  button.hidden=tabletPivotInteraction();
  button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));
 }
}
// Same bounded segment intersection used by the drawing snap provider.
function moveSnapPoints(objects,includePivots=false){
 const out=[],add=(point,kind,key)=>{if(Number.isFinite(point.x)&&Number.isFinite(point.y))out.push({...point,kind,key})};
 for(const o of objects){
  if(includePivots&&o.pivot&&objectPivot(o))add(objectPivot(o),'pivot',o.id+':pivot');
  geometricPoints(o).forEach((p,i)=>add(p,'endpoint',o.id+':e'+i));
  if(['bar','thin','dashed'].includes(o.type))add({x:(o.x+o.x2)/2,y:(o.y+o.y2)/2},'midpoint',o.id+':m');
 }
 const segments=objects.filter(o=>['bar','thin','dashed'].includes(o.type)&&Math.hypot(o.x2-o.x,o.y2-o.y)>1e-9);
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const q=segmentIntersectionPoint(segments[i],segments[j]);if(q)add(q,'intersection',segments[i].id+':'+segments[j].id+':i');
 }
 return out;
}
function moveScreenDistance(a,b){const m=svg.getScreenCTM(),dx=a.x-b.x,dy=a.y-b.y;return Math.hypot(m.a*dx+m.c*dy,m.b*dx+m.d*dy)}
function moveSnapTolerance(kind){return kind==='endpoint'?14:12}
function pivotSnapPair(s,delta,targets,previous){
 const source={...s.pivot,kind:'pivot',key:'selection:pivot'},rank={endpoint:0,midpoint:1,intersection:2,pivot:3};let best=null;
 for(const target of targets){
  const distance=moveScreenDistance({x:source.x+delta.x,y:source.y+delta.y},target);
  if(distance>moveSnapTolerance(target.kind))continue;
  if(!best||distance<best.distance-2||Math.abs(distance-best.distance)<=2&&rank[target.kind]<rank[best.target.kind])best={source,target,distance};
 }
 if(previous&&targets.some(q=>q.key===previous.target.key)){
  const distance=moveScreenDistance({x:source.x+delta.x,y:source.y+delta.y},previous.target);
  if(distance<=moveSnapTolerance(previous.target.kind)*1.5&&(!best||best.distance>distance-4))best={source,target:previous.target,distance};
 }
 return best;
}
function updateSmartMove(p){
 const s=smartMoveSession;if(!s?.anchor||s.pending||s.pickingBase)return;
 const delta={x:p.x-s.anchor.x,y:p.y-s.anchor.y};
 const sources=s.base?[s.base]:s.sources.filter(q=>snapOptions[q.kind]);
 const targets=s.targets.filter(q=>q.kind==='pivot'||snapOptions[q.kind]);
 const pivotPair=s.pair?.source.kind==='pivot'?s.pair:null;
 if(s.pivot)s.pair=s.automaticPair;
 const rank={endpoint:0,midpoint:1,intersection:2,pivot:3};let best=null;
 if(snapEnabled)for(const source of sources)for(const target of targets){
  const distance=moveScreenDistance({x:source.x+delta.x,y:source.y+delta.y},target);
  if(distance>moveSnapTolerance(target.kind))continue;
  const candidate={source,target,distance};
  if(!best||distance<best.distance-2||Math.abs(distance-best.distance)<=2&&rank[target.kind]<rank[best.target.kind])best=candidate;
 }
 // Release at 1.5 times acquisition radius; a four-pixel improvement permits switching.
 if(snapEnabled&&s.pair&&targets.some(q=>q.key===s.pair.target.key)&&sources.some(q=>q.key===s.pair.source.key)){
  const distance=moveScreenDistance({x:s.pair.source.x+delta.x,y:s.pair.source.y+delta.y},s.pair.target);
  if(distance<=moveSnapTolerance(s.pair.target.kind)*1.5&&(!best||best.distance>distance-4))best={...s.pair,distance};
 }
 if(s.pivot){s.automaticPair=best;if(snapEnabled)best=pivotSnapPair(s,delta,targets,pivotPair)||best}
 s.pair=best;
 if(best){delta.x=best.target.x-best.source.x;delta.y=best.target.y-best.source.y}
 s.valid=translationWithinBounds(s.originals,delta.x,delta.y);
 if(s.valid){s.delta=delta;s.moved=Math.hypot(delta.x,delta.y)>1e-9}
 else s.pair=null;
}
function commitSmartMove(){
 if(smartMoveSession?.rotating)return commitBarRotation();
 if(smartMoveSession?.pivotEditing)return commitBarPivot();
 const s=smartMoveSession;if(!s||s.valid===false||s.pickingBase||!s.anchor||s.pending?.kind==='base')return false;
 // A concurrent document edit invalidates this transaction rather than overwriting it.
 if(JSON.stringify(items)!==s.document){cancelSmartMove();render();return false}
 const {x:dx,y:dy}=s.delta,ids=s.ids,primary=selected,changed=s.moved;
 const groupPivot=temporaryBarPivot?.signature===barSelectionSignature(s.originals)?temporaryBarPivot.point:null;
 cancelSmartMove();
 if(changed){checkpoint();for(const o of items)if(ids.has(o.id)){o.x+=dx;o.y+=dy;o.x2+=dx;o.y2+=dy}}
 if(changed&&groupPivot)temporaryBarPivot={signature:barSelectionSignature(items.filter(o=>ids.has(o.id))),point:{x:groupPivot.x+dx,y:groupPivot.y+dy}};
 if(mode==='move')setMode('select');updateSelection(ids,primary);render();return changed;
}
function freezeSmartMovePoint(kind,point){
 const s=smartMoveSession;if(!s||kind==='destination'&&s.valid===false)return;
 s.pending={kind,point:{...point}};
 if(kind==='rotation'){s.state='CONFIRM_ROTATION';setSmartMoveBubblePresentation(kind)}
 if(kind==='base'||kind==='pivot'||s.base){s.state=kind==='pivot'?'CONFIRM_PIVOT':kind==='base'?'CONFIRM_BASE_POINT':'CONFIRM_MOVE_WITH_BASE_POINT';setSmartMoveBubblePresentation(kind)}
 penConnectionPlacement={type:'move',state:'confirming',lockedCandidate:Object.freeze({...point}),lockedPointerId:null};
 if(kind==='rotation')penConnectionPlacement.rotationInput=true;
 penConnectionBubble.hidden=false;positionPenConnectionBubble();render();
}
function confirmSmartMovePoint(action){
 const s=smartMoveSession,pending=s?.pending;if(!pending||penConnectionPlacement?.type!=='move')return;
 if(s.rotating){if(action==='confirm')commitBarRotation();else{cancelSmartMove();render()}return}
 clearSmartMovePoint();
 if(s.pivotEditing){if(action==='cancel'){cancelSmartMove();render()}else commitBarPivot();return}
 if(action==='cancel'){
  s.pair=null;s.delta={x:0,y:0};s.moved=false;
  if(pending.kind==='base'){s.state='SELECT_BASE_POINT';s.pickingBase=true}
  else if(s.base)s.state='MOVE_WITH_BASE_POINT';
  if(!s.command){cancelSmartMove()}render();return;
 }
 if(pending.kind==='base'){acceptSmartMoveBase(pending.point);render()}
 else commitSmartMove();
}
function handleSmartMovePointer(e){
 let s=smartMoveSession;
 if(s?.rotating&&e.type==='pointerdown'&&e.target.closest('[data-bar-rotation-handle]')){
  if(!resumeBarRotation(e,s))return false;
  e.preventDefault();e.stopImmediatePropagation();return true;
 }
 if(!s&&e.type==='pointerdown'&&e.target.closest('[data-bar-rotation-handle]')){
  if(!beginBarRotation(e))return false;s=smartMoveSession;
 }
 if(!s&&e.type==='pointerdown'&&e.target.closest('[data-bar-pivot]')){
  if(!beginBarPivot(e))return false;s=smartMoveSession;
 }
 if(!s&&e.type==='pointerdown'&&mode==='select'&&e.button===0&&!e.ctrlKey&&!e.altKey&&!panEnabled&&!gesture){
  const id=e.target.closest('[data-id]')?.dataset.id,o=items.find(o=>o.id===id);
  if(!o||e.target.closest('[data-endpoint],text,[data-rigid-action]'))return false;
  let ids=selectedObjectIds();if(!ids.has(id))ids=new Set([id]);
  if(!movableBars(ids))return false;
  updateSelection(ids,id);beginSmartMove(rawPoint(e),e);s=smartMoveSession;svg.setPointerCapture(e.pointerId);
 }else if(!s)return false;
 if(e.button!==0&&e.type==='pointerdown'||panEnabled||gesture)return false;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.type==='pointercancel'){cancelSmartMove();render();return true}
 if(s.rotating)return handleBarRotationPointer(e,s);
 if(s.pivotEditing)return handleBarPivotPointer(e,s);
 if(s.pending)return true;
 const p=rawPoint(e),tablet=e.pointerType==='touch'||e.pointerType==='pen';
 if(s.pickingBase){
  if(e.type==='pointerdown'){
   const candidate=smartMoveBaseAt(p);
   if(candidate){if(tablet)freezeSmartMovePoint('base',candidate);else acceptSmartMoveBase(candidate);render()}
  }return true;
 }
 if(s.command){
  if(e.type==='pointerdown'){
   if(!s.anchor){s.anchor={x:p.x,y:p.y};s.pointerId=e.pointerId;s.screenStart={x:e.clientX,y:e.clientY};svg.setPointerCapture(e.pointerId)}
   else{updateSmartMove(p);if(tablet)freezeSmartMovePoint('destination',s.pair?.target||p);else commitSmartMove()}
  }else if(e.type==='pointermove'){
   if(s.pointerId===e.pointerId&&s.screenStart&&Math.hypot(e.clientX-s.screenStart.x,e.clientY-s.screenStart.y)<4)return true;
   updateSmartMove(p);render();
  }
  // A contact drag is also a complete destination selection; a tap only acquires the anchor.
  else if(e.type==='pointerup'&&s.pointerId===e.pointerId){s.pointerId=null;if(s.moved){updateSmartMove(p);if(tablet)freezeSmartMovePoint('destination',s.pair?.target||p);else commitSmartMove()}}
 }else{
  if(e.pointerId!==s.pointerId)return true;
  if(e.type==='pointermove'&&Math.hypot(e.clientX-s.screenStart.x,e.clientY-s.screenStart.y)>=4){updateSmartMove(p);render()}
  if(e.type==='pointerup'){
   if(s.valid===false){cancelSmartMove();render();return true}
   if(!s.moved){cancelSmartMove();if(e.pointerType==='mouse'&&s.ids.size>1&&s.ids.has(s.clickId))updateSelection([s.clickId],s.clickId);render()}
   else{updateSmartMove(p);if(tablet)freezeSmartMovePoint('destination',s.pair?.target||p);else commitSmartMove()}
  }
 }
 return true;
}
function renderSmartMove(){
 if(smartMoveSession&&JSON.stringify(items)!==smartMoveSession.document)cancelSmartMove();
 if(smartMoveSession?.rotating&&(!rotationBar()||!smartMoveSession.ids.has(selected)))cancelSmartMove();
 syncSmartMoveControls();const s=smartMoveSession;if(!s||s.pivotEditing||s.rotating){renderBarPivot();renderBarRotation();return}
 const g=el('g',{'data-move-preview':'true','pointer-events':'none',stroke:'#087d95',fill:'none'}),{x:dx,y:dy}=s.delta;
 for(const o of s.originals)line(g,o.x+dx,o.y+dy,o.x2+dx,o.y2+dy,{'stroke-width':3.5,'stroke-dasharray':'6 3','vector-effect':'non-scaling-stroke'});
 const scale=Math.hypot(svg.getScreenCTM().a,svg.getScreenCTM().b)||1;
 if(s.pickingBase){
  for(const q of s.baseSources)el('circle',{cx:q.x,cy:q.y,r:3/scale,stroke:'#16845b',fill:'white','data-move-base-option':q.kind,'vector-effect':'non-scaling-stroke'},g);
 }
 if(s.pending?.kind==='base'){
  const q=s.pending.point;el('circle',{cx:q.x,cy:q.y,r:8/scale,stroke:'#16845b','stroke-width':2,'data-move-base-candidate':q.kind,'vector-effect':'non-scaling-stroke'},g);
 }
 if(s.base){
  const x=s.base.x+dx,y=s.base.y+dy;
  el('circle',{cx:x,cy:y,r:5/scale,stroke:'white',fill:'#16845b','data-move-base':'true','vector-effect':'non-scaling-stroke'},g);
  el('text',{x:x+9/scale,y:y-9/scale,fill:'#16845b',stroke:'white','stroke-width':3/scale,'paint-order':'stroke','font-size':12/scale,'font-family':'Arial,sans-serif','data-move-base-label':'true'},g).textContent='Base Point';
 }
 const status={SELECT_BASE_POINT:'Chọn Base Point',CONFIRM_BASE_POINT:'Xác nhận Base Point',MOVE_WITH_BASE_POINT:'Base Point — chọn đích',CONFIRM_MOVE_WITH_BASE_POINT:'Xác nhận Move'}[s.state];
 if(status){
  const box=svg.getBoundingClientRect(),point=rawPoint({clientX:box.left+box.width/2,clientY:Math.max(box.top,window.visualViewport?.offsetTop||0)+24});
  const badge=el('g',{'data-move-base-status':s.state,role:'status','aria-live':'polite'},g),width=(status.length*7+20)/scale;
  el('rect',{x:point.x-width/2,y:point.y-15/scale,width,height:24/scale,rx:4/scale,fill:'white',stroke:'#16845b','vector-effect':'non-scaling-stroke'},badge);
  el('text',{x:point.x,y:point.y+1/scale,'text-anchor':'middle','font-size':12/scale,'font-family':'Arial,sans-serif',fill:'#16845b',stroke:'none'},badge).textContent=status;
 }
 if(s.pair){
  const a=s.pair.source,b=s.pair.target;
  if(!s.base&&a.kind!=='pivot')el('circle',{cx:a.x+dx,cy:a.y+dy,r:8/scale,stroke:'#9451a3','data-move-source':a.kind,'vector-effect':'non-scaling-stroke'},g);
  el('rect',{x:b.x-4/scale,y:b.y-4/scale,width:8/scale,height:8/scale,stroke:'#087d95','data-move-target':b.kind,'vector-effect':'non-scaling-stroke'},g);
 }
 renderBarPivot();
}
document.addEventListener('keydown',e=>{
 if(!smartMoveSession||e.isComposing||e.target.matches('input,textarea,select')||e.ctrlKey||e.altKey||e.metaKey||e.key!=='Enter')return;
 e.preventDefault();e.stopImmediatePropagation();if(!e.repeat){if(smartMoveSession.rotating){if(!smartMoveSession.rotationTablet)commitBarRotation()}else if(smartMoveSession.pending)confirmSmartMovePoint('confirm');else commitSmartMove()}
},true);
for(const type of ['blur','resize','scroll'])window.addEventListener(type,()=>{if(smartMoveSession){cancelSmartMove();render()}},type==='scroll');
 new ResizeObserver(()=>{if(rotationBar()&&!smartMoveSession)render()}).observe(svg);
new MutationObserver(()=>{if(rotationBar()&&!smartMoveSession)render()}).observe(svg,{attributes:true,attributeFilter:['viewBox']});
window.visualViewport?.addEventListener('resize',()=>{if(smartMoveSession){cancelSmartMove();render()}});
floatingToolsMedia.addEventListener('change',()=>{cancelSmartMove();render()});
syncSmartMoveControls();
