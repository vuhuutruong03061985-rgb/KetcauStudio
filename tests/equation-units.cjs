const assert=require('node:assert/strict'),{updateDrawingEquations:u}=require('../assets/calculator.js');
const given=(id,label)=>({id,label}),eq=(id,labelFormula)=>({id,labelFormula});
let a=[given('p','P=20 kN'),given('l','L=6 m'),given('m','M=12 kN.m'),eq('k','M_K2+P*L-M=0-->')];u(a);assert.equal(a[3].label,'M_K2+P*L-M=0-->M_K2=-108 kN·m');
a=[given('p','P=20000 N'),given('l','L=6000 mm'),eq('m','M=P*L-->'),eq('q','q=P/L-->'),eq('r','R=M/L-->')];u(a);assert.equal(a[2].label,'M=P*L-->M=120 kN·m');assert.equal(a[3].label,'q=P/L-->q=3.333333333 kN/m');assert.equal(a[4].label,'R=M/L-->R=20 kN');
a=[given('p','P=20 kN'),given('l','L=6 m'),eq('x','x=P+L-->')];u(a);assert(a[2].label.endsWith('Đơn vị không tương thích'));
a=[given('p','P=20 kN'),given('l','L=6'),eq('x','x=P*L-->')];u(a);assert.equal(a[2].label,'x=P*L-->x=120');
a=[given('p','P=20 kN'),eq('x','x=P*L-->')];u(a);assert(a[1].label.endsWith('Chờ dữ kiện'));
console.log('PASS units, N/mm conversion, moment/load/force chain, mismatch and missing units');
