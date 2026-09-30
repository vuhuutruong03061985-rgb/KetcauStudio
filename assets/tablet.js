'use strict';

// The camera changes only the SVG viewBox, never the drawing coordinates.
let camera={x:0,y:0,w:1100,h:720},panEnabled=false,gesture=null;
const contacts=new Map();
let touchSnapshot=null,suppressTouch=false,installPrompt=null;
const editableTypes=['force','moment','udl','dim','text','diagramM','diagramQ','diagramN'];
let escapeCount=0;
let lastToolT=null;
const drawingShortcuts={t:'bar',l:'thin',d:'dashed',c:'curve',k:'dim'};
const drawingShortcutNames={bar:'T',thin:'L',dashed:'D',curve:'C',text:'TT',dim:'K'};
document.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase(),target=document.activeElement;
 const typing=target?.matches('input,textarea,select')||target?.isContentEditable;
 if(e.isComposing||typing||e.ctrlKey||e.altKey||e.metaKey||document.querySelector('dialog[open]')||drag||groupDrag||jointDrag||gesture){lastToolT=null;return}
 if(!drawingShortcuts[key]){lastToolT=null;return}
 e.preventDefault();e.stopImmediatePropagation();
 if(e.repeat)return;
 const now=performance.now(),tool=key==='t'&&lastToolT!==null&&now-lastToolT<700?'text':drawingShortcuts[key];
 lastToolT=key==='t'&&tool==='bar'?now:null;
 panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');
 document.querySelectorAll('details[open]').forEach(menu=>menu.open=false);
 chooseToolOptions(tool);
},true);
document.addEventListener('pointerdown',()=>{lastToolT=null},true);
window.addEventListener('blur',()=>{lastToolT=null});
document.addEventListener('keydown',e=>{
 if(e.key==='F3'){
  e.preventDefault();e.stopImmediatePropagation();
  if(!e.repeat)$('snapToggle').click();
  return;
 }
 if(e.key==='Escape'){
  e.preventDefault();e.stopImmediatePropagation();cancelActiveCommand();return;
 }
 if(e.altKey&&!e.ctrlKey&&e.key.toLowerCase()==='s'){
  e.preventDefault();e.stopImmediatePropagation();
  if(mode!=='labelEdit')$('editSelected').click();else editObjectLabel(items.find(o=>o.id===selected));
 }
},true);
// Escape and desktop canvas right-click share cancellation, never editor confirmation.
function cancelToSelection(){
 cancelMarquee();
 const keep=cancelSelection||{ids:[...selectedObjectIds()],primary:selected};
 cancelLoadPlacement();
 if(inlineEditor)inlineEditor.finish(false);
 if(jointDrag){items=jointDrag.before;chosenJoints=jointDrag.anchors;jointDrag=null}
 else if(groupDrag)items=groupDrag.before;
 else if(drag)items=drag.before;
 drag=null;groupDrag=null;boxSelect=null;
 cancelRigidDrag();
 sectionPoints=[];sectionPending=null;
 document.querySelector('[data-section-dialog]')?.remove();
 gesture=null;contacts.clear();touchSnapshot=null;suppressTouch=false;
 panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');
 closeSecondaryTools();document.querySelectorAll('details[open]').forEach(menu=>menu.open=false);
 document.activeElement?.blur();setMode('select');updateSelection(keep.ids,keep.primary);render();escapeCount=0;
}
document.addEventListener('pointerdown',e=>{
 if(!svg.contains(e.target)||e.pointerType!=='mouse')return;
 if(e.button===2){e.preventDefault();e.stopImmediatePropagation();cancelToSelection();return}
 if(e.button!==0||mode!=='select'||!e.ctrlKey||e.altKey||panEnabled||gesture||drag||groupDrag||rigidDrag||jointDrag)return;
 const id=e.target.closest('[data-id]')?.dataset.id;
 if(!items.some(o=>o.id===id))return;
 e.preventDefault();e.stopImmediatePropagation();
 const ids=selectedObjectIds();if(ids.has(id))ids.delete(id);else ids.add(id);
 updateSelection(ids,ids.has(id)?id:selected);render();
},true);
// Chorded right-button presses emit pointermove; compatibility mousedown may be
// suppressed by a handle's original pointerdown.preventDefault().
document.addEventListener('pointermove',e=>{
 if(e.pointerType!=='mouse'||e.button!==2||!(e.buttons&2)||!svg.contains(e.target))return;
 e.preventDefault();e.stopImmediatePropagation();cancelToSelection();
},true);
svg.addEventListener('contextmenu',e=>{
 // Touch long-press and controls outside the SVG retain browser behavior.
 if(e.pointerType==='touch')return;
 e.preventDefault();
});

document.addEventListener('pointerdown',()=>{escapeCount=0},true);
for(const [value,label]of [['pin-plain','Cố định · không gạch nền'],['roller-plain','Di động · không gạch nền']]){
 const option=document.createElement('option');option.value=value;option.textContent=label;$('support').append(option);
}
svg.addEventListener('pointermove',e=>{
 svg.querySelector('[data-midpoint-hint]')?.remove();
 svg.querySelector('[data-endpoint-hint]')?.remove();
 svg.querySelector('[data-intersection-hint]')?.remove();
 svg.querySelector('[data-extra-snap-hint]')?.remove();
 if(mode==='person'||drag?.o.type==='person'||groupDrag?.freeMove)return;
 if(!snapEnabled||panEnabled||gesture||['labelEdit','erase','extend'].includes(mode))return;
 if(rigidDrag||drag?.o.type==='rigidRegion')return;
 const raw=rawPoint(e),exclude=drag?selected:null;
 const intersection=intersectionSnap(raw,exclude),endpoint=endpointSnap(raw,exclude),midpoint=midpointSnap(raw,exclude);
 const contact=tangentSnap(raw,exclude);
 let p=intersection||endpoint||midpoint||contact?.point||snapToBar(raw,exclude),extra=p&&!intersection&&!endpoint&&!midpoint?(contact?'tangent':'member'):null;
 const construction=constructionSnap(e);if(construction){p=construction.point;extra=construction.kind}
 if(mode==='dim'&&first&&second&&snapOptions.dimension){
  const q=point(e),offset=offsetAt(first,second,q),aligned=snapDimensionOffset(first,second,offset);
  if(Math.abs(aligned-offset)>1e-8){
   const dx=second.x-first.x,dy=second.y-first.y,len=Math.hypot(dx,dy);
   p={x:q.x-dy/len*(aligned-offset),y:q.y+dx/len*(aligned-offset)};extra='dimension';
  }
 }
 if(!p)return;
 if(e.shiftKey&&first&&['bar','thin','dashed','udl'].includes(mode)){
  const constrained=drawingPoint(e);if(Math.hypot(constrained.x-p.x,constrained.y-p.y)>0.01)return;
 }
 const size=6/Math.abs(svg.getScreenCTM().a);
 const override=mode==='thin'&&first&&thinReferenceSession?thinReferenceOverrideAt(raw):mode==='support'&&supportPlacementSession?supportReferenceOverrideAt(raw):['force','moment','udl'].includes(mode)&&loadPlacement?loadReferenceOverrideAt(raw):null;
 const markerClass=override&&override.id!==(mode==='support'?supportPlacementSession?.referenceBarId:['force','moment','udl'].includes(mode)?loadPlacement?.referenceBarId:thinReferenceSession?.referenceBarId)?'reference-override':'';
 if(extra){
  const g=el('g',{'data-extra-snap-hint':extra,class:markerClass,'pointer-events':'none',stroke:'#087d95',fill:'white','stroke-width':1.5});
  if(extra==='perpendicular')el('path',{d:`M${p.x-size} ${p.y-size}V${p.y+size}H${p.x+size}M${p.x-size} ${p.y}H${p.x}V${p.y+size}`,fill:'none','vector-effect':'non-scaling-stroke'},g);
  else if(extra==='pendingIntersection')el('path',{d:`M${p.x-size} ${p.y-size}L${p.x+size} ${p.y+size}M${p.x-size} ${p.y+size}L${p.x+size} ${p.y-size}`,'vector-effect':'non-scaling-stroke'},g);
  else el('path',{d:`M${p.x} ${p.y-size}L${p.x+size} ${p.y}L${p.x} ${p.y+size}L${p.x-size} ${p.y}Z`,'vector-effect':'non-scaling-stroke'},g);
  return;
 }
 if(intersection){
  const g=el('g',{'data-intersection-hint':'true',class:markerClass,'pointer-events':'none'});
  el('path',{d:`M${p.x-size} ${p.y-size}L${p.x+size} ${p.y+size}M${p.x-size} ${p.y+size}L${p.x+size} ${p.y-size}`,stroke:'#087d95','stroke-width':2,'vector-effect':'non-scaling-stroke'},g);return;
 }
 if(endpoint){
  const g=el('g',{'data-endpoint-hint':'true',class:markerClass,'pointer-events':'none'});
  el('circle',{cx:p.x,cy:p.y,r:size+2/Math.abs(svg.getScreenCTM().a),fill:'none',stroke:'#087d95','stroke-width':2,'vector-effect':'non-scaling-stroke'},g);
  el('circle',{cx:p.x,cy:p.y,r:2/Math.abs(svg.getScreenCTM().a),fill:'#087d95'},g);
  return;
 }
 const g=el('g',{'data-midpoint-hint':'true',class:markerClass,'pointer-events':'none'});
 el('path',{d:`M${p.x} ${p.y-size} L${p.x+size} ${p.y+size} L${p.x-size} ${p.y+size} Z`,fill:'white',stroke:'#087d95','stroke-width':1.5,'vector-effect':'non-scaling-stroke'},g);
});
svg.addEventListener('pointerleave',()=>{svg.querySelector('[data-extra-snap-hint]')?.remove();svg.querySelector('[data-midpoint-hint]')?.remove();svg.querySelector('[data-endpoint-hint]')?.remove();svg.querySelector('[data-intersection-hint]')?.remove()});
function applyCamera(){
 clearPersonPreview();
 svg.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.w} ${camera.h}`);
 $('zoomLevel').textContent=Math.round(1100/camera.w*100)+'%';
 if(['support','force','udl'].includes(mode))renderReferenceAnglePreview();
}
function zoomAt(factor,anchor={x:camera.x+camera.w/2,y:camera.y+camera.h/2}){
 const w=Math.max(137.5,Math.min(4400,camera.w/factor)),ratio=w/camera.w;
 camera={x:anchor.x-(anchor.x-camera.x)*ratio,y:anchor.y-(anchor.y-camera.y)*ratio,w,h:camera.h*ratio};
 applyCamera();
}
function viewButton(id,label,handler){
 const button=document.createElement('button');button.id=id;button.textContent=label;button.type='button';button.onclick=handler;
 $('viewTools').append(button);return button;
}
viewButton('zoomOut','−',()=>zoomAt(1/1.25)).setAttribute('aria-label','Thu nhỏ');
const zoomLabel=document.createElement('output');zoomLabel.id='zoomLevel';zoomLabel.textContent='100%';$('viewTools').append(zoomLabel);
viewButton('zoomIn','+',()=>zoomAt(1.25)).setAttribute('aria-label','Phóng to');
function activateSelection(){
 rememberCancelSelection();const retainedSelection=cancelSelection;
 cancelLoadPlacement();
 if(inlineEditor)inlineEditor.finish(true);
 if(jointDrag)items=jointDrag.before;
 else if(groupDrag)items=groupDrag.before;
 else if(drag)items=drag.before;
 jointDrag=null;groupDrag=null;drag=null;boxSelect=null;chosenJoints=[];
 gesture=null;contacts.clear();touchSnapshot=null;suppressTouch=false;
 selected=null;
 panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');
 document.querySelectorAll('details[open]').forEach(panel=>panel.open=false);
 closeSecondaryTools();setMode('select');cancelSelection=retainedSelection;
}
viewButton('resetView','Chọn',activateSelection).dataset.toolbarIcon='select';
$('tools').querySelector('[data-mode="select"]').onclick=activateSelection;
const panButton=viewButton('panView','Di chuyển trang',()=>{panEnabled=!panEnabled;panButton.classList.toggle('active',panEnabled);panButton.setAttribute('aria-pressed',String(panEnabled));svg.style.cursor=panEnabled?'grab':''});
panButton.setAttribute('aria-pressed','false');
function showTemporaryPan(e){
 const active=panEnabled||!!(e.ctrlKey&&e.altKey);
 svg.style.cursor=active?'grab':'';
 panButton.classList.toggle('active',active);
 panButton.setAttribute('aria-pressed',String(active));
}
document.addEventListener('keydown',showTemporaryPan);
document.addEventListener('keyup',showTemporaryPan);
window.addEventListener('blur',()=>showTemporaryPan({}));
function editObjectLabel(object){
 if(!object||!editableTypes.includes(object.type))return;
 if(inlineEditor)inlineEditor.finish(true);
 selected=object.id;render();
 const group=[...svg.querySelectorAll('g[data-id]')].find(g=>g.dataset.id===object.id);
 const texts=group?.querySelectorAll('text');
 if(texts?.length)editLabel(object,texts[texts.length-1]);
}
viewButton('editSelected','Sửa nhãn',()=>{
 if(inlineEditor)inlineEditor.finish(true);
 if(mode==='labelEdit'){setMode('select');return}
 panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');
 setMode('labelEdit');editObjectLabel(items.find(o=>o.id===selected));
 msg('Bấm lần lượt các nhãn để sửa. Enter lưu; Esc hoặc Chọn để thoát.');
});
svg.addEventListener('pointerdown',e=>{
 if(mode!=='labelEdit'||e.button!==0)return;
 e.preventDefault();e.stopImmediatePropagation();
 const id=e.target.closest('[data-id]')?.dataset.id;
 editObjectLabel(items.find(o=>o.id===id));
},true);
let objectClipboard=[],clipboardBase=null,pendingCopy=[];
function copySelection(){
 const ids=new Set(multiSelection);if(selected)ids.add(selected);
 const chosen=items.filter(o=>ids.has(o.id));
 if(!chosen.length){msg('Chọn đối tượng hoặc nhóm cần sao chép.');return}
 pendingCopy=copy(chosen);activateSelection();setMode('copyBase');msg('Chọn điểm gốc để chèn bản sao. Esc để hủy.');
}
function pasteObjects(){
 if(!objectClipboard.length){msg('Chưa có đối tượng được sao chép.');return}
 if(items.length+objectClipboard.length>2000){msg('Bản vẽ tối đa 2000 đối tượng.');return}
 if(!clipboardBase){msg('Chưa chọn điểm gốc sao chép.');return}
 activateSelection();setMode('pastePoint');msg('Chọn vị trí đặt điểm gốc của bản sao. Esc để hủy.');
}
function placeClipboard(target){
 if(items.length+objectClipboard.length>2000){msg('Bản vẽ tối đa 2000 đối tượng.');return}
 const dx=target.x-clipboardBase.x,dy=target.y-clipboardBase.y;
 const copiedGroups=new Map();
 const added=copy(objectClipboard).map(o=>{
  if(o.sectionGroup){if(!copiedGroups.has(o.sectionGroup))copiedGroups.set(o.sectionGroup,newId());o.sectionGroup=copiedGroups.get(o.sectionGroup)}
  o.id=newId();o.x+=dx;o.y+=dy;
  if(o.x2!==undefined){o.x2+=dx;o.y2+=dy}return o;
 });
 checkpoint();items.push(...added);
 panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');
 setMode('select');
 multiSelection=new Set(added.map(o=>o.id));selected=added.length===1?added[0].id:null;
 render();msg('Đã dán '+added.length+' đối tượng theo điểm gốc. Ctrl+V để dán tiếp.');
}
document.addEventListener('pointerdown',e=>{
 if(!['copyBase','pastePoint'].includes(mode)||!svg.contains(e.target)||e.button!==0||panEnabled||gesture||e.ctrlKey&&e.altKey)return;
 e.preventDefault();e.stopImmediatePropagation();const p=point(e);
 if(mode==='copyBase'){
  objectClipboard=pendingCopy;clipboardBase={x:p.x,y:p.y};pendingCopy=[];setMode('select');
  msg('Đã sao chép với điểm gốc. Bấm Dán hoặc Ctrl+V rồi chọn vị trí chèn.');
 }else placeClipboard(p);
},true);
svg.addEventListener('pointermove',e=>{
 if(!['copyBase','pastePoint'].includes(mode))return;
 svg.querySelector('[data-insertion-point]')?.remove();const p=point(e),s=8/Math.abs(svg.getScreenCTM().a);
 const g=el('g',{'data-insertion-point':'true','pointer-events':'none',stroke:'#087d95','stroke-width':1.5});
 line(g,p.x-s,p.y,p.x+s,p.y);line(g,p.x,p.y-s,p.x,p.y+s);
});
viewButton('copyObjects','Sao chép',copySelection);
viewButton('pasteObjects','Dán',pasteObjects);
const lineStyleLabel=document.createElement('div');
lineStyleLabel.id='lineStyleTools';
lineStyleLabel.setAttribute('role','group');lineStyleLabel.setAttribute('aria-label','Đổi nét');
lineStyleLabel.style.cssText='display:inline-flex;align-items:center;gap:6px;margin:0';
const changeLineButton=document.createElement('button');changeLineButton.id='changeLineStyle';
changeLineButton.type='button';changeLineButton.textContent='Đổi nét';
changeLineButton.title='Chọn thanh hoặc nét thẳng trên hình để đổi kiểu nét';
changeLineButton.onclick=()=>{
 if(inlineEditor)inlineEditor.finish(true);
 panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');
 const ids=new Set(multiSelection);setMode('select');multiSelection=ids;render();
 closeSecondaryTools();
 if(selectedLines().length)lineStyle.focus();
 else msg('Chọn thanh hoặc nét thẳng trên hình, rồi chọn Thanh, Nét liền mảnh hoặc Nét đứt mảnh trong ô Đổi nét.');
};
lineStyleLabel.append(changeLineButton);
const lineStyle=document.createElement('select');lineStyle.id='lineStyle';lineStyle.setAttribute('aria-label','Đổi kiểu nét đã chọn');
lineStyle.style.cssText='width:auto;margin:0';
for(const [value,label]of [['','Chọn nét trên hình'],['bar','Thanh'],['thin','Nét liền mảnh'],['dashed','Nét đứt mảnh']]){
 const option=document.createElement('option');option.value=value;option.textContent=label;lineStyle.append(option);
}
lineStyleLabel.append(lineStyle);lineStyleLabel.hidden=true;$('viewTools').append(lineStyleLabel);
function selectedLines(){
 const ids=new Set(multiSelection);if(selected)ids.add(selected);
 return items.filter(o=>ids.has(o.id)&&['bar','thin','dashed'].includes(o.type));
}
function refreshLineStyle(){
 const control=document.getElementById('lineStyle');if(!control)return;
 const lines=selectedLines(),types=new Set(lines.map(o=>o.type));
 control.disabled=!lines.length;control.value=types.size===1?lines[0].type:'';
 control.options[0].textContent=lines.length?'Nhiều kiểu nét':'Chọn nét trên hình';
}
lineStyle.onchange=()=>{
 const type=lineStyle.value;if(!['bar','thin','dashed'].includes(type))return;
 const lines=selectedLines().filter(o=>o.type!==type);if(!lines.length)return;
 checkpoint();for(const o of lines)o.type=type;render();msg('Đã đổi kiểu nét cho '+lines.length+' đối tượng.');
};
refreshLineStyle();
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&mode==='labelEdit'){setMode('select');return}
 if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)||document.activeElement.isContentEditable)return;
 if((e.ctrlKey||e.metaKey)&&!e.altKey){
  if(e.key.toLowerCase()==='c'){e.preventDefault();copySelection()}
  if(e.key.toLowerCase()==='v'){e.preventDefault();pasteObjects()}
 }
});
// Session-only toolbox presentation; independent of drawing/document state.
const floatingToolsMedia=matchMedia('(any-pointer: coarse)');
let floatingToolsOpen=false,floatingToolsSide='left',floatingToolsRatio=.35,floatingToolsDrag=null,floatingToolsSuppressClick=false;
const toolboxPanel=$('toolPanel'),toolboxHandle=$('toggleTools'),toolboxShell=toolboxPanel.parentElement;
const toolboxPin=document.createElement('button');toolboxPin.id='toolboxPin';toolboxPin.type='button';
toolboxPin.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 7 3 3v2H6v-2l3-3zM12 15v6"/></svg>';
const toolboxHeading=document.createElement('div');toolboxHeading.className='toolbox-heading';
toolboxPanel.prepend(toolboxHeading);toolboxHeading.append(toolboxPanel.querySelector('h2'),toolboxPin);
toolboxShell.append(toolboxHandle);toolboxHandle.className='toolbox-edge-handle';
let toolboxMode='pinned-open',toolboxOpen=false,toolboxCloseTimer=null,toolboxTouchInteraction=false;
function cancelToolboxClose(){clearTimeout(toolboxCloseTimer);toolboxCloseTimer=null}
function paintToolbox(){
 if(floatingToolsMedia.matches){paintFloatingTools();return}
 const visible=toolboxMode==='pinned-open'||toolboxMode==='auto-hide'&&toolboxOpen;
 toolboxShell.dataset.toolboxMode=toolboxMode;toolboxShell.classList.toggle('toolbox-overlay-open',toolboxMode==='auto-hide'&&toolboxOpen);
 document.body.classList.toggle('tools-collapsed',!visible);
 toolboxPanel.hidden=!visible;toolboxPanel.inert=!visible;
 toolboxHandle.textContent=visible?'‹':'›';toolboxHandle.setAttribute('aria-expanded',String(visible));
 toolboxHandle.title=visible?'Thu gọn thanh Công cụ':'Mở thanh Công cụ';toolboxHandle.setAttribute('aria-label',toolboxHandle.title);
 toolboxPin.setAttribute('aria-pressed',String(toolboxMode==='pinned-open'));
 toolboxPin.title=toolboxMode==='pinned-open'?'Tự động ẩn thanh Công cụ':'Ghim thanh Công cụ';toolboxPin.setAttribute('aria-label',toolboxPin.title);
}
function setToolboxMode(next){cancelToolboxClose();toolboxMode=next;toolboxOpen=false;paintToolbox()}
function openToolboxOverlay(){if(floatingToolsMedia.matches)return;if(toolboxMode!=='auto-hide')return;cancelToolboxClose();toolboxOpen=true;paintToolbox()}
function toolboxHasKeyboardFocus(){return [toolboxHandle,toolboxPanel].some(el=>el.contains(document.activeElement)&&document.activeElement.matches(':focus-visible'))}
function scheduleToolboxClose(){
 if(floatingToolsMedia.matches)return;
 if(toolboxMode!=='auto-hide')return;cancelToolboxClose();
 toolboxCloseTimer=setTimeout(()=>{if(toolboxHasKeyboardFocus())return;toolboxOpen=false;paintToolbox()},400);
}
toolboxHandle.onclick=()=>{
 if(floatingToolsMedia.matches){if(floatingToolsSuppressClick){floatingToolsSuppressClick=false;return}floatingToolsOpen=!floatingToolsOpen;paintFloatingTools();return}
 if(toolboxMode==='collapsed')setToolboxMode('pinned-open');
 else if(toolboxMode==='auto-hide'&&!toolboxOpen)openToolboxOverlay();
 else setToolboxMode('collapsed');
};
toolboxPin.onclick=()=>{
 if(toolboxMode==='pinned-open'){toolboxHandle.focus({preventScroll:true});setToolboxMode('auto-hide')}
 else setToolboxMode('pinned-open');
};
for(const target of [toolboxHandle,toolboxPanel]){
 target.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')openToolboxOverlay()});
 target.addEventListener('pointerleave',e=>{if(e.pointerType!=='touch')scheduleToolboxClose()});
 target.addEventListener('focusin',()=>{if(toolboxHasKeyboardFocus())openToolboxOverlay()});
 target.addEventListener('focusout',()=>{if(!toolboxTouchInteraction)scheduleToolboxClose()});
}
document.addEventListener('keydown',e=>{if(e.key==='Tab')toolboxTouchInteraction=false},true);
document.addEventListener('pointerdown',e=>{
 toolboxTouchInteraction=e.pointerType==='touch';
 if(toolboxMode!=='auto-hide'||!toolboxOpen||toolboxPanel.contains(e.target)||toolboxHandle.contains(e.target))return;
 cancelToolboxClose();toolboxOpen=false;paintToolbox();
},true);
if(!floatingToolsMedia.matches)paintToolbox();
for(const [id,title,types]of [
 ['interactionTools','Thao tác',['select']],
 ['drawingTools','Vẽ',['bar','thin','dashed','curve','extend','hatch','rigidRegion']],
 ['symbolTools','Tải trọng',['support','hinge','force','moment','udl']],
 ['annotationTools','Chú thích',['dim','text','person','positive','negative','diagramM','diagramQ','diagramN']]
]){
 const section=document.createElement('section');section.id=id;section.className='tool-group';
 const heading=document.createElement('h3');heading.id=id+'Title';heading.textContent=title;
 section.setAttribute('aria-labelledby',heading.id);
 const buttons=document.createElement('div');buttons.className='tool-buttons';
 for(const type of types)buttons.append($('tools').querySelector(`[data-mode="${type}"]`));
 section.append(heading,buttons);$('tools').append(section);
}
$('drawingTools').append(hatchPanel);
for(const id of ['support','direction','rotation'])$('symbolTools').append($(id).closest('label'));

function captureDrawing(){
 return {items:copy(items),past:copy(past),future:copy(future),selected,first:copy(first),second:copy(second),hover:copy(hover),hatchPoints:copy(hatchPoints),rigidPoints:copy(rigidPoints),rigidPivot:copy(rigidPivot),extendBoundary,multiSelection:[...multiSelection]};
}
function restoreDrawing(snapshot){
 if(mode==='section'||mirrorSelecting)clearMultiPointCommand();
 cancelConcentratedLoadPlacement();
 clearSupportPlacement();
 if(!snapshot)return;
 jointDrag=null;rigidDrag=null;rigidPivot=snapshot.rigidPivot||null;rigidSnapHint=null;rigidPoints=snapshot.rigidPoints||[];
 items=snapshot.items;past=snapshot.past;future=snapshot.future;selected=snapshot.selected;first=snapshot.first;second=snapshot.second;hover=snapshot.hover;
 hatchPoints=snapshot.hatchPoints;extendBoundary=snapshot.extendBoundary;multiSelection=new Set(snapshot.multiSelection);
 // Restored first/items are new objects: rebuild transient reference state, never reuse the gesture lock.
 beginThinReferenceSession();
 drag=null;groupDrag=null;boxSelect=null;render();
}
function stopPointer(e){e.preventDefault();e.stopImmediatePropagation()}
function contactPair(){
 const [a,b]=[...contacts.values()];
 return {mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))};
}
function beginPinch(){
 const pair=contactPair(),matrix=svg.getScreenCTM().inverse();
 gesture={kind:'pinch',camera:{...camera},distance:pair.distance,anchor:new DOMPoint(pair.mid.x,pair.mid.y).matrixTransform(matrix)};
}
// Capture on the parent runs before the editor's SVG pointer handlers.
document.addEventListener('pointerdown',e=>{
 if(!svg.contains(e.target))return;
 if(e.pointerType==='touch'){
  if(!contacts.size){touchSnapshot=captureDrawing();suppressTouch=false}
  contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(contacts.size>=2){
   if(!suppressTouch)restoreDrawing(touchSnapshot);
   suppressTouch=true;beginPinch();svg.setPointerCapture(e.pointerId);stopPointer(e);return;
  }
  if(suppressTouch){stopPointer(e);return}
 }
 if((panEnabled||(e.ctrlKey&&e.altKey))&&e.button===0){
  const matrix=svg.getScreenCTM().inverse();
  gesture={kind:'pan',id:e.pointerId,camera:{...camera},matrix,start:new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix)};
  svg.setPointerCapture(e.pointerId);stopPointer(e);
 }
},true);
document.addEventListener('pointermove',e=>{
 if(contacts.has(e.pointerId))contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(gesture?.kind==='pinch'&&contacts.size>=2){
  const pair=contactPair(),base=gesture.camera;
  const width=Math.max(137.5,Math.min(4400,base.w*gesture.distance/pair.distance));
  camera={...base,w:width,h:base.h*width/base.w};applyCamera();
  const current=new DOMPoint(pair.mid.x,pair.mid.y).matrixTransform(svg.getScreenCTM().inverse());
  camera.x+=gesture.anchor.x-current.x;camera.y+=gesture.anchor.y-current.y;applyCamera();stopPointer(e);
 }else if(gesture?.kind==='pan'&&gesture.id===e.pointerId){
  const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(gesture.matrix);
  camera={...gesture.camera,x:gesture.camera.x+gesture.start.x-p.x,y:gesture.camera.y+gesture.start.y-p.y};applyCamera();stopPointer(e);
 }else if(suppressTouch&&e.pointerType==='touch')stopPointer(e);
},true);
function finishGesture(e){
 const tracked=contacts.has(e.pointerId),blocked=(tracked&&suppressTouch)||(gesture?.kind==='pan'&&gesture.id===e.pointerId);
 if(tracked)contacts.delete(e.pointerId);
 if(e.type==='pointercancel'&&tracked&&!suppressTouch){restoreDrawing(touchSnapshot);stopPointer(e)}
 if(blocked)stopPointer(e);
 if(gesture?.id===e.pointerId||contacts.size<2)gesture=null;
 else if(suppressTouch)beginPinch();
 if(!contacts.size){touchSnapshot=null;suppressTouch=false}
}
document.addEventListener('pointerup',finishGesture,true);
document.addEventListener('pointercancel',finishGesture,true);
svg.addEventListener('wheel',e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();zoomAt(Math.exp(-e.deltaY*0.003),rawPoint(e))}},{passive:false});

// Word is a local Windows capability; static hosting and Android use image export.
if(location.hostname==='localhost'){
 fetch('/bridge-info',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(info=>{
  if(info?.token){wordBridgeToken=info.token;wordButton.hidden=false}
 }).catch(()=>{});
}
if(location.search.includes('token='))history.replaceState(null,'',location.pathname);
const installButton=$('installApp');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();if(matchMedia('(display-mode: standalone)').matches)return;installPrompt=e;installButton.hidden=false});
installButton.onclick=async()=>{
 if(!installPrompt)return;
 await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installButton.hidden=true;
};
window.addEventListener('appinstalled',()=>{installButton.hidden=true;installPrompt=null});
const KETCAU_APP_VERSION='shell-v8';
let pwaRegistration=null;
if('serviceWorker' in navigator&&window.isSecureContext&&location.protocol!=='file:'){
 const indicator=document.createElement('small');indicator.className='offline-ready';indicator.id='pwaStatus';indicator.setAttribute('role','status');
 document.querySelector('header>div').append(indicator);
 const versionLabel=document.createElement('span');versionLabel.className='pwa-version';versionLabel.textContent=KETCAU_APP_VERSION+' | ';
 const statusLabel=document.createElement('span');indicator.append(versionLabel,statusLabel);
 let readyNoticeTimer=null;
 const status=(state,text)=>{
  if(indicator.dataset.state===state&&statusLabel.textContent===text)return;
  clearTimeout(readyNoticeTimer);delete indicator.dataset.dismissed;
  indicator.dataset.state=state;statusLabel.textContent=text;
  if(state==='ready')readyNoticeTimer=setTimeout(()=>{indicator.dataset.dismissed='true'},5000);
 };
 const waiting=()=>{if(!pwaRegistration?.waiting)return false;status('update','Có phiên bản mới. Đóng tất cả cửa sổ ứng dụng rồi mở lại để cập nhật.');return true};
 function readiness(){
  if(waiting())return;
  const worker=pwaRegistration?.active;if(!worker)return;
  const channel=new MessageChannel();
  channel.port1.onmessage=event=>{channel.port1.close();if(waiting())return;status(event.data.ready?'ready':'unavailable',event.data.ready?'Đã sẵn sàng ngoại tuyến':'Chưa sẵn sàng ngoại tuyến')};
  worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
 }
 async function checkUpdate(){
  if(!navigator.onLine||!pwaRegistration)return;
  try{await pwaRegistration.update()}catch{/* Offline/transient failure must not interrupt drawing. */}
  readiness();
 }
 navigator.serviceWorker.addEventListener('controllerchange',readiness);
 window.addEventListener('online',checkUpdate);
 navigator.serviceWorker.register('./sw.js').then(registration=>{
  pwaRegistration=registration;
  const observe=()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'||worker.state==='activated'){if(!waiting())readiness()}})};
  registration.addEventListener('updatefound',observe);observe();
  if(!waiting())status('checking','Đang kiểm tra ngoại tuyến...');
  navigator.serviceWorker.ready.then(readiness);
  checkUpdate();
 }).catch(()=>status('unavailable','Chưa sẵn sàng ngoại tuyến; vẫn có thể vẽ và lưu JSON.'));
}

// A document is a JSON file. Browser drafts remain a recovery copy, not a file save.
let documentHandle=null,documentName='Chưa đặt tên.json',documentDiskText=null,fileBusy=false;
const documentText=()=>JSON.stringify({format:'ket-cau-studio',version:1,items,geometryScale,internalForceScale},null,2);
let savedDocument=items.length?'':documentText();
const fileMenu=document.createElement('details');fileMenu.id='fileMenu';
const fileSummary=document.createElement('summary');fileSummary.textContent='File';
const fileCommands=document.createElement('div');fileCommands.className='file-commands';
fileMenu.append(fileSummary,fileCommands);$('actions').prepend(fileMenu);
const fileStatus=document.createElement('span');fileStatus.id='fileStatus';fileStatus.setAttribute('aria-live','polite');fileMenu.after(fileStatus);
const headerFileName=document.createElement('span');headerFileName.id='headerFileName';headerFileName.hidden=true;headerFileName.setAttribute('aria-live','polite');document.querySelector('header strong').after(headerFileName);
function updateFileStatus(){
 syncDrawingScaleControls();
 const status=document.getElementById('fileStatus');if(!status)return;
 const dirty=documentText()!==savedDocument;
 const named=documentName!=='Chưa đặt tên.json';
 headerFileName.hidden=!named;headerFileName.textContent=named?documentName+(dirty?' *':''):'';headerFileName.title=named?documentName:'';
 status.textContent=documentName+(dirty?' • Chưa lưu':'');
 document.title=(dirty?'* ':'')+documentName+' — Kết cấu Studio';
}
function finishDocumentEdit(){if(inlineEditor)inlineEditor.finish(true)}
function allowReplaceDocument(){
 finishDocumentEdit();
 return documentText()===savedDocument||confirm('Bản vẽ có thay đổi chưa lưu vào tệp. Tiếp tục và bỏ thay đổi? Chọn Hủy để quay lại Lưu.');
}
const documentTypes=[{description:'Bản vẽ Kết cấu Studio',accept:{'application/json':['.json']}}];
const openDialog=document.createElement('dialog');openDialog.id='openDrawingDialog';
openDialog.innerHTML='<h2>Mở bản vẽ</h2><div class="open-actions"><button id="browseDrawingFolder">Chọn thư mục…</button><button id="browseDrawingFiles">Chọn tệp JSON…</button></div><p>Chọn thư mục hoặc tệp trên máy / OneDrive, rồi chọn bản vẽ để xem trước.</p><div class="open-layout"><div id="drawingFileList" aria-label="Danh sách bản vẽ"></div><div class="drawing-preview"><img id="drawingFilePreview" alt="Xem trước kết cấu" hidden><p id="drawingFileInfo">Chưa chọn tệp.</p></div></div><div class="open-actions"><button id="confirmOpenDrawing" disabled>Mở bản vẽ</button><button id="cancelOpenDrawing">Hủy</button></div>';
document.body.append(openDialog);
let openCandidates=[],chosenCandidate=null,previewVersion=0;
const candidateInput=document.createElement('input');candidateInput.type='file';candidateInput.accept='.json';candidateInput.multiple=true;candidateInput.hidden=true;document.body.append(candidateInput);
const folderInput=document.createElement('input');folderInput.type='file';folderInput.multiple=true;folderInput.setAttribute('webkitdirectory','');folderInput.hidden=true;document.body.append(folderInput);
function previewDrawing(data){
 const previous=items;const title=document.title,status=$('fileStatus').textContent;
 try{
  items=data.items;render(true);
  const groups=[...svg.querySelectorAll('g[data-id]')];
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const g of groups){const b=g.getBBox();left=Math.min(left,b.x);top=Math.min(top,b.y);right=Math.max(right,b.x+b.width);bottom=Math.max(bottom,b.y+b.height)}
  const out=svg.cloneNode(true);out.setAttribute('width','700');out.setAttribute('height','480');
  if(Number.isFinite(left))out.setAttribute('viewBox',`${left-30} ${top-30} ${Math.max(80,right-left+60)} ${Math.max(80,bottom-top+60)}`);
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(out));
 }finally{items=previous;render();document.title=title;$('fileStatus').textContent=status}
}
async function selectCandidate(candidate){
 const version=++previewVersion;chosenCandidate=null;$('confirmOpenDrawing').disabled=true;$('drawingFilePreview').hidden=true;
 for(const b of $('drawingFileList').children)b.classList.toggle('active',b.dataset.name===candidate.name);
 $('drawingFileInfo').textContent='Đang đọc '+candidate.name+'…';
 try{
  const file=candidate.handle?await candidate.handle.getFile():candidate.file;
  if(file.size>2000000)throw Error('Tệp quá lớn.');
  const data=JSON.parse(await file.text());validate(data);
  if(version!==previewVersion)return;
  $('drawingFilePreview').src=previewDrawing(data);$('drawingFilePreview').hidden=false;
  $('drawingFileInfo').textContent=candidate.name+' · '+data.items.length+' đối tượng';
  chosenCandidate=candidate;$('confirmOpenDrawing').disabled=false;
 }catch(e){if(version===previewVersion)$('drawingFileInfo').textContent='Không mở được '+candidate.name+': '+e.message}
}
function listCandidates(candidates){
 previewVersion++;chosenCandidate=null;$('confirmOpenDrawing').disabled=true;$('drawingFilePreview').hidden=true;
 openCandidates=candidates.filter(c=>c.name.toLowerCase().endsWith('.json')).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 $('drawingFileList').replaceChildren();
 for(const candidate of openCandidates){const b=document.createElement('button');b.textContent=candidate.name;b.dataset.name=candidate.name;b.onclick=()=>selectCandidate(candidate);$('drawingFileList').append(b)}
 $('drawingFileInfo').textContent=openCandidates.length?'Chọn tệp để xem trước.':'Không có tệp JSON trong thư mục.';
}
$('browseDrawingFiles').onclick=async()=>{
 if(!window.showOpenFilePicker){candidateInput.click();return}
 try{const handles=await window.showOpenFilePicker({types:documentTypes,multiple:true});listCandidates(handles.map(handle=>({name:handle.name,handle})))}catch(e){if(e.name!=='AbortError')$('drawingFileInfo').textContent=e.message}
};
$('browseDrawingFolder').onclick=async()=>{
 if(!window.showDirectoryPicker){folderInput.click();return}
 try{const folder=await window.showDirectoryPicker({mode:'read'}),candidates=[];for await(const handle of folder.values())if(handle.kind==='file')candidates.push({name:handle.name,handle});listCandidates(candidates)}catch(e){if(e.name!=='AbortError')$('drawingFileInfo').textContent=e.message}
};
candidateInput.onchange=()=>{listCandidates([...candidateInput.files].map(file=>({name:file.name,file})));candidateInput.value=''};
folderInput.onchange=()=>{listCandidates([...folderInput.files].map(file=>({name:file.webkitRelativePath||file.name,file})));folderInput.value=''};
$('cancelOpenDrawing').onclick=()=>openDialog.close();
openDialog.addEventListener('close',()=>{previewVersion++});
$('confirmOpenDrawing').onclick=async()=>{
 if(!chosenCandidate||fileBusy||!allowReplaceDocument())return;
 const candidate=chosenCandidate;fileBusy=true;
 try{await loadDocument(candidate.handle?await candidate.handle.getFile():candidate.file,candidate.handle||null);openDialog.close()}
 catch(e){$('drawingFileInfo').textContent='Không mở được: '+e.message}finally{fileBusy=false}
};
async function loadDocument(file,handle=null){
 if(file.size>2000000)throw Error('Tệp quá lớn.');
 const text=await file.text(),data=JSON.parse(text),next=validate(data);
 closeDrawingScales();
 checkpoint();items=next;restoreDrawingScales(data);
 drag=null;groupDrag=null;boxSelect=null;selected=null;
 documentHandle=handle;documentName=file.name;documentDiskText=text;savedDocument=documentText();
 setMode('select');saveDraft();msg('Đã mở '+documentName);
}
async function openDocument(){
 clearMultiPointCommand();
 cancelConcentratedLoadPlacement();
 clearSupportPlacement();
 if(fileBusy)return;
 finishDocumentEdit();fileMenu.open=false;openDialog.showModal();
}
async function saveDocument(saveAs=false){
 if(fileBusy)return false;finishDocumentEdit();fileBusy=true;fileMenu.open=false;
 try{
  const text=documentText();validate(JSON.parse(text));
  if(!window.showSaveFilePicker){
   const name=prompt('Tên tệp JSON để tải xuống:',documentName);if(!name)return false;
   const filename=name.toLowerCase().endsWith('.json')?name:name+'.json';
   download(new Blob([text],{type:'application/json'}),filename);
   msg('Đã gửi tệp tải xuống. Trình duyệt này không ghi đè trực tiếp; hãy giữ tệp trong thư mục OneDrive.');
   return false;
  }
  let handle=documentHandle;
  if(saveAs||!handle)handle=await window.showSaveFilePicker({suggestedName:documentName,types:documentTypes});
  if(handle===documentHandle&&documentDiskText!==null){
   const current=await (await handle.getFile()).text();
   if(current!==documentDiskText&&!confirm('Tệp đã thay đổi bên ngoài ứng dụng, có thể từ máy khác. Ghi đè bằng bản vẽ đang mở?'))return false;
  }
  const writer=await handle.createWritable();
  try{await writer.write(text);await writer.close()}catch(e){try{await writer.abort()}catch{}throw e}
  documentHandle=handle;documentName=handle.name;documentDiskText=text;savedDocument=text;
  updateFileStatus();saveDraft();msg('Đã lưu '+documentName);return true;
 }catch(e){if(e.name!=='AbortError')msg('Không lưu được: '+e.message);return false}finally{fileBusy=false}
}
function newDocument(){
 if(fileBusy||!allowReplaceDocument())return;
 closeDrawingScales();
 fileMenu.open=false;checkpoint();items=[];restoreDrawingScales();selected=null;drag=null;groupDrag=null;boxSelect=null;
 documentHandle=null;documentName='Chưa đặt tên.json';documentDiskText=null;savedDocument=documentText();
 setMode('select');saveDraft();msg('Bản vẽ mới. Chọn Lưu để đặt tên và thư mục.');
}
for(const [id,label,handler]of [['clear','Mới',newDocument],['open','Mở…  Ctrl+O',openDocument],['save','Lưu  Ctrl+S',()=>saveDocument()],['saveAs','Lưu thành…  Ctrl+Shift+S',()=>saveDocument(true)]]){
 const button=$(id)||document.createElement('button');button.id=id;button.textContent=label;button.onclick=handler;fileCommands.append(button);
}
$('file').onchange=async e=>{
 const file=e.target.files[0];if(!file)return;
 try{if(!fileBusy){fileBusy=true;await loadDocument(file)}}catch(error){msg('Không mở được: '+error.message)}finally{fileBusy=false;e.target.value=''}
};
document.addEventListener('keydown',e=>{
 if(!(e.ctrlKey||e.metaKey)||e.altKey)return;
 if(e.key.toLowerCase()==='s'){e.preventDefault();e.stopImmediatePropagation();saveDocument(e.shiftKey)}
 else if(e.key.toLowerCase()==='o'){e.preventDefault();e.stopImmediatePropagation();openDocument()}
},true);
document.addEventListener('pointerdown',e=>{if(!fileMenu.contains(e.target))fileMenu.open=false});
document.addEventListener('keydown',e=>{if(e.key==='Escape')fileMenu.open=false});
window.addEventListener('beforeunload',e=>{if(documentText()!==savedDocument){e.preventDefault();e.returnValue=''}});
updateFileStatus();

// Move existing commands into menus: one button and handler per command.
fileMenu.classList.add('command-menu');
function commandMenu(id,title,commands){
 const menu=document.createElement('details');menu.id=id;menu.className='command-menu';
 const summary=document.createElement('summary');summary.textContent=title;
 const panel=document.createElement('div');panel.className='file-commands';
 for(const command of commands)panel.append(typeof command==='string'?$(command):command);
 menu.append(summary,panel);$('actions').insertBefore(menu,fileStatus);return menu;
}
const editMenu=commandMenu('editMenu','Chỉnh sửa',['undo','redo','copyObjects','pasteObjects','editSelected','delete']);
const fileSeparator=document.createElement('hr');fileSeparator.style.cssText='width:100%;border:0;border-top:1px solid #dce4ea;margin:6px 0';
fileCommands.append(fileSeparator,$('svg'),$('png'),wordButton);
const insertHelp=document.createElement('p');insertHelp.textContent='Mở bằng Ket-Cau-Studio.vbs trên Windows để chèn trực tiếp vào Word. Có thể dùng Xuất hình để chèn ảnh thủ công.';
fileCommands.append(insertHelp);
function updateInsertMenu(){insertHelp.hidden=!wordButton.hidden}
new MutationObserver(updateInsertMenu).observe(wordButton,{attributes:true,attributeFilter:['hidden']});updateInsertMenu();
// Reuse the existing buttons and handlers on the main toolbar.
for(const [id,title,buttons] of [
 ['fileToolbar','Tệp',['clear','open','save','saveAs']],
 ['editToolbar','Chỉnh sửa',['undo','redo','copyObjects','pasteObjects','editSelected','delete']],
 ['exportToolbar','Xuất hình và chèn',[$('svg'),$('png'),wordButton]]
]){
 const group=document.createElement('div');group.id=id;group.className='action-group';
 group.setAttribute('role','group');group.setAttribute('aria-label',title);
 for(const button of buttons)group.append(typeof button==='string'?$(button):button);
 $('actions').insertBefore(group,fileStatus);
}
fileMenu.hidden=true;editMenu.hidden=true;
wordButton.dataset.toolbarIcon='insertWord';
// Document metadata only; these controls never transform existing geometry.
const drawingScales=document.createElement('fieldset');drawingScales.id='drawingScales';
drawingScales.innerHTML='<legend>Tỷ lệ vẽ</legend><label for="geometryScale"><span>Kết cấu</span><span>1 m</span><span>=</span><input id="geometryScale" type="number" step="any" inputmode="decimal" required><span>px</span></label><label for="internalForceScale"><span>Nội lực</span><span>1 đơn vị</span><span>=</span><input id="internalForceScale" type="number" step="any" inputmode="decimal" required><span>px</span></label>';
const drawingScalesButton=document.createElement('button');drawingScalesButton.id='drawingScalesToggle';drawingScalesButton.type='button';drawingScalesButton.textContent='Tỷ lệ vẽ';
drawingScalesButton.setAttribute('aria-controls','drawingScales');drawingScalesButton.setAttribute('aria-expanded','false');
$('viewTools').append(drawingScalesButton);document.body.append(drawingScales);drawingScales.hidden=true;
function positionDrawingScales(){
 if(drawingScales.hidden)return;
 const vv=window.visualViewport,valid=vv&&[vv.width,vv.height,vv.offsetLeft,vv.offsetTop].every(Number.isFinite)&&vv.width>0&&vv.height>0;
 const left=valid?vv.offsetLeft:0,top=valid?vv.offsetTop:0,width=valid?vv.width:innerWidth,height=valid?vv.height:innerHeight;
 drawingScales.style.maxWidth=Math.max(1,width-16)+'px';drawingScales.style.maxHeight=Math.max(1,height-16)+'px';
 const anchor=drawingScalesButton.getBoundingClientRect(),box=drawingScales.getBoundingClientRect();
 const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
 drawingScales.style.left=clamp(anchor.left,left+8,left+width-box.width-8)+'px';
 const y=anchor.bottom+6+box.height>top+height-8?anchor.top-box.height-6:anchor.bottom+6;
 drawingScales.style.top=clamp(y,top+8,top+height-box.height-8)+'px';
}
function closeDrawingScales(restoreFocus=false){
 if(drawingScales.hidden)return;
 const inside=drawingScales.contains(document.activeElement);
 if(inside)document.activeElement.blur();
 drawingScales.hidden=true;drawingScalesButton.setAttribute('aria-expanded','false');drawingScalesButton.classList.remove('active');
 if(restoreFocus||inside)drawingScalesButton.focus({preventScroll:true});
}
drawingScalesButton.onclick=()=>{
 if(!drawingScales.hidden){closeDrawingScales();return}
 syncDrawingScaleControls();drawingScales.hidden=false;drawingScalesButton.setAttribute('aria-expanded','true');drawingScalesButton.classList.add('active');positionDrawingScales();
};
document.addEventListener('pointerdown',e=>{if(!drawingScales.contains(e.target)&&!drawingScalesButton.contains(e.target))closeDrawingScales()},true);
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!drawingScales.hidden){e.preventDefault();e.stopImmediatePropagation();closeDrawingScales(true)}
},true);
window.addEventListener('resize',positionDrawingScales);
window.addEventListener('scroll',positionDrawingScales,true);
window.visualViewport?.addEventListener('resize',positionDrawingScales);
window.visualViewport?.addEventListener('scroll',positionDrawingScales);
function syncDrawingScaleControls(){
 const geometryInput=$('geometryScale'),forceInput=$('internalForceScale');
 if(!geometryInput||!forceInput)return;
 // Leave in-progress typing alone unless the document value has changed.
 for(const [input,value]of [[geometryInput,geometryScale],[forceInput,1/internalForceScale]]){
  if(document.activeElement!==input||input.dataset.currentValue!==String(value))input.value=value;
  input.dataset.currentValue=String(value);
 }

}
for(const [id,getValue,setValue]of [
 ['geometryScale',()=>geometryScale,value=>{geometryScale=value}],
 ['internalForceScale',()=>1/internalForceScale,value=>{internalForceScale=1/value}]
]){
 const input=$(id);
 input.onchange=()=>{
  const value=input.valueAsNumber;
  if(!Number.isFinite(value)||value<=0||(id==='internalForceScale'&&(!Number.isFinite(1/value)||1/value<=0))){input.value=getValue();msg('Tỷ lệ phải là số hữu hạn lớn hơn 0.');return}
  setValue(value);syncDrawingScaleControls();updateFileStatus();saveDraft();
 };
 input.addEventListener('blur',()=>{input.value=getValue()});
}
syncDrawingScaleControls();
const snapButton=document.createElement('button');snapButton.id='snapToggle';
const snapPanel=document.createElement('details');snapPanel.id='snapSettings';
const snapSummary=document.createElement('summary');snapSummary.textContent='Kiểu bắt điểm';snapPanel.append(snapSummary);
snapSummary.hidden=true;
snapButton.setAttribute('aria-controls','snapSettings');snapButton.setAttribute('aria-expanded','false');
snapButton.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'&&snapEnabled)snapPanel.open=true});
snapButton.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&snapEnabled){e.preventDefault();snapPanel.open=true;positionSnapChoices();snapChoices.querySelector('input')?.focus()}});
const snapChoices=document.createElement('div');snapChoices.className='snap-choices';snapPanel.append(snapChoices);
snapChoices.setAttribute('role','group');snapChoices.setAttribute('aria-label','Các kiểu bắt điểm');
const snapIcons={endpoint:'M5 26L24 7M20 3H28V11H20Z',midpoint:'M3 24H29M16 7L24 23H8Z',intersection:'M5 5L27 27M27 5L5 27M11 11H21V21H11Z',member:'M3 26L29 6M20 16A4 4 0 1 0 12 16A4 4 0 1 0 20 16',dimension:'M6 3V29M26 3V29M6 16H26M10 12L6 16L10 20M22 12L26 16L22 20'};
snapIcons.tangent='M3 24H29M8 24A8 8 0 1 1 24 24';
snapIcons.perpendicular='M6 4V26H28M6 16H16V26';
for(const [key,title]of [['endpoint','Đầu / cuối nét'],['midpoint','Trung điểm'],['intersection','Giao điểm'],['perpendicular','Vuông góc'],['tangent','Tangent / Contact'],['member','Điểm trên thanh'],['dimension','Căn đường kích thước']]){
 const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=snapOptions[key];input.id='snap-'+key;
 const icon=document.createElementNS(NS,'svg');icon.setAttribute('viewBox','0 0 32 32');icon.setAttribute('aria-hidden','true');icon.style.cssText='width:30px;height:30px;border:0;flex:none';
 el('path',{d:snapIcons[key],fill:'none',stroke:'currentColor','stroke-width':1.5},icon);
 label.title=title;label.className='snap-icon-choice';input.setAttribute('aria-label',title);
 input.onchange=()=>{snapOptions[key]=input.checked;saveSnapSettings();render()};label.append(input,icon);snapChoices.append(label);
}
function saveSnapSettings(){try{localStorage.setItem('ket-cau-snap-settings',JSON.stringify({enabled:snapEnabled,options:snapOptions}))}catch{}}
function updateSnapControls(){snapButton.textContent=snapEnabled?'Bắt điểm: Bật':'Bắt điểm: Tắt';snapButton.classList.toggle('active',snapEnabled);snapButton.setAttribute('aria-pressed',String(snapEnabled));snapPanel.hidden=!snapEnabled}
snapButton.onclick=()=>{snapEnabled=!snapEnabled;updateSnapControls();snapPanel.open=snapEnabled;saveSnapSettings();render()};
$('viewTools').append(snapButton);document.body.append(snapPanel);updateSnapControls();
snapSummary.title='Lựa chọn kiểu bắt điểm';
snapSummary.setAttribute('aria-expanded','false');
function positionSnapChoices(){
 if(!snapPanel.open)return;
 const box=snapButton.getBoundingClientRect();
 snapChoices.style.left=Math.max(8,Math.min(box.left,innerWidth-snapChoices.offsetWidth-8))+'px';
 snapChoices.style.top=Math.max(8,Math.min(box.bottom+6,innerHeight-snapChoices.offsetHeight-8))+'px';
}
snapPanel.addEventListener('toggle',()=>{snapButton.setAttribute('aria-expanded',String(snapPanel.open));if(snapPanel.open){closeSecondaryTools();positionSnapChoices()}});
autoHideSecondary(snapPanel,()=>[snapButton],()=>snapPanel.open,()=>{snapPanel.open=false});
window.addEventListener('resize',positionSnapChoices);
document.addEventListener('scroll',e=>{if(!snapChoices.contains(e.target))snapPanel.open=false},true);
for(const menu of [fileMenu,editMenu]){
 const summary=menu.querySelector('summary');summary.setAttribute('aria-expanded','false');
 summary.addEventListener('click',()=>{for(const other of document.querySelectorAll('.command-menu'))if(other!==menu)other.open=false});
 menu.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(menu.open)));
 menu.addEventListener('click',e=>{if(e.target.closest('button'))menu.open=false});
 menu.addEventListener('keydown',e=>{
  if(e.key==='Escape'){menu.open=false;summary.focus();e.stopPropagation()}
  if(e.key==='ArrowDown'&&e.target===summary){e.preventDefault();menu.open=true;menu.querySelector('button:not([hidden]):not(:disabled)')?.focus()}
 });
}
document.addEventListener('pointerdown',e=>{for(const menu of document.querySelectorAll('.command-menu'))if(!menu.contains(e.target))menu.open=false});

// Junction editing uses the original geometry on every move, preventing drift.
let jointDrag=null;
let chosenJoints=[];
const sameJoint=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<.25;
const jointButton=document.createElement('button');jointButton.textContent='Kéo điểm giao';jointButton.dataset.mode='joint';
jointButton.onclick=()=>{panEnabled=false;panButton.classList.remove('active');panButton.setAttribute('aria-pressed','false');setMode('joint');msg('Kéo điểm tròn để chỉnh các nét, ký hiệu và hatch liên quan.');};
$('drawingTools').querySelector('.tool-buttons').append(jointButton);
const straightTypes=['bar','thin','dashed'];
function curveAt(o,t){const [m,b]=o.curvePoints,c={x:2*m.x-b.x/2,y:2*m.y-b.y/2};return {x:o.x+2*t*(1-t)*c.x+t*t*b.x,y:o.y+2*t*(1-t)*c.y+t*t*b.y}}
function projection(p,a,b){const x=b.x-a.x,y=b.y-a.y,l=x*x+y*y;if(!l)return null;const t=((p.x-a.x)*x+(p.y-a.y)*y)/l;return t>=-1e-6&&t<=1+1e-6&&Math.hypot(p.x-a.x-t*x,p.y-a.y-t*y)<0.25?Math.max(0,Math.min(1,t)):null}
function jointPoints(){
 const points=[],lines=items.filter(o=>straightTypes.includes(o.type));
 for(const o of lines)points.push({x:o.x,y:o.y},{x:o.x2,y:o.y2});
 for(const o of items.filter(o=>o.type==='curve'))points.push(curveAt(o,0),curveAt(o,.5),curveAt(o,1));
 for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
  const a=lines[i],b=lines[j],ux=a.x2-a.x,uy=a.y2-a.y,vx=b.x2-b.x,vy=b.y2-b.y,d=ux*vy-uy*vx;
  if(Math.abs(d)<1e-8)continue;
  const t=((b.x-a.x)*vy-(b.y-a.y)*vx)/d,q=((b.x-a.x)*uy-(b.y-a.y)*ux)/d;
  if(t>=0&&t<=1&&q>=0&&q<=1)points.push({x:a.x+t*ux,y:a.y+t*uy});
 }
 return [...new Map(points.map(p=>[`${Math.round(p.x*1000)},${Math.round(p.y*1000)}`,p])).values()];
}
function drawJointHandles(){
 const radius=7/Math.abs(svg.getScreenCTM().a);
 for(const p of jointPoints())el('circle',{'data-joint-x':p.x,'data-joint-y':p.y,cx:p.x,cy:p.y,r:radius,fill:chosenJoints.some(q=>sameJoint(p,q))?'#087d95':'white',stroke:'#087d95','stroke-width':2,'vector-effect':'non-scaling-stroke',cursor:'move'});
}
function deformJoint(before,anchor,target,splitIds,anchors=[anchor]){
 const delta={x:target.x-anchor.x,y:target.y-anchor.y};
 const lines=before.filter(o=>straightTypes.includes(o.type)).map(o=>({o,a:{x:o.x,y:o.y},b:{x:o.x2,y:o.y2},ts:anchors.map(p=>projection(p,{x:o.x,y:o.y},{x:o.x2,y:o.y2})).filter(t=>t!==null)})).filter(s=>s.ts.length);
 const curves=before.filter(o=>o.type==='curve').map(o=>({o,ts:[0,.5,1].filter(t=>anchors.some(p=>sameJoint(curveAt(o,t),p)))})).filter(s=>s.ts.length);
 function weight(p){
  if(anchors.some(a=>sameJoint(p,a)))return 1;
  for(const s of curves){
   let best=Infinity,at=0;
   for(let i=0;i<256;i++){const a=curveAt(s.o,i/256),b=curveAt(s.o,(i+1)/256),dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0,d=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);if(d<best){best=d;at=(i+t)/256}}
   if(best<.3)return s.ts.reduce((sum,t)=>sum+(t===0?(1-at)*(1-2*at):t===1?at*(2*at-1):4*at*(1-at)),0);
  }
  for(const s of lines){const t=projection(p,s.a,s.b);if(t!==null){
   const knots=[...new Set([0,...s.ts,1])].sort((a,b)=>a-b),value=k=>s.ts.some(v=>Math.abs(v-k)<1e-6)?1:0;
   for(let i=1;i<knots.length;i++)if(t<=knots[i]){const a=knots[i-1],b=knots[i],u=(t-a)/(b-a);return value(a)*(1-u)+value(b)*u}
  }}
  return 0;
 }
 const move=p=>{const w=weight(p);return {x:p.x+w*delta.x,y:p.y+w*delta.y}};
 const result=[];
 for(const original of before){
  if(original.type==='rigidRegion'||drawingConnection(original)){result.push(copy(original));continue}
  const o=copy(original),start=move(original);
  if(o.type==='hatch'){
   const pts=original.points.map(p=>({x:original.x+p.x,y:original.y+p.y})),expanded=[];
   for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];expanded.push(a);const cuts=anchors.map(p=>({p,t:projection(p,a,b)})).filter(c=>c.t!==null&&c.t>1e-5&&c.t<1-1e-5).sort((a,b)=>a.t-b.t);expanded.push(...cuts.map(c=>c.p))}
   o.points=expanded.map(p=>{const q=move(p);return {x:q.x-start.x,y:q.y-start.y}});
  }
  if(o.type==='curve')o.curvePoints=original.curvePoints.map(p=>{const q=move({x:original.x+p.x,y:original.y+p.y});return {x:q.x-start.x,y:q.y-start.y}});
  Object.assign(o,start);
  if(o.x2!==undefined){const end=move({x:original.x2,y:original.y2});o.x2=end.x;o.y2=end.y}
  const line=lines.find(s=>s.o.id===o.id);
  const cuts=line?[...new Set(line.ts)].filter(t=>t>1e-5&&t<1-1e-5).sort((a,b)=>a-b):[];
  if(cuts.length){
   const points=[{x:o.x,y:o.y},...cuts.map(t=>({x:line.a.x+t*(line.b.x-line.a.x)+delta.x,y:line.a.y+t*(line.b.y-line.a.y)+delta.y})),{x:o.x2,y:o.y2}];
   for(let i=1;i<points.length;i++)result.push({...o,id:i===1?o.id:splitIds.get(o.id)+'-'+i,x:points[i-1].x,y:points[i-1].y,x2:points[i].x,y2:points[i].y});
  }else result.push(o);
 }
 return result;
}
svg.addEventListener('pointerdown',e=>{
 if(mode!=='joint'||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();
 const handle=e.target.closest('[data-joint-x]');if(!handle){chosenJoints=[];render();return}
 const anchor={x:Number(handle.dataset.jointX),y:Number(handle.dataset.jointY)};
 chosenJoints=chosenJoints.filter(p=>jointPoints().some(q=>sameJoint(p,q)));
 if(e.ctrlKey||e.metaKey){chosenJoints=chosenJoints.some(p=>sameJoint(p,anchor))?chosenJoints.filter(p=>!sameJoint(p,anchor)):[...chosenJoints,anchor];render();msg('Đã chọn '+chosenJoints.length+' điểm. Kéo một điểm đã chọn để di chuyển cùng nhau.');return}
 if(!chosenJoints.some(p=>sameJoint(p,anchor)))chosenJoints=[anchor];
 jointDrag={id:e.pointerId,before:copy(items),anchor,anchors:copy(chosenJoints),splitIds:new Map(items.map(o=>[o.id,newId()])),moved:false};svg.setPointerCapture(e.pointerId);
},true);
svg.addEventListener('pointermove',e=>{
 if(!jointDrag)return;e.preventDefault();e.stopImmediatePropagation();
 let target=rawPoint(e);
 if(e.shiftKey)target=orthogonalPoint(jointDrag.anchor,target);
 jointDrag.moved=Math.hypot(target.x-jointDrag.anchor.x,target.y-jointDrag.anchor.y)>.01;
 items=jointDrag.moved?deformJoint(jointDrag.before,jointDrag.anchor,target,jointDrag.splitIds,jointDrag.anchors):copy(jointDrag.before);
 chosenJoints=jointDrag.anchors.map(p=>({x:p.x+target.x-jointDrag.anchor.x,y:p.y+target.y-jointDrag.anchor.y}));render();
},true);
function finishJoint(e){if(!jointDrag)return;e.stopImmediatePropagation();if(e.type==='pointercancel'){items=jointDrag.before;chosenJoints=jointDrag.anchors}else if(jointDrag.moved){past.push(jointDrag.before);future=[]}jointDrag=null;render()}
svg.addEventListener('pointerup',finishJoint,true);svg.addEventListener('pointercancel',finishJoint,true);

// SVG icons are CSS masks so changing button text/state cannot remove them.
const toolIconPaths={
 person:'M14 4A2 2 0 1 1 10 4A2 2 0 1 1 14 4M12 6V15M12 9L7 13M12 9L17 13M12 15L7 23M12 15L17 23',
 drawingScalesToggle:'M3 7h18v10H3z M7 7v5 M11 7v3 M15 7v5 M19 7v3',
 linkBar:'M7 12H17M7 12A3 3 0 1 1 1 12A3 3 0 1 1 7 12M23 12A3 3 0 1 1 17 12A3 3 0 1 1 23 12',
 weld:'M6 6H18V18H6Z',
 rigidRegion:'M4 7C7 1 13 4 17 4C23 4 23 12 19 17C16 23 6 22 4 17C1 13 2 10 4 7Z',
 mirror:'M12 2V5M12 8V11M12 14V17M12 20V22M2 20V6L9 20ZM22 20V6L15 20Z',
 insertWord:'M5 2H16L21 7V22H5ZM16 2V7H21M7 11L9 18L12 13L15 18L17 11',
 select:'M5 3L20 14L13 15L10 22Z',
 bar:'M3 19L21 5M3 17L21 3M3 21L21 7',
 thin:'M3 21L21 3',
 dashed:'M3 21L7 17M10 14L14 10M17 7L21 3',
 curve:'M3 20Q12 -8 21 20',
 extend:'M4 3V21M4 12H21M10 7L4 12L10 17',
 hatch:'M3 3H21V21H3ZM4 10L10 4M4 17L17 4M8 21L21 8M15 21L21 15',
 support:'M12 4L3 19H21ZM3 22H21',
 hinge:'M3 12H8M16 12H21M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12',
 force:'M12 2V21M6 15L12 21L18 15',
 moment:'M6 18A8 8 0 1 1 20 9M15 7L20 9L22 4',
 udl:'M3 4H21M4 4V20M12 4V20M20 4V20M1 16L4 20L7 16M9 16L12 20L15 16M17 16L20 20L23 16',
 dim:'M4 3V21M20 3V21M4 12H20M7 9L4 12L7 15M17 9L20 12L17 15',
 text:'M4 5H20M12 5V21M8 21H16M4 5V8M20 5V8',
 positive:'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M6 12H18M12 6V18',
 negative:'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M6 12H18',
 diagramM:'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M6 17V7L12 14L18 7V17',
 diagramQ:'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M16 12A4 5 0 1 0 8 12A4 5 0 1 0 16 12M12 14L18 19',
 diagramN:'M12 2A10 10 0 1 0 12 22A10 10 0 1 0 12 2M8 17V7L16 17V7',
 joint:'M3 5L12 12L21 5M12 12V22M16 12A4 4 0 1 1 8 12A4 4 0 1 1 16 12',
 snapToggle:'M5 3V13A7 7 0 0 0 19 13V3H15V13A3 3 0 0 1 9 13V3ZM5 7H9M15 7H19',
 zoomIn:'M12 4V20M4 12H20',zoomOut:'M4 12H20',
 resetView:'M9 3H3V9M15 3H21V9M3 15V21H9M15 21H21V15',
 panView:'M12 2V22M2 12H22M8 6L12 2L16 6M8 18L12 22L16 18M6 8L2 12L6 16M18 8L22 12L18 16',
 undo:'M4 10H15A6 6 0 0 1 15 22M9 5L4 10L9 15',
 redo:'M20 10H9A6 6 0 0 0 9 22M15 5L20 10L15 15',
 copyObjects:'M8 8H21V21H8ZM4 16H3V3H16V4',
 pasteObjects:'M8 5H4V22H20V5H16M8 3H16V7H8ZM8 12H16M8 17H16',
 editSelected:'M3 21L4 15L17 2L22 7L9 20ZM14 5L19 10',
 delete:'M3 15L14 4L22 12L13 21H9ZM9 9L17 17M13 21H22',
 clear:'M5 2H15L21 8V22H5ZM15 2V8H21',
 open:'M2 20V5H9L12 8H22V10M2 20L6 11H23L19 20Z',
 save:'M3 3H18L21 6V21H3ZM7 3V9H17V3M7 21V14H17V21',
 saveAs:'M3 3H18L21 6V12M3 3V21H10M7 3V9H17V3M13 21L14 17L20 11L23 14L17 20Z',
 svg:'M3 4H21V20H3ZM3 17L9 10L14 15L17 12L21 17',
 png:'M3 4H21V20H3ZM3 17L9 10L14 15L17 12L21 17M16 8H17',
 openCalculator:'M5 2H19V22H5ZM8 5H16V9H8ZM8 13H10M14 13H16M8 17H10M14 17H16',
 toggleTools:'M4 5H20M4 12H20M4 19H20M8 2V8M16 9V15M8 16V22'
};
// Same artwork as the toolbar; hotspot is the left working corner of the eraser.
const eraseCursorSVG=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="${toolIconPaths.delete}" fill="white" stroke="#28485c" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
svg.style.setProperty('--erase-cursor',`url("data:image/svg+xml,${encodeURIComponent(eraseCursorSVG)}") 3 15, default`);
function decorateToolIcons(){
 for(const button of document.querySelectorAll('#tools button,#viewTools button,#actions button')){
  const key=button.dataset.mode||button.dataset.toolbarIcon||button.id,path=toolIconPaths[key];if(!path)continue;
  const label=button.textContent.trim();
  const title=key==='person'?'H\u00ecnh ng\u01b0\u1eddi \u2013 \u0111\u1eb7t v\u1ecb tr\u00ed \u0111\u1ee9ng':label+(drawingShortcutNames[key]?' ('+drawingShortcutNames[key]+')':'');
  if(button.title!==title)button.title=title;
  if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
  if(!button.classList.contains('icon-button')){
   const format=['svg','png'].includes(key)?`<rect x="2" y="14" width="22" height="10" fill="white"/><text x="12" y="22" text-anchor="middle" font-family="Arial" font-size="8" font-weight="bold">${key.toUpperCase()}</text>`:'';
   const svgIcon=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${path}" fill="${key==='weld'?'black':'none'}" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>${format}</svg>`;
   button.style.setProperty('--tool-icon',`url("data:image/svg+xml,${encodeURIComponent(svgIcon)}")`);button.classList.add('icon-button');
  }
  button.classList.toggle('icon-with-label',!!button.closest('.file-commands'));
 }
}
decorateToolIcons();
new MutationObserver(decorateToolIcons).observe(document.body,{childList:true,subtree:true});

const supportChoices=document.createElement('div');supportChoices.className='support-choices';supportChoices.setAttribute('role','group');supportChoices.setAttribute('aria-label','Các loại liên kết');
const supportTitle=document.createElement('h3');supportTitle.textContent='Liên kết';
$('support').closest('label').hidden=true;
$('symbolTools').querySelector('.tool-buttons').after(supportTitle,supportChoices);
supportChoices.append($('tools').querySelector('[data-mode="hinge"]'));
for(const type of ['linkBar','weld'])supportChoices.append($('tools').querySelector(`[data-mode="${type}"]`));
$('tools').querySelector('[data-mode="support"]').hidden=true;
for(const option of $('support').options){
 const button=document.createElement('button');button.dataset.supportType=option.value;button.title=button.ariaLabel=option.textContent;button.className='support-symbol';
 const icon=document.createElementNS(NS,'svg');icon.setAttribute('viewBox','-34 -10 68 74');icon.setAttribute('aria-hidden','true');
 const g=el('g',{fill:'none',stroke:'currentColor','stroke-width':1.8},icon);
 drawSupport(g,{x:0,y:0,support:option.value,direction:'down'});
 button.append(icon);button.onclick=()=>{
  $('support').value=option.value;
  const object=items.find(o=>o.id===selected);
  if(mode==='select'&&object?.type==='support')$('support').onchange();
  else{selected=null;setMode('support')}
  syncSupportChoices();
 };supportChoices.append(button);
}
function syncSupportChoices(){
 for(const button of document.querySelectorAll('[data-support-type]')){
  const active=mode==='support'&&button.dataset.supportType===$('support').value;
  button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 }
}
syncSupportChoices();

// Selection is available in the top toolbar.
document.getElementById('interactionTools')?.remove();

'use strict';
// Temporary source-bar connectivity for finite open-polyline cuts; no force solving.
// Section-only temporary topology. Vertices below are physical bar intervals;
// adjacency is the line graph of source joints, never coordinate merging of cut ports.
const sectionGeometry=(()=>{
 const eps=1e-7,topologyTolerance=.25;
 const at=(b,t)=>({x:b.x+(b.x2-b.x)*t,y:b.y+(b.y2-b.y)*t});
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 function parameter(p,b,tolerance){
  const dx=b.x2-b.x,dy=b.y2-b.y,l=dx*dx+dy*dy;if(!l)return null;
  const t=((p.x-b.x)*dx+(p.y-b.y)*dy)/l;
  return t>=-eps&&t<=1+eps&&distance(p,at(b,Math.max(0,Math.min(1,t))))<tolerance?Math.max(0,Math.min(1,t)):null;
 }
 function segments(points){return points.slice(1).map((p,i)=>[points[i],p]).filter(([a,b])=>distance(a,b)>eps)}
 function intersection(bar,a,b){
  const dx=bar.x2-bar.x,dy=bar.y2-bar.y,ux=b.x-a.x,uy=b.y-a.y,d=dx*uy-dy*ux;
  if(Math.abs(d)<=eps*Math.max(1,Math.hypot(dx,dy)*Math.hypot(ux,uy)))return null;
  const rx=a.x-bar.x,ry=a.y-bar.y,t=(rx*uy-ry*ux)/d,u=(rx*dy-ry*dx)/d;
  return t>eps&&t<1-eps&&u>=-eps&&u<=1+eps?t:null;
 }
 function build(source,points){
  const bars=source.filter(o=>o.type==='bar'&&!o.sectionExtract).slice().sort((a,b)=>a.id.localeCompare(b.id));
  const edges=segments(points),links=[],junctions=[],cuts=bars.map(()=>[]);
  // Source endpoints alone establish connections. No interior-crossing query here.
  for(let i=0;i<bars.length;i++)for(let j=i+1;j<bars.length;j++){
   for(const [a,b]of [[i,j],[j,i]])for(const t of [0,1]){
    const q=at(bars[a],t);let u=null;
    for(const end of [0,1])if(distance(q,at(bars[b],end))<topologyTolerance){u=end;break}
    if(u===null)u=parameter(q,bars[b],topologyTolerance);
    if(u===null)continue;
    links.push({a,t,b,u});
    if(u>eps&&u<1-eps)junctions.push({bar:b,t:u,point:at(bars[b],u)});
   }
  }
  for(let i=0;i<bars.length;i++){
   const candidates=edges.map(([a,b])=>intersection(bars[i],a,b)).filter(t=>t!==null).sort((a,b)=>a-b);
   for(const t of candidates)if(!cuts[i].length||t-cuts[i].at(-1)>eps)cuts[i].push(t);
   for(const t of cuts[i])for(const joint of junctions)if(joint.bar===i&&distance(at(bars[i],t),joint.point)<topologyTolerance){
    const error=new Error('M\u1eb7t c\u1eaft \u0111i qua n\u00fat T. H\u00e3y d\u1ecbch \u0111\u01b0\u1eddng c\u1eaft kh\u1ecfi n\u00fat.');error.point=joint.point;throw error;
   }
  }
  const pieces=[],byBar=bars.map(()=>[]);
  bars.forEach((bar,index)=>{
   const ts=[0,...cuts[index],1];
   for(let i=1;i<ts.length;i++){
    const t0=ts[i-1],t1=ts[i],a=at(bar,t0),b=at(bar,t1),len=distance(a,b);if(len<=eps)continue;
    const ends=[],ux=(b.x-a.x)/len,uy=(b.y-a.y)/len;
    if(i>1)ends.push({x:0,y:0,ux:-ux,uy:-uy,sign:-1});
    if(i<ts.length-1)ends.push({x:b.x-a.x,y:b.y-a.y,ux,uy,sign:1});
    const id=pieces.length;
    pieces.push({id,sourceBarId:bar.id,t0,t1,a,b,ends,neighbors:new Set(),componentId:null,
     startPort:{id:`${index}:${i}:start`,kind:i>1?'cut':'source',...a},endPort:{id:`${index}:${i}:end`,kind:i<ts.length-1?'cut':'source',...b}});
    byBar[index].push(id);
   }
  });
  // A source T contact links to an interval interior without splitting its drawable.
  // Rejected cut-at-T conflicts ensure it cannot reconnect two cut ports.
  const owner=(bar,t)=>byBar[bar].find(id=>t>=pieces[id].t0-eps&&t<=pieces[id].t1+eps);
  for(const link of links){const a=owner(link.a,link.t),b=owner(link.b,link.u);if(a!==undefined&&b!==undefined){pieces[a].neighbors.add(b);pieces[b].neighbors.add(a)}}
  const components=[];
  for(const piece of pieces)if(piece.componentId===null){
   const id=components.length,members=[],queue=[piece.id];piece.componentId=id;
   for(let i=0;i<queue.length;i++){const p=pieces[queue[i]];members.push(p.id);for(const next of p.neighbors)if(pieces[next].componentId===null){pieces[next].componentId=id;queue.push(next)}}
   components.push({id,pieces:members,affected:members.some(id=>pieces[id].ends.length>0)});
  }
  return {bars,edges,cuts,pieces,components,candidates:components.filter(c=>c.affected).map(c=>c.id)};
 }
 function extract(graph,componentId,source){
  const component=graph.components[componentId];if(!component||!component.affected)return [];
  const result=component.pieces.map(id=>{const p=graph.pieces[id],original=graph.bars.find(b=>b.id===p.sourceBarId);
   return {...copy(original),id:newId(),x:p.a.x,y:p.a.y,x2:p.b.x,y2:p.b.y,sectionEnds:copy(p.ends)};
  });
  const owners=p=>new Set(graph.pieces.filter(q=>parameter(p,{x:q.a.x,y:q.a.y,x2:q.b.x,y2:q.b.y},eps)!==null).map(q=>q.componentId));
  for(const o of source){
   if(o.sectionExtract||o.sectionAction||o.sectionMark)continue;
   if(['force','moment','support','hinge'].includes(o.type)){
    const ids=owners(o);if(ids.size===1&&ids.has(componentId))result.push({...copy(o),id:newId()});
   }else if(o.type==='udl'){
    // Complete finite domain must be collinear with, and covered by, exactly one component.
    const dx=o.x2-o.x,dy=o.y2-o.y,len=Math.hypot(dx,dy);if(len<=eps)continue;
    const ranges=[];
    for(const p of graph.pieces){
     const project=q=>((q.x-o.x)*dx+(q.y-o.y)*dy)/(len*len);
     const off=q=>Math.abs((q.x-o.x)*dy-(q.y-o.y)*dx)/len;
     if(off(p.a)>eps||off(p.b)>eps)continue;
     const a=Math.max(0,Math.min(project(p.a),project(p.b))),b=Math.min(1,Math.max(project(p.a),project(p.b)));
     if(b-a>eps)ranges.push({a,b,id:p.componentId});
    }
    if(!ranges.length||ranges.some(r=>r.id!==componentId))continue;
    ranges.sort((a,b)=>a.a-b.a);let end=0;for(const r of ranges){if(r.a>end+eps)break;end=Math.max(end,r.b)}
    const a=owners(o),b=owners({x:o.x2,y:o.y2});
    if(end>=1-eps&&a.size===1&&b.size===1&&a.has(componentId)&&b.has(componentId))result.push({...copy(o),id:newId()});
   }
  }
  return result;
 }
 return {build,extract,segments,intersection,parameter,eps,topologyTolerance};
})();

const sectionVisibilityKey='ket-cau-studio-section-visibility-v1';
let sectionVisibilityDefaults={N:true,Q:true,M:true};
try{
 const saved=JSON.parse(localStorage.getItem(sectionVisibilityKey)||'null');
 if(saved&&['N','Q','M'].every(k=>typeof saved[k]==='boolean'))sectionVisibilityDefaults={N:saved.N,Q:saved.Q,M:saved.M};
}catch{}
function selectedSectionGroups(){
 const ids=selectedObjectIds(),groups=new Set();
 for(const o of items)if(ids.has(o.id)&&typeof o.sectionGroup==='string'&&o.sectionGroup)groups.add(o.sectionGroup);
 return new Set([...groups].filter(id=>items.some(o=>o.sectionGroup===id&&sectionForceAction(o))));
}
function sectionActionState(groups,action){
 const actions=items.filter(o=>groups.has(o.sectionGroup)&&sectionForceAction(o)&&o.sectionAction===action);
 if(!actions.length)return null; // Missing is not hidden.
 const visible=actions.filter(o=>o.sectionVisible!==false).length;
 return visible===actions.length?true:visible===0?false:'mixed';
}
function setSectionActionVisibility(action,visible){
 if(!['N','Q','M'].includes(action)||typeof visible!=='boolean')return;
 const groups=selectedSectionGroups();
 const targets=items.filter(o=>groups.has(o.sectionGroup)&&sectionForceAction(o)&&o.sectionAction===action);
 if(!targets.length)return;
 const changed=targets.filter(o=>(o.sectionVisible!==false)!==visible);
 if(changed.length){checkpoint();for(const o of changed)o.sectionVisible=visible}
 if(groups.size===1){
  // Missing or mixed components cannot define a new preference; keep their last value.
  for(const key of ['N','Q','M']){const state=sectionActionState(groups,key);if(typeof state==='boolean')sectionVisibilityDefaults[key]=state}
  try{localStorage.setItem(sectionVisibilityKey,JSON.stringify(sectionVisibilityDefaults))}catch{}
 }
 render();
}
function syncSectionVisibilityControls(){
 const panel=$('sectionVisibility');if(!panel)return;
 const groups=selectedSectionGroups();panel.hidden=!groups.size;
 for(const action of ['N','Q','M']){
  const input=$('section-visible-'+action),state=sectionActionState(groups,action);
  input.disabled=state===null;input.checked=state===true;input.indeterminate=state==='mixed';
 }
}
const sectionVisibilityPanel=document.createElement('div');sectionVisibilityPanel.id='sectionVisibility';
sectionVisibilityPanel.setAttribute('role','group');sectionVisibilityPanel.setAttribute('aria-label','N\u1ed9i l\u1ef1c');
sectionVisibilityPanel.style.cssText='display:inline-flex;align-items:center;gap:4px';sectionVisibilityPanel.hidden=true;
const sectionVisibilityTitle=document.createElement('span');sectionVisibilityTitle.textContent='N\u1ed9i l\u1ef1c:';sectionVisibilityPanel.append(sectionVisibilityTitle);
for(const action of ['N','Q','M']){
 const label=document.createElement('label');label.style.cssText='display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:44px;min-height:44px;margin:0;cursor:pointer';
 const input=document.createElement('input');input.type='checkbox';input.id='section-visible-'+action;input.style.cssText='width:18px;height:18px;min-height:18px;margin:0';
 input.setAttribute('aria-label','Hi\u1ec7n n\u1ed9i l\u1ef1c '+action+' c\u1ee7a nh\u00f3m m\u1eb7t c\u1eaft');input.onchange=()=>setSectionActionVisibility(action,input.checked);
 label.append(input,document.createTextNode(action));sectionVisibilityPanel.append(label);
}
$('viewTools').append(sectionVisibilityPanel);syncSectionVisibilityControls();

let sectionPoints=[],sectionPending=null;
modes.section='Mặt cắt';
const sectionButton=document.createElement('button');sectionButton.type='button';sectionButton.classList.add('icon-button');sectionButton.setAttribute('aria-pressed','false');sectionButton.dataset.mode='section';sectionButton.title='Mặt cắt';sectionButton.setAttribute('aria-label','Mặt cắt');
const sectionIcon='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M2 8H22M2 17H22M16 2L8 22M8 3H15M16 21H9" fill="none" stroke="black" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
sectionButton.style.setProperty('--tool-icon',`url("data:image/svg+xml,${encodeURIComponent(sectionIcon)}")`);

$('drawingTools').querySelector('.tool-buttons').append(sectionButton);
sectionButton.onclick=()=>{
 if(mode==='section'){sectionPoints=[];sectionPending=null;activateSelection();return}
 activateSelection();closeSecondaryTools();sectionPoints=[];sectionPending=null;setMode('section');
 msg('Chọn các điểm của đường cắt hở; Enter để chọn thành phần, Esc để hủy.');
};
function finishSection(){
 sectionPending=null;
 try{
  if(sectionPoints.length<2)throw Error('Chọn ít nhất hai điểm.');
  const graph=sectionGeometry.build(items,sectionPoints);
  if(!graph.candidates.length)throw Error('Mặt cắt chưa cắt qua nội bộ thanh nào.');
  sectionPending={graph,groups:[],component:null,hover:null};paintSection();
  msg('Chọn một đoạn thanh xem trước để trích thành phần liên thông.');
 }catch(error){paintSection();if(error.point)el('circle',{cx:error.point.x,cy:error.point.y,r:10,fill:'none',stroke:'#c22','stroke-width':3,'pointer-events':'none','data-section-conflict':'true'},svg.querySelector('[data-section-preview]'));msg(error.message)}
}
function chooseSectionComponent(component){
 const group=sectionGeometry.extract(sectionPending.graph,component,items);if(!group.length)return;
 const groups=[group];
  const cutNames=new Map();
  for(const group of groups){
   const additions=[];
   for(const bar of group){
    for(const end of bar.sectionEnds||[]){
     const x=bar.x+end.x,y=bar.y+end.y,ux=end.ux,uy=end.uy,nx=-uy,ny=ux;
     const existing=[...cutNames].find(([,q])=>Math.hypot(q.x-x,q.y-y)<sectionGeometry.eps);
     const cutKey=existing?existing[0]:x+','+y;
     if(!cutNames.has(cutKey)){
      const near=items.filter(o=>!o.sectionExtract&&o.type==='text'&&o.label&&!o.labelFormula&&Math.hypot(o.x-x,o.y-y)<35).sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];
      cutNames.set(cutKey,{x,y,name:near?.label||'K'+(cutNames.size+1)});
     }
     additions.push(make('thin',x-32*nx,y-32*ny,x+32*nx,y+32*ny,{sectionMark:true}));
     additions.push(make('force',x,y,undefined,undefined,{label:'N',sectionCutKey:cutKey,sectionAction:'N',sectionVector:{x:ux,y:uy}}));
     additions.push(make('force',x,y,undefined,undefined,{label:'Q',sectionCutKey:cutKey,sectionAction:'Q',sectionVector:{x:nx,y:ny}}));
     additions.push(make('moment',x,y,undefined,undefined,{label:'M',sectionCutKey:cutKey,sectionAction:'M',sectionVector:{x:ux,y:uy},sectionSign:end.sign}));
    }delete bar.sectionEnds;
   }for(const o of additions)if(sectionForceAction(o))o.sectionVisible=sectionVisibilityDefaults[o.sectionAction];group.push(...additions);
  }

 sectionPending.groups=groups;sectionPending.component=component;
 if(cutNames.size)nameSectionCuts(cutNames);
 paintSection();
}
function nameSectionCuts(cuts){
 const dialog=document.createElement('dialog');dialog.id='sectionNames';
 dialog.dataset.sectionDialog='true';
 dialog.style.cssText='max-width:min(420px,95vw);max-height:85vh;overflow:auto;border:1px solid #b8c9d4;border-radius:10px';
 const heading=document.createElement('h3');heading.textContent='Tên các điểm cắt';dialog.append(heading);
 const form=document.createElement('form');dialog.append(form);
 for(const [key,cut]of cuts){
  const label=document.createElement('label');label.textContent=`Điểm (${Math.round(cut.x)}, ${Math.round(cut.y)})`;
  const input=document.createElement('input');input.value=cut.name;input.maxLength=24;input.required=true;input.dataset.cutKey=key;input.setAttribute('aria-label',label.textContent);
  label.append(input);form.append(label);
 }
 const ok=document.createElement('button');ok.type='submit';ok.textContent='Áp dụng';
 const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Hủy';form.append(ok,cancel);
 const abort=()=>{sectionPending=null;sectionPoints=[];dialog.remove();activateSelection()};
 cancel.onclick=abort;dialog.addEventListener('cancel',e=>{e.preventDefault();abort()});
 form.onsubmit=e=>{
  e.preventDefault();
  for(const input of form.querySelectorAll('input')){
   const name=input.value.trim().replace(/[{}_^]/g,'');
   if(!name){input.setCustomValidity('Nhập tên điểm cắt.');input.reportValidity();input.oninput=()=>input.setCustomValidity('');return}
   cuts.get(input.dataset.cutKey).name=name;
  }
  for(const group of sectionPending.groups)for(const o of group)if(o.sectionAction){
   o.sectionPointName=cuts.get(o.sectionCutKey).name;o.label=o.sectionAction+'_{'+o.sectionPointName+'}';
  }
  dialog.remove();paintSection();msg('Bấm và kéo thành phần đã chọn để đặt bản trích.');
 };
 document.body.append(dialog);dialog.showModal();form.querySelector('input')?.select();
}
function sectionComponentAt(e){
 if(!sectionPending)return null;
 const point=rawPoint(e),tolerance=9/(Math.abs(svg.getScreenCTM().a)||1),ids=new Set();
 for(const p of sectionPending.graph.pieces){
  if(!sectionPending.graph.candidates.includes(p.componentId))continue;
  if(sectionGeometry.parameter(point,{x:p.a.x,y:p.a.y,x2:p.b.x,y2:p.b.y},tolerance)!==null)ids.add(p.componentId);
 }
 return ids.size===1?[...ids][0]:ids.size>1?'ambiguous':null;
}
function paintSection(p){
 svg.querySelector('[data-section-preview]')?.remove();if(!sectionPoints.length)return;
 const g=el('g',{'data-section-preview':'true','pointer-events':'none',stroke:'#b6407b',fill:'none','stroke-width':1.5});
 const points=[...sectionPoints,...(!sectionPending&&p?[p]:[])];
 el('polyline',{points:points.map(p=>`${p.x},${p.y}`).join(' '),'stroke-dasharray':'8 5'},g);
 for(const q of sectionPoints)el('circle',{cx:q.x,cy:q.y,r:4,fill:'white'},g);
 if(sectionPending){
  const active=sectionPending.component??sectionPending.hover;
  for(const p of sectionPending.graph.pieces)if(sectionPending.graph.candidates.includes(p.componentId)){
   const h=el('g',{'data-section-piece':p.id,'data-section-component':p.componentId,'data-section-highlight':String(active===p.componentId)},g);
   line(h,p.a.x,p.a.y,p.b.x,p.b.y,{stroke:active===p.componentId?'#e57712':'#16849a','stroke-width':active===p.componentId?5:3,'vector-effect':'non-scaling-stroke'});
   line(h,p.a.x,p.a.y,p.b.x,p.b.y,{stroke:'transparent','stroke-width':18,'vector-effect':'non-scaling-stroke','pointer-events':'stroke'});
  }
 }
}

document.addEventListener('pointerdown',e=>{
 if(!svg.contains(e.target)||e.button!==0||panEnabled||gesture||e.ctrlKey&&e.altKey)return;
 if(mode==='section'){
  e.preventDefault();e.stopImmediatePropagation();
  if(sectionPending){
   const component=sectionComponentAt(e);
   if(component==='ambiguous'){msg('Các thành phần chồng nhau. Hãy chọn đoạn không chồng.');return}
   if(component===null)return;
   if(sectionPending.component!==component){chooseSectionComponent(component);return}
   if(document.querySelector('#sectionNames'))return;
   const added=sectionPending.groups[0],before=copy(items);
   if(items.length+added.length>2000){msg('Quá nhiều đối tượng khi thêm bản trích.');return}
   const groupId=newId();for(const o of added){o.sectionGroup=groupId;o.sectionExtract=true}
   // Enter Select without losing the first contact's pre-extraction rollback snapshot.
   const placementTouch=e.pointerType==='touch'?{snapshot:touchSnapshot,contacts:new Map(contacts)}:null;
   items.push(...added);sectionPending=null;sectionPoints=[];activateSelection();
   if(placementTouch){touchSnapshot=placementTouch.snapshot;for(const [id,contact]of placementTouch.contacts)contacts.set(id,contact)}
   const ids=new Set(added.map(o=>o.id));multiSelection=ids;
   groupDrag={start:point(e),before,ids,moved:true};
   // Group drag needs original positions for the new objects as well as the undo snapshot.
   groupDrag.sectionAdded=copy(added);
   svg.setPointerCapture(e.pointerId);render();msg('Kéo bản trích đến vị trí mong muốn rồi thả chuột.');return;
  }

  const p=point(e);if(sectionPoints.length&&Math.hypot(p.x-sectionPoints.at(-1).x,p.y-sectionPoints.at(-1).y)<.01)return;
  sectionPoints.push(p);paintSection();return;
 }
 if(mode==='select'&&!e.altKey){
  const o=items.find(o=>o.id===e.target.closest('[data-id]')?.dataset.id);
  if(o?.sectionGroup){
   const ids=new Set(items.filter(q=>q.sectionGroup===o.sectionGroup).map(q=>q.id));
   if(ids.size>1){e.preventDefault();e.stopImmediatePropagation();multiSelection=ids;selected=null;
    groupDrag={start:point(e),before:copy(items),ids,moved:false};svg.setPointerCapture(e.pointerId);render();
   }
  }
 }
},true);
svg.addEventListener('pointermove',e=>{if(mode==='section'){if(sectionPending)sectionPending.hover=sectionComponentAt(e);paintSection(sectionPending?null:point(e))}});
document.addEventListener('keydown',e=>{
 if(mode!=='section'||e.target.matches('input,textarea,select'))return;
 if(e.key==='Enter'&&!sectionPending){e.preventDefault();finishActiveCommand()}
});

function mirroredObjects(source,a,b){
 const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);if(l<.01)throw Error('Hai điểm trục đối xứng phải khác nhau.');
 const ux=dx/l,uy=dy/l,theta=Math.atan2(dy,dx),groups=new Map();
 const vector=p=>({x:(2*ux*ux-1)*p.x+2*ux*uy*p.y,y:2*ux*uy*p.x+(2*uy*uy-1)*p.y});
 const reflect=p=>{const q=vector({x:p.x-a.x,y:p.y-a.y});return {x:a.x+q.x,y:a.y+q.y}};
 const angle=v=>((Math.atan2(-v.y,v.x)*180/Math.PI)%360+360)%360;
 return source.map(original=>{
  const o=copy(original),p=reflect(o);o.id=newId();o.x=p.x;o.y=p.y;
  if(original.x2!==undefined){const q=reflect({x:original.x2,y:original.y2});o.x2=q.x;o.y2=q.y}
  for(const key of ['points','curvePoints'])if(original[key])o[key]=original[key].map(vector);
  if(original.type==='rigidRegion'&&original.rigidAngle){o.rigidAngle=(360-original.rigidAngle)%360;}
  if(o.type==='dim')o.offset=-(o.offset||0);
  if(['force','udl'].includes(o.type)){const [x,y]=loadVector(original);o.loadAngle=angle(vector({x,y}))}
  if(o.type==='moment'){o.loadAngle=((180-2*theta*180/Math.PI-(original.loadAngle||0))%360+360)%360;o.rotation=o.rotation==='cw'?'ccw':'cw'}
  if(o.type==='support'){
   const r=(Number.isFinite(o.supportAngle)?o.supportAngle:{down:0,up:180,right:-90,left:90}[o.direction])*Math.PI/180;
   const v=vector({x:-Math.sin(r),y:Math.cos(r)});o.supportAngle=Math.atan2(-v.x,v.y)*180/Math.PI;
  }
  if(o.sectionVector)o.sectionVector=vector(o.sectionVector);
  if(o.sectionSign)o.sectionSign=-o.sectionSign;
  if(Number.isFinite(o.hatchAngle))o.hatchAngle=2*theta-o.hatchAngle;
  if(o.sectionGroup){if(!groups.has(o.sectionGroup))groups.set(o.sectionGroup,newId());o.sectionGroup=groups.get(o.sectionGroup)}
  return o;
 });
}
let mirrorSource=[],mirrorAxis=null;
var mirrorSelecting=false;
const mirrorButton=document.createElement('button');mirrorButton.id='mirrorObjects';mirrorButton.title='Mirror — đối xứng';mirrorButton.setAttribute('aria-label','Mirror — đối xứng');
mirrorButton.textContent='Mirror — đối xứng';mirrorButton.dataset.mode='mirror';mirrorButton.setAttribute('aria-pressed','false');
$('editToolbar').append(mirrorButton);
decorateToolIcons();
function startMirrorAxis(){
 const ids=new Set(multiSelection);if(selected)ids.add(selected);mirrorSource=items.filter(o=>ids.has(o.id)).map(copy);
 if(!mirrorSource.length){activateSelection();mirrorSelecting=true;render();msg('Mirror: chọn đối tượng hoặc quét chọn nhóm, rồi nhấn Enter để chọn trục đối xứng.');return}
 mirrorSelecting=false;
 activateSelection();setMode('mirror');mirrorAxis=null;msg('Mirror: chọn điểm đầu trục đối xứng, rồi điểm thứ hai. Shift căn ngang/dọc.');
}
mirrorButton.onclick=()=>{
 if(mode==='mirror'||mirrorSelecting){activateSelection();msg('Đã thoát Mirror.');return}
 startMirrorAxis();
};
document.addEventListener('keydown',e=>{
 if(mirrorSelecting&&e.key==='Enter'&&!e.target.matches('input,textarea,select')){e.preventDefault();finishActiveCommand()}
});
function completeMirror(end){
 let reflected;try{reflected=mirroredObjects(mirrorSource,mirrorAxis,end)}catch(error){msg(error.message);return}
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Mirror');
 const title=document.createElement('p');title.textContent='Giữ hay xóa các đối tượng gốc?';dialog.append(title);
 for(const [text,remove]of [['Giữ bản gốc',false],['Xóa bản gốc',true]]){
  const button=document.createElement('button');button.textContent=text;button.onclick=()=>{
   const ids=new Set(mirrorSource.map(o=>o.id)),base=remove?items.filter(o=>!ids.has(o.id)):items;
   if(base.length+reflected.length>2000){msg('Bản vẽ tối đa 2000 đối tượng.');return}
   try{validate({format:'ket-cau-studio',version:1,items:[...base,...reflected]})}catch(error){msg(error.message);return}
   checkpoint();items=[...base,...reflected];dialog.close();dialog.remove();activateSelection();cancelSelection=null;multiSelection=new Set(reflected.map(o=>o.id));render();msg('Đã tạo đối xứng. Hoàn tác để khôi phục.');
  };dialog.append(button);
 }
 const cancel=document.createElement('button');cancel.textContent='Hủy';cancel.onclick=()=>{dialog.close();dialog.remove();activateSelection()};dialog.append(cancel);
 dialog.addEventListener('cancel',()=>{dialog.remove();activateSelection()});document.body.append(dialog);dialog.showModal();
}
document.addEventListener('pointerdown',e=>{
 if(mode!=='mirror'||!svg.contains(e.target)||e.button!==0||panEnabled||gesture||e.ctrlKey&&e.altKey)return;
 e.preventDefault();e.stopImmediatePropagation();const p=point(e);
 if(!mirrorAxis){mirrorAxis=p;msg('Chọn điểm thứ hai của trục đối xứng.');return}
 completeMirror(e.shiftKey?orthogonalPoint(mirrorAxis,p):p);
},true);
svg.addEventListener('pointermove',e=>{
 if(mode!=='mirror'||!mirrorAxis)return;
 svg.querySelector('[data-mirror-axis]')?.remove();let p=point(e);if(e.shiftKey)p=orthogonalPoint(mirrorAxis,p);
 const g=el('g',{'data-mirror-axis':'true','pointer-events':'none',stroke:'#087d95'});line(g,mirrorAxis.x,mirrorAxis.y,p.x,p.y,{'stroke-dasharray':'6 4'});
});

const mathSymbolsButton=document.createElement('button');mathSymbolsButton.id='mathSymbols';mathSymbolsButton.textContent='Ω';mathSymbolsButton.title='Ký hiệu toán học';mathSymbolsButton.setAttribute('aria-label','Ký hiệu toán học');mathSymbolsButton.setAttribute('aria-expanded','false');
$('viewTools').append(mathSymbolsButton);
const mathSymbolsPanel=document.createElement('div');mathSymbolsPanel.id='mathSymbolsPanel';mathSymbolsPanel.hidden=true;mathSymbolsPanel.setAttribute('role','region');mathSymbolsPanel.setAttribute('aria-label','Bảng ký hiệu toán học');
mathSymbolsPanel.style.cssText='position:fixed;z-index:2200;width:320px;max-width:calc(100vw - 16px);max-height:60vh;overflow:auto;padding:12px;border:1px solid #b8c9d4;border-radius:10px;background:white;box-shadow:0 4px 16px #0003';document.body.append(mathSymbolsPanel);
let mathInput=null,mathSelection={start:0,end:0};
function rememberMathInput(){const input=document.activeElement;if(input?.matches('input[type="text"],textarea')&&!input.hidden){mathInput=input;mathSelection={start:input.selectionStart??0,end:input.selectionEnd??0}}}
document.addEventListener('selectionchange',rememberMathInput);document.addEventListener('focusin',rememberMathInput);
function positionMathSymbols(){const r=mathSymbolsButton.getBoundingClientRect();mathSymbolsPanel.style.left=Math.max(8,Math.min(r.left,innerWidth-mathSymbolsPanel.offsetWidth-8))+'px';mathSymbolsPanel.style.top=Math.max(8,Math.min(r.bottom+5,innerHeight-mathSymbolsPanel.offsetHeight-8))+'px'}
function closeMathSymbols(){mathSymbolsPanel.hidden=true;mathSymbolsButton.classList.remove('active');mathSymbolsButton.setAttribute('aria-expanded','false')}
mathSymbolsButton.onpointerdown=e=>{rememberMathInput();e.preventDefault()};
mathSymbolsButton.onclick=()=>{if(!mathSymbolsPanel.hidden){closeMathSymbols();return}mathSymbolsPanel.hidden=false;mathSymbolsButton.classList.add('active');mathSymbolsButton.setAttribute('aria-expanded','true');positionMathSymbols()};
const header=document.createElement('div');header.textContent='Ký hiệu toán học';const close=document.createElement('button');close.textContent='×';close.title='Đóng bảng ký hiệu';close.style.float='right';close.onclick=closeMathSymbols;header.append(close);mathSymbolsPanel.append(header);
const note=document.createElement('p');note.textContent='Mở nhãn để sửa, đặt con trỏ rồi bấm ký hiệu. Ký hiệu tổng, tích phân và chữ Hy Lạp dùng để trình bày.';mathSymbolsPanel.append(note);
const symbolGroups=[
 // Entries: display, insertion prefix, optional suffix, name, input reference.
 ['Mẫu Equation',[
  ['a/b','\\frac{','}{}','Phân số','\\frac{a}{b}'],['√x','\\sqrt{','}','Căn bậc hai','\\sqrt{x}'],
  ['∑ᵢ','\\sum_{i=1}^{n}','','Tổng','\\sum_{i=1}^{n}'],['∫ₐᵇ','\\int_{a}^{b}','','Tích phân','\\int_{a}^{b}'],
  ['α','\\alpha','','Alpha','\\alpha'],['⇒','\\Rightarrow','','Suy ra','\\Rightarrow']
 ]],
 ['Phép toán',[
  ['+','+','','Cộng','+'],['−','-','','Trừ','-'],['×','*','','Nhân','*'],['÷','/','','Chia','/'],['=','=','','Bằng','='],
  ['( )','(',')','Dấu ngoặc','(x)'],['√','sqrt(',')','Căn bậc hai','sqrt(x)'],['π','pi','','Pi','pi'],
  ['x²','^2','','Bình phương','x^2'],['xⁿ','^{','}','Số mũ','x^{n}'],['xᵢ','_{','}','Chỉ số dưới','x_{i}'],['⇒','-->','','Suy ra','-->']
 ]],
 ['Quan hệ và ký hiệu',[
  ['±','±','','Cộng trừ','\\pm'],['≈','≈','','Xấp xỉ','\\approx'],['≠','≠','','Khác','\\ne'],
  ['≤','≤','','Nhỏ hơn hoặc bằng','\\le'],['≥','≥','','Lớn hơn hoặc bằng','\\ge'],['∞','∞','','Vô cùng','\\infty'],
  ['∑','∑','','Tổng','\\sum'],['∫','∫','','Tích phân','\\int'],['∂','∂','','Đạo hàm riêng','\\partial'],
  ['Δ','Δ','','Delta hoa','\\Delta'],['°','°','','Độ','°'],['→','→','','Mũi tên phải','\\rightarrow']
 ]],
 ['Chữ Hy Lạp',[
  ['α','Alpha','\\alpha'],['β','Beta','\\beta'],['γ','Gamma','\\gamma'],['δ','Delta','\\delta'],
  ['θ','Theta','\\theta'],['λ','Lambda','\\lambda'],['μ','Mu','\\mu'],['ν','Nu','\\nu'],
  ['ρ','Rho','\\rho'],['σ','Sigma','\\sigma'],['τ','Tau','\\tau'],['υ','Upsilon','υ'],
  ['φ','Phi','\\phi'],['ω','Omega','\\omega'],['Ω','Omega hoa','\\Omega']
 ].map(([s,name,reference])=>[s,s,'',name,reference])]
];
for(const [title,symbols]of symbolGroups){
 const heading=document.createElement('p');heading.textContent=title;heading.style.margin='10px 0 4px';mathSymbolsPanel.append(heading);
 const group=document.createElement('div');group.style.cssText='display:grid;grid-template-columns:repeat(6,1fr);gap:3px';mathSymbolsPanel.append(group);
 for(const [display,left,right='',name,reference]of symbols){const button=document.createElement('button');button.type='button';button.textContent=display;button.title=display+'\n'+name+'\nInput: '+reference;button.style.cssText='padding:4px;margin:0;min-width:0';
  button.onclick=()=>{
   if(!mathInput?.isConnected){msg('Nhấp đúp nhãn cần sửa, rồi chọn ký hiệu.');return}
   const input=mathInput,{start,end}=mathSelection,selection=input.value.slice(start,end),replacement=left+selection+right;
   if(input.maxLength>0&&input.value.length-(end-start)+replacement.length>input.maxLength){msg('Nhãn đã đạt giới hạn ký tự.');return}
   input.focus();input.setRangeText(right?replacement:left,start,end,'end');
   if(right)input.setSelectionRange(start+left.length,start+left.length+selection.length);
   input.dispatchEvent(new Event('input',{bubbles:true}));rememberMathInput();
  };group.append(button);
 }
}
mathSymbolsPanel.addEventListener('pointerdown',e=>{if(e.target.closest('button')){rememberMathInput();e.preventDefault()}});
window.addEventListener('resize',positionMathSymbols);

// Creation actions remain reachable after the floating style panel closes (including on touch).
const rigidActions=document.createElement('div');rigidActions.id='rigidActions';rigidActions.className='action-group';rigidActions.hidden=true;
for(const [id,label,handler]of [['finishRigidRegion','Hoàn tất',finishRigidRegion],['cancelRigidRegion','Hủy',()=>{setMode('select');closeSecondaryTools()}]]){
 const button=document.createElement('button');button.id=id;button.textContent=label;button.type='button';button.style.minHeight='44px';button.onclick=handler;rigidActions.append(button);
}
$('viewTools').append(rigidActions);

// Foreground style uses the existing selection, cloning and whole-document history.
var objectColorControls=null,objectColorEdit=null;
const colorObjectTypes=new Set(['bar','thin','dashed','curve','support','hinge','force','moment','udl','dim','text','positive','negative','diagramM','diagramQ','diagramN','hatch','rigidRegion','linkBar','weld']);
function selectedColorObjects(){
 const ids=new Set(multiSelection);if(selected)ids.add(selected);
 return items.filter(o=>ids.has(o.id)&&colorObjectTypes.has(o.type));
}
function finishObjectColorEdit(){
 const edit=objectColorEdit;if(!edit)return;objectColorEdit=null;
 // Returning to the starting value is a no-op, including restoration of the redo branch.
 if(past.at(-1)===edit.before&&JSON.stringify(items)===JSON.stringify(edit.before)){
  past.pop();if(edit.dropped)past.unshift(edit.dropped);future=edit.future;
 }
}
function syncObjectColorControls(){
 if(!objectColorControls)return;
 const chosen=selectedColorObjects(),edit=objectColorEdit;
 if(edit&&(chosen.length!==edit.objects.length||chosen.some((o,i)=>o!==edit.objects[i])))finishObjectColorEdit();
 const input=$('objectColor');
 input.disabled=!chosen.length;
 const colors=new Set(chosen.map(o=>objectColor(o).toLowerCase().replace(/^black$/,'#000000')));
 input.value=colors.size===1?[...colors][0]:'#000000';
 $('objectColorState').textContent=colors.size>1?'Nhi\u1ec1u m\u00e0u':'';
 input.title=!chosen.length?'Ch\u1ecdn \u0111\u1ed1i t\u01b0\u1ee3ng':colors.size>1?'Nhi\u1ec1u m\u00e0u: ch\u1ecdn m\u00e0u cho c\u1ea3 nh\u00f3m':'M\u00e0u n\u00e9t / ch\u1eef (kh\u00f4ng \u0111\u1ed5i m\u00e0u t\u00f4 mi\u1ebfng c\u1ee9ng)';
}
function applyObjectColor(value){
 if(value!==null&&!validObjectColor(value))return;
 const chosen=selectedColorObjects();
 if(objectColorEdit&&(chosen.length!==objectColorEdit.objects.length||chosen.some((o,i)=>o!==objectColorEdit.objects[i])))finishObjectColorEdit();
 const normalized=value===null?null:value.toLowerCase();
 if(!chosen.some(o=>normalized===null?Object.hasOwn(o,'strokeColor'):o.strokeColor!==normalized))return;
 if(!objectColorEdit){
  const redo=future,dropped=past.length>=100?past[0]:null;checkpoint();
  objectColorEdit={objects:chosen,before:past.at(-1),future:redo,dropped};
 }
 for(const o of chosen){if(normalized===null)delete o.strokeColor;else o.strokeColor=normalized}
 render();
}
objectColorControls=document.createElement('div');objectColorControls.id='objectColorControls';objectColorControls.className='action-group';
const colorLabel=document.createElement('label');colorLabel.htmlFor='objectColor';colorLabel.style.cssText='display:flex;align-items:center;gap:6px;margin:0';
const colorInput=document.createElement('input');colorInput.id='objectColor';colorInput.type='color';colorInput.setAttribute('aria-label','M\u00e0u \u0111\u1ed1i t\u01b0\u1ee3ng');colorInput.style.cssText='width:48px;height:44px;padding:4px;margin:0';
// Fixed tool artwork; the native input still owns activation, focus and value.
const paletteArtwork='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">'+['#000000','#d32f2f','#1976d2','#388e3c','#f57c00','#7b1fa2'].map((color,i)=>`<rect x="${1+(i%3)*8}" y="${3+Math.floor(i/3)*10}" width="6" height="8" rx="1" fill="${color}"/>`).join('')+'</svg>';
colorInput.style.setProperty('--palette-artwork',`url("data:image/svg+xml,${encodeURIComponent(paletteArtwork)}")`);
// Browsers supporting native color suggestions can offer these without another popup.
const colorPresets=document.createElement('datalist');colorPresets.id='objectColorPresets';
for(const value of ['#000000','#d32f2f','#1976d2','#388e3c','#f57c00','#7b1fa2','#757575']){const option=document.createElement('option');option.value=value;colorPresets.append(option)}
colorInput.setAttribute('list',colorPresets.id);colorLabel.append(colorInput);
const colorState=document.createElement('span');colorState.id='objectColorState';colorState.style.fontSize='12px';
objectColorControls.append(colorLabel,colorState,colorPresets);$('viewTools').append(objectColorControls);
colorInput.oninput=()=>applyObjectColor(colorInput.value);
colorInput.onchange=()=>{applyObjectColor(colorInput.value);finishObjectColorEdit()};
colorInput.onblur=finishObjectColorEdit;
document.addEventListener('pointerdown',e=>{if(e.target!==colorInput)finishObjectColorEdit()},true);
colorInput.addEventListener('pointerdown',finishObjectColorEdit);
colorInput.addEventListener('keydown',e=>{
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){
  e.preventDefault();e.stopImmediatePropagation();finishObjectColorEdit();actions[e.shiftKey?'redo':'undo'][1]();
 }
});
syncObjectColorControls();

// Transient numeric-entry UI. Positions are CSS client coordinates, never model coordinates.
const dynamicInputUI=(()=>{
 const panel=document.createElement('div');panel.id='dynamicInput';panel.hidden=true;
 const input=document.createElement('input');input.id='dynamicInputValue';input.type='text';input.inputMode='decimal';input.autocomplete='off';input.setAttribute('aria-label','Giá trị');input.setAttribute('aria-describedby','dynamicInputSuffix');
 const suffix=document.createElement('span');suffix.id='dynamicInputSuffix';
 const confirmButton=document.createElement('button');confirmButton.type='button';confirmButton.textContent='✓';confirmButton.setAttribute('aria-label','Xác nhận');
 const cancelButton=document.createElement('button');cancelButton.type='button';cancelButton.textContent='×';cancelButton.setAttribute('aria-label','Hủy');
 input.enterKeyHint='done';
 panel.append(input,suffix,confirmButton,cancelButton);document.body.append(panel);
 const secondary=document.createElement('input');secondary.id='dynamicInputSecondary';secondary.type='text';secondary.inputMode='decimal';secondary.enterKeyHint='done';secondary.autocomplete='off';secondary.hidden=true;
 const secondarySuffix=document.createElement('span');secondarySuffix.hidden=true;
 panel.insertBefore(secondary,confirmButton);panel.insertBefore(secondarySuffix,confirmButton);
 let fields=null,activeIndex=0;
 const fieldInputs=[input,secondary];
 for(const el of fieldInputs){
  const hitArea=document.createElement('label');hitArea.className='dynamic-hit-area';hitArea.htmlFor=el.id;
  el.before(hitArea);hitArea.append(el);
 }
 function activeInput(){return fields?fieldInputs[activeIndex]:input}
 function selectField(index,focus=false){
  activeIndex=index;
  fieldInputs.forEach((el,i)=>el.classList.toggle('dynamic-active',!!fields&&i===index));
  fields?.onActive?.(index);
  if(focus){activeInput().focus({preventScroll:true});activeInput().select()}
 }
 function syncFields(){
  if(!fields)return;
  fields.values.forEach((field,i)=>{
   const el=fieldInputs[i];
   if(!el.dataset.editing)el.value=field.mode==='locked'?String(field.value):String(Number(field.value.toFixed(i===0?3:1)));
   el.classList.toggle('dynamic-locked',field.mode==='locked');
  });
 }
 fieldInputs.forEach((el,i)=>{
  el.addEventListener('focus',()=>{if(fields){selectField(i);el.select()}});
  el.addEventListener('input',()=>{el.setCustomValidity('');el.removeAttribute('aria-invalid');el.dataset.editing='true'});
  el.addEventListener('keydown',e=>e.stopPropagation());el.addEventListener('keyup',e=>e.stopPropagation());
 });
 let arcDirection=null;
 let x=0,y=0,viewport=null,onConfirm=null,onCancel=null,previousFocus=null,validateValue=null;
 function clearError(){for(const el of fieldInputs){el.setCustomValidity('');el.removeAttribute('aria-invalid')}}
 function confirm(){
  if(panel.hidden)return;
  // One comma is a decimal separator; mixed/repeated separators remain invalid.
  const target=activeInput(),text=target.value.trim().replace(',','.'),value=Number(text);
  if(!text||!Number.isFinite(value)||(validateValue&&validateValue(value)===false)||(fields&&fields.validate(activeIndex,value)===false)){
   target.setCustomValidity('Nhập số hữu hạn hợp lệ; chiều dài phải lớn hơn 0.');target.setAttribute('aria-invalid','true');target.reportValidity();return;
  }
  if(fields){fields.onConfirm(activeIndex,value);delete target.dataset.editing;clearError();syncFields();target.select();return true}
  const callback=onConfirm;hide();callback?.(value);return true;
 }
 function cancel(){if(panel.hidden)return;const callback=onCancel;hide();callback?.()}
 function keyboard(e){
  if(panel.hidden||document.querySelector('dialog[open]')||inlineEditor||(!panel.contains(e.target)&&e.target!==document.body&&e.target!==document.documentElement))return;
  if(e.key!=='Enter'&&e.key!=='Escape'&&!(fields&&e.key==='Tab'))return;
  e.stopImmediatePropagation();
  if(e.isComposing||e.keyCode===229)return;
  e.preventDefault();
  if(e.repeat&&fields?.onKeyboardCommit)return;
  if(e.key==='Tab'){
   if(fields.onKeyboardCommit&&activeInput().dataset.editing&&!confirm())return;
   selectField((activeIndex+1)%fields.values.length,true);return;
  }
  if(e.key==='Enter'&&fields?.onKeyboardCommit&&e.target!==cancelButton){
   if(activeInput().dataset.editing&&!confirm())return;
   fields.onKeyboardCommit();return;
  }
  if(e.key==='Escape')cancel();else if(e.target===cancelButton)cancel();else confirm();
 }
 confirmButton.onclick=confirm;cancelButton.onclick=cancel;
 input.addEventListener('input',clearError);
 function position(){
  if(panel.hidden)return;
  const vv=window.visualViewport,valid=vv&&[vv.width,vv.height,vv.offsetLeft,vv.offsetTop].every(Number.isFinite)&&vv.width>0&&vv.height>0;
  const left=valid?vv.offsetLeft:0,top=valid?vv.offsetTop:0,width=valid?vv.width:innerWidth,height=valid?vv.height:innerHeight;
  const mx=Math.min(8,width/4),my=Math.min(8,height/4),gap=16;
  panel.style.maxWidth=Math.max(1,width-2*mx)+'px';panel.style.maxHeight=Math.max(1,height-2*my)+'px';
  const rect=panel.getBoundingClientRect();
  const clamp=(n,min,max)=>Math.max(min,Math.min(n,Math.max(min,max)));
  const px=arcDirection?x+(arcDirection.x<0?-rect.width:0):x+gap+rect.width>left+width-mx?x-gap-rect.width:x+gap;
  const py=arcDirection?y+(arcDirection.y<0?-rect.height:0):fields&&y-gap-rect.height>=top+my?y-gap-rect.height:(y+gap+rect.height>top+height-my?y-gap-rect.height:y+gap);
  panel.style.left=clamp(px,left+mx,left+width-mx-rect.width)+'px';
  panel.style.top=clamp(py,top+my,top+height-my-rect.height)+'px';
 }
 function update(options={}){
  if(Object.hasOwn(options,'arcDirection'))arcDirection=options.arcDirection;
  if(Number.isFinite(options.clientX))x=options.clientX;
  if(Number.isFinite(options.clientY))y=options.clientY;
  if(Object.hasOwn(options,'value')){input.value=String(options.value??'');clearError()}
  if(Object.hasOwn(options,'suffix'))suffix.textContent=String(options.suffix??'');
  suffix.hidden=!suffix.textContent;
  syncFields();
  if(!options.keepPosition)position();
  if(options.focus&&!panel.hidden)activeInput().focus({preventScroll:true});
 }
 function show(options={}){
  arcDirection=null;
  panel.classList.toggle('dynamic-compact',options.compact===true);
  confirmButton.hidden=cancelButton.hidden=options.compact===true;
  fields=options.fields||null;activeIndex=0;validateValue=typeof options.validateValue==='function'?options.validateValue:null;
  for(const el of fieldInputs)delete el.dataset.editing;
  secondary.hidden=secondarySuffix.hidden=!fields||fields.values.length<2;
  input.setAttribute('aria-label',fields?.label||(fields?'Chiều dài':'Giá trị'));secondary.setAttribute('aria-label','Góc');
  secondarySuffix.textContent=fields?.suffix??'';
  panel.classList.toggle('dynamic-pair',!!fields&&fields.values.length>1);selectField(0);
  onConfirm=typeof options.onConfirm==='function'?options.onConfirm:null;
  onCancel=typeof options.onCancel==='function'?options.onCancel:null;clearError();
  if(panel.hidden){
   previousFocus=document.activeElement;window.addEventListener('keydown',keyboard,true);
   panel.hidden=false;viewport=window.visualViewport;
   window.addEventListener('resize',position);window.addEventListener('scroll',position);
   viewport?.addEventListener('resize',position);viewport?.addEventListener('scroll',position);
  }
  update(options);
 }
 function hide(){
  const restore=panel.contains(document.activeElement);
  panel.hidden=true;
  window.removeEventListener('keydown',keyboard,true);
  onConfirm=null;onCancel=null;validateValue=null;clearError();
  fields=null;for(const el of fieldInputs)delete el.dataset.editing;
  if(restore){document.activeElement.blur();if(previousFocus?.isConnected&&previousFocus.getClientRects().length)previousFocus.focus({preventScroll:true})}
  previousFocus=null;
  window.removeEventListener('resize',position);window.removeEventListener('scroll',position);
  viewport?.removeEventListener('resize',position);viewport?.removeEventListener('scroll',position);viewport=null;
 }
 // Keep native text editing; do not forward editing keys into drawing shortcuts.
 input.addEventListener('keydown',e=>e.stopPropagation());
 input.addEventListener('keyup',e=>e.stopPropagation());
 function confirmPending(){
  if(panel.hidden)return true;
  if(!fields)return confirm()===true;
  const previous=activeIndex;
  for(let i=0;i<fields.values.length;i++){
   if(!fieldInputs[i].dataset.editing)continue;
   selectField(i);if(!confirm()){fieldInputs[i].focus({preventScroll:true});return false}
  }
  selectField(previous);return true;
 }
 return {show,update,hide,cancel,confirmPending,getValue:()=>activeInput().value,isOpen:()=>!panel.hidden,owns:callback=>!panel.hidden&&onConfirm===callback,
  startKey:key=>{if(!fields)return false;const el=activeInput();el.focus({preventScroll:true});el.value=key;el.dataset.editing='true';clearError();el.setSelectionRange(key.length,key.length);return true},
  isFieldFocused:()=>!!fields&&fieldInputs.includes(document.activeElement)};
})();
function showDynamicInput(options){dynamicInputUI.show(options)}
function updateDynamicInput(options){dynamicInputUI.update(options)}
function hideDynamicInput(){dynamicInputUI.hide()}
function getDynamicInputValue(){return dynamicInputUI.getValue()}

function cancelDynamicInput(){dynamicInputUI.cancel()}

// Opt-in numeric capture; caller owns workflow semantics.
let dynamicNumericCapture=null;
function isDynamicNumericInputArmed(){return dynamicNumericCapture!==null}
function disarmDynamicNumericInput(){
 const session=dynamicNumericCapture;dynamicNumericCapture=null;
 if(session&&dynamicInputUI.owns(session.confirm))hideDynamicInput();
}
function armDynamicNumericInput(options={}){
 disarmDynamicNumericInput();
 const session={clientX:Number.isFinite(options.clientX)?options.clientX:0,clientY:Number.isFinite(options.clientY)?options.clientY:0,
  suffix:options.suffix??'',initialValue:options.initialValue??'',onConfirm:options.onConfirm,onCancel:options.onCancel,validateValue:options.validateValue,compact:options.compact===true};
 session.confirm=value=>{
  if(dynamicNumericCapture!==session)return;
  const callback=session.onConfirm;disarmDynamicNumericInput();if(typeof callback==='function')callback(value);
 };
 session.cancel=()=>{
  if(dynamicNumericCapture!==session)return;
  const callback=session.onCancel;disarmDynamicNumericInput();if(typeof callback==='function')callback();
 };
 dynamicNumericCapture=session;
}
function updateDynamicNumericInputAnchor(clientX,clientY){
 const session=dynamicNumericCapture;if(!session)return;
 if(Number.isFinite(clientX))session.clientX=clientX;
 if(Number.isFinite(clientY))session.clientY=clientY;
 if(dynamicInputUI.owns(session.confirm))updateDynamicInput({clientX:session.clientX,clientY:session.clientY});
}
function openArmedDynamicInput(initialValue){
 const session=dynamicNumericCapture;if(!session)return false;
 if(dynamicInputUI.isOpen()){
  if(!dynamicInputUI.owns(session.confirm))return false;
  updateDynamicInput({focus:true});return true;
 }
 showDynamicInput({clientX:session.clientX,clientY:session.clientY,suffix:session.suffix,
  value:initialValue===undefined?session.initialValue:initialValue,focus:true,onConfirm:session.confirm,onCancel:session.cancel,validateValue:session.validateValue,compact:session.compact});
 return true;
}
window.addEventListener('keydown',e=>{
 if(!dynamicNumericCapture||e.defaultPrevented||e.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;
 const editing=element=>element instanceof Element&&(element.matches('input,textarea,select')||element.isContentEditable||!!element.closest('[role="textbox"],[role="combobox"],[role="spinbutton"]'));
 if(editing(document.activeElement)||e.composedPath().some(editing)||document.querySelector('dialog[open]'))return;
 if(!/^[0-9.,-]$/.test(e.key))return;
 if(dynamicInputUI.isOpen()){
  if(dynamicInputUI.owns(dynamicNumericCapture.confirm)&&dynamicInputUI.startKey(e.key)){e.preventDefault();e.stopImmediatePropagation()}
  return;
 }
 if(openArmedDynamicInput(e.key)){e.preventDefault();e.stopImmediatePropagation()}
},true);

// Reuse the numeric field and viewport clamp; keep the typing target stationary.
function updateReferenceAngleInputAnchor(geometry=activeReferenceAnglePreview(),e){
 const numeric=mode==='support'?supportNumericSession:['force','udl'].includes(mode)?loadNumericSession:null;
 if(!numeric||!dynamicInputUI.owns(numeric.capture.confirm))return false;
 if(e)numeric.cursorAnchor={clientX:e.clientX,clientY:e.clientY};
 if(dynamicInputUI.isFieldFocused()||$('dynamicInputValue').dataset.editing){updateDynamicInput(geometry?{}:{arcDirection:null,keepPosition:true});return true}
 let anchor=numeric.touch?numeric.initialAnchor:numeric.cursorAnchor;
 if(geometry){const p=new DOMPoint(geometry.inputAnchor.x,geometry.inputAnchor.y).matrixTransform(svg.getScreenCTM());anchor={clientX:p.x,clientY:p.y}}
 updateDynamicInput({...anchor,arcDirection:geometry?.arcMidDirection||null});return true;
}
// Support owns one angle field; reuse shared capture, validation and focus lifecycle.
var supportNumericSession=null;
function endSupportNumericInput(){
 const session=supportNumericSession;supportNumericSession=null;
 if(session&&dynamicNumericCapture===session.capture)disarmDynamicNumericInput();
}
function lockSupportNumericAngle(value){
 const session=supportPlacementSession;if(!session||!Number.isFinite(value))return;
 // Same SVG +Y convention and canonical range as the pure direction solver.
 const wrapped=value%360,r=wrapped*Math.PI/180;
 const angle=solveSupportAngle({x:0,y:0},{x:-Math.sin(r),y:Math.cos(r)});
 supportReferenceFrame();session.angle.mode='locked';session.angle.value=angle;session.previewAngle=supportGlobalAngle();render();
}
function beginSupportNumericInput(e){
 endSupportNumericInput();
 const session=supportPlacementSession,active=document.activeElement;
 if(!session||active?.matches('input,textarea,select')||active?.isContentEditable||dynamicNumericCapture||dynamicInputUI.isOpen())return;
 const global={down:0,up:180,left:90,right:-90}[session.direction]||0,frame=supportReferenceFrame();
 session.angle.value=frame?globalPlacementAngleToReferenceAngle(global,frame):global;
 armDynamicNumericInput({clientX:e.clientX,clientY:e.clientY,suffix:'\u00b0',compact:true,onCancel:cancelToSelection});
 supportNumericSession={session,capture:dynamicNumericCapture,touch:e.pointerType==='touch',initialAnchor:{clientX:e.clientX,clientY:e.clientY},cursorAnchor:{clientX:e.clientX,clientY:e.clientY}};
 showDynamicInput({clientX:e.clientX,clientY:e.clientY,suffix:'\u00b0',compact:true,onConfirm:dynamicNumericCapture.confirm,onCancel:dynamicNumericCapture.cancel,
  fields:{label:'G\u00f3c',values:[session.angle],validate:()=>true,onConfirm:(_,value)=>lockSupportNumericAngle(value),
   onKeyboardCommit:()=>commitSupportPlacement(supportGlobalAngle())}});
}
function confirmSupportNumericInput(){
 return !supportNumericSession||dynamicInputUI.confirmPending();
}
function updateSupportNumericInput(e){
 if(!supportNumericSession)return;
 if($('dynamicInputValue').dataset.editing){
  const text=getDynamicInputValue().trim().replace(',','.'),value=Number(text);
  if(text&&Number.isFinite(value))lockSupportNumericAngle(value);
 }
 if(updateReferenceAngleInputAnchor(activeReferenceAnglePreview(),e))return;
 if(supportNumericSession.touch)updateDynamicInput();
 else updateDynamicInput({clientX:e.clientX,clientY:e.clientY});
}
$('dynamicInputValue').addEventListener('input',()=>{
 if(!supportNumericSession)return;
 const text=getDynamicInputValue().trim().replace(',','.'),value=Number(text);
 if(text&&Number.isFinite(value))lockSupportNumericAngle(value);
});

// Moment reuses Snap's palette, radio selected styling and dismissal lifecycle.
let currentMomentRotation='cw';
const momentButton=$('tools').querySelector('[data-mode="moment"]');
const momentPalette=document.createElement('details');momentPalette.id='momentDirectionPalette';
momentPalette.style.cssText='position:fixed;width:0;height:0;margin:0;padding:0;border:0;z-index:2000';
const momentSummary=document.createElement('summary');momentSummary.hidden=true;momentPalette.append(momentSummary);
const momentChoices=document.createElement('div');momentChoices.className='snap-choices';momentChoices.style.width='max-content';
momentChoices.setAttribute('role','radiogroup');momentChoices.setAttribute('aria-label','Chi\u1ec1u m\u00f4men');momentPalette.append(momentChoices);document.body.append(momentPalette);
const momentIcon=rotation=>{
 const side=rotation==='cw'?1:-1,id='moment-tool-arrow-'+rotation;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-55 -55 110 110"><defs><marker id="${id}" viewBox="0 0 10 10" refX="0" refY="5" markerWidth="7" markerHeight="7" orient="auto" overflow="visible"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs><g fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M0 0L${-side*20} 28"/><path d="M${-side*20} 28 A34 34 0 0 ${side===1?1:0} ${side*12} -32" marker-end="url(#${id})"/></g></svg>`;
};
function syncMomentDirection(){
 for(const input of momentChoices.querySelectorAll('input'))input.checked=input.value===currentMomentRotation;
 momentButton.style.setProperty('--tool-icon',`url("data:image/svg+xml,${encodeURIComponent(momentIcon(currentMomentRotation))}")`);
 momentButton.dataset.rotation=currentMomentRotation;
}
function closeMomentPalette(){momentPalette.open=false;momentButton.setAttribute('aria-expanded','false')}
function positionMomentPalette(){
 if(!momentPalette.open)return;
 const box=momentButton.getBoundingClientRect();
 momentChoices.style.left=Math.max(8,Math.min(box.left,innerWidth-momentChoices.offsetWidth-8))+'px';
 momentChoices.style.top=Math.max(8,Math.min(box.bottom+6,innerHeight-momentChoices.offsetHeight-8))+'px';
}
for(const [rotation,title]of [['cw','M\u00f4men thu\u1eadn chi\u1ec1u'],['ccw','M\u00f4men ng\u01b0\u1ee3c chi\u1ec1u']]){
 const label=document.createElement('label');label.className='snap-icon-choice';label.title=title;
 const input=document.createElement('input');input.type='radio';input.name='momentDirection';input.value=rotation;input.setAttribute('aria-label',title);
 label.innerHTML=momentIcon(rotation);label.querySelector('svg').style.cssText='width:30px;height:30px;border:0;flex:none';label.querySelector('svg').setAttribute('aria-hidden','true');label.prepend(input);
 input.onclick=()=>{currentMomentRotation=rotation;$('rotation').value=rotation;selected=null;setMode('moment');syncMomentDirection();closeMomentPalette();momentButton.focus({preventScroll:true})};
 momentChoices.append(label);
}
momentButton.setAttribute('aria-controls',momentPalette.id);momentButton.setAttribute('aria-haspopup','true');momentButton.setAttribute('aria-expanded','false');
let momentHoldTimer=null,momentHoldOpened=false;
function openMomentChoices(){closeSecondaryTools();snapPanel.open=false;syncMomentDirection();momentPalette.open=true;momentButton.setAttribute('aria-expanded','true');positionMomentPalette()}
momentButton.title+=' ? CW/CCW: right-click / hold / ?';
momentButton.onclick=()=>{
 if(momentHoldOpened){momentHoldOpened=false;return}
 closeSecondaryTools();snapPanel.open=false;selected=null;setMode('moment');syncMomentDirection();
 closeMomentPalette();
};
momentButton.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();openMomentChoices();momentChoices.querySelector('input:checked')?.focus()}});
momentButton.addEventListener('contextmenu',e=>{e.preventDefault();openMomentChoices()});
momentButton.addEventListener('pointerdown',e=>{momentHoldOpened=false;if(e.pointerType==='touch'||e.pointerType==='pen')momentHoldTimer=setTimeout(()=>{momentHoldOpened=true;openMomentChoices()},500)});
for(const event of ['pointerup','pointercancel','pointerleave'])momentButton.addEventListener(event,()=>clearTimeout(momentHoldTimer));
momentPalette.addEventListener('toggle',()=>{momentButton.setAttribute('aria-expanded',String(momentPalette.open));positionMomentPalette()});
autoHideSecondary(momentPalette,()=>[momentButton],()=>momentPalette.open,closeMomentPalette);
window.addEventListener('resize',positionMomentPalette);
document.addEventListener('scroll',e=>{if(!momentChoices.contains(e.target))closeMomentPalette()},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMomentPalette()});
syncMomentDirection();

// Force/moment use the shared angle field; UDL retains its legacy panel.
var loadNumericSession=null;
function endLoadNumericInput(){
 const session=loadNumericSession;loadNumericSession=null;
 if(session&&dynamicNumericCapture===session.capture)disarmDynamicNumericInput();
}
function lockLoadNumericAngle(value){
 if(!loadNumericSession||!Number.isFinite(value))return;
 const session=loadNumericSession.session;
 let angle=value%360;if(angle<=-180)angle+=360;if(angle>180)angle-=360;
 loadReferenceFrame();session.uiAngle.mode='locked';session.uiAngle.value=angle===0?0:angle;
 resolveLoadUserAngle();paintLoadPreview();
}
function readLoadNumericEdit(){
 if(!loadNumericSession||!$('dynamicInputValue').dataset.editing)return;
 const text=getDynamicInputValue().trim().replace(',','.'),value=Number(text);
 if(text&&Number.isFinite(value))lockLoadNumericAngle(value);
}
function beginLoadNumericInput(e){
 endLoadNumericInput();
 const session=loadPlacement,active=document.activeElement;
 if(!session?.uiAngle||active?.matches('input,textarea,select')||active?.isContentEditable||dynamicNumericCapture||dynamicInputUI.isOpen())return;
 armDynamicNumericInput({clientX:e.clientX,clientY:e.clientY,suffix:'\u00b0',compact:true,onCancel:cancelToSelection});
 loadNumericSession={session,capture:dynamicNumericCapture,touch:e.pointerType==='touch',initialAnchor:{clientX:e.clientX,clientY:e.clientY},cursorAnchor:{clientX:e.clientX,clientY:e.clientY}};
 showDynamicInput({clientX:e.clientX,clientY:e.clientY,suffix:'\u00b0',compact:true,onConfirm:dynamicNumericCapture.confirm,onCancel:dynamicNumericCapture.cancel,
  fields:{label:'G\u00f3c',values:[session.uiAngle],validate:()=>true,onConfirm:(_,value)=>lockLoadNumericAngle(value),onKeyboardCommit:placeLoadObject}});

}
function confirmLoadNumericInput(){return !loadNumericSession||dynamicInputUI.confirmPending()}
function updateLoadNumericInput(e){
 if(!loadNumericSession)return;
 if(['force','udl'].includes(mode)&&updateReferenceAngleInputAnchor(activeReferenceAnglePreview(),e))return;
 updateDynamicInput(loadNumericSession.touch?{}:{clientX:e.clientX,clientY:e.clientY});
}
$('dynamicInputValue').addEventListener('input',readLoadNumericEdit);

// Each explicit first point or completed segment starts a fresh LIVE/LIVE session.
var barNumericSession=null;
function beginBarNumericInput(e){
 endBarNumericInput();
 const active=document.activeElement;
 if(mode!=='bar'||!first||active?.matches('input,textarea,select')||active?.isContentEditable||dynamicNumericCapture||dynamicInputUI.isOpen())return;
 armDynamicNumericInput({clientX:e.clientX,clientY:e.clientY,suffix:'m',
  onConfirm:()=>{barNumericSession=null},onCancel:()=>{barNumericSession=null;cancelToSelection()}});
 barNumericSession={first,capture:dynamicNumericCapture};
 barNumericSession.state={activeField:'distance',distance:{mode:'live',value:0},angle:{mode:'live',value:0}};
 const state=barNumericSession.state;
 showDynamicInput({clientX:e.clientX,clientY:e.clientY,suffix:'m',compact:true,onConfirm:dynamicNumericCapture.confirm,onCancel:dynamicNumericCapture.cancel,
  fields:{values:[state.distance,state.angle],suffix:'°',onKeyboardCommit:()=>{
   const session=barNumericSession;if(!session||session.state!==state)return;
   commitBarCandidate(hover||first,{clientX:session.capture.clientX,clientY:session.capture.clientY});
  },validate:(i,value)=>i!==0||value>0,
   onActive:i=>{state.activeField=i===0?'distance':'angle'},
   onConfirm:(i,value)=>{const field=i===0?state.distance:state.angle;field.mode='locked';field.value=value;syncBarNumericInput();renderBarConstraintPreview()}}});
}
function endBarNumericInput(){
 if(!barNumericSession)return;
 if(dynamicNumericCapture===barNumericSession.capture)disarmDynamicNumericInput();
 barNumericSession=null;
}
function syncBarNumericInput(){
 if(barNumericSession&&(mode!=='bar'||first!==barNumericSession.first||dynamicNumericCapture!==barNumericSession.capture))endBarNumericInput();
 if(!barNumericSession)return;
 const session=barNumericSession,state=session.state;
 session.endpoint=solveBarEndpoint({startPoint:first,candidatePoint:hover||first,geometryScale,
  distanceMode:state.distance.mode,distanceValue:state.distance.value,angleMode:state.angle.mode,angleValue:state.angle.value});
 if(session.endpoint){
  const dx=session.endpoint.x-first.x,dy=session.endpoint.y-first.y;
  if(state.distance.mode==='live')state.distance.value=Math.hypot(dx,dy)/geometryScale;
  if(state.angle.mode==='live')state.angle.value=(Math.atan2(-dy,dx)*180/Math.PI+360)%360;
 }
 if(dynamicInputUI.owns(session.capture.confirm))updateDynamicInput();
}
svg.addEventListener('pointermove',e=>{
 syncBarNumericInput();
 if(!barNumericSession)return;
 if(e.pointerType==='touch'&&dynamicInputUI.isFieldFocused())updateDynamicInput();
 else updateDynamicNumericInputAnchor(e.clientX,e.clientY);
});

// Thin-line magnitude session shared by pointer and keyboard interactions.
var thinNumericSession=null;
function beginThinNumericInput(e){
 endThinNumericInput();
 const active=document.activeElement;
 if(mode!=='thin'||!first||active?.matches('input,textarea,select')||active?.isContentEditable||inlineEditor||document.querySelector('dialog[open]')||dynamicNumericCapture||dynamicInputUI.isOpen())return;
 armDynamicNumericInput({clientX:e.clientX,clientY:e.clientY,suffix:'NL',compact:true,
  validateValue:value=>value>0&&Number.isFinite(internalForceScale)&&internalForceScale>0&&Number.isFinite(value/internalForceScale)&&value/internalForceScale>0,
  onConfirm:value=>{if(!thinNumericSession)return;thinNumericSession.valueMode='locked';thinNumericSession.value=value;syncThinNumericInput();renderThinConstraintPreview()},
  onCancel:()=>{thinNumericSession=null;cancelToSelection()}});
 thinNumericSession={first,capture:dynamicNumericCapture,valueMode:'live',value:0,endpoint:null,pointerType:e.pointerType||'mouse'};
 const session=thinNumericSession;
 showDynamicInput({clientX:e.clientX,clientY:e.clientY,suffix:'NL',compact:true,
  onConfirm:session.capture.confirm,onCancel:session.capture.cancel,
  fields:{label:'Độ lớn nội lực',values:[{get mode(){return session.valueMode},get value(){return session.value}}],
   validate:(i,value)=>session.capture.validateValue(value),
   onConfirm:(i,value)=>session.capture.onConfirm(value)}});

}
function endThinNumericInput(){
 if(!thinNumericSession)return;
 if(dynamicNumericCapture===thinNumericSession.capture)disarmDynamicNumericInput();
 thinNumericSession=null;
}
function syncThinNumericInput(){
 // The legacy commit replaces first with the endpoint; this also ends the session.
 if(thinNumericSession&&(mode!=='thin'||first!==thinNumericSession.first||(thinNumericSession.valueMode==='live'&&dynamicNumericCapture!==thinNumericSession.capture)))endThinNumericInput();
 const referenceBar=thinNumericSession?getThinReferenceBar():null;
 const geometry=referenceBar?getThinConstrainedGeometry(referenceBar):null;
 if(thinNumericSession?.valueMode==='locked')thinNumericSession.endpoint=referenceBar?geometry?.endpoint||null:solveThinEndpointFromValue({startPoint:first,candidatePoint:hover||first,internalForceValue:thinNumericSession.value,internalForceScale});
 if(thinNumericSession?.valueMode==='live'){
  const candidate=hover||first;
  thinNumericSession.value=(referenceBar?Math.abs(geometry?.signedNormalDistance||0):Math.hypot(candidate.x-first.x,candidate.y-first.y))*internalForceScale;
 }
 if(thinNumericSession&&dynamicInputUI.owns(thinNumericSession.capture.confirm))updateDynamicInput();
}
svg.addEventListener('pointermove',e=>{
 syncThinNumericInput();
 if(thinNumericSession&&dynamicNumericCapture===thinNumericSession.capture){
  if(e.pointerType==='touch'&&dynamicInputUI.isFieldFocused())updateDynamicInput();
  else updateDynamicNumericInputAnchor(e.clientX,e.clientY);
 }
});

// A canvas tap can accept pending drawing edits without a separate touch button.
// Validation happens before the unchanged pointer commit handler.
svg.addEventListener('pointerdown',e=>{
 if(consumeThinReferenceOverride(e))return;
 if(e.button!==0||!first||!dynamicInputUI.isOpen())return;
 const session=mode==='bar'?barNumericSession:mode==='thin'?thinNumericSession:null;
 if(!session||!dynamicInputUI.owns(session.capture.confirm))return;
 if(!dynamicInputUI.confirmPending()){e.preventDefault();e.stopImmediatePropagation()}
},true);


// A touch/pen edit keeps Done as field confirmation even on hybrid computers.
$('dynamicInput').addEventListener('pointerdown',e=>{
 if(thinNumericSession&&dynamicInputUI.owns(thinNumericSession.capture.confirm)&&['touch','pen'].includes(e.pointerType))thinNumericSession.pointerType=e.pointerType;
});
window.addEventListener('keydown',e=>{
 const session=thinNumericSession;
 if(e.key!=='Enter'||e.isComposing||e.keyCode===229||e.ctrlKey||e.altKey||e.metaKey||mode!=='thin'||!first||!session||session.first!==first||session.pointerType!=='mouse'||inlineEditor||document.querySelector('dialog[open]'))return;
 const ownInput=dynamicInputUI.owns(session.capture.confirm);
 if(dynamicInputUI.isOpen()&&!ownInput)return;
 if(e.target!==document.body&&e.target!==document.documentElement&&!(ownInput&&$('dynamicInput').contains(e.target)))return;
 if(!ownInput&&session.valueMode!=='locked')return;
 e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
 if(ownInput&&!dynamicInputUI.confirmPending())return;
 if(thinNumericSession!==session||session.valueMode!=='locked')return;
 commitThinCandidate(hover||first,{clientX:session.capture.clientX,clientY:session.capture.clientY,pointerType:session.pointerType});
},true);

// Shared command actions: native editors/Dynamic Input retain their own key lifecycle.
function finishActiveCommand(){
 if(mode==='section'&&!sectionPending)finishSection();
 else if(mode==='rigidRegion')finishRigidRegion();
 else if(mode==='hatch')finishHatchCommand();
 else if(mirrorSelecting)startMirrorAxis();
 updateCommandControls();
}
function cancelActiveCommand(){cancelToSelection();updateCommandControls()}
const commandControls=document.createElement('div');commandControls.id='commandControls';commandControls.hidden=true;
const commandCancel=document.createElement('button'),commandFinish=document.createElement('button');
commandCancel.type=commandFinish.type='button';commandCancel.textContent='\u00d7';commandFinish.textContent='\u2713';
commandCancel.setAttribute('aria-label','H\u1ee7y (Esc)');commandFinish.setAttribute('aria-label','Ho\u00e0n t\u1ea5t (Enter)');
commandControls.append(commandCancel,commandFinish);document.body.append(commandControls);
commandControls.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation()});
commandCancel.onclick=cancelActiveCommand;commandFinish.onclick=finishActiveCommand;
function updateCommandControls(){
 const touch=matchMedia('(any-pointer: coarse)').matches;
 const editing=inlineEditor||document.querySelector('dialog[open]')||document.activeElement?.matches('input,textarea,select')||document.activeElement?.isContentEditable;
 const active=mode!=='select'||mirrorSelecting;
 const finish=mode==='section'&&!sectionPending&&sectionPoints.length>=2||mode==='rigidRegion'&&rigidPoints.length>=3||mode==='hatch'&&hatchPoints.length>=3||mirrorSelecting&&selectedObjectIds().size>0;
 commandControls.hidden=!touch||!!editing||!active;
 commandFinish.hidden=!finish;
 // Keep clear of the existing numeric editor; do not create a second confirmation UI.
 const input=$('dynamicInput');
 if(input&&!input.hidden){const r=input.getBoundingClientRect();commandControls.style.bottom=Math.max(16,innerHeight-r.top+12)+'px'}else commandControls.style.bottom='';
}
new MutationObserver(updateCommandControls).observe(svg,{childList:true,subtree:true});
for(const event of ['focusin','focusout','pointerup','keydown'])document.addEventListener(event,()=>queueMicrotask(updateCommandControls));
window.addEventListener('resize',updateCommandControls);
document.addEventListener('keydown',e=>{if(mode==='hatch'&&e.key==='Enter'&&!e.isComposing&&!e.target.matches('input,textarea,select')){e.preventDefault();finishActiveCommand()}});
// Clear multi-point sessions on lifecycle actions that previously left point arrays alive.
function clearMultiPointCommand(){
 if(!['section','hatch','rigidRegion'].includes(mode)&&!mirrorSelecting)return;
 sectionPoints=[];sectionPending=null;hatchPoints=[];rigidPoints=[];mirrorSelecting=false;
 document.querySelector('[data-section-dialog]')?.remove();setMode('select');updateCommandControls();
}
for(const name of ['undo','redo']){const action=actions[name][1];actions[name][1]=()=>{clearMultiPointCommand();action()};$(name).onclick=actions[name][1]}
svg.addEventListener('pointercancel',clearMultiPointCommand);
$('open').addEventListener('click',clearMultiPointCommand,true);
updateCommandControls();

// Tablet presentation adapter: same tool DOM and selection handlers, no drawing state.
function floatingToolsBounds(){
 const vv=window.visualViewport,left=vv?.offsetLeft||0,top=vv?.offsetTop||0,w=vv?.width||innerWidth,h=vv?.height||innerHeight;
 const style=getComputedStyle(toolboxHandle),inset=name=>parseFloat(style.getPropertyValue(name))||0;
 return {left:left+Math.max(8,inset('--safe-left')),right:left+w-Math.max(8,inset('--safe-right'))-44,
  top:Math.max(top+8,document.querySelector('header').getBoundingClientRect().bottom+8),bottom:top+h-Math.max(12,inset('--safe-bottom'))-44};
}
function avoidFloatingCollision(rect){
 for(const id of ['commandControls','dynamicInput']){
  const element=$(id);if(!element||element.hidden)continue;
  const r=element.getBoundingClientRect();
  if(rect.x<r.right+8&&rect.x+rect.w>r.left-8&&rect.y<r.bottom+8&&rect.y+rect.h>r.top-8){
   const bounds=floatingToolsBounds();rect.y=r.top-rect.h-8>=bounds.top?r.top-rect.h-8:Math.min(bounds.bottom+44-rect.h,r.bottom+8);
  }
 }
 return rect;
}
function positionFloatingTools(){
 if(!floatingToolsMedia.matches||floatingToolsDrag)return;
 const b=floatingToolsBounds(),r=avoidFloatingCollision({x:floatingToolsSide==='left'?b.left:b.right,y:b.top+floatingToolsRatio*Math.max(0,b.bottom-b.top),w:44,h:44});
 toolboxHandle.style.left=r.x+'px';toolboxHandle.style.top=r.y+'px';
 if(!floatingToolsOpen)return;
 const width=Math.min(300,Math.max(120,b.right-b.left-16));
 const controls=$('commandControls'),reserved=controls&&!controls.hidden?controls.getBoundingClientRect().top-8:b.bottom+44;
 const height=Math.max(44,Math.min(b.bottom+44,reserved)-b.top);
 toolboxPanel.style.width=width+'px';toolboxPanel.style.maxHeight=height+'px';
 const pr=avoidFloatingCollision({x:Math.max(b.left,Math.min(floatingToolsSide==='left'?r.x+52:r.x-width-8,b.right+44-width)),y:Math.max(b.top,Math.min(r.y,Math.min(b.bottom+44,reserved)-toolboxPanel.offsetHeight)),w:width,h:toolboxPanel.offsetHeight});
 toolboxPanel.style.left=pr.x+'px';toolboxPanel.style.top=Math.max(b.top,pr.y)+'px';
}
function paintFloatingTools(){
 toolboxShell.dataset.floatingTools='true';document.body.classList.remove('tools-collapsed');
 toolboxPanel.hidden=!floatingToolsOpen;toolboxPanel.inert=!floatingToolsOpen;
 toolboxHandle.textContent='\u2637';toolboxHandle.setAttribute('aria-label','C\u00f4ng c\u1ee5');toolboxHandle.title='C\u00f4ng c\u1ee5';toolboxHandle.setAttribute('aria-expanded',String(floatingToolsOpen));
 toolboxHandle.classList.toggle('active',mode!=='select');toolboxHandle.dataset.activeTool=mode;
 positionFloatingTools();
}
toolboxHandle.addEventListener('pointerdown',e=>{
 if(!floatingToolsMedia.matches||e.button!==0)return;
 e.preventDefault();e.stopPropagation();floatingToolsSuppressClick=false;
 floatingToolsDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:toolboxHandle.getBoundingClientRect().left,top:toolboxHandle.getBoundingClientRect().top,moved:false};toolboxHandle.setPointerCapture(e.pointerId);
});
toolboxHandle.addEventListener('pointermove',e=>{
 const d=floatingToolsDrag;if(!d||d.id!==e.pointerId)return;
 const dx=e.clientX-d.x,dy=e.clientY-d.y;if(!d.moved&&Math.hypot(dx,dy)<8)return;
 d.moved=true;floatingToolsOpen=false;toolboxPanel.hidden=true;toolboxPanel.inert=true;toolboxHandle.setAttribute('aria-expanded','false');
 const b=floatingToolsBounds();toolboxHandle.style.left=Math.max(b.left,Math.min(b.right,d.left+dx))+'px';toolboxHandle.style.top=Math.max(b.top,Math.min(b.bottom,d.top+dy))+'px';e.preventDefault();e.stopPropagation();
});
function endFloatingToolsDrag(e){
 const d=floatingToolsDrag;if(!d||d.id!==e.pointerId)return;floatingToolsDrag=null;
 if(d.moved){const b=floatingToolsBounds(),r=toolboxHandle.getBoundingClientRect();floatingToolsSide=r.left+22<(b.left+b.right+44)/2?'left':'right';floatingToolsRatio=Math.max(0,Math.min(1,(r.top-b.top)/Math.max(1,b.bottom-b.top)));floatingToolsSuppressClick=true}
 if(toolboxHandle.hasPointerCapture(e.pointerId))toolboxHandle.releasePointerCapture(e.pointerId);paintFloatingTools();
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])toolboxHandle.addEventListener(event,endFloatingToolsDrag);
toolboxPanel.addEventListener('click',e=>{
 if(!floatingToolsMedia.matches||!e.target.closest('button[data-mode],button[data-support-type]'))return;
 floatingToolsOpen=false;paintFloatingTools();
});
document.addEventListener('pointerdown',e=>{
 if(!floatingToolsMedia.matches||!floatingToolsOpen||toolboxPanel.contains(e.target)||toolboxHandle.contains(e.target))return;
 floatingToolsOpen=false;paintFloatingTools();
},true);
floatingToolsMedia.addEventListener('change',()=>{
 cancelToolboxClose();floatingToolsOpen=false;
 delete toolboxShell.dataset.floatingTools;toolboxPanel.style.removeProperty('width');toolboxPanel.style.removeProperty('max-height');toolboxPanel.style.removeProperty('left');toolboxPanel.style.removeProperty('top');toolboxHandle.style.removeProperty('left');toolboxHandle.style.removeProperty('top');paintToolbox();
});
window.addEventListener('resize',positionFloatingTools);window.visualViewport?.addEventListener('resize',positionFloatingTools);window.visualViewport?.addEventListener('scroll',positionFloatingTools);
new MutationObserver(()=>{if(floatingToolsMedia.matches)paintFloatingTools()}).observe(svg,{childList:true});
paintToolbox();

// Tablet-only ribbon presentation; move existing containers without replacing handlers.
const commandRibbon=document.createElement('div');commandRibbon.id='commandRibbon';
const ribbonScroll=document.createElement('div');ribbonScroll.id='ribbonScroll';
const ribbonToggle=document.createElement('button');ribbonToggle.id='ribbonToggle';ribbonToggle.type='button';ribbonToggle.setAttribute('aria-controls','ribbonScroll');
commandRibbon.append(ribbonScroll,ribbonToggle);
let ribbonCollapsed=false;
try{ribbonCollapsed=localStorage.getItem('ket-cau-ribbon-collapsed')==='true'}catch{}
function paintCommandRibbon(){
 const tablet=floatingToolsMedia.matches;
 if(tablet){
  if(!commandRibbon.isConnected){$('actions').before(commandRibbon);ribbonScroll.append($('actions'),$('viewTools'))}
  commandRibbon.dataset.collapsed=String(ribbonCollapsed);ribbonScroll.hidden=ribbonCollapsed;
  ribbonToggle.textContent=ribbonCollapsed?'\u2304':'\u2303';
  ribbonToggle.title=ribbonCollapsed?'Hi\u1ec7n thanh l\u1ec7nh':'Thu g\u1ecdn thanh l\u1ec7nh';ribbonToggle.setAttribute('aria-label',ribbonToggle.title);ribbonToggle.setAttribute('aria-expanded',String(!ribbonCollapsed));
 }else if(commandRibbon.isConnected){commandRibbon.before($('actions'),$('viewTools'));commandRibbon.remove()}
}
ribbonToggle.addEventListener('pointerdown',e=>e.preventDefault());
ribbonToggle.onclick=()=>{
 ribbonCollapsed=!ribbonCollapsed;
 for(const menu of ribbonScroll.querySelectorAll('details[open]'))menu.open=false;
 try{localStorage.setItem('ket-cau-ribbon-collapsed',String(ribbonCollapsed))}catch{}
 paintCommandRibbon();
};
// Menus must escape the scrolling strip's clipping rectangle.
function positionRibbonMenus(){
 if(!floatingToolsMedia.matches)return;
 for(const menu of ribbonScroll.querySelectorAll('.command-menu[open]')){
  const panel=menu.querySelector('.file-commands'),r=menu.querySelector('summary').getBoundingClientRect();
  panel.style.left=Math.max(8,Math.min(r.left,innerWidth-panel.offsetWidth-8))+'px';panel.style.top=r.bottom+4+'px';
 }
}
for(const menu of [$('fileMenu'),$('editMenu')])menu.addEventListener('toggle',positionRibbonMenus);
ribbonScroll.addEventListener('scroll',()=>{for(const menu of ribbonScroll.querySelectorAll('details[open]'))menu.open=false});
floatingToolsMedia.addEventListener('change',()=>{for(const panel of ribbonScroll.querySelectorAll('.file-commands')){panel.style.removeProperty('left');panel.style.removeProperty('top')}paintCommandRibbon()});
window.addEventListener('resize',positionRibbonMenus);
paintCommandRibbon();
