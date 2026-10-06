'use strict';
const assert=require('node:assert/strict');
// Focus-only test setup through the existing menu API: taps now activate.
// Actual drag, cancellation and source invocation assertions stay in each suite.
async function focusRadialEntry(page,side,id){
 await page.evaluate(({side,id})=>{
  const menu=side==='left'?leftDrawingMenu:rightCommandMenu;
  const ring=menu.state.rings.find(r=>r.entries.some(e=>e.id===id));
  menu.setRingEntries(ring.id,ring.entries,id);
 },{side,id});
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.equal(await page.evaluate(({side,id})=>{
  const menu=side==='left'?leftDrawingMenu:rightCommandMenu;
  return menu.state.rings.find(r=>r.entries.some(e=>e.id===id)).focusedId;
 },{side,id}),id);
}
module.exports={focusRadialEntry};
