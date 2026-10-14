'use strict';
// Existing numerical tests complete the newly explicit tablet point step.
// Deferred creation is asserted independently in tablet-line-placement.cjs.
exports.confirmPoint=async p=>{
 if(!await p.evaluate(()=>['thin','dashed','bar'].includes(penConnectionPlacement?.type)&&penConnectionPlacement.state==='confirming'))return;
 const box=await p.locator('[data-pen-connection-action="confirm"]').boundingBox();
 if(!box)throw Error('Frozen point has no visible confirmation Bubble');
 await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
 await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
};
exports.enterThin=async(p,touch)=>{
 const allowed=await p.evaluate(()=>!inlineEditor&&!document.querySelector('dialog[open]')&&(document.activeElement===document.body||$('dynamicInput').contains(document.activeElement)));
 await p.keyboard.press('Enter');
 if(!touch||!allowed)return;
 const q=await p.evaluate(()=>thinNumericSession?.tablet&&thinNumericSession.valueMode==='locked'&&!dynamicInputUI.hasPendingEdit()?thinReferenceSession?.rawCursorPoint:null);
 if(!q)return;
 const s=await p.evaluate(q=>{const a=new DOMPoint(q.x,q.y).matrixTransform(svg.getScreenCTM());return {x:a.x,y:a.y}},q);
 await p.touchscreen.tap(s.x,s.y);await exports.confirmPoint(p);
};
