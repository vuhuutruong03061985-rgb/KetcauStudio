'use strict';
// A small SVG equation layout: independent of fonts/services downloaded online.
function equationLayout(source,size=19){
 let pos=0,depth=0;
 const symbols={alpha:'α',beta:'β',gamma:'γ',delta:'δ',theta:'θ',lambda:'λ',mu:'μ',nu:'ν',rho:'ρ',sigma:'σ',tau:'τ',phi:'φ',omega:'ω',Delta:'Δ',Omega:'Ω',pi:'π',sum:'∑',int:'∫',prod:'∏',infty:'∞',pm:'±',times:'×',cdot:'·',div:'÷',le:'≤',ge:'≥',ne:'≠',approx:'≈',Rightarrow:'⇒',rightarrow:'→',partial:'∂'};
 const text=(s,f)=>({simpleScriptBase:!/[∑∏∫]/.test(s),w:Math.max(f*.3,s.length*f*.57),h:f*.82,d:f*.25,draw(g,x,y){el('text',{x,y,fill:'black',stroke:'none','font-family':'Cambria Math, Times New Roman, serif','font-size':f,'text-anchor':'start'},g).textContent=s}});
 const row=nodes=>({simpleScriptBase:nodes.length>0&&nodes.every(n=>n.simpleScriptBase),w:nodes.reduce((s,n)=>s+n.w,0),h:Math.max(0,...nodes.map(n=>n.h)),d:Math.max(0,...nodes.map(n=>n.d)),draw(g,x,y){for(const n of nodes){n.draw(g,x,y);x+=n.w}}});
 function group(f){if(source[pos]==='{'){pos++;return sequence(f,true)}return atom(f)}
 function atom(f){
  if(++depth>24)throw Error('Công thức lồng quá sâu.');
  try{
   if(pos>=source.length)throw Error('Thiếu thành phần công thức.');
   if(source[pos]==='{')return group(f);
   if(source[pos]!==String.fromCharCode(92)){const character=source[pos++];return text(character,'∑∏∫'.includes(character)?f*1.3:f)}
   pos++;const match=source.slice(pos).match(/^[A-Za-z]+/);if(!match){return text(source[pos++]||'',f)}const command=match[0];pos+=command.length;
   if(command==='frac'){
    const a=group(f*.85),b=group(f*.85),w=Math.max(a.w,b.w)+f*.45;
    return {w,h:a.h+a.d+f*.45,d:b.h+b.d+f*.2,draw(g,x,y){a.draw(g,x+(w-a.w)/2,y-f*.45-a.d);line(g,x,y-f*.2,x+w,y-f*.2,{stroke:'black','stroke-width':1});b.draw(g,x+(w-b.w)/2,y+f*.2+b.h)}};
   }
   if(command==='sqrt'){
    const a=group(f),w=a.w+f*.7;return {w,h:a.h+f*.2,d:a.d,draw(g,x,y){text('√',f*1.25).draw(g,x,y);a.draw(g,x+f*.7,y);line(g,x+f*.65,y-a.h-f*.12,x+w,y-a.h-f*.12,{stroke:'black','stroke-width':1})}};
   }
   if(command==='text'||command==='mathrm')return group(f);
   if(!Object.hasOwn(symbols,command))throw Error('Chưa hỗ trợ \\'+command);
   return text(symbols[command],['sum','int','prod'].includes(command)?f*1.3:f);
  }finally{depth--}
 }
 function sequence(f,closing=false){
  const nodes=[];while(pos<source.length&&source[pos]!=='}'){
   if(source[pos]==='_'||source[pos]==='^')throw Error('Chỉ số cần ký hiệu đứng trước.');
   let base=atom(f),sup=null,sub=null;
   while(source[pos]==='_'||source[pos]==='^'){const key=source[pos++],s=group(f*.65);if(key==='^')sup=s;else sub=s}
   // Simple text scripts share a nearby baseline; operators and complex layouts retain conservative clearance.
   if(sup||sub){const b=base,up=sup?Math.max(f*.55,b.h*.7)+sup.d:0,down=sub?Math.max(f*.25,b.d)+(b.simpleScriptBase&&sub.simpleScriptBase?0:sub.h):0;
    base={w:b.w+Math.max(sup?.w||0,sub?.w||0),h:Math.max(b.h,sup?up+sup.h:0),d:Math.max(b.d,sub?down+sub.d:0),draw(g,x,y){b.draw(g,x,y);sup?.draw(g,x+b.w,y-up);sub?.draw(g,x+b.w,y+down)}};
   }nodes.push(base);
  }
  if(closing){if(source[pos]!=='}')throw Error('Thiếu dấu }.');pos++}else if(pos<source.length)throw Error('Dư dấu }.');return row(nodes);
 }
 return sequence(size);
}
function renderEquation(g,x,y,source){
 const layout=equationLayout(source),group=el('g',{'data-equation':'true',cursor:'text'},g);layout.draw(group,x-layout.w/2,y);return group;
}
// Recursive-descent arithmetic parser. Never evaluates JavaScript input.
function calculateExpression(source,angleMode='deg'){
 if(source.length>500)throw Error('Biểu thức tối đa 500 ký tự.');
 const text=source.replace(/×/g,'*').replace(/÷/g,'/').replace(/π/g,'pi').replace(/,/g,'.');
 const tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-zA-Z]+|\*\*|[+\-*/^()%]|\S/g)||[];
 let index=0,depth=0;const peek=()=>tokens[index];
 const checked=value=>{if(!Number.isFinite(value))throw Error('Kết quả không xác định hoặc vượt giới hạn.');return value};
 function primary(){
  if(++depth>60)throw Error('Biểu thức lồng quá sâu.');
  try{
   const token=tokens[index++];if(!token)throw Error('Thiếu số hoặc biểu thức.');
   if(token==='('){const value=sum();if(tokens[index++]!==')')throw Error('Thiếu dấu đóng ngoặc.');return value}
   if(/^(?:\d|\.)/.test(token))return checked(Number(token));
   const name=token.toLowerCase();if(name==='pi')return Math.PI;if(name==='e')return Math.E;
   const trig=angleMode==='deg'?Math.PI/180:1;
   const functions={sqrt:Math.sqrt,abs:Math.abs,sin:x=>Math.sin(x*trig),cos:x=>Math.cos(x*trig),tan:x=>{if(Math.abs(Math.cos(x*trig))<1e-14)throw Error('tan không xác định tại góc này.');return Math.tan(x*trig)},ln:Math.log,log:Math.log10,exp:Math.exp};
   if(!Object.hasOwn(functions,name))throw Error('Không nhận diện: '+token);
   if(tokens[index++]!=='(')throw Error('Hàm cần dấu ngoặc, ví dụ sqrt(9).');
   const value=sum();if(tokens[index++]!==')')throw Error('Thiếu dấu đóng ngoặc.');return checked(functions[name](value));
  }finally{depth--}
 }
 function power(){let value=primary();if(peek()==='^'||peek()==='**'){index++;value=checked(value**unary())}return value}
 function unary(){if(peek()==='+'||peek()==='-'){if(++depth>60)throw Error('Biểu thức lồng quá sâu.');const sign=tokens[index++];try{return (sign==='-'?-1:1)*unary()}finally{depth--}}let value=power();while(peek()==='%'){index++;value/=100}return value}
 function product(){let value=unary();while(peek()==='*'||peek()==='/'){const op=tokens[index++],right=unary();if(op==='/'&&right===0)throw Error('Không thể chia cho 0.');value=checked(op==='*'?value*right:value/right)}return value}
 function sum(){let value=product();while(peek()==='+'||peek()==='-'){const op=tokens[index++],right=product();value=checked(op==='+'?value+right:value-right)}return value}
 if(!tokens.length)throw Error('Nhập biểu thức cần tính.');
 const value=sum();if(index!==tokens.length)throw Error('Ký tự không hợp lệ hoặc thiếu phép nhân: '+peek());return checked(value);
}
if(typeof module!=='undefined')module.exports={calculateExpression};

// Polynomial arithmetic: exact structure checks, no evaluation of user code.
function solveEquations(source){
 if(source.length>500)throw Error('Phương trình tối đa 500 ký tự.');
 const match=source.trim().match(/^(?:solve|giai)\((.*)\)$/is);
 if(!match)throw Error('Dùng giai(2*x+3=7) hoặc giai(x+y=3; x-y=1).');
 const equations=match[1].split(';').map(s=>s.trim());
 if(equations.length>10)throw Error('Tối đa 10 phương trình.');
 const vars=new Set();
 const clean=p=>new Map([...p].filter(([,v])=>v!==0));
 const add=(a,b,f=1)=>{const p=new Map(a);for(const [k,v]of b)p.set(k,(p.get(k)||0)+f*v);return clean(p)};
 const multiply=(a,b)=>{const p=new Map();for(const [ka,va]of a)for(const [kb,vb]of b){const key=[...ka.split('*'),...kb.split('*')].filter(Boolean).sort().join('*');if(key.split('*').length>2)throw Error('Chỉ hỗ trợ đa thức bậc tối đa 2.');p.set(key,(p.get(key)||0)+va*vb)}return clean(p)};
 function parse(text){
  const t=text.replace(/×/g,'*').replace(/÷/g,'/').match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|\*\*|\S/g)||[];
  let i=0,depth=0;const constant=v=>new Map([['',v]]);
  function atom(){if(++depth>50)throw Error('Biểu thức lồng quá sâu.');try{
   const token=t[i++];if(token==='('){const p=sum();if(t[i++]!==')')throw Error('Thiếu dấu ).');return p}
   if(token&&/^(?:\d|\.)/.test(token)){const n=Number(token);if(!Number.isFinite(n))throw Error('Số vượt giới hạn.');return constant(n)}
   if(token&&/^[A-Za-z]/.test(token)){if(['sin','cos','tan','sqrt','log','ln','exp'].includes(token))throw Error('Chưa hỗ trợ phương trình chứa hàm '+token);vars.add(token);if(vars.size>10)throw Error('Tối đa 10 ẩn.');return new Map([[token,1]])}
   throw Error('Thiếu số hoặc tên ẩn.');
  }finally{depth--}}
  function power(){let p=atom();if(t[i]==='^'||t[i]==='**'){i++;const n=t[i++];if(!['0','1','2'].includes(n))throw Error('Số mũ chỉ nhận 0, 1, 2.');p=n==='0'?constant(1):n==='2'?multiply(p,p):p}return p}
  function unary(){let sign=1;while(t[i]==='+'||t[i]==='-'){if(t[i++]==='-')sign=-sign}return multiply(constant(sign),power())}
  function product(){let p=unary();while(i<t.length){const op=t[i],implicit=op==='('||/^[A-Za-z]/.test(op);if(!implicit&&!['*','/'].includes(op))break;if(!implicit)i++;const q=unary();if(op==='/'){if([...q.keys()].some(k=>k)||!q.get(''))throw Error('Chỉ được chia cho hằng số khác 0.');p=multiply(p,constant(1/q.get('')))}else p=multiply(p,q)}return p}
  function sum(){let p=product();while(t[i]==='+'||t[i]==='-'){const op=t[i++];p=add(p,product(),op==='+'?1:-1)}return p}
  const p=sum();if(i!==t.length)throw Error('Ký tự không hợp lệ: '+t[i]);for(const v of p.values())if(!Number.isFinite(v))throw Error('Hệ số vượt giới hạn.');return p;
 }
 const polys=equations.map(s=>{const sides=s.split('=');if(sides.length!==2||sides.some(s=>!s.trim()))throw Error('Mỗi phương trình cần hai vế và một dấu =.');return add(parse(sides[0]),parse(sides[1]),-1)});
 const names=[...vars].sort(),fmt=n=>String(Number(n.toPrecision(10)));
 if(names.length===1&&polys.length===1){
  const x=names[0],p=polys[0],a=p.get(x+'*'+x)||0,b=p.get(x)||0,c=p.get('')||0;
  if(a){const d=b*b-4*a*c;if(!Number.isFinite(d))throw Error('Hệ số quá lớn.');if(d<0)return 'Không có nghiệm thực';if(d===0)return x+' = '+fmt(-b/(2*a));const q=-.5*(b+(b>=0?1:-1)*Math.sqrt(d));return x+' = '+[q/a,c/q].sort((a,b)=>a-b).map(fmt).join(' hoặc ')}
  if(b)return x+' = '+fmt(-c/b);return c?'Vô nghiệm':'Vô số nghiệm';
 }
 if(polys.some(p=>[...p.keys()].some(k=>k.includes('*'))))throw Error('Hệ nhiều ẩn chỉ hỗ trợ tuyến tính.');
 const matrix=polys.map(p=>[...names.map(n=>p.get(n)||0),-(p.get('')||0)]).map(row=>{const scale=Math.max(...row.map(Math.abs));return scale?row.map(v=>v/scale):row});
 let rank=0;const pivots=[],tol=1e-12;
 for(let col=0;col<names.length&&rank<matrix.length;col++){
  let pivot=rank;for(let r=rank+1;r<matrix.length;r++)if(Math.abs(matrix[r][col])>Math.abs(matrix[pivot][col]))pivot=r;
  if(Math.abs(matrix[pivot][col])<tol)continue;
  [matrix[rank],matrix[pivot]]=[matrix[pivot],matrix[rank]];const divisor=matrix[rank][col];matrix[rank]=matrix[rank].map(v=>v/divisor);
  for(let r=0;r<matrix.length;r++)if(r!==rank){const f=matrix[r][col];matrix[r]=matrix[r].map((v,j)=>v-f*matrix[rank][j])}
  pivots.push(col);rank++;
 }
 if(matrix.some(row=>row.slice(0,-1).every(v=>Math.abs(v)<tol)&&Math.abs(row.at(-1))>=tol))return 'Vô nghiệm';
 if(rank<names.length||!names.length)return 'Vô số nghiệm';
 const values=Array(names.length);pivots.forEach((col,r)=>values[col]=matrix[r].at(-1));
 return names.map((n,i)=>n+' = '+fmt(values[i])).join('; ');
}
if(typeof module!=='undefined')module.exports.solveEquations=solveEquations;

function equationBody(formula){
 if(typeof formula!=='string')return null;
 if(formula.endsWith('-->'))return formula.slice(0,-3).trim();
 const m=formula.match(/^(?:giai|solve)\((.*)\)$/is);return m?m[1]:null;
}
// A numeric quantity followed by a unit-shaped suffix is a declaration, not
// implicit multiplication of unknowns. Explicit solver commands bypass this.
function engineeringValueLabel(text){
 return /^\s*[\p{L}][\p{L}\p{N}_{}]*\s*=\s*[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?\s*(?:[\p{L}°µΩ%]+(?:[²³⁴⁵⁶⁷⁸⁹⁰¹]|\^[+-]?\d+)*(?:\s*[\/·⋅*]\s*[\p{L}°µΩ]+(?:[²³⁴⁵⁶⁷⁸⁹⁰¹]|\^[+-]?\d+)*)*)\s*$/u.test(text);
}
function directEquation(text){
 if(engineeringValueLabel(text))return null;
 if(/(?:\\[A-Za-z]+|[∑∏∫])/.test(text))return null;
 if(/^(giai|solve)\(/i.test(text)||text.includes('-->'))return null;
 const parts=text.split('=');if(parts.length!==2)return null;
 const lhs=parts[0].trim(),rhs=parts[1].trim();
 const unknown=s=>/[A-Za-z]/.test(s.replace(/\b(sin|cos|tan|sqrt|abs|log|ln|exp|pi|e)\b/gi,''));
 if(!unknown(lhs+rhs)||(!/[+*/^()-]/.test(lhs)&&!unknown(rhs)&&! /^(x|y|z)$/i.test(lhs)))return null;
 return lhs+'='+(rhs||'0');
}
function equationBindings(result){
 return new Map([...quantityBindings(result)].map(([name,q])=>[name,q.value]));
}
function dependentEquation(body,values,units=new Map()){
 const names=[...new Set((body.replace(/\d(?:\.\d*)?e[+-]?\d+/gi,'0').match(/[A-Za-z][A-Za-z0-9_]*/g)||[]))];
 let original;
 try{original=solveEquations('giai('+body+')')}catch(error){if(!values.size)throw error}
 // A complete standalone equation/system supplies its own variables.
 if(original&&equationBindings(original).size)return original;
 if(names.length<=1&&original)return original;
 const substituted=body.replace(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*/g,token=>values.has(token)?'('+values.get(token)+')':token);
 if(substituted===body)return original==='Vô nghiệm'?'Vô nghiệm':'Chờ dữ kiện';
 const result=solveEquations('giai('+substituted+')');
 if(result==='Vô số nghiệm')return 'Chờ dữ kiện';
 const solutions=equationBindings(result);
 if(solutions.size===1&&units.size){
  const [name,value]=[...solutions][0],dim=inferEquationUnit(body,name,units,values);
  if(dim){const suffix=formatEquationUnit(dim);if(suffix)return name+' = '+Number(value.toPrecision(10))+' '+suffix}
 }
 return result;
}
function resolveDrawingEquations(objects){
 const entries=objects.map(o=>({o,body:equationBody(o.labelFormula)})).filter(e=>e.body!==null);
 let results=new Map(),values=new Map(),units=new Map();const blocked=new Set();
 const givens=objects.filter(o=>equationBody(o.labelFormula)===null).flatMap(o=>[...quantityBindings(o.label||'')]);
 for(let pass=0;pass<=entries.length+1;pass++){
  const next=new Map(),candidates=new Map(),candidateUnits=new Map();
  function offer(name,q){const value=q.value;
   if(blocked.has(name))return;
   if(candidates.has(name)&&(Math.abs(candidates.get(name)-value)>1e-9*Math.max(1,Math.abs(value))||JSON.stringify(candidateUnits.get(name)||null)!==JSON.stringify(q.dim))){blocked.add(name);candidates.delete(name);candidateUnits.delete(name)}else{candidates.set(name,value);if(q.dim)candidateUnits.set(name,q.dim)}
  }
  for(const [name,q]of givens)offer(name,q);
  for(const {o,body}of entries){
   const available=new Map(values);for(const name of equationBindings(results.get(o.id)||'').keys())available.delete(name);
   let result;try{result=dependentEquation(body,available,units)}catch(error){result=error.message==='Đơn vị không tương thích'?'Đơn vị không tương thích':'Phương trình chưa hợp lệ'}next.set(o.id,result);
   for(const [name,q]of quantityBindings(result))if(Number.isFinite(q.value))offer(name,q);
  }
  const stable=JSON.stringify([...next])===JSON.stringify([...results])&&JSON.stringify([...candidates])===JSON.stringify([...values])&&JSON.stringify([...candidateUnits])===JSON.stringify([...units]);
  results=next;values=candidates;units=candidateUnits;if(stable)break;
 }
 return results;
}
function updateDrawingEquations(objects){
 const results=resolveDrawingEquations(objects);
 for(const o of objects)if(results.has(o.id)){
  const result=results.get(o.id),label=o.labelFormula.endsWith('-->')?o.labelFormula+result.replace(/\s*=\s*/g,'='):result;
  o.label=label.length<=100?label:o.labelFormula.endsWith('-->')?o.labelFormula+'....':'....';
 }
}
function previewDependentEquation(formula,objects,id){
 const candidate={id,labelFormula:formula};return resolveDrawingEquations([...objects.filter(o=>o.id!==id),candidate]).get(id)||'Chờ dữ kiện';
}
if(typeof module!=='undefined')Object.assign(module.exports,{resolveDrawingEquations,updateDrawingEquations});

// Base units are kN and m. Unitless data remains unspecified, not guessed.
function parseEquationUnit(text){
 const units={N:[.001,1,0],kN:[1,1,0],MN:[1000,1,0],m:[1,0,1],cm:[.01,0,1],mm:[.001,0,1],Pa:[.001,1,-2],kPa:[1,1,-2],MPa:[1000,1,-2],GPa:[1000000,1,-2]};
 const s=text.trim().replace(/[·⋅.]/g,'*').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\s+/g,'*');
 if(!s)return {scale:1,dim:null};
 const tokens=s.match(/[A-Za-z]+(?:\^[+-]?\d+)?|[*/]/g);if(!tokens||tokens.join('')!==s)return null;
 let scale=1,dim=[0,0],sign=1,expect=true;
 for(const token of tokens){
  if(token==='*'||token==='/'){if(expect)return null;sign=token==='/'?-1:1;expect=true;continue}
  if(!expect)return null;const [name,power]=token.split('^'),u=units[name],n=sign*Number(power??1);if(!u||Math.abs(n)>6)return null;
  scale*=u[0]**n;dim[0]+=u[1]*n;dim[1]+=u[2]*n;expect=false;
 }return expect?null:{scale,dim};
}
function quantityBindings(result){
 const out=new Map();for(const part of result.split(';')){
  const m=part.trim().match(/^([A-Za-z][A-Za-z0-9_]*)\s*=\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s+(.+))?$/i);
  if(!m)return new Map();const unit=parseEquationUnit(m[3]||'');if(!unit)return new Map();
  out.set(m[1],{value:Number(m[2])*unit.scale,dim:unit.dim});
 }return out;
}
function formatEquationUnit(dim){
 const top=[],bottom=[];dim.forEach((power,i)=>{if(Math.abs(power)<1e-9)return;const n=Math.abs(power),s=['kN','m'][i]+(n===1?'':'^'+n);(power>0?top:bottom).push(s)});
 if(!top.length&&bottom.length)return dim.map((n,i)=>n?['kN','m'][i]+'^'+n:'').filter(Boolean).join('·');
 return top.join('·')+(bottom.length?'/'+bottom.join('/'):'');
}
function inferEquationUnit(body,unknown,units,values){
 const tokens=body.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|\*\*|\S/g)||[];
 let i=0,missing=false;const constraints=[];
 const node=(d=[0,0],k=0,zero=false)=>({d,k,zero});
 const equal=(a,b)=>{if(!a.zero&&!b.zero)constraints.push({k:a.k-b.k,d:a.d.map((v,j)=>v-b.d[j])})};
 function atom(){const t=tokens[i++];if(t==='('){const a=sum();if(tokens[i++]!==')')throw Error('Ngoặc');return a}
  if(/^(\d|\.)/.test(t||''))return node([0,0],0,Number(t)===0);
  if(t===unknown)return node([0,0],1);
  if(units.has(t))return node(units.get(t));
  if(values.has(t))missing=true;else missing=true;return node();
 }
 function power(){const a=atom();if(tokens[i]==='^'||tokens[i]==='**'){i++;const n=Number(tokens[i++]);if(!Number.isFinite(n))throw Error('Mũ');return node(a.d.map(v=>v*n),a.k*n,a.zero&&n>0)}return a}
 function unary(){while(tokens[i]==='+'||tokens[i]==='-')i++;return power()}
 function product(){let a=unary();while(i<tokens.length){const t=tokens[i],implicit=t==='('||/^[A-Za-z]/.test(t);if(!implicit&&!['*','/'].includes(t))break;if(!implicit)i++;const b=unary(),sign=t==='/'?-1:1;a=node(a.d.map((v,j)=>v+sign*b.d[j]),a.k+sign*b.k,a.zero||b.zero)}return a}
 function sum(){let a=product();while(tokens[i]==='+'||tokens[i]==='-'){i++;const b=product();equal(a,b);if(a.zero)a=b}return a}
 while(i<tokens.length){const a=sum();if(tokens[i++]!=='=')return null;const b=sum();equal(a,b);if(i<tokens.length&&tokens[i++]!==';')return null}
 if(missing)return null;
 let result=null;for(const c of constraints){
  if(Math.abs(c.k)<1e-12){if(c.d.some(v=>Math.abs(v)>1e-9))throw Error('Đơn vị không tương thích');continue}
  const d=c.d.map(v=>-v/c.k);if(result&&d.some((v,j)=>Math.abs(v-result[j])>1e-9))throw Error('Đơn vị không tương thích');result=d;
 }return result;
}
