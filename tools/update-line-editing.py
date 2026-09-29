from pathlib import Path
p=Path(__file__).resolve().parent.parent/'assets/app.js'
s=p.read_text(encoding='utf-8')
old="const p=['moment','thin','dashed'].includes(mode)?(snapToBar(rawPoint(e))||point(e)):point(e);if(mode==='select')"
assert old in s
s=s.replace(old,"const p=drawingPoint(e);if(mode==='select')",1)
s=s.replace("svg.onpointermove=e=>{if(!drag){", "svg.onpointermove=e=>{if(!drag){if(first&&['bar','thin','dashed','udl'].includes(mode)){hover=drawingPoint(e);render();return;}",1)
s=s.replace("const p=(drag.anchor||drag.endpoint)?", "let p=(drag.anchor||drag.endpoint)?",1)
s=s.replace("if(Math.hypot(p.x-otherX,p.y-otherY)<1)return;", "if(e.shiftKey&&['bar','thin','dashed','udl'].includes(o.type))p=orthogonalPoint({x:otherX,y:otherY},p);\n if(Math.hypot(p.x-otherX,p.y-otherY)<1)return;",1)
s=s.replace("function render(clean=false){", "function render(clean=false){\n if(typeof refreshLineStyle==='function')refreshLineStyle();",1)
marker="function paintMarquee(){"
pos=s.index(marker)
end=s.rfind('}',0,pos)
s=s[:end]+" if(!clean&&first&&hover&&['bar','thin','dashed','udl'].includes(mode)){const g=el('g',{'pointer-events':'none',stroke:'#087d95','stroke-dasharray':'5 4'});line(g,first.x,first.y,hover.x,hover.y);}\n"+s[end:]
p.write_text(s,encoding='utf-8')
