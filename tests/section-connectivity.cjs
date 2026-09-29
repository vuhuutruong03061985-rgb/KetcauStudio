const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function geometry(){const s=fs.readFileSync(require('node:path').join(__dirname,'../assets/tablet.js'),'utf8');let id=0;const ctx={copy:o=>JSON.parse(JSON.stringify(o)),newId:()=>`copy-${++id}`};vm.createContext(ctx);vm.runInContext(s.slice(s.indexOf('const sectionGeometry='),s.indexOf('const sectionVisibilityKey='))+';globalThis.geom=sectionGeometry;',ctx);return ctx.geom}
const bar=(id,x,y,x2,y2)=>({id,type:'bar',x,y,x2,y2,label:'',support:'pin',direction:'down',rotation:'cw'});
function run(){const g=geometry(),b=bar('b',0,0,100,0),build=(bars,points=[])=>g.build(bars,points),v=(x,y)=>({x,y});
 assert.equal(build([b,bar('c',100,0,100,100)]).components.length,1);
 assert.equal(build([b,bar('c',50,0,50,100)]).components.length,1);
 assert.equal(build([b,bar('c',50,-50,50,50)]).components.length,2);
 assert.equal(build([bar('a',0,0,50,0),bar('b',50,0,100,0),bar('c',50,0,50,50),bar('d',50,0,50,-50)]).components.length,1);
 for(const [gap,count]of [[.249,1],[.25,2],[.251,2]])assert.equal(build([b,bar('c',100+gap,0,150,0)]).components.length,count);
 for(const [gap,count]of [[.249,1],[.251,2]])assert.equal(build([b,bar('c',50,gap,50,50)]).components.length,count);
 let graph=build([b],[v(40,-20),v(40,20)]);assert.equal(graph.components.length,2);assert.equal(graph.pieces.length,2);assert.notEqual(graph.pieces[0].endPort.id,graph.pieces[1].startPort.id);assert.equal(graph.pieces[0].endPort.x,graph.pieces[1].startPort.x);assert.equal(graph.pieces[0].neighbors.size,0);
 graph=build([b],[v(30,-20),v(30,20),v(70,20),v(70,-20)]);assert.equal(graph.components.length,3);
 const loop=[b,bar('r',100,0,100,100),bar('top',100,100,0,100),bar('l',0,100,0,0)];graph=build(loop,[v(50,-20),v(50,20)]);assert.equal(graph.components.length,1);assert.equal(graph.candidates.length,1);
 const frame=[bar('l',0,0,0,100),bar('top',0,100,100,100),bar('r',100,100,100,0)];graph=build(frame,[v(-10,50),v(110,50)]);assert.equal(graph.components.length,3);
 graph=build([...frame,bar('remote',500,500,600,500)],[v(-10,50),v(110,50)]);assert.equal(graph.components.length,4);assert.equal(graph.candidates.length,3);
 const t=[b,bar('branch',50,0,50,100)];for(const x of [50,50.249])assert.throws(()=>build(t,[v(x,-20),v(x,20)]),/T/);
 for(const x of [49,50.251])assert.equal(build(t,[v(x,-20),v(x,20)]).candidates.length,2);
 graph=build([bar('left',0,0,50,0),bar('right',50,0,100,0),bar('up',50,0,50,100)],[v(50,-20),v(50,20)]);assert.equal(graph.candidates.length,0);
 // Source remains immutable; pieces can be computed in any source-array order.
 const before=JSON.stringify(frame),a=build(frame,[v(-10,50),v(110,50)]),rev=build([...frame].reverse(),[v(-10,50),v(110,50)]);assert.equal(JSON.stringify(a.components),JSON.stringify(rev.components));assert.equal(JSON.stringify(frame),before);
 const source=[b,bar('cross',30,-20,30,20),{id:'f',type:'force',x:10,y:0},{id:'amb',type:'support',x:30,y:0},{id:'cut',type:'hinge',x:50,y:0},{id:'near',type:'force',x:10,y:.1},{id:'text',type:'text',x:10,y:0},{id:'h',type:'hatch',x:0,y:0,points:[]},{id:'udl',type:'udl',x:5,y:0,x2:20,y2:0},{id:'span',type:'udl',x:10,y:0,x2:80,y2:0}];
 graph=build(source,[v(50,-10),v(50,10)]);const component=graph.pieces.find(p=>p.sourceBarId==='b'&&p.t0===0).componentId;const extracted=g.extract(graph,component,source);assert.equal(extracted.filter(o=>o.type==='force').length,1);assert.equal(extracted.filter(o=>o.type==='udl').length,1);assert(!extracted.some(o=>['text','hatch','hinge','support'].includes(o.type)));
 assert.equal(build([b,{...bar('x',50,-10,50,10),type:'linkBar'},{...bar('y',20,-10,20,10),sectionExtract:true}]).bars.length,1);
 console.log('PASS connectivity: endpoint/T/crossing/segmented nodes, tolerance, isolated cut ports, multi-cut/frame/alternate path, candidate scope, deterministic ordering, T rejection and conservative ownership');}
module.exports={geometry,bar};if(require.main===module)run();
